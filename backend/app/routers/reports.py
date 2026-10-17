from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.report import DashboardRead
from app.services import report_service
from fastapi.responses import FileResponse
import os
from datetime import datetime
from app.database import SQLALCHEMY_DATABASE_URL

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/dashboard", response_model=DashboardRead)
def dashboard(
    trend_days: int = Query(14, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return report_service.get_dashboard(db, trend_days)

@router.get("/backup")
def download_backup():
    """Download a snapshot of the SQLite database file."""
    # SQLALCHEMY_DATABASE_URL is like "sqlite:////abs/path/shop.db"
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        # Fallback for relative URLs
        db_path = os.path.abspath(db_path)

    if not os.path.exists(db_path):
        raise HTTPException(404, "Database file not found")

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return FileResponse(
        path=db_path,
        media_type="application/octet-stream",
        filename=f"rachna-shop-backup-{stamp}.db",
    )