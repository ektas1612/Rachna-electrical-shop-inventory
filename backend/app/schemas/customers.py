from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    phone: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime
    outstanding: Optional[Decimal] = None


class CreditPaymentCreate(BaseModel):
    customer_id: int
    amount: Decimal = Field(..., gt=0)
    payment_date: Optional[date] = None
    payment_mode: str = Field("cash", pattern="^(cash|upi)$")
    notes: Optional[str] = None


class CreditPaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    amount: Decimal
    payment_date: date
    payment_mode: str
    notes: Optional[str]
    created_at: datetime


class LedgerEntry(BaseModel):
    date: date
    description: str
    debit: Decimal
    credit: Decimal
    running_balance: Decimal
    kind: str
    ref_id: int