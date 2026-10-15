import api from "./client";

export const listSales = async ({ dateFrom, dateTo, paymentStatus, customerId } = {}) => {
  const params = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  if (paymentStatus) params.payment_status = paymentStatus;
  if (customerId) params.customer_id = customerId;
  const { data } = await api.get("/api/sales", { params });
  return data;
};

export const getSale = async (id) => {
  const { data } = await api.get(`/api/sales/${id}`);
  return data;
};

export const createSale = async (payload) => {
  const { data } = await api.post("/api/sales", payload);
  return data;
};