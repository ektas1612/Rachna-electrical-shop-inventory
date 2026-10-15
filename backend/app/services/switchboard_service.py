from decimal import Decimal
from typing import Optional, List
from datetime import date as date_type
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException

from app.models.switchboard import Switchboard, SwitchboardComponent
from app.models.products import Product
from app.models.sale import Sale
from app.models.inventory_batch import InventoryBatch
from app.models.customers import Customer
from app.schemas.switchboards import (
    SwitchboardCreate,
    SellSwitchboardCreate,
    DamageSwitchboardCreate,
    DismantleSwitchboardCreate,
    StuckComponent,
    SwitchboardStats,
    SwitchboardNameSuggestion,
)


# ---------- Build ----------

def _next_code(db: Session, prefix: str) -> str:
    last = (
        db.query(Switchboard)
        .filter(Switchboard.code.like(f"{prefix}-%"))
        .order_by(Switchboard.id.desc())
        .first()
    )
    n = 1
    if last and last.code and "-" in last.code:
        try:
            n = int(last.code.split("-")[-1]) + 1
        except ValueError:
            pass
    return f"{prefix}-{n:04d}"


def _consume_from_batches(db: Session, product_id: int, quantity: Decimal):
    """Consume `quantity` from FIFO batches. Returns total cost consumed."""
    batches = (
        db.query(InventoryBatch)
        .filter(
            InventoryBatch.product_id == product_id,
            InventoryBatch.quantity_remaining > 0,
        )
        .order_by(InventoryBatch.purchase_date.asc(), InventoryBatch.id.asc())
        .all()
    )
    total_available = sum((Decimal(b.quantity_remaining) for b in batches), Decimal(0))
    if total_available < quantity:
        raise HTTPException(
            400,
            f"Not enough stock (batch-level) for product {product_id}: "
            f"need {quantity}, have {total_available}.",
        )
    remaining = quantity
    total_cost = Decimal(0)
    for b in batches:
        if remaining <= 0:
            break
        take = min(Decimal(b.quantity_remaining), remaining)
        b.quantity_remaining = Decimal(b.quantity_remaining) - take
        total_cost += take * Decimal(b.cost_per_piece)
        remaining -= take
    return total_cost


def build_switchboard(db: Session, data: SwitchboardCreate) -> Switchboard:
    # Validate products exist
    product_ids = [c.product_id for c in data.components]
    products = {
        p.id: p for p in db.query(Product).filter(Product.id.in_(product_ids)).all()
    }
    for c in data.components:
        if c.product_id not in products:
            raise HTTPException(404, f"Product {c.product_id} not found")

    # Check total stock per product
    for c in data.components:
        product = products[c.product_id]
        if Decimal(product.current_stock) < Decimal(c.quantity):
            raise HTTPException(
                400,
                f"Not enough stock of '{product.name}'. "
                f"Available: {product.current_stock}, needed: {c.quantity}.",
            )

    built_date = data.built_date or date_type.today()
    prefix = (data.code_prefix or "SB").strip() or "SB"
    code = _next_code(db, prefix)

    board = Switchboard(
        name=data.name.strip(),
        code=code,
        status="available",
        listed_price=data.listed_price,
        built_date=built_date,
        notes=data.notes,
    )
    db.add(board)
    db.flush()

    material_cost = Decimal(0)
    for c in data.components:
        product = products[c.product_id]
        qty = Decimal(c.quantity)
        consumed_cost = _consume_from_batches(db, c.product_id, qty)
        cost_per_piece = (consumed_cost / qty) if qty > 0 else Decimal(0)
        line_cost = consumed_cost

        board.components.append(
            SwitchboardComponent(
                product_id=c.product_id,
                quantity=qty,
                cost_per_piece=cost_per_piece,
                line_cost=line_cost,
            )
        )
        product.current_stock = Decimal(product.current_stock) - qty
        material_cost += line_cost

    board.material_cost = material_cost

    db.commit()
    db.refresh(board)
    return board


# ---------- List / get ----------

def list_switchboards(
    db: Session,
    status: Optional[str] = None,
) -> List[Switchboard]:
    q = db.query(Switchboard).options(
        joinedload(Switchboard.components).joinedload(SwitchboardComponent.product)
    )
    if status:
        q = q.filter(Switchboard.status == status)
    return q.order_by(Switchboard.built_date.desc(), Switchboard.id.desc()).all()


def get_switchboard(db: Session, board_id: int) -> Optional[Switchboard]:
    return (
        db.query(Switchboard)
        .options(
            joinedload(Switchboard.components).joinedload(
                SwitchboardComponent.product
            )
        )
        .filter(Switchboard.id == board_id)
        .first()
    )


# ---------- Sell ----------

