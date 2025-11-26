// admin/src/utils/api.js
import axios from "axios";

// ---------- Axios instance ----------

const api = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL || "",
  timeout: 30000,
});

// Attach freshest token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize errors so all admin pages can handle them the same way
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Request was cancelled
    if (
      axios.isCancel?.(error) ||
      error?.code === "ERR_CANCELED" ||
      error?.name === "CanceledError"
    ) {
      error.isCanceled = true;
      return Promise.reject(error);
    }

    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.msg ||
      error?.response?.data?.error ||
      error.message ||
      "Request failed";

    const enriched = new Error(msg);
    enriched.status = error?.response?.status;
    enriched.data = error?.response?.data;
    enriched.code = error?.code;

    // 🔐 Global handling for ANY unauthorized / forbidden response
    if (enriched.status === 401 || enriched.status === 403) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch (e) {
        console.error("Failed to clear auth storage", e);
      }

      // Optional: fire a custom event if you ever want to listen to it in App.js
      try {
        window.dispatchEvent(
          new CustomEvent("thriftkart:admin-logout", {
            detail: { reason: enriched.message },
          })
        );
      } catch (e) {
        // ignore
      }

      // Redirect to admin login (avoid looping if already there)
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      // ✅ Resolve with safe axios-like object so `fetchDataFromApi` returns `null`
      return Promise.resolve({ data: null });
    }

    // For all other errors, let caller decide (you can catch in components)
    return Promise.reject(enriched);
  }
);

// ---------- Helper functions ----------

// GET
export async function fetchDataFromApi(url, opts = {}) {
  const { params, signal, headers } = opts;
  const res = await api.get(url, { params, signal, headers });
  return res.data;
}

// POST (JSON or FormData)
export async function postData(url, body, opts = {}) {
  const { params, signal, headers } = opts;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const res = await api.post(url, body, {
    params,
    signal,
    headers: {
      ...(headers || {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });
  return res.data;
}

// PUT
export async function editData(url, body, opts = {}) {
  const { params, signal, headers } = opts;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const res = await api.put(url, body, {
    params,
    signal,
    headers: {
      ...(headers || {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });
  return res.data;
}

// DELETE (no body)
export async function deleteData(url, opts = {}) {
  const { params, signal, headers } = opts;
  const res = await api.delete(url, { params, signal, headers });
  return res.data;
}

// DELETE (with body – e.g. delete image)
export async function deleteImages(url, body = {}, opts = {}) {
  const { params, signal, headers } = opts;
  const res = await api.delete(url, {
    params,
    signal,
    headers,
    data: body,
  });
  return res.data;
}

// Multipart upload (images, etc.)
export async function uploadImage(url, formData, opts = {}) {
  const { params, signal, headers } = opts;
  const res = await api.post(url, formData, {
    params,
    signal,
    headers: {
      ...(headers || {}),
      // Let axios set correct multipart boundary for FormData
    },
  });
  return res.data;
}

export default api;
