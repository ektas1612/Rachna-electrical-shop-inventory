from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.report import DashboardRead
from app.services import report_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/dashboard", response_model=DashboardRead)
def dashboard(
    trend_days: int = Query(14, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return report_service.get_dashboard(db, trend_days)