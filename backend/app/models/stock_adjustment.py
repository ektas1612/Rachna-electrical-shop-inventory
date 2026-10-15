from sqlalchemy import Column, Integer, Numeric, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity_change = Column(Numeric(12, 2), nullable=False)
    reason = Column(String, nullable=False, default="opening")
    cost_per_piece = Column(Numeric(12, 2), nullable=True)
    notes = Column(Text, nullable=True)
    adjusted_at = Column(Date, nullable=False, server_default=func.current_date())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")