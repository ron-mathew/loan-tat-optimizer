// src/api.js — all calls to the FastAPI backend

import axios from "axios";

// Production backend URL — update this if the Render service URL changes
const RENDER_URL = "https://loan-tat-optimizer.onrender.com";

const getBaseUrl = () => {
  // 1. Explicit env var always wins (set in Vercel project settings)
  if (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== "") {
    return import.meta.env.VITE_API_URL;
  }
  // 2. Local dev — use localhost backend
  if (typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "3000")) {
    return "http://localhost:8000";
  }
  // 3. Production fallback — point directly to Render
  return RENDER_URL;
};

const BASE = getBaseUrl();

export const analyzeLoan = (loanData) =>
  axios.post(`${BASE}/analyze`, loanData).then((r) => r.data);

export const batchAnalyze = (loans) =>
  axios.post(`${BASE}/batch`, { loans }).then((r) => r.data);

export const getStats = () =>
  axios.get(`${BASE}/stats`).then((r) => r.data);

export const getHealth = () =>
  axios.get(`${BASE}/health`).then((r) => r.data);

export const getMetrics = () =>
  axios.get(`${BASE}/metrics`).then((r) => r.data);

export const getDatasetSample = (n = 10) =>
  axios.get(`${BASE}/dataset/sample?n=${n}`).then((r) => r.data);

export const getDatasetRange = (start, end) =>
  axios.get(`${BASE}/dataset/range?start=${start}&end=${end}`).then((r) => r.data);

export const getDatasetOptions = () =>
  axios.get(`${BASE}/dataset/options`).then((r) => r.data);

export const getLoanById = (appId) =>
  axios.get(`${BASE}/dataset/loan/${appId}`).then((r) => r.data);

export const getHistoryStats = () =>
  axios.get(`${BASE}/history/stats`).then((r) => r.data);

export const getHistory = (page = 1, limit = 15, risk = "", source = "") => {
  const params = new URLSearchParams({ page, limit });
  if (risk) params.append("risk", risk);
  if (source) params.append("source", source);
  return axios.get(`${BASE}/history?${params}`).then((r) => r.data);
};

export const clearHistory = () =>
  axios.delete(`${BASE}/history`).then((r) => r.data);

