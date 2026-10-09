
const API_URL = "http://127.0.0.1:8000"

async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, options)

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.detail || "Something went wrong")
    }
    return data
}

export function getProducts(){
    return request("/products")
}

export function getCategories(){
    return request("/categories")
} 

export function createCategory(name) {
    return request("/categories", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({name}),
    })
}

export function createProduct(product) {
    return request("/products", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(product)
    })
}
