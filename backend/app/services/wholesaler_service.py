from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.models.wholesalers import Wholesaler
from app.schemas.wholesalers import WholesalerCreate, WholesalerUpdate


class DuplicateWholesalerError(Exception):
    """Raised when a wholesaler name already exists."""


def create_wholesaler(db: Session, data: WholesalerCreate) -> Wholesaler:
    wholesaler = Wholesaler(**data.model_dump())
    db.add(wholesaler)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise DuplicateWholesalerError(f"Wholesaler '{data.name}' already exists")
    db.refresh(wholesaler)
    return wholesaler


def get_wholesaler(db: Session, wholesaler_id: int) -> Optional[Wholesaler]:
    return db.query(Wholesaler).filter(Wholesaler.id == wholesaler_id).first()


def list_wholesalers(
    db: Session,
    search: Optional[str] = None,
    include_inactive: bool = False,
) -> List[Wholesaler]:
    q = db.query(Wholesaler)
    if not include_inactive:
        q = q.filter(Wholesaler.is_active == True)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Wholesaler.name.ilike(like), Wholesaler.phone.ilike(like)))
    return q.order_by(Wholesaler.name.asc()).all()


def update_wholesaler(
    db: Session, wholesaler_id: int, data: WholesalerUpdate
) -> Optional[Wholesaler]:
    wholesaler = get_wholesaler(db, wholesaler_id)
    if not wholesaler:
        return None

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(wholesaler, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise DuplicateWholesalerError(f"Wholesaler name already exists")
    db.refresh(wholesaler)
    return wholesaler


def deactivate_wholesaler(db: Session, wholesaler_id: int) -> Optional[Wholesaler]:
    wholesaler = get_wholesaler(db, wholesaler_id)
    if not wholesaler:
        return None
    wholesaler.is_active = False
    db.commit()
    db.refresh(wholesaler)
    return wholesaler