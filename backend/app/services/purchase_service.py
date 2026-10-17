from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException

from app.models.purchase import Purchase, PurchaseItem
from app.models.products import Product
from app.models.wholesalers import Wholesaler
from app.models.wholesaler_payment import WholesalerPayment
from app.schemas.purchase import (
    PurchaseCreate,
    WholesalerPaymentCreate,
    WholesalerBalanceRead,
)
from app.models.inventory_batch import InventoryBatch
from app.models.wholesaler_return import WholesalerReturn


def _resolve_pieces(qty: Decimal, unit: str, product: Product) -> Decimal:
    """Convert purchase quantity to pieces using the product's packaging."""
    if unit == "box":
        return qty * Decimal(product.pieces_per_box)
    # piece & meter are stored as-is (meter treated as its own 'piece' unit for stock math)
    return qty


def create_purchase(db: Session, data: PurchaseCreate) -> Purchase:
    # 1. Validate wholesaler
    wholesaler = db.query(Wholesaler).filter(Wholesaler.id == data.wholesaler_id).first()
    if not wholesaler:
        raise HTTPException(404, "Wholesaler not found")

    # 2. Validate all products exist (fetch once)
    product_ids = [item.product_id for item in data.items]
    products = {
        p.id: p
        for p in db.query(Product).filter(Product.id.in_(product_ids)).all()
    }
    for item in data.items:
        if item.product_id not in products:
            raise HTTPException(404, f"Product {item.product_id} not found")

    # 3. Build line items + running total
    purchase = Purchase(
        wholesaler_id=data.wholesaler_id,
        receipt_number=data.receipt_number,
        purchase_date=data.purchase_date,
        amount_paid=data.amount_paid,
        payment_mode=data.payment_mode,
        cash_paid=data.cash_paid,
        upi_paid=data.upi_paid,
        notes=data.notes,
        total_amount=Decimal("0"),
    )

    total = Decimal("0")
    for item in data.items:
        product = products[item.product_id]
        pieces = _resolve_pieces(item.quantity_bought, item.unit_used, product)
        line_total = pieces * item.unit_price

        purchase_item = PurchaseItem(
            product_id=item.product_id,
            quantity_bought=item.quantity_bought,
            unit_used=item.unit_used,
            quantity_in_pieces=pieces,
            unit_price=item.unit_price,
            line_total=line_total,
        )
        purchase.items.append(purchase_item)
        db.flush()

        # 4. Increase stock in pieces
    product.current_stock = (product.current_stock or 0) + pieces

    batch = InventoryBatch(
        product_id=item.product_id,
        purchase_item_id=purchase_item.id,
        quantity_initial=pieces,
        quantity_remaining=pieces,
        cost_per_piece=item.unit_price,
        purchase_date=data.purchase_date,
    )
    db.add(batch)

    total += line_total

    purchase.total_amount = total

    # 5. Save everything as one transaction
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase


def list_purchases(
    db: Session,
    wholesaler_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
) -> List[Purchase]:
    q = db.query(Purchase).options(
        joinedload(Purchase.items).joinedload(PurchaseItem.product),
        joinedload(Purchase.wholesaler),
    )
    if wholesaler_id:
        q = q.filter(Purchase.wholesaler_id == wholesaler_id)
    if date_from:
        q = q.filter(Purchase.purchase_date >= date_from)
    if date_to:
        q = q.filter(Purchase.purchase_date <= date_to)
    return q.order_by(Purchase.purchase_date.desc(), Purchase.id.desc()).limit(limit).all()


def get_purchase(db: Session, purchase_id: int) -> Optional[Purchase]:
    return (
        db.query(Purchase)
        .options(
            joinedload(Purchase.items).joinedload(PurchaseItem.product),
            joinedload(Purchase.wholesaler),
        )
        .filter(Purchase.id == purchase_id)
        .first()
    )


# ---------- Standalone payments ----------

def create_payment(db: Session, data: WholesalerPaymentCreate) -> WholesalerPayment:
    wholesaler = db.query(Wholesaler).filter(Wholesaler.id == data.wholesaler_id).first()
    if not wholesaler:
        raise HTTPException(404, "Wholesaler not found")

    payment = WholesalerPayment(
        wholesaler_id=data.wholesaler_id,
        amount=data.amount,
        payment_mode=data.payment_mode,
        reference=data.reference, 
        notes=data.notes,
    )
    if data.payment_date:
        from datetime import datetime, time
        payment.payment_date = datetime.combine(data.payment_date, time.min)

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def list_payments(db: Session, wholesaler_id: Optional[int] = None) -> List[WholesalerPayment]:
    q = db.query(WholesalerPayment)
    if wholesaler_id:
        q = q.filter(WholesalerPayment.wholesaler_id == wholesaler_id)
    return q.order_by(WholesalerPayment.payment_date.desc()).all()


