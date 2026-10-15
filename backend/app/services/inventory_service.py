from decimal import Decimal
from typing import List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.inventory_batch import InventoryBatch
from app.models.sale_item_batch import SaleItemBatch


def fifo_consume(
    db: Session,
    product_id: int,
    quantity: Decimal,
    sale_item_id: int,
) -> Decimal:
    """
    Consume `quantity` pieces from oldest batches first.
    Creates SaleItemBatch rows for each batch touched.
    Returns total cost of goods for this line.
    Raises 400 if not enough total stock across batches.
    """
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
    if total_available < quantity:
        raise HTTPException(
            400,
            f"Not enough stock (batch-level): requested {quantity}, available {total_available}.",
        )

    remaining = quantity
    total_cost = Decimal(0)

    for b in batches:
        if remaining <= 0:
            break
        take = min(b.quantity_remaining, remaining)
        b.quantity_remaining = b.quantity_remaining - take

        db.add(
            SaleItemBatch(
                sale_item_id=sale_item_id,
                batch_id=b.id,
                quantity_consumed=take,
                cost_per_piece=b.cost_per_piece,
            )
        )

        total_cost += take * Decimal(b.cost_per_piece)
        remaining -= take

    return total_cost


def newest_first_consume(
    db: Session,
    product_id: int,
    quantity: Decimal,
) -> Decimal:
    """
    For wholesaler returns: consume from newest batches first.
    Returns total cost of the returned goods (for accounts if needed).
    """
    batches = (
        db.query(InventoryBatch)
        .filter(
            InventoryBatch.product_id == product_id,
            InventoryBatch.quantity_remaining > 0,
        )
        .order_by(InventoryBatch.purchase_date.desc(), InventoryBatch.id.desc())
        .all()
    )

    total_available = sum((b.quantity_remaining for b in batches), Decimal(0))
    if total_available < quantity:
        raise HTTPException(
            400,
            f"Cannot return {quantity}; only {total_available} in stock.",
        )

    remaining = quantity
    total_cost = Decimal(0)
    for b in batches:
        if remaining <= 0:
            break
        take = min(b.quantity_remaining, remaining)
        b.quantity_remaining = b.quantity_remaining - take
        total_cost += take * Decimal(b.cost_per_piece)
        remaining -= take

    return total_cost


def cost_of_goods_for_period(
    db: Session,
    date_from=None,
    date_to=None,
) -> Decimal:
    """
    Total COGS for sales in a date range. Joins sale_item_batches up to sales.
    """
    from app.models.sale import Sale, SaleItem

    q = (
        db.query(SaleItemBatch)
        .join(SaleItem, SaleItemBatch.sale_item_id == SaleItem.id)
        .join(Sale, SaleItem.sale_id == Sale.id)
    )
    if date_from:
        q = q.filter(Sale.sale_date >= date_from)
    if date_to:
        q = q.filter(Sale.sale_date <= date_to)

    total = Decimal(0)
    for row in q.all():
        total += Decimal(row.quantity_consumed) * Decimal(row.cost_per_piece)
    return total