import api from "./client";

export const listPurchaseList = async ({ status } = {}) => {
  const params = {};
  if (status) params.status = status;
  const { data } = await api.get("/api/purchase-list", { params });
  return data;
};

export const addPurchaseListItem = async (payload) => {
  const { data } = await api.post("/api/purchase-list", payload);
  return data;
};

export const updatePurchaseListItem = async (id, payload) => {
  const { data } = await api.patch(`/api/purchase-list/${id}`, payload);
  return data;
};

export const deletePurchaseListItem = async (id) => {
  await api.delete(`/api/purchase-list/${id}`);
};

export const getRecommendations = async () => {
  const { data } = await api.get("/api/purchase-list/recommendations");
  return data;
};

export const getPurchaseListBudget = async () => {
  const { data } = await api.get("/api/purchase-list/budget");
  return data;
};

export const markReceived = async (ids) => {
  const { data } = await api.post("/api/purchase-list/mark-received", ids);
  return data;
};