def sell_switchboard(db: Session, data: SellSwitchboardCreate) -> Switchboard:
    board = get_switchboard(db, data.board_id)
    if not board:
        raise HTTPException(404, "Switchboard not found")
    if board.status != "available":
        raise HTTPException(400, f"Board is not available (status: {board.status})")

    sale_date = data.sale_date or date_type.today()
    total = Decimal(data.actual_price)
    paid = Decimal(data.cash_paid) + Decimal(data.upi_paid)
    amount_due = total - paid if total > paid else Decimal("0")

    if paid <= 0:
        payment_status = "unpaid"
    elif paid >= total:
        payment_status = "paid"
    else:
        payment_status = "partial"

    if paid >= total and data.cash_paid > 0 and data.upi_paid > 0:
        payment_mode = "mixed"
    elif paid >= total and data.upi_paid > 0:
        payment_mode = "upi"
    elif paid >= total:
        payment_mode = "cash"
    else:
        payment_mode = "unpaid"

    if payment_status != "paid" and not data.customer_id:
        raise HTTPException(
            400, "A customer is required when payment is partial or unpaid."
        )

    if data.customer_id:
        cust = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not cust:
            raise HTTPException(404, "Customer not found")

    sale = Sale(
        sale_date=sale_date,
        subtotal=total,
        total_amount=total,
        cash_paid=data.cash_paid,
        upi_paid=data.upi_paid,
        amount_paid=paid,
        amount_due=amount_due,
        payment_mode=payment_mode,
        payment_status=payment_status,
        customer_id=data.customer_id,
        notes=f"Switchboard {board.code or board.id}: {board.name}",
    )
    db.add(sale)
    db.flush()

    board.status = "sold"
    board.actual_sold_price = total
    board.sold_date = sale_date
    board.sale_id = sale.id
    if data.notes:
        board.notes = (board.notes + " | " + data.notes) if board.notes else data.notes

    db.commit()
    db.refresh(board)
    return board


# ---------- Damage ----------

def damage_switchboard(db: Session, data: DamageSwitchboardCreate) -> Switchboard:
    board = get_switchboard(db, data.board_id)
    if not board:
        raise HTTPException(404, "Switchboard not found")
    if board.status != "available":
        raise HTTPException(400, f"Board is not available (status: {board.status})")

    board.status = "damaged"
    if data.notes:
        board.notes = (board.notes + " | " + data.notes) if board.notes else data.notes

    db.commit()
    db.refresh(board)
    return board


# ---------- Dismantle ----------

def dismantle_switchboard(db: Session, data: DismantleSwitchboardCreate) -> Switchboard:
    board = get_switchboard(db, data.board_id)
    if not board:
        raise HTTPException(404, "Switchboard not found")
    if board.status != "available":
        raise HTTPException(400, f"Board is not available (status: {board.status})")

    # Return each component to stock as a new batch at its snapshot cost
    for comp in board.components:
        product = db.query(Product).filter(Product.id == comp.product_id).first()
        if not product:
            continue
        qty = Decimal(comp.quantity)
        cost = Decimal(comp.cost_per_piece)

        product.current_stock = Decimal(product.current_stock) + qty
        db.add(
            InventoryBatch(
                product_id=comp.product_id,
                purchase_item_id=None,
                quantity_initial=qty,
                quantity_remaining=qty,
                cost_per_piece=cost,
                purchase_date=date_type.today(),
            )
        )

    board.status = "dismantled"
    if data.notes:
        board.notes = (board.notes + " | " + data.notes) if board.notes else data.notes

    db.commit()
    db.refresh(board)
    return board


# ---------- Stats ----------

def get_stats(db: Session) -> SwitchboardStats:
    total_built = db.query(Switchboard).count()
    total_available = (
        db.query(Switchboard).filter(Switchboard.status == "available").count()
    )
    total_sold = db.query(Switchboard).filter(Switchboard.status == "sold").count()
    total_damaged = db.query(Switchboard).filter(Switchboard.status == "damaged").count()
    total_dismantled = (
        db.query(Switchboard).filter(Switchboard.status == "dismantled").count()
    )

    stuck: dict[int, Decimal] = {}
    available = (
        db.query(Switchboard)
        .options(joinedload(Switchboard.components))
        .filter(Switchboard.status == "available")
        .all()
    )
    for b in available:
        for comp in b.components:
            stuck[comp.product_id] = stuck.get(comp.product_id, Decimal(0)) + Decimal(
                comp.quantity
            )

    stuck_list = []
    for pid, qty in stuck.items():
        product = db.query(Product).filter(Product.id == pid).first()
        if product:
            stuck_list.append(
                StuckComponent(
                    product_id=pid,
                    product_name=product.name,
                    quantity_locked=qty,
                )
            )
    stuck_list.sort(key=lambda x: x.product_name)

    return SwitchboardStats(
        total_built=total_built,
        total_available=total_available,
        total_sold=total_sold,
        total_damaged=total_damaged,
        total_dismantled=total_dismantled,
        stuck_components=stuck_list,
    )


# ---------- Name suggestions ----------

def name_suggestions(db: Session, limit: int = 20) -> List[SwitchboardNameSuggestion]:
    rows = (
        db.query(Switchboard.name, func.count(Switchboard.id).label("c"))
        .group_by(Switchboard.name)
        .order_by(func.count(Switchboard.id).desc())
        .limit(limit)
        .all()
    )
    return [SwitchboardNameSuggestion(name=r[0], times_built=r[1]) for r in rows]