import api from "./client";

export const listCustomers = async ({ search, withBalance = true } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (withBalance) params.with_balance = true;
  const { data } = await api.get("/api/customers", { params });
  return data;
};

export const getCustomer = async (id) => {
  const { data } = await api.get(`/api/customers/${id}`);
  return data;
};

export const createCustomer = async (payload) => {
  const { data } = await api.post("/api/customers", payload);
  return data;
};

export const updateCustomer = async (id, payload) => {
  const { data } = await api.patch(`/api/customers/${id}`, payload);
  return data;
};

export const deactivateCustomer = async (id) => {
  const { data } = await api.delete(`/api/customers/${id}`);
  return data;
};

export const getCustomerLedger = async (customerId) => {
  const { data } = await api.get(`/api/customers/${customerId}/ledger`);
  return data;
};

export const recordCreditPayment = async (payload) => {
  const { data } = await api.post("/api/credit-payments", payload);
  return data;
};

export const listCreditPayments = async ({ customerId } = {}) => {
  const params = {};
  if (customerId) params.customer_id = customerId;
  const { data } = await api.get("/api/credit-payments", { params });
  return data;
};