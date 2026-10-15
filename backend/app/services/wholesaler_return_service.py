from decimal import Decimal
from typing import Optional, List
from datetime import date as date_type
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

from app.models.wholesaler_return import WholesalerReturn, WholesalerReturnItem
from app.models.products import Product
from app.models.inventory_batch import InventoryBatch
from app.models.wholesalers import Wholesaler
from app.schemas.wholesaler_return import ReturnCreate



def create_return(db: Session, data: ReturnCreate) -> WholesalerReturn:
    ret_date = data.return_date or date_type.today()

    wholesaler = db.query(Wholesaler).filter(Wholesaler.id == data.wholesaler_id).first()
    if not wholesaler:
        raise HTTPException(404, "Wholesaler not found")

    product_ids = [i.product_id for i in data.items]
    products = {
        p.id: p for p in db.query(Product).filter(Product.id.in_(product_ids)).all()
    }
    for i in data.items:
        if i.product_id not in products:
            raise HTTPException(404, f"Product {i.product_id} not found")
        p = products[i.product_id]
        if Decimal(p.current_stock) < Decimal(i.quantity):
            raise HTTPException(
                400,
                f"Not enough stock of '{p.name}'. Available: {p.current_stock}, "
                f"return requested: {i.quantity}.",
            )

    wh_return = WholesalerReturn(
        wholesaler_id=data.wholesaler_id,
        return_date=ret_date,
        reference=data.reference,
        notes=data.notes,
        total_amount=Decimal("0"),
    )
    db.add(wh_return)
    db.flush()

    total = Decimal("0")

    for i in data.items:
        product = products[i.product_id]
        qty = Decimal(i.quantity)
        price = Decimal(i.unit_price)
        line_total = qty * price

        wh_return.items.append(
            WholesalerReturnItem(
                product_id=i.product_id,
                quantity=qty,
                unit_price=price,
                line_total=line_total,
            )
        )

        # Reduce stock. Newest batches first — that's how returns typically work.
        batches = (
            db.query(InventoryBatch)
            .filter(
                InventoryBatch.product_id == i.product_id,
                InventoryBatch.quantity_remaining > 0,
            )
            .order_by(
                InventoryBatch.purchase_date.desc(),
                InventoryBatch.id.desc(),
            )
            .all()
        )
        remaining = qty
        for b in batches:
            if remaining <= 0:
                break
            take = min(Decimal(b.quantity_remaining), remaining)
            b.quantity_remaining = Decimal(b.quantity_remaining) - take
            remaining -= take

        product.current_stock = Decimal(product.current_stock) - qty
        total += line_total

    wh_return.total_amount = total

    db.commit()
    db.refresh(wh_return)
    return wh_return


def list_returns(
    db: Session,
    wholesaler_id: Optional[int] = None,
    limit: int = 200,
) -> List[WholesalerReturn]:
    q = db.query(WholesalerReturn).options(
        joinedload(WholesalerReturn.items).joinedload(WholesalerReturnItem.product),
        joinedload(WholesalerReturn.wholesaler),
    )
    if wholesaler_id:
        q = q.filter(WholesalerReturn.wholesaler_id == wholesaler_id)
    return (
        q.order_by(WholesalerReturn.return_date.desc(), WholesalerReturn.id.desc())
        .limit(limit)
        .all()
    )


def get_return(db: Session, return_id: int) -> Optional[WholesalerReturn]:
    return (
        db.query(WholesalerReturn)
        .options(
            joinedload(WholesalerReturn.items).joinedload(WholesalerReturnItem.product),
            joinedload(WholesalerReturn.wholesaler),
        )
        .filter(WholesalerReturn.id == return_id)
        .first()
    )