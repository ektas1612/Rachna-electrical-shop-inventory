from fastapi import FastAPI, HTTPException
import sqlite3
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods = ["*"],
    allow_headers = ["*"],
)

DATABASE_NAME = "inventory.db"

def get_connection():
    connection = sqlite3.connect(DATABASE_NAME)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON')
    return connection

def initialize_database():
    connection = get_connection()

    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products (
         id INTEGER PRIMARY KEY,
         name TEXT NOT NULL,
         category_id INTEGER NOT NULL,
         unit TEXT NOT NULL,
         selling_price REAL NOT NULL CHECK (selling_price >= 0),
         reorder_level INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
         created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (category_id) REFERENCES categories(id)
        );
        """
    )
    connection.commit()
    connection.close()

initialize_database()

class CategoryCreate(BaseModel):
    name: str

class ProductCreate(BaseModel):
    name: str
    category_id: int = Field(gt=0)
    unit: str
    selling_price: float = Field(ge=0)
    reorder_level: int = Field(ge=0)

# Root end point

@app.get("/")
def read_root():
    return {"message": "Rachna electrical shop inventory API is running"}


# Categories end point

@app.get("/categories")
def get_categories():
    connection = get_connection()

    rows = connection.execute(
        """
            SELECT id, name, created_at
            FROM categories
            ORDER BY name
        """
    ).fetchall()

    connection.close()

    return [dict(row) for row in rows]


@app.post("/categories", status_code=201)
def create_category(category: CategoryCreate):
    name = category.name.strip()

    if name == "":
        raise HTTPException(
            status_code=400,
            detail="Category name cannot be empty"
        )
    
    connection = get_connection()

    try:
        cursor = connection.execute(
            "INSERT INTO categories (name) VALUES (?)",
            (name,),
        )
        connection.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="A category with this name already exists",
        )
    finally:
        connection.close()
    
    return {
        "id": cursor.lastrowid,
        "name": name,
    }


# Products end point

@app.get("/products")
def get_products():
    connection = get_connection()

    rows = connection.execute(
        """
            SELECT
                products.id,
                products.name,
                products.unit,
                products.selling_price,
                products.reorder_level,
                categories.id AS category_id,
                categories.name AS category_name
            FROM products
            JOIN categories ON categories.id = products.category_id
            ORDER BY products.name
        """
    ).fetchall()
    connection.close()

    return [dict(row) for row in rows]

@app.post("/products", status_code=201)
def create_product(product: ProductCreate):
    name = product.name.strip()
    unit = product.unit.strip()

    if name == "" or unit == "":
        raise HTTPException(
            status_code=400,
            detail="Product name and unit cannot be empty",
        )
    
    connection = get_connection()

    category = connection.execute(
        "SELECT id FROM categories WHERE id = ?",
        (product.category_id,),
    ).fetchone()

    if category is None:
        connection.close()
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )
    
    cursor = connection.execute(
        """
            INSERT INTO products (
                name,
                category_id,
                unit,
                selling_price,
                reorder_level
            )
            VALUES (?,?,?,?,?)
        """,
        (
            name,
            product.category_id,
            unit,
            product.selling_price,
            product.reorder_level,
        ),
    )

    connection.commit()
    connection.close()

    return {
        "id": cursor.lastrowid,
        "name": name,
        "category_id": product.category_id,
        "unit": unit,
        "selling_price": product.selling_price,
        "reorder_level": product.reorder_level,
    }