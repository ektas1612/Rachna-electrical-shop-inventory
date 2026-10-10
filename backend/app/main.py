from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import products  # noqa: F401  -- ensures the table is registered
from app.routers import products

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


@app.get("/")
def root():
    return {"message": "Backend is alive ⚡"}