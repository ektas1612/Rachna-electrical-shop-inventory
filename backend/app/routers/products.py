from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.products import ProductCreate, ProductUpdate, ProductRead
from app.services import product_service
from app.services.product_service import (
    enrich_product, 
    get_product_batches
)
from app.schemas.products import (
    ProductCreate,
    ProductUpdate,
    ProductRead,
    InventoryBatchRead,
    StockAdjustmentCreate
)

router = APIRouter(prefix="/api/products", tags=["products"])


@router.post("", response_model=ProductRead, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    product = product_service.create_product(db, payload)
    return enrich_product(db, product)

@router.get("", response_model=List[ProductRead])
def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    products = product_service.list_products(db, search, category, include_inactive)
    return [enrich_product(db, p) for p in products]

@router.get("/meta/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    return product_service.list_categories(db)

@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return enrich_product(db, product)

@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)
):
    product = product_service.update_product(db, product_id, payload)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return enrich_product(db, product)


@router.delete("/{product_id}", response_model=ProductRead)
def deactivate_product(product_id: int, db: Session = Depends(get_db)):
    product = product_service.deactivate_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/meta/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    return product_service.list_categories(db)


@router.get("/{product_id}/batches", response_model=List[InventoryBatchRead])
def get_batches(product_id: int, db: Session = Depends(get_db)):
    return get_product_batches(db, product_id)

@router.post("/{product_id}/adjust-stock")
def adjust_stock(
    product_id: int,
    payload: StockAdjustmentCreate,
    db: Session = Depends(get_db),
):
    return product_service.adjust_stock(
        db,
        product_id,
        payload.quantity_change,
        payload.cost_per_piece,
        payload.reason,
        payload.notes,
        payload.adjusted_at,
    )