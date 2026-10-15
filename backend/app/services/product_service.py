from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy import distinct
from decimal import Decimal
from app.models.products import Product
from app.schemas.products import ProductCreate, ProductUpdate
from app.models.inventory_batch import InventoryBatch
from app.models.wholesalers import Wholesaler

def create_product(db: Session, data: ProductCreate) -> Product:
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_product(db: Session, product_id: int) -> Optional[Product]:
    return db.query(Product).filter(Product.id == product_id).first()


def list_products(
    db: Session,
    search: Optional[str] = None,
    category: Optional[str] = None,
    include_inactive: bool = False,
) -> List[Product]:
    q = db.query(Product)

    if not include_inactive:
        q = q.filter(Product.is_active == True)

    if category:
        q = q.filter(Product.category == category)

    if search:
        like = f"%{search}%"
        q = q.filter(or_(Product.name.ilike(like), Product.brand.ilike(like)))

    return q.order_by(Product.name.asc()).all()


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Optional[Product]:
    product = get_product(db, product_id)
    if not product:
        return None

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def deactivate_product(db: Session, product_id: int) -> Optional[Product]:
    product = get_product(db, product_id)
    if not product:
        return None
    product.is_active = False
    db.commit()
    db.refresh(product)
    return product

def list_categories(db: Session) -> List[str]:
    rows = (
        db.query(distinct(Product.category))
        .filter(Product.is_active == True)
        .all()
    )
    return sorted([r[0] for r in rows if r[0]])

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
    
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy import distinct
from decimal import Decimal
from app.models.products import Product
from app.schemas.products import ProductCreate, ProductUpdate
from app.models.inventory_batch import InventoryBatch
from app.models.wholesalers import Wholesaler


def create_product(db: Session, data: ProductCreate) -> Product:
    product = Product(**data.model_dump(exclude={"supplier_name", "latest_cost"}))
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_product(db: Session, product_id: int) -> Optional[Product]:
    return db.query(Product).filter(Product.id == product_id).first()


def list_products(
    db: Session,
    search: Optional[str] = None,
    category: Optional[str] = None,
    include_inactive: bool = False,
) -> List[Product]:
    q = db.query(Product)

    if not include_inactive:
        q = q.filter(Product.is_active == True)

    if category:
        q = q.filter(Product.category == category)

    if search:
        like = f"%{search}%"
        q = q.filter(or_(Product.name.ilike(like), Product.brand.ilike(like)))

    return q.order_by(Product.name.asc()).all()


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Optional[Product]:
    product = get_product(db, product_id)
    if not product:
        return None

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def deactivate_product(db: Session, product_id: int) -> Optional[Product]:
    product = get_product(db, product_id)
    if not product:
        return None
    product.is_active = False
    db.commit()
    db.refresh(product)
    return product

def list_categories(db: Session) -> List[str]:
    rows = (
        db.query(distinct(Product.category))
        .filter(Product.is_active == True)
        .all()
    )
    return sorted([r[0] for r in rows if r[0]])

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
    """Return a dict matching ProductRead, with supplier_name + latest_cost filled in."""
    supplier_name = None
    if product.default_wholesaler_id:
        w = (
            db.query(Wholesaler)
            .filter(Wholesaler.id == product.default_wholesaler_id)
            .first()
        )
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
    return Decimal(batch.cost_per_piece) if batch else None


def enrich_product(db: Session, product) -> dict:
    """Return a dict matching ProductRead, with supplier_name + latest_cost filled in."""
    supplier_name = None
    if product.default_wholesaler_id:
        w = (
            db.query(Wholesaler)
            .filter(Wholesaler.id == product.default_wholesaler_id)
            .first()
        )
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


from datetime import date as date_type
from app.models.stock_adjustment import StockAdjustment
from fastapi import HTTPException


def adjust_stock(
    db: Session,
    product_id: int,
    quantity_change,
    cost_per_piece,
    reason: str,
    notes: str | None,
    adjusted_at,
):
    product = get_product(db, product_id)
    if not product:
        raise HTTPException(404, "Product not found")

    quantity_change = Decimal(quantity_change)
    adjusted_at = adjusted_at or date_type.today()

    if quantity_change > 0:
        # Cost is required for positive adjustments (so FIFO has a cost)
        if cost_per_piece is None:
            raise HTTPException(400, "cost_per_piece is required for positive adjustments")
        cost_per_piece = Decimal(cost_per_piece)

        # Increase stock
        product.current_stock = (product.current_stock or 0) + quantity_change

        # Create a matching batch so FIFO has something to consume
        from app.models.inventory_batch import InventoryBatch
        batch = InventoryBatch(
            product_id=product_id,
            purchase_item_id=None,
            quantity_initial=quantity_change,
            quantity_remaining=quantity_change,
            cost_per_piece=cost_per_piece,
            purchase_date=adjusted_at,
        )
        db.add(batch)

    else:
        # Negative adjustment: consume from oldest batches first
        from app.services.inventory_service import fifo_consume
        # fifo_consume needs a sale_item_id — since this isn't a sale,
        # we'll do the consumption inline instead.
        from app.models.inventory_batch import InventoryBatch
        remaining = -quantity_change  # positive number to remove
        batches = (
            db.query(InventoryBatch)
            .filter(
                InventoryBatch.product_id == product_id,
                InventoryBatch.quantity_remaining > 0,
            )
            .order_by(InventoryBatch.purchase_date.asc(), InventoryBatch.id.asc())
            .all()
        )
        total_available = sum((b.quantity_remaining for b in batches), Decimal(0))
        if total_available < remaining:
            raise HTTPException(
                400,
                f"Cannot remove {remaining}; only {total_available} in stock.",
            )
        for b in batches:
            if remaining <= 0:
                break
            take = min(b.quantity_remaining, remaining)
            b.quantity_remaining = b.quantity_remaining - take
            remaining -= take

        product.current_stock = (product.current_stock or 0) + quantity_change  # quantity_change is negative

    # Log the adjustment
    adj = StockAdjustment(
        product_id=product_id,
        quantity_change=quantity_change,
        reason=reason,
        cost_per_piece=cost_per_piece if quantity_change > 0 else None,
        notes=notes,
        adjusted_at=adjusted_at,
    )
    db.add(adj)
    db.commit()
    db.refresh(adj)
    return adj