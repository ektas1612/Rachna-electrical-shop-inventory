from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ReturnItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)


class ReturnItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal


class ReturnCreate(BaseModel):
    wholesaler_id: int
    return_date: Optional[date] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    items: List[ReturnItemCreate] = Field(..., min_length=1)


class ReturnRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    wholesaler_id: int
    wholesaler_name: Optional[str] = None
    return_date: date
    reference: Optional[str] = None
    total_amount: Decimal
    notes: Optional[str] = None
    created_at: datetime
    items: List[ReturnItemRead] = []