from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.switchboards import (
    SwitchboardCreate,
    SwitchboardRead,
    SellSwitchboardCreate,
    DamageSwitchboardCreate,
    DismantleSwitchboardCreate,
    SwitchboardStats,
    SwitchboardNameSuggestion,
)
from app.services import switchboard_service

router = APIRouter(prefix="/api/switchboards", tags=["switchboards"])


@router.post("", response_model=SwitchboardRead, status_code=201)
def build(payload: SwitchboardCreate, db: Session = Depends(get_db)):
    board = switchboard_service.build_switchboard(db, payload)
    return _to_read(board)


@router.get("", response_model=List[SwitchboardRead])
def list_boards(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return [_to_read(b) for b in switchboard_service.list_switchboards(db, status)]


@router.get("/stats", response_model=SwitchboardStats)
def stats(db: Session = Depends(get_db)):
    return switchboard_service.get_stats(db)


@router.get("/name-suggestions", response_model=List[SwitchboardNameSuggestion])
def name_suggestions(db: Session = Depends(get_db)):
    return switchboard_service.name_suggestions(db)


@router.get("/{board_id}", response_model=SwitchboardRead)
def get_one(board_id: int, db: Session = Depends(get_db)):
    board = switchboard_service.get_switchboard(db, board_id)
    if not board:
        raise HTTPException(404, "Switchboard not found")
    return _to_read(board)


@router.post("/sell", response_model=SwitchboardRead)
def sell(payload: SellSwitchboardCreate, db: Session = Depends(get_db)):
    board = switchboard_service.sell_switchboard(db, payload)
    return _to_read(board)


@router.post("/damage", response_model=SwitchboardRead)
def damage(payload: DamageSwitchboardCreate, db: Session = Depends(get_db)):
    board = switchboard_service.damage_switchboard(db, payload)
    return _to_read(board)


@router.post("/dismantle", response_model=SwitchboardRead)
def dismantle(payload: DismantleSwitchboardCreate, db: Session = Depends(get_db)):
    board = switchboard_service.dismantle_switchboard(db, payload)
    return _to_read(board)


def _to_read(board) -> SwitchboardRead:
    data = SwitchboardRead.model_validate(board)
    for c_read, c_orm in zip(data.components, board.components):
        c_read.product_name = c_orm.product.name if c_orm.product else None
    return data