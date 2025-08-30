import axios from "axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// -------- GET --------
export const fetchDataFromApi = async (url) => {
  try {
    const { data } = await axios.get(process.env.REACT_APP_BASE_URL + url, {
      headers: getAuthHeaders(),
    });
    return data;
  } catch (error) {
    console.error("fetchDataFromApi error:", error);
    return { success: false, msg: "Request failed" };
  }
};

// -------- POST (file upload) --------
export const uploadImage = async (url, formData) => {
  try {
    const { data } = await axios.post(process.env.REACT_APP_BASE_URL + url, formData, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, 
    });
    return data; // expected: array of uploaded filenames
  } catch (error) {
    console.error("uploadImage error:", error);
    return { success: false, msg: "Upload failed" };
  }
};

// -------- POST (JSON) --------
export const postData = async (url, formData) => {
  try {
    const { data } = await axios.post(process.env.REACT_APP_BASE_URL + url, formData, {
      headers: getAuthHeaders(),
    });
    return data;
  } catch (error) {
    console.error("postData error:", error);
    return { success: false, msg: "Request failed" };
  }
};

// -------- PUT --------
export const editData = async (url, updatedData) => {
  try {
    const { data } = await axios.put(process.env.REACT_APP_BASE_URL + url, updatedData, {
      headers: getAuthHeaders(),
    });
    return data;
  } catch (error) {
    console.error("editData error:", error);
    return { success: false, msg: "Update failed" };
  }
};

// -------- DELETE (no body) --------
export const deleteData = async (url) => {
  try {
    const { data } = await axios.delete(process.env.REACT_APP_BASE_URL + url, {
      headers: getAuthHeaders(),
    });
    return data;
  } catch (error) {
    console.error("deleteData error:", error);
    return { success: false, msg: "Delete failed" };
  }
};

// -------- DELETE (with body e.g. image) --------
export const deleteImages = async (url, body = {}) => {
  try {
    const { data } = await axios.delete(process.env.REACT_APP_BASE_URL + url, {
      headers: getAuthHeaders(),
      data: body, // <-- axios lets you send a body in DELETE
    });
    return data;
  } catch (error) {
    console.error("deleteImages error:", error);
    return { success: false, msg: "Delete image failed" };
  }
};
