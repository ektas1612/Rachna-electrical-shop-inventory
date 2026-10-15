from sqlalchemy import (
    Column, Integer, Numeric, Date, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class InventoryBatch(Base):
    __tablename__ = "inventory_batches"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    purchase_item_id = Column(Integer, ForeignKey("purchase_items.id"), nullable=True, index=True)

    quantity_initial = Column(Numeric(12, 2), nullable=False)
    quantity_remaining = Column(Numeric(12, 2), nullable=False)
    cost_per_piece = Column(Numeric(12, 2), nullable=False)

    purchase_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")
    purchase_item = relationship("PurchaseItem")