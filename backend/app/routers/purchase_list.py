from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.purchase_list import (
    PurchaseListItemCreate,
    PurchaseListItemUpdate,
    PurchaseListItemRead,
    RecommendationRow,
    PurchaseListBudget,
)
from app.services import purchase_list_service

router = APIRouter(prefix="/api/purchase-list", tags=["purchase-list"])


@router.get("", response_model=List[PurchaseListItemRead])
def list_items(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return purchase_list_service.list_items(db, status)


@router.post("", response_model=PurchaseListItemRead, status_code=201)
def add_item(payload: PurchaseListItemCreate, db: Session = Depends(get_db)):
    return purchase_list_service.add_item(db, payload)


@router.patch("/{item_id}", response_model=PurchaseListItemRead)
def update_item(
    item_id: int, payload: PurchaseListItemUpdate, db: Session = Depends(get_db)
):
    item = purchase_list_service.update_item(db, item_id, payload)
    if not item:
        raise HTTPException(404, "Item not found")
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    ok = purchase_list_service.delete_item(db, item_id)
    if not ok:
        raise HTTPException(404, "Item not found")
    return None


@router.get("/recommendations", response_model=List[RecommendationRow])
def recommendations(db: Session = Depends(get_db)):
    return purchase_list_service.recommendations(db)


@router.get("/budget", response_model=PurchaseListBudget)
def budget(db: Session = Depends(get_db)):
    return purchase_list_service.budget(db)


@router.post("/mark-received")
def mark_received(ids: List[int], db: Session = Depends(get_db)):
    count = purchase_list_service.mark_received(db, ids)
    return {"marked": count}