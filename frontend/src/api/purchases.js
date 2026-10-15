import api from "./client";

export const listPurchases = async ({ wholesalerId, dateFrom, dateTo } = {}) => {
  const params = {};
  if (wholesalerId) params.wholesaler_id = wholesalerId;
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const { data } = await api.get("/api/purchases", { params });
  return data;
};

export const getPurchase = async (id) => {
  const { data } = await api.get(`/api/purchases/${id}`);
  return data;
};

export const createPurchase = async (payload) => {
  const { data } = await api.post("/api/purchases", payload);
  return data;
};

export const listPayments = async ({ wholesalerId } = {}) => {
  const params = {};
  if (wholesalerId) params.wholesaler_id = wholesalerId;
  const { data } = await api.get("/api/wholesaler-payments", { params });
  return data;
};

export const createPayment = async (payload) => {
  const { data } = await api.post("/api/wholesaler-payments", payload);
  return data;
};

export const listBalances = async () => {
  const { data } = await api.get("/api/wholesaler-balances");
  return data;
};

export const listWholesalerLedger = async (wholesalerId) => {
    const [purchases, payments] = await Promise.all([
      listPurchases({ wholesalerId }),
      listPayments({ wholesalerId }),
    ]);
    return { purchases, payments };
  };