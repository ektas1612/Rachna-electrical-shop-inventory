from sqlalchemy import (
    Column, Integer, Numeric, String, Text, Date, DateTime,
    ForeignKey, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WholesalerReturn(Base):
    __tablename__ = "wholesaler_returns"

    id = Column(Integer, primary_key=True, index=True)
    wholesaler_id = Column(
        Integer, ForeignKey("wholesalers.id"), nullable=False, index=True
    )
    return_date = Column(Date, nullable=False, server_default=func.current_date())
    reference = Column(String, nullable=True)   # optional note/ref # from wholesaler
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wholesaler = relationship("Wholesaler")
    items = relationship(
        "WholesalerReturnItem",
        back_populates="wholesaler_return",
        cascade="all, delete-orphan",
    )


class WholesalerReturnItem(Base):
    __tablename__ = "wholesaler_return_items"

    id = Column(Integer, primary_key=True, index=True)
    return_id = Column(
        Integer, ForeignKey("wholesaler_returns.id"), nullable=False, index=True
    )
    product_id = Column(
        Integer, ForeignKey("products.id"), nullable=False, index=True
    )

    quantity = Column(Numeric(12, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    wholesaler_return = relationship(
        "WholesalerReturn", back_populates="items"
    )
    product = relationship("Product")