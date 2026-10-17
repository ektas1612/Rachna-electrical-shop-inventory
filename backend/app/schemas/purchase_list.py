from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class PurchaseListItemBase(BaseModel):
    product_id: int
    wholesaler_id: Optional[int] = None
    quantity: Decimal = Field(..., gt=0)
    notes: Optional[str] = None


class PurchaseListItemCreate(PurchaseListItemBase):
    pass


class PurchaseListItemUpdate(BaseModel):
    quantity: Optional[Decimal] = Field(None, gt=0)
    wholesaler_id: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(planned|received)$")


class PurchaseListItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: Optional[str] = None
    product_category: Optional[str] = None
    wholesaler_id: Optional[int] = None
    wholesaler_name: Optional[str] = None
    quantity: Decimal
    notes: Optional[str] = None
    status: str
    last_price: Optional[Decimal] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class RecommendationRow(BaseModel):
    product_id: int
    product_name: str
    product_category: Optional[str] = None
    current_stock: Decimal
    low_threshold: Decimal
    mid_threshold: Decimal
    suggested_qty: Decimal
    last_price: Optional[Decimal] = None
    already_on_list: bool = False


class BudgetByWholesaler(BaseModel):
    wholesaler_id: Optional[int]
    wholesaler_name: str
    item_count: int
    total: Decimal


class PurchaseListBudget(BaseModel):
    total: Decimal
    item_count: int
    by_wholesaler: List[BudgetByWholesaler]