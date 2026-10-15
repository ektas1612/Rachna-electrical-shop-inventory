from sqlalchemy import Column, Integer, Numeric, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WholesalerPayment(Base):
    __tablename__ = "wholesaler_payments"

    id = Column(Integer, primary_key=True, index=True)
    wholesaler_id = Column(Integer, ForeignKey("wholesalers.id"), nullable=False, index=True)

    amount = Column(Numeric(12, 2), nullable=False)  # positive = we paid them
    payment_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    payment_mode = Column(String, nullable=False, default="cash")  # "cash" / "upi"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wholesaler = relationship("Wholesaler")