from sqlalchemy import (
    Column, Integer, Numeric, String, Text, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PurchaseListItem(Base):
    __tablename__ = "purchase_list_items"

    id = Column(Integer, primary_key=True, index=True)

    product_id = Column(
        Integer, ForeignKey("products.id"), nullable=False, index=True
    )
    wholesaler_id = Column(
        Integer, ForeignKey("wholesalers.id"), nullable=True, index=True
    )

    quantity = Column(Numeric(12, 2), nullable=False, default=1)
    notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="planned", index=True)
    # "planned" | "received"

    # Price snapshot at add-time so budget stays stable
    last_price = Column(Numeric(12, 2), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    product = relationship("Product")
    wholesaler = relationship("Wholesaler")