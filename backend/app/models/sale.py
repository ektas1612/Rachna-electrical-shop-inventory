from sqlalchemy import (
    Column, Integer, Numeric, String, Text, Date, DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    sale_date = Column(Date, nullable=False, server_default=func.current_date())

    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)

    payment_mode = Column(String, nullable=False, default="cash")  # cash/upi/mixed/unpaid
    cash_paid = Column(Numeric(12, 2), nullable=False, default=0)
    upi_paid = Column(Numeric(12, 2), nullable=False, default=0)
    amount_paid = Column(Numeric(12, 2), nullable=False, default=0)
    amount_due = Column(Numeric(12, 2), nullable=False, default=0)
    payment_status = Column(String, nullable=False, default="paid")  # paid/partial/unpaid

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship(
        "SaleItem",
        back_populates="sale",
        cascade="all, delete-orphan",
    )
    customer = relationship("Customer")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)

    quantity = Column(Numeric(12, 2), nullable=False)
    listed_price = Column(Numeric(12, 2), nullable=False)
    actual_price = Column(Numeric(12, 2), nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")

    batches = relationship(
        "SaleItemBatch",
        back_populates="sale_item",
        cascade="all, delete-orphan",
    )