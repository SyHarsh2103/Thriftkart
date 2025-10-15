import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  timeout: 30000,
});

// attach the freshest token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";
    const enriched = new Error(msg);
    enriched.status = err?.response?.status;
    enriched.data = err?.response?.data;
    throw enriched;
  }
);

// GET
export async function fetchDataFromApi(url, opts = {}) {
  const { params, signal, headers } = opts;
  const res = await api.get(url, { params, signal, headers });
  return res.data;
}

// POST (JSON or FormData)
export async function postData(url, body, opts = {}) {
  const { params, signal, headers } = opts;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await api.post(url, body, {
    params,
    signal,
    headers: { ...(headers || {}), ...(isFormData ? {} : { "Content-Type": "application/json" }) },
  });
  return res.data;
}

// PUT
export async function editData(url, body, opts = {}) {
  const { params, signal, headers } = opts;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await api.put(url, body, {
    params,
    signal,
    headers: { ...(headers || {}), ...(isFormData ? {} : { "Content-Type": "application/json" }) },
  });
  return res.data;
}

// DELETE (optional body via opts.data)
export async function deleteData(url, opts = {}) {
  const { params, signal, headers, data } = opts;
  const res = await api.delete(url, { params, signal, headers, data });
  return res.data;
}

// Multipart upload
export async function uploadImage(url, formData, opts = {}) {
  const { params, signal, headers } = opts;
  const res = await api.post(url, formData, {
    params,
    signal,
    headers: { ...(headers || {}) }, // axios sets correct boundary
  });
  return res.data;
}

export async function deleteImages(url, payload, opts = {}) {
  const { params, signal, headers } = opts;
  const res = await api.delete(url, { params, signal, headers, data: payload });
  return res.data;
}

export default api;
