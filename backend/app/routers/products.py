from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.product import ProductCreate, ProductUpdate, ProductRead
from app.services import product_service

router = APIRouter(prefix="/api/products", tags=["products"])


@router.post("", response_model=ProductRead, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    return product_service.create_product(db, payload)


@router.get("", response_model=List[ProductRead])
def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    return product_service.list_products(db, search, category, include_inactive)

@router.get("/meta/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    return product_service.list_categories(db)

@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = product_service.update_product(db, product_id, payload)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.delete("/{product_id}", response_model=ProductRead)
def deactivate_product(product_id: int, db: Session = Depends(get_db)):
    product = product_service.deactivate_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product