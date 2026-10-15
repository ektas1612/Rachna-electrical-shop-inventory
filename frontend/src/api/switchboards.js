import api from "./client";

export const listSwitchboards = async ({ status } = {}) => {
  const params = {};
  if (status) params.status = status;
  const { data } = await api.get("/api/switchboards", { params });
  return data;
};

export const getSwitchboard = async (id) => {
  const { data } = await api.get(`/api/switchboards/${id}`);
  return data;
};

export const buildSwitchboard = async (payload) => {
  const { data } = await api.post("/api/switchboards", payload);
  return data;
};

export const sellSwitchboard = async (payload) => {
  const { data } = await api.post("/api/switchboards/sell", payload);
  return data;
};

export const damageSwitchboard = async (payload) => {
  const { data } = await api.post("/api/switchboards/damage", payload);
  return data;
};

export const dismantleSwitchboard = async (payload) => {
  const { data } = await api.post("/api/switchboards/dismantle", payload);
  return data;
};

export const switchboardStats = async () => {
  const { data } = await api.get("/api/switchboards/stats");
  return data;
};

export const switchboardNameSuggestions = async () => {
  const { data } = await api.get("/api/switchboards/name-suggestions");
  return data;
};