import api from "./client";

export const listProducts = async ({ 
  search, 
  category, 
  includeInactive,
  sortBy,
 } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (category) params.category = category;
  if (includeInactive) params.include_inactive = true;
  if (sortBy) params.sort_by = sortBy;

  const { data } = await api.get("/api/products", { params });
  return data;
};

export const getProduct = async (id) => {
  const { data } = await api.get(`/api/products/${id}`);
  return data;
};

export const createProduct = async (payload) => {
  const { data } = await api.post("/api/products", payload);
  return data;
};

export const updateProduct = async (id, payload) => {
  const { data } = await api.patch(`/api/products/${id}`, payload);
  return data;
};

export const deactivateProduct = async (id) => {
  const { data } = await api.delete(`/api/products/${id}`);
  return data;
};

export const listCategories = async () => {
    const {data} = await api.get("/api/products/meta/categories");
    return data;
};

export const getProductBatches = async (productId) => {
  const { data } = await api.get(`/api/products/${productId}/batches`);
  return data;
};

export const adjustStock = async (productId, payload) => {
  const { data } = await api.post(`/api/products/${productId}/adjust-stock`, payload);
  return data;
};