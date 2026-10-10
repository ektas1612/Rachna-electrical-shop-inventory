from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    # Basic info
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)   # e.g. "Switch", "Socket", "Wire"
    brand = Column(String, nullable=True)                    # e.g. "Anchor", "Havells"

    # Units
    unit = Column(String, nullable=False, default="piece")   # "piece", "meter", "box"
    pieces_per_box = Column(Integer, nullable=False, default=1)  # 1 if not box-packed

    # Pricing
    selling_price = Column(Numeric(10, 2), nullable=False, default=0)  # price per PIECE

    # Stock — stored in PIECES
    current_stock = Column(Numeric(10, 2), nullable=False, default=0)

    # Low/mid/high thresholds (user customizable)
    low_stock_threshold = Column(Numeric(10, 2), nullable=False, default=10)
    mid_stock_threshold = Column(Numeric(10, 2), nullable=False, default=30)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())