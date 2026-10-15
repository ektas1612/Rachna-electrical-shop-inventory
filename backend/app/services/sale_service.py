from decimal import Decimal
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

from app.models.sale import Sale, SaleItem
from app.models.products import Product
from app.models.customers import Customer
from app.schemas.sale import SaleCreate
from app.services.inventory_service import fifo_consume


def _payment_status(total: Decimal, paid: Decimal) -> str:
    if paid <= 0:
        return "unpaid"
    if paid >= total:
        return "paid"
    return "partial"


def _payment_mode(cash: Decimal, upi: Decimal, total: Decimal, paid: Decimal) -> str:
    if paid < total:
        return "unpaid"  # anything not fully paid we tag as unpaid for filtering
    if cash > 0 and upi > 0:
        return "mixed"
    if upi > 0:
        return "upi"
    return "cash"


def create_sale(db: Session, data: SaleCreate) -> Sale:
    # 1. Fetch all products at once
    product_ids = [item.product_id for item in data.items]
    products = {
        p.id: p
        for p in db.query(Product).filter(Product.id.in_(product_ids)).all()
    }
    for item in data.items:
        if item.product_id not in products:
            raise HTTPException(404, f"Product {item.product_id} not found")

    # 2. Optional customer check (Phase 5 will use this heavily)
    if data.customer_id:
        customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise HTTPException(404, "Customer not found")

    sale = Sale(
        sale_date=data.sale_date,
        cash_paid=data.cash_paid,
        upi_paid=data.upi_paid,
        customer_id=data.customer_id,
        notes=data.notes,
    )
    db.add(sale)
    db.flush()

    subtotal = Decimal("0")
    total = Decimal("0")

    for item in data.items:
        product = products[item.product_id]

        # 3. Stock check
        if product.current_stock < item.quantity:
            raise HTTPException(
                400,
                f"Not enough stock for '{product.name}'. "
                f"Available: {product.current_stock}, requested: {item.quantity}.",
            )

        listed = Decimal(product.selling_price)
        actual = Decimal(item.actual_price)
        line_total = item.quantity * actual

        sale_item = SaleItem(
                product_id=item.product_id,
                quantity=item.quantity,
                listed_price=listed,
                actual_price=actual,
                line_total=line_total,
            )

        sale.items.append(sale_item)
        db.flush()

        fifo_consume(db, item.product_id, item.quantity, sale_item.id)

        product.current_stock = product.current_stock - item.quantity

        subtotal += item.quantity * listed
        total += line_total

    sale.subtotal = subtotal
    sale.total_amount = total

    paid = data.cash_paid + data.upi_paid
    sale.amount_paid = paid
    sale.amount_due = total - paid if total > paid else Decimal("0")
    sale.payment_status = _payment_status(total, paid)
    sale.payment_mode = _payment_mode(data.cash_paid, data.upi_paid, total, paid)

    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


def list_sales(
    db: Session,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    payment_status: Optional[str] = None,
    customer_id: Optional[int] = None,
    limit: int = 200,
) -> List[Sale]:
    q = db.query(Sale).options(
        joinedload(Sale.items).joinedload(SaleItem.product),
        joinedload(Sale.customer),
    )
    if date_from:
        q = q.filter(Sale.sale_date >= date_from)
    if date_to:
        q = q.filter(Sale.sale_date <= date_to)
    if payment_status:
        q = q.filter(Sale.payment_status == payment_status)
    if customer_id:
        q = q.filter(Sale.customer_id == customer_id)
    return q.order_by(Sale.sale_date.desc(), Sale.id.desc()).limit(limit).all()


def get_sale(db: Session, sale_id: int) -> Optional[Sale]:
    return (
        db.query(Sale)
        .options(
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.customer),
        )
        .filter(Sale.id == sale_id)
        .first()
    )