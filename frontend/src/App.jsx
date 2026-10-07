import { useEffect, useState } from "react"
import "./App.css"

const API_URL = "http://127.0.0.1:8000"

function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])

  // category state
  const [categoryName, setCategoryName] = useState("")
  const [categoryMessage, setCategoryMessage] = useState("")

  // product state
  const [showProductForm, setShowProductForm] = useState(false)
  const [productName, setProductName] = useState("")
  const [productCategoryId, setProductCategoryId] = useState("")
  const [productUnit, setProductUnit] = useState("pieces")
  const [sellingPrice, setSellingPrice] = useState("")
  const [reorderLevel, setReorderLevel] = useState("")
  const [productMessage, setProductMessage] = useState("")

  useEffect(() => {
    async function loadDashboardData() {
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_URL}/products`),
        fetch(`${API_URL}/categories`),
      ])

      const [productsData, categoriesData] = await Promise.all([
        productsResponse.json(),
        categoriesResponse.json(),
      ])

      setProducts(productsData)
      setCategories(categoriesData)
    }

    loadDashboardData()
  }, [])

  //------------------------- Add category feature ---------------------------------

  async function addCategory(event) {
    event.preventDefault()

    if (categoryName.trim() === "") {
      return
    }

    const response = await fetch(`${API_URL}/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: categoryName.trim(),
      }),
    })

    const data = await response.json()

    if(!response.ok) {
      setCategoryMessage(data.detail)
      return
    }

    setCategories(
      [...categories, data].sort((first, second) => 
        first.name.localeCompar(second.name),
      ),
    )
    setCategoryName("")
    setCategoryMessage(`${data.name} added successfully`)
  }

  // ---------------------------- Add product feature ------------------------------

  async function addProduct(event) {
    event.preventDefault()

    if (productName.trim() === "" ||
        productCategoryId === "" ||
        Number(sellingPrice) < 0 ||
        Number(reorderLevel) < 0
      ) {
        setProductMessage("Please complete all product details.")
        return
    }

    const response = await fetch(`${API_URL}/products`,{
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: productName.trim(),
        category_id: Number(productCategoryId),
        unit: productUnit.trim(),
        selling_price: Number(sellingPrice),
        reorder_level: Number(reorderLevel),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setProductMessage(data.detail)
      return
    }

    const productsResponse = await fetch(`${API_URL}/products`)
    const productsData = await productsResponse.json()

    setProducts(productsData)
    setProductName("")
    setProductCategoryId("")
    setProductUnit("pieces")
    setSellingPrice("")
    setReorderLevel("")
    setProductMessage("")
    setShowProductForm(false)
  }

  return (
    // -------------------------- Header -------------------------------------
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">E</span>
          <span>Rachna Electricals Stock</span>
        </div>

        {/* ----------------------- Nav Bar ------------------------------------ */}

        <nav>
          <a className="nav-item active" href="#dashboard">Dashboard</a>
          <a className="nav-item" href="#products">Products</a>
          <a className="nav-item" href="#purchases">Purchases</a>
          <a className="nav-item" href="#sales">Sales</a>
          <a className="nav-item" href="#reports">Reports</a>
        </nav>

        <p className="sidebar-note">Local inventory system</p>
      </aside>

      {/* ------------------------- Add product section -------------------------------- */}

      {showProductForm && (
        <section className="content-card product-form-card">
          <div className="section-heading">
            <div>
              <h2>Add a product</h2>
              <p>Create a product before recording purchases or sales.</p>
            </div>
          </div>

          <form className="product-form" onSubmit={addProduct}>
            <label>
              Product className
              <input 
                value={productName}
                onChange={(event) => 
                  setProductName(event.target.value)
                }
                placeholder="For example: LED Bulb 12W"
              />
            </label>

            <label>
              Category
              <select
                value={productCategoryId}
                onChange={(event) => setProductCategoryId(event.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Unit
              <input
                value={productUnit}
                onChange={(event) => setProductUnit(event.target.value)}
                placeholder="pieces, metres, boxes...."
              />
            </label>

            <label>
              Selling price (₹)
              <input 
                type="number" 
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(event) => setSellingPrice(event.target.value)}
              />
            </label>

            <label>
              Reorder level
              <input 
                type="number"
                min="0"
                step="1"
                value={reorderLevel}
                onChange={(event) => setReorderLevel(event.target.value)}
                 placeholder="For example: 10"
              />
            </label>

            <div className="form-actions">
              <button className="primary-button" type="submit">Save Product</button>
              <button 
                className="secondary-button"
                type="button"
                onClick={() => setShowProductForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>

          {productMessage && <p className="form-message">{productMessage}</p>}
        </section>
      )}

      {/* --------------------------- Dashboard -------------------------------- */}

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Overview</p>
            <h1>Inventory dashboard</h1>
          </div>

          {/*  ------------------------- Add product button ------------------------ */}

          <button 
            className="primary-button"
            onClick={() => setShowProductForm(true)}
          >
            + Add product
          </button>
        </header>

        {/* ------------------------ Product summary section ----------------------------- */}

        <section className="summary-grid">
          <article className="summary-card">
            <p>Total products</p>
            <strong>{products.length}</strong>
            <span>Products in your catalogue</span>
          </article>

          <article className="summary-card">
            <p>Product categories</p>
            <strong>{categories.length}</strong>
            <span>Flexible shop categories</span>
          </article>

          <article className="summary-card warning">
            <p>Inventory status</p>
            <strong>—</strong>
            <span>Purchase and sales tracking comes next</span>
          </article>
        </section>

        {/* ------------------------- Add category section -------------------------------- */}

        <section className="content-card category-card">
          <div className="section-heading">
            <div>
              <h2>Product categories</h2>
              <p>Add categories whenever the shop starts selling a new type of item.</p>
            </div>
          </div>

          <form className="category-form" onSubmit={addCategory}>
            <input 
              value={categoryName}
              onChange={(event) =>
                setCategoryName(event.target.value)
              }
              placeholder="For example: Heaters"
            />
            <button className="primary-button" type="submit">
              Add category
            </button>
          </form>

          {categoryMessage && <p className="form-message">{categoryMessage}</p>}

          <div className="category-list">
            {categories.map((category) => (
              <span className="category-chip" key={category.id}>
                {category.name}
              </span>
            ))}
          </div>
        </section>

        {/* ----------------------- Product catalogue section ----------------------------- */}

        <section className="content-card" id="products">
          <div className="section-heading">
            <div>
              <h2>Product catalogue</h2>
              <p>Products currently saved in your local database.</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Selling price</th>
                  <th>Reorder level</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category_name}</td>
                    <td>₹{product.selling_price}</td>
                    <td>
                      {product.reorder_level} {product.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
