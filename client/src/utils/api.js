// client/src/utils/api.js
import axios from "axios";

// ========== Axios instance ==========

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  timeout: 30000,
});

// ========== Helpers ==========

function clearAuthStorage() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("actionType");
  } catch (e) {
    // ignore storage errors
  }
}

function emitAuthLogout(reason = "unauthorized") {
  try {
    window.dispatchEvent(
      new CustomEvent("thriftkart:auth-logout", {
        detail: { reason },
      })
    );
  } catch (e) {
    // ignore
  }
}

// Tiny helper for cancellation checks
export function isCanceledError(e) {
  return (
    e?.isCanceled ||
    e?.name === "AbortError" ||
    e?.name === "CanceledError" ||
    e?.code === "ERR_CANCELED"
  );
}

// ========== Interceptors ==========

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

// Response: tag cancellations, normalize message, and handle 401 auth errors
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

    const status = err?.response?.status;
    const data = err?.response?.data || {};
    const backendCode = data?.code;
    const backendMsg =
      data?.message || data?.msg || data?.error || err?.message || "";

    // --- Central 401 handling (jwt expired / no token / invalid_token) ---
    let authError = false;

    if (status === 401) {
      const messageText = String(backendMsg || "").toLowerCase();
      const codeText = String(backendCode || "").toLowerCase();

      if (
        codeText === "invalid_token" ||
        codeText === "credentials_required" ||
        messageText.includes("jwt expired") ||
        messageText.includes("no authorization token was found") ||
        messageText.includes("unauthorized")
      ) {
        authError = true;

        // Clear any stale auth data
        clearAuthStorage();

        // Let the rest of the app know
        emitAuthLogout("token_expired_or_missing");
      }
    }

    // Store a normalized message on the error itself
    const msg =
      backendMsg ||
      err?.message ||
      (authError
        ? "Your session has expired. Please sign in again."
        : "Request failed");

    err.normalizedMessage = msg;
    err.authError = authError;

    return Promise.reject(err);
  }
);

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
    code: error?.code || error?.response?.data?.code,
    authError: !!error?.authError,
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
