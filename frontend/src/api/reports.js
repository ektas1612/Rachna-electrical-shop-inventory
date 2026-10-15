import api from "./client";

export const getDashboard = async ({ trendDays = 14 } = {}) => {
  const params = {};
  if (trendDays) params.trend_days = trendDays;
  const { data } = await api.get("/api/reports/dashboard", { params });
  return data;
};