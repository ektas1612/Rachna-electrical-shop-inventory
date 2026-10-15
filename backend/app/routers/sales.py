from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.sale import SaleCreate, SaleRead
from app.services import sale_service

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.post("", response_model=SaleRead, status_code=201)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    sale = sale_service.create_sale(db, payload)
    return _to_read(sale)


@router.get("", response_model=List[SaleRead])
def list_sales(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    payment_status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
):
    sales = sale_service.list_sales(db, date_from, date_to, payment_status, customer_id, limit)
    return [_to_read(s) for s in sales]


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = sale_service.get_sale(db, sale_id)
    if not sale:
        raise HTTPException(404, "Sale not found")
    return _to_read(sale)


def _to_read(sale) -> SaleRead:
    data = SaleRead.model_validate(sale)
    data.customer_name = sale.customer.name if sale.customer else None
    for item_read, item_orm in zip(data.items, sale.items):
        item_read.product_name = item_orm.product.name if item_orm.product else None
    return data