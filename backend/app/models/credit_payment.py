from sqlalchemy import Column, Integer, Numeric, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CreditPayment(Base):
    __tablename__ = "credit_payments"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)

    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date, nullable=False, server_default=func.current_date())
    payment_mode = Column(String, nullable=False, default="cash")  # cash / upi
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer")