from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.wholesaler_return import ReturnCreate, ReturnRead
from app.services import wholesaler_return_service

router = APIRouter(prefix="/api/wholesaler-returns", tags=["wholesaler-returns"])


@router.post("", response_model=ReturnRead, status_code=201)
def create_return(payload: ReturnCreate, db: Session = Depends(get_db)):
    wh_return = wholesaler_return_service.create_return(db, payload)
    return _to_read(wh_return)


@router.get("", response_model=List[ReturnRead])
def list_returns(
    wholesaler_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    returns = wholesaler_return_service.list_returns(db, wholesaler_id)
    return [_to_read(r) for r in returns]


@router.get("/{return_id}", response_model=ReturnRead)
def get_return(return_id: int, db: Session = Depends(get_db)):
    wh_return = wholesaler_return_service.get_return(db, return_id)
    if not wh_return:
        raise HTTPException(404, "Return not found")
    return _to_read(wh_return)


def _to_read(r) -> ReturnRead:
    data = ReturnRead.model_validate(r)
    data.wholesaler_name = r.wholesaler.name if r.wholesaler else None
    for i_read, i_orm in zip(data.items, r.items):
        i_read.product_name = i_orm.product.name if i_orm.product else None
    return data