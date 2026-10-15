from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import (
    products, wholesalers, purchase, wholesaler_payment, 
    customers, sale, switchboard, wholesaler_return,
    inventory_batch, sale_item_batch, stock_adjustment
)  # noqa: F401  -- ensures the table is registered
from app.routers import (
    products, wholesalers, purchases, 
    sales, customers, reports, 
    switchboards, wholesaler_returns
)

# Create tables on startup (later we'll replace this with Alembic migrations)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Electrical Shop API", version="0.1.0")

# Allow the React dev server to call us
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(wholesalers.router)
app.include_router(purchases.router)
app.include_router(sales.router)
app.include_router(customers.router) 
app.include_router(reports.router) 
app.include_router(switchboards.router)
app.include_router(wholesaler_returns.router)


@app.get("/")
def root():
    return {"message": "Backend is alive ⚡"}