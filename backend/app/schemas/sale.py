from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(..., gt=0)
    actual_price: Decimal = Field(..., ge=0)   # after bargaining
    # listed_price is NOT sent — backend snapshots it from the product


class SaleItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: Decimal
    listed_price: Decimal
    actual_price: Decimal
    line_total: Decimal


class SaleCreate(BaseModel):
    sale_date: date
    cash_paid: Decimal = Field(Decimal("0"), ge=0)
    upi_paid: Decimal = Field(Decimal("0"), ge=0)
    customer_id: Optional[int] = None
    notes: Optional[str] = None
    items: List[SaleItemCreate] = Field(..., min_length=1)


class SaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sale_date: date
    subtotal: Decimal
    total_amount: Decimal
    payment_mode: str
    cash_paid: Decimal
    upi_paid: Decimal
    amount_paid: Decimal
    amount_due: Decimal
    payment_status: str
    customer_id: Optional[int]
    customer_name: Optional[str] = None
    notes: Optional[str]
    created_at: datetime
    items: List[SaleItemRead] = []