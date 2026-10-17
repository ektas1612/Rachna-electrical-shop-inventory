from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

from app.models.purchase_list import PurchaseListItem
from app.models.products import Product
from app.models.wholesalers import Wholesaler
from app.models.inventory_batch import InventoryBatch
from app.schemas.purchase_list import (
    PurchaseListItemCreate,
    PurchaseListItemUpdate,
    RecommendationRow,
    PurchaseListBudget,
    BudgetByWholesaler,
)


def _latest_price(db: Session, product_id: int) -> Optional[Decimal]:
    """Last purchase price for the product.

    Priority:
    1. Latest remaining batch cost (fast, accurate)
    2. Latest purchase_item unit_price (works even when stock is consumed)
    """
    from app.models.purchase import PurchaseItem

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
    if batch:
        return Decimal(batch.cost_per_piece)

    last_item = (
        db.query(PurchaseItem)
        .filter(PurchaseItem.product_id == product_id)
        .order_by(PurchaseItem.id.desc())
        .first()
    )
    return Decimal(last_item.unit_price) if last_item else None


def _to_read(db: Session, item: PurchaseListItem) -> dict:
    return {
        "id": item.id,
        "product_id": item.product_id,
        "product_name": item.product.name if item.product else None,
        "product_category": item.product.category if item.product else None,
        "wholesaler_id": item.wholesaler_id,
        "wholesaler_name": item.wholesaler.name if item.wholesaler else None,
        "quantity": item.quantity,
        "notes": item.notes,
        "status": item.status,
        "last_price": item.last_price,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


# ---------- CRUD ----------

def list_items(
    db: Session,
    status: Optional[str] = None,
) -> List[dict]:
    q = db.query(PurchaseListItem).options(
        joinedload(PurchaseListItem.product),
        joinedload(PurchaseListItem.wholesaler),
    )
    if status:
        q = q.filter(PurchaseListItem.status == status)
    items = q.order_by(
        PurchaseListItem.status.asc(),
        PurchaseListItem.created_at.desc(),
    ).all()
    return [_to_read(db, i) for i in items]


def add_item(db: Session, data: PurchaseListItemCreate) -> dict:
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    # Use provided wholesaler, or fall back to product's default
    wholesaler_id = data.wholesaler_id or product.default_wholesaler_id
    if wholesaler_id:
        w = db.query(Wholesaler).filter(Wholesaler.id == wholesaler_id).first()
        if not w:
            raise HTTPException(404, "Wholesaler not found")

    price = _latest_price(db, data.product_id)

    item = PurchaseListItem(
        product_id=data.product_id,
        wholesaler_id=wholesaler_id,
        quantity=data.quantity,
        notes=data.notes,
        status="planned",
        last_price=price,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_read(db, item)


def update_item(
    db: Session, item_id: int, data: PurchaseListItemUpdate
) -> Optional[dict]:
    item = db.query(PurchaseListItem).filter(PurchaseListItem.id == item_id).first()
    if not item:
        return None
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _to_read(db, item)


def delete_item(db: Session, item_id: int) -> bool:
    item = db.query(PurchaseListItem).filter(PurchaseListItem.id == item_id).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def mark_received(db: Session, item_ids: List[int]) -> int:
    if not item_ids:
        return 0
    updated = (
        db.query(PurchaseListItem)
        .filter(PurchaseListItem.id.in_(item_ids))
        .update(
            {PurchaseListItem.status: "received"},
            synchronize_session=False,
        )
    )
    db.commit()
    return updated


# ---------- Recommendations ----------

def recommendations(db: Session) -> List[RecommendationRow]:
    """Low-stock products with suggested order quantity."""
    products = (
        db.query(Product)
        .filter(Product.is_active == True)
        .all()
    )

    # Set of product_ids already on the planned list
    existing_ids = {
        row[0]
        for row in db.query(PurchaseListItem.product_id)
        .filter(PurchaseListItem.status == "planned")
        .all()
    }

    out: List[RecommendationRow] = []
    for p in products:
        stock = Decimal(p.current_stock or 0)
        low = Decimal(p.low_stock_threshold or 0)
        mid = Decimal(p.mid_stock_threshold or 0)
        if stock > low:
            continue

        suggested = mid - stock
        if suggested <= 0:
            suggested = Decimal(10)  # fallback if mid threshold is too low

        out.append(
            RecommendationRow(
                product_id=p.id,
                product_name=p.name,
                product_category=p.category,
                current_stock=stock,
                low_threshold=low,
                mid_threshold=mid,
                suggested_qty=suggested,
                last_price=_latest_price(db, p.id),
                already_on_list=p.id in existing_ids,
            )
        )

    # Sort by how severely low (stock / low ascending)
    out.sort(key=lambda r: (
        float(r.current_stock) / float(r.low_threshold) if r.low_threshold else 0
    ))
    return out


# ---------- Budget ----------

def budget(db: Session) -> PurchaseListBudget:
    items = (
        db.query(PurchaseListItem)
        .options(joinedload(PurchaseListItem.wholesaler))
        .filter(PurchaseListItem.status == "planned")
        .all()
    )

    total = Decimal(0)
    grouped: dict[Optional[int], dict] = {}

    for it in items:
        price = Decimal(it.last_price or 0)
        line_total = Decimal(it.quantity or 0) * price
        total += line_total

        key = it.wholesaler_id
        if key not in grouped:
            grouped[key] = {
                "wholesaler_id": key,
                "wholesaler_name": it.wholesaler.name if it.wholesaler else "Unassigned",
                "item_count": 0,
                "total": Decimal(0),
            }
        grouped[key]["item_count"] += 1
        grouped[key]["total"] += line_total

    by_wholesaler = [
        BudgetByWholesaler(**v) for v in grouped.values()
    ]
    by_wholesaler.sort(key=lambda b: (b.wholesaler_id is None, -(b.total or 0)))

    return PurchaseListBudget(
        total=total,
        item_count=len(items),
        by_wholesaler=by_wholesaler,
    )