from datetime import date, timedelta
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.sale import Sale, SaleItem
from app.models.purchase import Purchase
from app.models.wholesaler_payment import WholesalerPayment
from app.models.credit_payment import CreditPayment
from app.models.sale_item_batch import SaleItemBatch
from app.models.customers import Customer
from app.models.wholesalers import Wholesaler
from app.schemas.report import (
    PeriodStats, AllTimeStats, TrendRow, DashboardRead,
)


def _period_stats(db: Session, date_from: date, date_to: date) -> PeriodStats:
    # Sales in range
    sales_rows = (
        db.query(Sale)
        .filter(Sale.sale_date >= date_from, Sale.sale_date <= date_to)
        .all()
    )

    total_sales = sum((Decimal(s.total_amount) for s in sales_rows), Decimal(0))
    cash_from_sales = sum((Decimal(s.cash_paid) for s in sales_rows), Decimal(0))
    upi_from_sales = sum((Decimal(s.upi_paid) for s in sales_rows), Decimal(0))
    sales_count = len(sales_rows)

    # Credit payments received in range (money in)
    credit_payments = (
        db.query(CreditPayment)
        .filter(
            CreditPayment.payment_date >= date_from,
            CreditPayment.payment_date <= date_to,
        )
        .all()
    )
    cash_from_credit = sum(
        (Decimal(p.amount) for p in credit_payments if p.payment_mode == "cash"),
        Decimal(0),
    )
    upi_from_credit = sum(
        (Decimal(p.amount) for p in credit_payments if p.payment_mode == "upi"),
        Decimal(0),
    )

    # COGS for sales in range
    cogs = Decimal(0)
    if sales_rows:
        sale_ids = [s.id for s in sales_rows]
        items = (
            db.query(SaleItem)
            .filter(SaleItem.sale_id.in_(sale_ids))
            .all()
        )
        item_ids = [i.id for i in items]
        if item_ids:
            batches = (
                db.query(SaleItemBatch)
                .filter(SaleItemBatch.sale_item_id.in_(item_ids))
                .all()
            )
            for b in batches:
                cogs += Decimal(b.quantity_consumed) * Decimal(b.cost_per_piece)

    profit = total_sales - cogs

    return PeriodStats(
        sales=total_sales,
        cash_collected=cash_from_sales + cash_from_credit,
        upi_collected=upi_from_sales + upi_from_credit,
        profit=profit,
        sales_count=sales_count,
    )


def _all_time_stats(db: Session) -> AllTimeStats:
    total_purchases = Decimal(
        db.query(func.coalesce(func.sum(Purchase.total_amount), 0)).scalar() or 0
    )
    total_sales = Decimal(
        db.query(func.coalesce(func.sum(Sale.total_amount), 0)).scalar() or 0
    )

    # COGS across all sale items
    cogs = Decimal(0)
    for b in db.query(SaleItemBatch).all():
        cogs += Decimal(b.quantity_consumed) * Decimal(b.cost_per_piece)
    gross_profit = total_sales - cogs

    # Owed to us = sum of positive customer balances
    # We compute from sale.amount_due minus credit payments, but only positive
    owed_to_us = Decimal(0)
    for c in db.query(Customer).filter(Customer.is_active == True).all():
        due = (
            db.query(func.coalesce(func.sum(Sale.amount_due), 0))
            .filter(Sale.customer_id == c.id)
            .scalar()
            or 0
        )
        paid = (
            db.query(func.coalesce(func.sum(CreditPayment.amount), 0))
            .filter(CreditPayment.customer_id == c.id)
            .scalar()
            or 0
        )
        bal = Decimal(due) - Decimal(paid)
        if bal > 0:
            owed_to_us += bal

    # We owe = sum of positive wholesaler balances
    we_owe = Decimal(0)
    for w in db.query(Wholesaler).filter(Wholesaler.is_active == True).all():
        purchased = (
            db.query(func.coalesce(func.sum(Purchase.total_amount), 0))
            .filter(Purchase.wholesaler_id == w.id)
            .scalar()
            or 0
        )
        paid_at_purchase = (
            db.query(func.coalesce(func.sum(Purchase.amount_paid), 0))
            .filter(Purchase.wholesaler_id == w.id)
            .scalar()
            or 0
        )
        paid_standalone = (
            db.query(func.coalesce(func.sum(WholesalerPayment.amount), 0))
            .filter(WholesalerPayment.wholesaler_id == w.id)
            .scalar()
            or 0
        )
        bal = (
            Decimal(w.opening_balance or 0)
            + Decimal(purchased)
            - Decimal(paid_at_purchase)
            - Decimal(paid_standalone)
        )       
        if bal > 0:
            we_owe += bal

    return AllTimeStats(
        total_purchases=total_purchases,
        total_sales=total_sales,
        gross_profit=gross_profit,
        owed_to_us=owed_to_us,
        we_owe=we_owe,
    )


def _trend(db: Session, days: int) -> List[TrendRow]:
    today = date.today()
    start = today - timedelta(days=days - 1)
    rows: List[TrendRow] = []

    current = start
    while current <= today:
        stats = _period_stats(db, current, current)
        rows.append(
            TrendRow(date=current, sales=stats.sales, profit=stats.profit)
        )
        current = current + timedelta(days=1)

    return rows


def get_dashboard(db: Session, trend_days: int = 14) -> DashboardRead:
    today = date.today()
    month_start = today.replace(day=1)

    return DashboardRead(
        today=_period_stats(db, today, today),
        month=_period_stats(db, month_start, today),
        all_time=_all_time_stats(db),
        trend=_trend(db, trend_days),
    )