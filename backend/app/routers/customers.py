from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.customers import (
    CustomerCreate,
    CustomerUpdate,
    CustomerRead,
    CreditPaymentCreate,
    CreditPaymentRead,
    LedgerEntry,
)
from app.services import customer_service

router = APIRouter(prefix="/api", tags=["customers"])


# ---------- Customers ----------

@router.post("/customers", response_model=CustomerRead, status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    c = customer_service.create_customer(db, payload)
    read = CustomerRead.model_validate(c)
    read.outstanding = customer_service._customer_balance(db, c.id)
    return read


@router.get("/customers", response_model=List[CustomerRead])
def list_customers(
    search: Optional[str] = Query(None),
    with_balance: bool = Query(True),
    db: Session = Depends(get_db),
):
    if with_balance:
        return customer_service.list_customers_with_balances(db, search=search)
    customers = customer_service.list_customers(db, search=search)
    return [CustomerRead.model_validate(c) for c in customers]


@router.get("/customers/{customer_id}", response_model=CustomerRead)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    c = customer_service.get_customer(db, customer_id)
    if not c:
        raise HTTPException(404, "Customer not found")
    read = CustomerRead.model_validate(c)
    read.outstanding = customer_service._customer_balance(db, customer_id)
    return read


@router.patch("/customers/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db)
):
    c = customer_service.update_customer(db, customer_id, payload)
    if not c:
        raise HTTPException(404, "Customer not found")
    read = CustomerRead.model_validate(c)
    read.outstanding = customer_service._customer_balance(db, customer_id)
    return read


@router.delete("/customers/{customer_id}", response_model=CustomerRead)
def deactivate_customer(customer_id: int, db: Session = Depends(get_db)):
    c = customer_service.deactivate_customer(db, customer_id)
    if not c:
        raise HTTPException(404, "Customer not found")
    return CustomerRead.model_validate(c)


@router.get("/customers/{customer_id}/ledger", response_model=List[LedgerEntry])
def customer_ledger(customer_id: int, db: Session = Depends(get_db)):
    return customer_service.customer_ledger(db, customer_id)


# ---------- Credit payments ----------

@router.post("/credit-payments", response_model=CreditPaymentRead, status_code=201)
def record_payment(payload: CreditPaymentCreate, db: Session = Depends(get_db)):
    p = customer_service.record_payment(db, payload)
    read = CreditPaymentRead.model_validate(p)
    read.customer_name = p.customer.name if p.customer else None
    return read


@router.get("/credit-payments", response_model=List[CreditPaymentRead])
def list_payments(
    customer_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    payments = customer_service.list_payments(db, customer_id)
    out = []
    for p in payments:
        r = CreditPaymentRead.model_validate(p)
        r.customer_name = p.customer.name if p.customer else None
        out.append(r)
    return out