# ---------- Balances ----------

def compute_balances(db: Session) -> List[WholesalerBalanceRead]:
    """Running balance per wholesaler across all purchases + payments."""
    purchased = dict(
        db.query(
            Purchase.wholesaler_id,
            func.coalesce(func.sum(Purchase.total_amount), 0),
        ).group_by(Purchase.wholesaler_id).all()
    )
    # amount_paid at purchase time also counts as payment
    paid_at_purchase = dict(
        db.query(
            Purchase.wholesaler_id,
            func.coalesce(func.sum(Purchase.amount_paid), 0),
        ).group_by(Purchase.wholesaler_id).all()
    )
    paid_standalone = dict(
        db.query(
            WholesalerPayment.wholesaler_id,
            func.coalesce(func.sum(WholesalerPayment.amount), 0),
        ).group_by(WholesalerPayment.wholesaler_id).all()
    )

    returned = dict(
        db.query(
            WholesalerReturn.wholesaler_id,
            func.coalesce(func.sum(WholesalerReturn.total_amount), 0),
        ).group_by(WholesalerReturn.wholesaler_id).all()
    )

    result = []
    for w in db.query(Wholesaler).filter(Wholesaler.is_active == True).all():
        total_purchased = Decimal(purchased.get(w.id, 0))
        total_paid = Decimal(paid_at_purchase.get(w.id, 0)) + Decimal(paid_standalone.get(w.id, 0))
        balance = (
            Decimal(w.opening_balance or 0) 
            + total_purchased 
            - total_paid 
            - Decimal(returned.get(w.id, 0))
        )
        result.append(
            WholesalerBalanceRead(
                wholesaler_id=w.id,
                wholesaler_name=w.name,
                total_purchased=total_purchased,
                total_paid=total_paid,
                balance=balance,
                opening_balance=Decimal(w.opening_balance or 0),
            )
        )
    return result

def _latest_cost(db: Session, product_id: int) -> Decimal | None:
    batch = (
        db.query(InventoryBatch)
        .filter(
            InventoryBatch.product_id == product_id,
            InventoryBatch.quantity_remaining > 0,
        )
        .order_by(
            InventoryBatch.purchase_date.desc(),
            InventoryBatch.id.desc(),
        )
        .first()
    )
    return Decimal(batch.cost_per_piece) if batch else None


def enrich_product(db: Session, product) -> dict:
    """Return a dict matching ProductRead with extra fields filled."""
    supplier_name = None
    if product.default_wholesaler_id:
        w = db.query(Wholesaler).filter(Wholesaler.id == product.default_wholesaler_id).first()
        supplier_name = w.name if w else None

    return {
        "id": product.id,
        "name": product.name,
        "category": product.category,
        "brand": product.brand,
        "unit": product.unit,
        "pieces_per_box": product.pieces_per_box,
        "selling_price": product.selling_price,
        "low_stock_threshold": product.low_stock_threshold,
        "mid_stock_threshold": product.mid_stock_threshold,
        "is_active": product.is_active,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
        "current_stock": product.current_stock,
        "default_wholesaler_id": product.default_wholesaler_id,
        "supplier_name": supplier_name,
        "latest_cost": _latest_cost(db, product.id),
    }


def get_product_batches(db: Session, product_id: int) -> list:
    batches = (
        db.query(InventoryBatch)
        .filter(
            InventoryBatch.product_id == product_id,
            InventoryBatch.quantity_remaining > 0,
        )
        .order_by(InventoryBatch.purchase_date.asc(), InventoryBatch.id.asc())
        .all()
    )
    out = []
    for b in batches:
        receipt = None
        supplier = None
        if b.purchase_item and b.purchase_item.purchase:
            receipt = b.purchase_item.purchase.receipt_number
            if b.purchase_item.purchase.wholesaler:
                supplier = b.purchase_item.purchase.wholesaler.name
        out.append({
            "id": b.id,
            "quantity_initial": b.quantity_initial,
            "quantity_remaining": b.quantity_remaining,
            "cost_per_piece": b.cost_per_piece,
            "purchase_date": b.purchase_date,
            "receipt_number": receipt,
            "wholesaler_name": supplier,
        })
    return out