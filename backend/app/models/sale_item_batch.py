from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SaleItemBatch(Base):
    __tablename__ = "sale_item_batches"

    id = Column(Integer, primary_key=True, index=True)
    sale_item_id = Column(Integer, ForeignKey("sale_items.id"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("inventory_batches.id"), nullable=False, index=True)

    quantity_consumed = Column(Numeric(12, 2), nullable=False)
    cost_per_piece = Column(Numeric(12, 2), nullable=False)

    sale_item = relationship("SaleItem", back_populates="batches")
    batch = relationship("InventoryBatch")