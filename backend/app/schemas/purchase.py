from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ---------- Line items ----------

class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity_bought: Decimal = Field(..., gt=0)
    unit_used: str = Field(..., pattern="^(piece|box|meter)$")
    unit_price: Decimal = Field(..., ge=0)   # per piece


class PurchaseItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: Optional[str] = None    # we'll fill this in the service
    quantity_bought: Decimal
    unit_used: str
    quantity_in_pieces: Decimal
    unit_price: Decimal
    line_total: Decimal


# ---------- Purchase ----------

class PurchaseCreate(BaseModel):
    wholesaler_id: int
    receipt_number: Optional[str] = None
    purchase_date: date

    amount_paid: Decimal = Field(Decimal("0"), ge=0)
    payment_mode: str = Field("cash", pattern="^(cash|upi|mixed)$")
    cash_paid: Decimal = Field(Decimal("0"), ge=0)
    upi_paid: Decimal = Field(Decimal("0"), ge=0)

    notes: Optional[str] = None
    items: List[PurchaseItemCreate] = Field(..., min_length=1)


class PurchaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wholesaler_id: int
    wholesaler_name: Optional[str] = None
    receipt_number: Optional[str]
    purchase_date: date
    total_amount: Decimal
    amount_paid: Decimal
    payment_mode: str
    cash_paid: Decimal
    upi_paid: Decimal
    notes: Optional[str]
    created_at: datetime
    items: List[PurchaseItemRead] = []


# ---------- Standalone payments ----------

class WholesalerPaymentCreate(BaseModel):
    wholesaler_id: int
    amount: Decimal = Field(..., gt=0)
    payment_date: Optional[date] = None
    payment_mode: str = Field("cash", pattern="^(cash|upi)$")
    notes: Optional[str] = None


class WholesalerPaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wholesaler_id: int
    amount: Decimal
    payment_date: datetime
    payment_mode: str
    notes: Optional[str]
    created_at: datetime


# ---------- Ledger / balance ----------

class WholesalerBalanceRead(BaseModel):
    wholesaler_id: int
    wholesaler_name: str
    total_purchased: Decimal
    total_paid: Decimal
    balance: Decimal   # positive → we owe them (red), negative → advance (green)
    opening_balance: Decimal = 0