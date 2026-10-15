from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.wholesalers import (
    WholesalerCreate,
    WholesalerUpdate,
    WholesalerRead,
)
from app.services import wholesaler_service
from app.services.wholesaler_service import DuplicateWholesalerError

router = APIRouter(prefix="/api/wholesalers", tags=["wholesalers"])


@router.post("", response_model=WholesalerRead, status_code=201)
def create_wholesaler(payload: WholesalerCreate, db: Session = Depends(get_db)):
    try:
        return wholesaler_service.create_wholesaler(db, payload)
    except DuplicateWholesalerError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[WholesalerRead])
def list_wholesalers(
    search: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    return wholesaler_service.list_wholesalers(db, search, include_inactive)


@router.get("/{wholesaler_id}", response_model=WholesalerRead)
def get_wholesaler(wholesaler_id: int, db: Session = Depends(get_db)):
    w = wholesaler_service.get_wholesaler(db, wholesaler_id)
    if not w:
        raise HTTPException(status_code=404, detail="Wholesaler not found")
    return w


@router.patch("/{wholesaler_id}", response_model=WholesalerRead)
def update_wholesaler(
    wholesaler_id: int, payload: WholesalerUpdate, db: Session = Depends(get_db)
):
    try:
        w = wholesaler_service.update_wholesaler(db, wholesaler_id, payload)
    except DuplicateWholesalerError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not w:
        raise HTTPException(status_code=404, detail="Wholesaler not found")
    return w


@router.delete("/{wholesaler_id}", response_model=WholesalerRead)
def deactivate_wholesaler(wholesaler_id: int, db: Session = Depends(get_db)):
    w = wholesaler_service.deactivate_wholesaler(db, wholesaler_id)
    if not w:
        raise HTTPException(status_code=404, detail="Wholesaler not found")
    return w