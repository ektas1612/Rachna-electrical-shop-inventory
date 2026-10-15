from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class SwitchboardComponentCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(..., gt=0)


class SwitchboardComponentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: Decimal
    cost_per_piece: Decimal
    line_cost: Decimal


class SwitchboardCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    listed_price: Decimal = Field(..., ge=0)
    built_date: Optional[date] = None
    code_prefix: Optional[str] = None       # e.g. "SB" — auto-numbered
    notes: Optional[str] = None
    components: List[SwitchboardComponentCreate] = Field(..., min_length=1)


class SwitchboardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: Optional[str] = None
    status: str
    material_cost: Decimal
    listed_price: Decimal
    actual_sold_price: Optional[Decimal] = None
    built_date: date
    sold_date: Optional[date] = None
    sale_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    components: List[SwitchboardComponentRead] = []


class SellSwitchboardCreate(BaseModel):
    board_id: int
    actual_price: Decimal = Field(..., ge=0)
    sale_date: Optional[date] = None
    cash_paid: Decimal = Field(Decimal("0"), ge=0)
    upi_paid: Decimal = Field(Decimal("0"), ge=0)
    customer_id: Optional[int] = None
    notes: Optional[str] = None


class DamageSwitchboardCreate(BaseModel):
    board_id: int
    notes: Optional[str] = None


class DismantleSwitchboardCreate(BaseModel):
    board_id: int
    notes: Optional[str] = None


class StuckComponent(BaseModel):
    product_id: int
    product_name: str
    quantity_locked: Decimal


class SwitchboardStats(BaseModel):
    total_built: int
    total_available: int
    total_sold: int
    total_damaged: int
    total_dismantled: int
    stuck_components: List[StuckComponent]


class SwitchboardNameSuggestion(BaseModel):
    """Existing board names — used to autocomplete the form."""
    name: str
    times_built: int