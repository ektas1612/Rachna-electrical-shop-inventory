from datetime import date
from decimal import Decimal
from typing import List
from pydantic import BaseModel


class PeriodStats(BaseModel):
    sales: Decimal
    cash_collected: Decimal
    upi_collected: Decimal
    profit: Decimal
    sales_count: int


class AllTimeStats(BaseModel):
    total_purchases: Decimal
    total_sales: Decimal
    gross_profit: Decimal
    owed_to_us: Decimal
    we_owe: Decimal


class TrendRow(BaseModel):
    date: date
    sales: Decimal
    profit: Decimal


class DashboardRead(BaseModel):
    today: PeriodStats
    month: PeriodStats
    all_time: AllTimeStats
    trend: List[TrendRow]