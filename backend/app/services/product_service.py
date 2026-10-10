from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy import distinct

from app.models.products import Product
from app.schemas.product import ProductCreate, ProductUpdate


def create_product(db: Session, data: ProductCreate) -> Product:
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_product(db: Session, product_id: int) -> Optional[Product]:
    return db.query(Product).filter(Product.id == product_id).first()


def list_products(
    db: Session,
    search: Optional[str] = None,
    category: Optional[str] = None,
    include_inactive: bool = False,
) -> List[Product]:
    q = db.query(Product)

    if not include_inactive:
        q = q.filter(Product.is_active == True)

    if category:
        q = q.filter(Product.category == category)

    if search:
        like = f"%{search}%"
        q = q.filter(or_(Product.name.ilike(like), Product.brand.ilike(like)))

    return q.order_by(Product.name.asc()).all()


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Optional[Product]:
    product = get_product(db, product_id)
    if not product:
        return None

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def deactivate_product(db: Session, product_id: int) -> Optional[Product]:
    product = get_product(db, product_id)
    if not product:
        return None
    product.is_active = False
    db.commit()
    db.refresh(product)
    return product

def list_categories(db: Session) -> List[str]:
    rows = (
        db.query(distinct(Product.category))
        .filter(Product.is_active == True)
        .all()
    )
    return sorted([r(0) for r in rows if r[0]])