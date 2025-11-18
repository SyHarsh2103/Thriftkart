// client/src/utils/api.js
import axios from "axios";

// ========== Axios instance ==========

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  timeout: 30000,
});

// Attach token (if present) on every request
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

// Tag cancellations + extract a friendly message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 👉 Detect axios cancellation
    if (
      axios.isCancel?.(err) ||
      err?.code === "ERR_CANCELED" ||
      err?.name === "CanceledError"
    ) {
      err.isCanceled = true;
      return Promise.reject(err);
    }

    // Store a normalized message on the error itself
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.msg || // your backend often uses `msg`
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";

    err.normalizedMessage = msg;
    return Promise.reject(err);
  }
);

// Tiny helper for cancellation checks
export function isCanceledError(e) {
  return (
    e?.isCanceled ||
    e?.name === "AbortError" ||
    e?.name === "CanceledError" ||
    e?.code === "ERR_CANCELED"
  );
}

// ========== Unified error normalizer ==========
function normalizeError(error) {
  const msg =
    error?.normalizedMessage ||
    error?.message ||
    "Something went wrong. Please try again.";

  return {
    success: false,
    error: true,
    msg,
    status: error?.response?.status,
    data: error?.response?.data,
    code: error?.code,
  };
}

// ========== Helpers ==========

// GET
export async function fetchDataFromApi(url, opts = {}) {
  const { params, signal, headers } = opts;
  try {
    const res = await api.get(url, { params, signal, headers });
    return res.data;
  } catch (error) {
    if (isCanceledError(error)) throw error; // let caller ignore if needed
    return normalizeError(error);
  }
}

// POST (JSON or FormData)
export async function postData(url, body, opts = {}) {
  const { params, signal, headers } = opts;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  try {
    const res = await api.post(url, body, {
      params,
      signal,
      headers: {
        ...(headers || {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
    });
    return res.data;
  } catch (error) {
    if (isCanceledError(error)) throw error;
    return normalizeError(error);
  }
}

// PUT
export async function editData(url, body, opts = {}) {
  const { params, signal, headers } = opts;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  try {
    const res = await api.put(url, body, {
      params,
      signal,
      headers: {
        ...(headers || {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
    });
    return res.data;
  } catch (error) {
    if (isCanceledError(error)) throw error;
    return normalizeError(error);
  }
}

// DELETE (optional body via opts.data)
export async function deleteData(url, opts = {}) {
  const { params, signal, headers, data } = opts;
  try {
    const res = await api.delete(url, { params, signal, headers, data });
    return res.data;
  } catch (error) {
    if (isCanceledError(error)) throw error;
    return normalizeError(error);
  }
}

// Multipart upload
export async function uploadImage(url, formData, opts = {}) {
  const { params, signal, headers } = opts;
  try {
    const res = await api.post(url, formData, {
      params,
      signal,
      headers: {
        ...(headers || {}),
        // axios will set the correct boundary for FormData
      },
    });
    return res.data;
  } catch (error) {
    if (isCanceledError(error)) throw error;
    return normalizeError(error);
  }
}

export async function deleteImages(url, payload, opts = {}) {
  const { params, signal, headers } = opts;
  try {
    const res = await api.delete(url, {
      params,
      signal,
      headers,
      data: payload,
    });
    return res.data;
  } catch (error) {
    if (isCanceledError(error)) throw error;
    return normalizeError(error);
  }
}

export default api;
