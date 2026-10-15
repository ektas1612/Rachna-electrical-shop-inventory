import api from "./client";

export const listWholesalers = async ({ search, includeInactive } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (includeInactive) params.include_inactive = true;
  const { data } = await api.get("/api/wholesalers", { params });
  return data;
};

export const createWholesaler = async (payload) => {
  const { data } = await api.post("/api/wholesalers", payload);
  return data;
};

export const updateWholesaler = async (id, payload) => {
  const { data } = await api.patch(`/api/wholesalers/${id}`, payload);
  return data;
};

export const deactivateWholesaler = async (id) => {
  const { data } = await api.delete(`/api/wholesalers/${id}`);
  return data;
};