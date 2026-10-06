import './App.css'

const products = [
  {
    id: 1,
    name: "Havells 1.5 sq mm Wire",
    category: "Wires",
    stock: 10,
    unit: "metres",
    status: "In stock"
  },
  {
    id: 2,
    name: "Rigga Switch",
    category: "Switches",
    stock: 10,
    unit: "pieces",
    status: "Low stock"
  },
  {
    id: 3,
    name: "LED Bulb 12W",
    category: "Lighting",
    stock: 36,
    unit: "pieces",
    status: "In stock"
  }
]

function App() {
  return (
    <div className='app-shell'>
      <aside className='sidebar'>
        <div className='brand'>
          <span className='brand-mark'>E</span>
          <span>ElectraStock</span>
        </div>

        <nav>
          <a className="nav-item active" href="#dashboard">Dashborard</a>
          <a className="nav-item active" href="#dashboard">Products</a>
          <a className="nav-item active" href="#dashboard">Purchases</a>
          <a className="nav-item active" href="#dashboard">Sales</a>
          <a className="nav-item active" href="#dashboard">Reports</a>
        </nav>

        <p className='sidebar-note'>Local inventory system</p>
      </aside>

      <main className='main-content'>
        <header className='topbar'>
          <div>
            <p className='eyebrow'>Overview</p>
            <h1>Inventory dashboard</h1>
          </div>

          <button className='primary-button'>+ Add product</button>
        </header>

        <section className='summary-grid'>
          <article className='summary-card'>
            <p>Total products</p>
            <strong>126</strong>
            <span>Across 8 categories</span>
          </article>

          <article className='summary-card'>
            <p>Stock value</p>
            <strong>₹1,448,250</strong>
            <span>Based on purchase prices</span>
          </article>

          <article className='summary-card warning'>
            <p>Low-stock products</p>
            <strong>6</strong>
            <span>Need attention soon</span>
          </article>
        </section>

        <section className='content-card' id='products'>
          <div className='section-heading'>
            <div>
              <h2>Products needing attention</h2>
              <p>Review stock levels before placing your next order.</p>
            </div>
            <button className='secondary-button'>View all products</button>
          </div>

          <div className='table-wrapper'>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Available stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>
                      {product.stock} {product.unit}
                    </td>
                    <td>
                      <span className={
                        product.status === "Low stock" ? "status low-stock": "status"
                      }
                      >
                        {product.status}
                      </span>
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
