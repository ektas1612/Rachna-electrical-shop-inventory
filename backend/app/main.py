from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import (
    products, wholesalers, purchase, wholesaler_payment, 
    customers, sale, switchboard, wholesaler_return,
    inventory_batch, sale_item_batch, stock_adjustment,
    purchase_list
)  # noqa: F401  -- ensures the table is registered
from app.routers import (
    products, wholesalers, purchases, 
    sales, customers, reports, 
    switchboards, wholesaler_returns,
    purchase_list
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
app.include_router(purchase_list.router)


@app.get("/health")
def root():
    return {"message": "Backend is alive ⚡"}

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


# Serve the built frontend (production). In dev, the Vite dev server
# runs separately, so this branch is only hit when dist/ exists.
DIST_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)

if os.path.isdir(DIST_DIR):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(DIST_DIR, "assets")),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        # Let API and docs routes work
        if full_path.startswith(("api/", "docs", "openapi.json", "redoc")):
            return {"detail": "Not Found"}

        # Serve index.html for any other path so React Router works
        index_path = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"detail": "Frontend not built"}