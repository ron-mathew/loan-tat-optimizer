// src/api.js — all calls to the FastAPI backend

import axios from "axios";

const BASE = "http://localhost:8000";

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