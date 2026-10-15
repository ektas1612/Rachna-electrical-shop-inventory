"""
One-shot seed script.

Usage:
    cd backend
    python -m scripts.seed_products

Reads scripts/seed_products.txt and:
1. Ensures wholesalers "Sagar Agency" and "SV Electricals" exist.
2. Creates a Product for each line if the name doesn't already exist.
3. Sets wholesaler opening balances:
   - Sagar Agency: +14,468 (we owe)
   - SV Electricals: -1,287 (advance, we owe them nothing)
4. Prints a summary.

Safe to re-run: existing products (by name) are skipped.
"""
import os
import sys
from decimal import Decimal
from typing import Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal  # noqa: E402
from app.models.products import Product  # noqa: E402
from app.models.wholesalers import Wholesaler  # noqa: E402


DATA_FILE = os.path.join(os.path.dirname(__file__), "seed_products.txt")

# Opening balances (as of today — the day we go live)
OPENING_BALANCES = {
    "Sagar Agency": Decimal("14468"),      # we owe them
    "SV Electricals": Decimal("-1287"),    # advance, they owe us
}


def infer_category(name: str) -> str:
    n = name.lower()
    if "led emergency" in n:
        return "LED Emergency"
    if "tube" in n and "led" in n:
        return "Tube LED"
    if "tube" in n:
        return "Tube"
    if "led" in n:
        return "LED"
    if n.startswith("switch") or " switch" in n:
        return "Switch"
    if n.startswith("socket") or " socket" in n:
        return "Socket"
    if n.startswith("wire") or " wire" in n:
        return "Wire"
    if "mcb" in n:
        return "MCB"
    if "capacitor" in n:
        return "Capacitor"
    if "starter" in n:
        return "Starter"
    if "holder" in n:
        return "Holder"
    if "heater" in n or n.startswith("coil"):
        return "Heater"
    if "regulator" in n:
        return "Regulator"
    if "fan" in n or "blade" in n:
        return "Fan"
    if n.startswith("board"):
        return "Board"
    for kw in ("casing", "pipe", "junction", "band", "clip", "elbow"):
        if kw in n:
            return "Casing & Fittings"
    if n.startswith("tape") or " tape" in n:
        return "Tape"
    if n.startswith("tester") or " tester" in n:
        return "Tester"
    if "adapter" in n:
        return "Adapter"
    if "plier" in n or "cutter" in n:
        return "Tools"
    if "pump" in n:
        return "Pump"
    return "Other"


BRANDS = [
    "Surya", "Wipro", "Anchor", "Rigga", "Klick", "Havells",
    "Vijaya", "Montez", "RK", "Casco", "Taparia", "Pye", "Venus",
    "Radiant", "Dyson", "Dysor", "Cona", "Victor",
]


def infer_brand(name: str) -> Optional[str]:
    lower = name.lower()
    for b in BRANDS:
        if b.lower() in lower:
            return b
    return None


def read_seed_file():
    rows = []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        for line_no, raw in enumerate(f, start=1):
            line = raw.rstrip("\n")
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) < 2:
                print(f"  [skip] line {line_no}: not enough columns -> {line!r}")
                continue
            name = parts[0].strip()
            cost_raw = parts[1].strip() if len(parts) > 1 else ""
            code = parts[2].strip().upper() if len(parts) > 2 and parts[2].strip() else None

            cost = Decimal(cost_raw) if cost_raw else Decimal("0")
            rows.append((name, cost, code))
    return rows


def ensure_wholesaler(db, name: str, opening: Decimal) -> Wholesaler:
    w = db.query(Wholesaler).filter(Wholesaler.name == name).first()
    if not w:
        w = Wholesaler(name=name, opening_balance=opening)
        db.add(w)
        db.commit()
        db.refresh(w)
        print(f"  + created wholesaler: {name} (opening balance ₹{opening})")
    else:
        # update opening balance if it's currently 0
        if not w.opening_balance or Decimal(w.opening_balance) == 0:
            w.opening_balance = opening
            db.commit()
            db.refresh(w)
            print(f"  = wholesaler exists, updated opening balance: {name} -> ₹{opening}")
        else:
            print(f"  = wholesaler exists (opening balance kept): {name}")
    return w


def main():
    print("Loading wholesalers…")
    db = SessionLocal()
    try:
        sa = ensure_wholesaler(db, "Sagar Agency", OPENING_BALANCES["Sagar Agency"])
        sv = ensure_wholesaler(db, "SV Electricals", OPENING_BALANCES["SV Electricals"])

        supplier_by_code = {"SA": sa, "SV": sv}

        print("\nSeeding products…")
        rows = read_seed_file()
        created = 0
        skipped = 0
        for name, cost, code in rows:
            existing = db.query(Product).filter(Product.name == name).first()
            if existing:
                skipped += 1
                continue

            supplier = supplier_by_code.get(code) if code else None

            p = Product(
                name=name,
                category=infer_category(name),
                brand=infer_brand(name),
                unit="piece",
                pieces_per_box=1,
                selling_price=Decimal("0"),
                low_stock_threshold=Decimal("10"),
                mid_stock_threshold=Decimal("30"),
                current_stock=Decimal("0"),
                default_wholesaler_id=supplier.id if supplier else None,
                is_active=True,
            )
            db.add(p)
            created += 1

        db.commit()
        print(f"\nDone.")
        print(f"  Created: {created}")
        print(f"  Skipped: {skipped} (already existed)")
        print(f"\nNote: costs from the sheet were NOT imported — products start with cost ₹0.")
        print(f"Use the Adjust Stock button on each product to set opening stock and cost.")
    finally:
        db.close()


if __name__ == "__main__":
    main()