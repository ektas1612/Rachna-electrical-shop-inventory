from sqlalchemy import (
    Column, Integer, Numeric, String, Text, DateTime,
    ForeignKey, Date
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    wholesaler_id = Column(Integer, ForeignKey("wholesalers.id"), nullable=False, index=True)

    receipt_number = Column(String, nullable=True, index=True)
    purchase_date = Column(Date, nullable=False, server_default=func.current_date())

    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    amount_paid = Column(Numeric(12, 2), nullable=False, default=0)
    payment_mode = Column(String, nullable=False, default="cash")   # "cash" / "upi" / "mixed"
    cash_paid = Column(Numeric(12, 2), nullable=False, default=0)
    upi_paid = Column(Numeric(12, 2), nullable=False, default=0)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wholesaler = relationship("Wholesaler")
    items = relationship(
        "PurchaseItem",
        back_populates="purchase",
        cascade="all, delete-orphan",
    )


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)

    quantity_bought = Column(Numeric(12, 2), nullable=False)     # as entered
    unit_used = Column(String, nullable=False)                    # "piece" / "box" / "meter"
    quantity_in_pieces = Column(Numeric(12, 2), nullable=False)  # always pieces
    unit_price = Column(Numeric(12, 2), nullable=False)          # per PIECE
    line_total = Column(Numeric(12, 2), nullable=False)

    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product")