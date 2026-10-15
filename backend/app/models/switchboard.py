from sqlalchemy import (
    Column, Integer, Numeric, String, Date, DateTime,
    ForeignKey, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Switchboard(Base):
    """An actual physical switchboard that was pre-built by the shop.

    Components are consumed from inventory at build time. If the board is
    dismantled or damaged, they may be partially returned or written off.
    """

    __tablename__ = "switchboards"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False, index=True)
    # Owner-facing name, e.g. "6-module wooden", "Ramesh custom"

    code = Column(String, nullable=True, unique=True, index=True)
    # Auto-generated like "SB-0001". Optional.

    status = Column(String, nullable=False, default="available", index=True)
    # "available" | "sold" | "damaged" | "dismantled"

    material_cost = Column(Numeric(12, 2), nullable=False, default=0)
    listed_price = Column(Numeric(12, 2), nullable=False, default=0)
    actual_sold_price = Column(Numeric(12, 2), nullable=True)

    built_date = Column(Date, nullable=False, server_default=func.current_date())
    sold_date = Column(Date, nullable=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=True, index=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    components = relationship(
        "SwitchboardComponent",
        back_populates="switchboard",
        cascade="all, delete-orphan",
    )


class SwitchboardComponent(Base):
    """A component used on a switchboard — snapshot of qty and cost at build."""

    __tablename__ = "switchboard_components"

    id = Column(Integer, primary_key=True, index=True)
    switchboard_id = Column(
        Integer, ForeignKey("switchboards.id"), nullable=False, index=True
    )
    product_id = Column(
        Integer, ForeignKey("products.id"), nullable=False, index=True
    )

    quantity = Column(Numeric(12, 2), nullable=False)
    cost_per_piece = Column(Numeric(12, 2), nullable=False)
    line_cost = Column(Numeric(12, 2), nullable=False)

    switchboard = relationship("Switchboard", back_populates="components")
    product = relationship("Product")