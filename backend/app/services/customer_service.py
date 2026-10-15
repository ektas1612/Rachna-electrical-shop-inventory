from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException

from app.models.customers import Customer
from app.models.sale import Sale
from app.models.credit_payment import CreditPayment
from app.schemas.customers import (
    CustomerCreate, CustomerUpdate, CustomerRead,
    CreditPaymentCreate, LedgerEntry,
)


def create_customer(db: Session, data: CustomerCreate) -> Customer:
    c = Customer(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def get_customer(db: Session, customer_id: int) -> Optional[Customer]:
    return db.query(Customer).filter(Customer.id == customer_id).first()


def list_customers(
    db: Session,
    search: Optional[str] = None,
    include_inactive: bool = False,
) -> List[Customer]:
    q = db.query(Customer)
    if not include_inactive:
        q = q.filter(Customer.is_active == True)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Customer.name.ilike(like), Customer.phone.ilike(like)))
    return q.order_by(Customer.name.asc()).all()


def update_customer(db: Session, customer_id: int, data: CustomerUpdate) -> Optional[Customer]:
    c = get_customer(db, customer_id)
    if not c:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    return c


def deactivate_customer(db: Session, customer_id: int) -> Optional[Customer]:
    c = get_customer(db, customer_id)
    if not c:
        return None
    c.is_active = False
    db.commit()
    db.refresh(c)
    return c


# ---------- Balances ----------

def _customer_balance(db: Session, customer_id: int) -> Decimal:
    """Positive = customer owes us. Negative = advance (we owe them)."""
    due = db.query(func.coalesce(func.sum(Sale.amount_due), 0)).filter(
        Sale.customer_id == customer_id
    ).scalar() or 0

    paid = db.query(func.coalesce(func.sum(CreditPayment.amount), 0)).filter(
        CreditPayment.customer_id == customer_id
    ).scalar() or 0

    return Decimal(due) - Decimal(paid)


def list_customers_with_balances(
    db: Session, search: Optional[str] = None
) -> List[CustomerRead]:
    customers = list_customers(db, search=search, include_inactive=False)
    result = []
    for c in customers:
        read = CustomerRead.model_validate(c)
        read.outstanding = _customer_balance(db, c.id)
        result.append(read)
    result.sort(key=lambda x: (x.outstanding is None, -(x.outstanding or 0)))
    return result


# ---------- Payments ----------

def record_payment(db: Session, data: CreditPaymentCreate) -> CreditPayment:
    c = get_customer(db, data.customer_id)
    if not c:
        raise HTTPException(404, "Customer not found")

    p = CreditPayment(
        customer_id=data.customer_id,
        amount=data.amount,
        payment_mode=data.payment_mode,
        notes=data.notes,
    )
    if data.payment_date:
        p.payment_date = data.payment_date

    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def list_payments(
    db: Session, customer_id: Optional[int] = None
) -> List[CreditPayment]:
    q = db.query(CreditPayment)
    if customer_id:
        q = q.filter(CreditPayment.customer_id == customer_id)
    return q.order_by(CreditPayment.payment_date.desc(), CreditPayment.id.desc()).all()


# ---------- Ledger ----------

def customer_ledger(db: Session, customer_id: int) -> List[LedgerEntry]:
    c = get_customer(db, customer_id)
    if not c:
        raise HTTPException(404, "Customer not found")

    sales = (
        db.query(Sale)
        .filter(Sale.customer_id == customer_id, Sale.amount_due > 0)
        .all()
    )
    payments = (
        db.query(CreditPayment)
        .filter(CreditPayment.customer_id == customer_id)
        .all()
    )

    entries = []
    for s in sales:
        entries.append({
            "date": s.sale_date,
            "kind": "sale",
            "ref_id": s.id,
            "description": f"Sale #{s.id} (total ₹{s.total_amount}, paid ₹{s.amount_paid})",
            "debit": Decimal(s.amount_due),
            "credit": Decimal(0),
            "sort_key": (s.sale_date, 0, s.id),
        })
    for p in payments:
        entries.append({
            "date": p.payment_date,
            "kind": "payment",
            "ref_id": p.id,
            "description": f"Payment ({p.payment_mode})",
            "debit": Decimal(0),
            "credit": Decimal(p.amount),
            "sort_key": (p.payment_date, 1, p.id),
        })

    entries.sort(key=lambda e: e["sort_key"])

    running = Decimal(0)
    out = []
    for e in entries:
        running = running + e["debit"] - e["credit"]
        out.append(
            LedgerEntry(
                date=e["date"],
                description=e["description"],
                debit=e["debit"],
                credit=e["credit"],
                running_balance=running,
                kind=e["kind"],
                ref_id=e["ref_id"],
            )
        )
    return out