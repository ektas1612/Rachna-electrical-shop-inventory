from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    category: str = Field(..., min_length=1, max_length=60)
    brand: Optional[str] = Field(None, max_length=60)

    unit: str = Field("piece", pattern="^(piece|meter|box)$")
    pieces_per_box: int = Field(1, ge=1)

    selling_price: Decimal = Field(..., ge=0)
    low_stock_threshold: Decimal = Field(10, ge=0)
    mid_stock_threshold: Decimal = Field(30, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    category: Optional[str] = Field(None, min_length=1, max_length=60)
    brand: Optional[str] = Field(None, max_length=60)
    unit: Optional[str] = Field(None, pattern="^(piece|meter|box)$")
    pieces_per_box: Optional[int] = Field(None, ge=1)
    selling_price: Optional[Decimal] = Field(None, ge=0)
    low_stock_threshold: Optional[Decimal] = Field(None, ge=0)
    mid_stock_threshold: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    current_stock: Decimal
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None