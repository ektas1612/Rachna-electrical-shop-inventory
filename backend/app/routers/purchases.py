from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseRead,
    WholesalerPaymentCreate,
    WholesalerPaymentRead,
    WholesalerBalanceRead,
)
from app.services import purchase_service

router = APIRouter(prefix="/api", tags=["purchases"])


@router.post("/purchases", response_model=PurchaseRead, status_code=201)
def create_purchase(payload: PurchaseCreate, db: Session = Depends(get_db)):
    purchase = purchase_service.create_purchase(db, payload)
    # Enrich with names for the response
    return _to_read(purchase)


@router.get("/purchases", response_model=List[PurchaseRead])
def list_purchases(
    wholesaler_id: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    purchases = purchase_service.list_purchases(db, wholesaler_id, date_from, date_to, limit)
    return [_to_read(p) for p in purchases]


@router.get("/purchases/{purchase_id}", response_model=PurchaseRead)
def get_purchase(purchase_id: int, db: Session = Depends(get_db)):
    purchase = purchase_service.get_purchase(db, purchase_id)
    if not purchase:
        raise HTTPException(404, "Purchase not found")
    return _to_read(purchase)


@router.post("/wholesaler-payments", response_model=WholesalerPaymentRead, status_code=201)
def create_payment(payload: WholesalerPaymentCreate, db: Session = Depends(get_db)):
    return purchase_service.create_payment(db, payload)


@router.get("/wholesaler-payments", response_model=List[WholesalerPaymentRead])
def list_payments(
    wholesaler_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return purchase_service.list_payments(db, wholesaler_id)


@router.get("/wholesaler-balances", response_model=List[WholesalerBalanceRead])
def wholesaler_balances(db: Session = Depends(get_db)):
    return purchase_service.compute_balances(db)


def _to_read(purchase) -> PurchaseRead:
    """Flatten the nested ORM into the response schema, filling names."""
    data = PurchaseRead.model_validate(purchase)
    data.wholesaler_name = purchase.wholesaler.name if purchase.wholesaler else None
    for item_read, item_orm in zip(data.items, purchase.items):
        item_read.product_name = item_orm.product.name if item_orm.product else None
    return data