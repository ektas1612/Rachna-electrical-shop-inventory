import { useEffect, useState } from "react"
import "./App.css"

const API_URL = "http://127.0.0.1:8000"

function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryName, setCategoryName] = useState("")
  const [categoryMessage, setCategoryMessage] = useState("")

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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">E</span>
          <span>ElectraStock</span>
        </div>

        <nav>
          <a className="nav-item active" href="#dashboard">Dashboard</a>
          <a className="nav-item" href="#products">Products</a>
          <a className="nav-item" href="#purchases">Purchases</a>
          <a className="nav-item" href="#sales">Sales</a>
          <a className="nav-item" href="#reports">Reports</a>
        </nav>

        <p className="sidebar-note">Local inventory system</p>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Overview</p>
            <h1>Inventory dashboard</h1>
          </div>

          <button className="primary-button">+ Add product</button>
        </header>

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
