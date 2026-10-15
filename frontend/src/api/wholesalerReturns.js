import api from "./client";

export const listReturns = async ({ wholesalerId } = {}) => {
  const params = {};
  if (wholesalerId) params.wholesaler_id = wholesalerId;
  const { data } = await api.get("/api/wholesaler-returns", { params });
  return data;
};

export const getReturn = async (id) => {
  const { data } = await api.get(`/api/wholesaler-returns/${id}`);
  return data;
};

export const createReturn = async (payload) => {
  const { data } = await api.post("/api/wholesaler-returns", payload);
  return data;
};