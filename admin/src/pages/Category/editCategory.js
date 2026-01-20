// src/Pages/Category/EditCategory.jsx
import React, { useContext, useEffect, useState } from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { emphasize, styled } from "@mui/material/styles";
import Chip from "@mui/material/Chip";
import { FaCloudUploadAlt, FaRegImages } from "react-icons/fa";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { IoCloseSharp } from "react-icons/io5";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteImages,
  editData,
  fetchDataFromApi,
  uploadImage,
} from "../../utils/api";
import { MyContext } from "../../App";

const StyledBreadcrumb = styled(Chip)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800],
  height: theme.spacing(3),
  color: theme.palette.text.primary,
  fontWeight: theme.typography.fontWeightRegular,
  "&:hover, &:focus": {
    backgroundColor: emphasize(theme.palette.grey[100], 0.06),
  },
  "&:active": {
    boxShadow: theme.shadows[1],
    backgroundColor: emphasize(theme.palette.grey[100], 0.12),
  },
}));

const EditCategory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // filenames only (what backend expects)
  const [files, setFiles] = useState([]);

  const [formFields, setFormFields] = useState({
    name: "",
    color: "",
    slug: "",
    parentId: "",
  });

  const { id } = useParams();
  const history = useNavigate();
  const context = useContext(MyContext);

  // -------- Load existing category once --------
  useEffect(() => {
    const loadCategory = async () => {
      try {
        const res = await fetchDataFromApi(`/api/category/${id}`);
        const cat = res?.categoryData?.[0];

        if (!cat) {
          context.setAlertBox({
            open: true,
            error: true,
            msg: "Category not found",
          });
          return;
        }

        // cat.images are full URLs from backend
        const filenames = Array.isArray(cat.images)
          ? cat.images
              .map((u) => {
                if (!u) return null;
                const parts = String(u).split("/");
                return parts[parts.length - 1] || null;
              })
              .filter(Boolean)
          : [];

        setFormFields({
          name: cat.name || "",
          color: cat.color || "",
          slug: cat.slug || "",
          parentId: cat.parentId || "",
        });
        setFiles(filenames);
      } catch (err) {
        console.error("Fetch category error:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Failed to load category",
        });
      }
    };

    loadCategory();
  }, [id]); // no context in deps → no refresh loop

  const changeInput = (e) => {
    setFormFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // -------- Upload new images (same as AddCategory) --------
  const onChangeFile = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const formdata = new FormData();
    for (let f of selected) {
      if (
        !["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(
          f.type
        )
      ) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Only JPG/PNG/WEBP allowed.",
        });
        e.target.value = "";
        return;
      }
      if (f.size > 1024 * 1024) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Each file must be ≤ 1 MB.",
        });
        e.target.value = "";
        return;
      }
      formdata.append("images", f);
    }

    try {
      setUploading(true);
      const res = await uploadImage("/api/category/upload", formdata);
      if (Array.isArray(res)) {
        // res = filenames from backend
        setFiles((prev) => [...prev, ...res]);
        context.setAlertBox({
          open: true,
          error: false,
          msg: "Images Uploaded!",
        });
      } else {
        console.error("Unexpected upload response:", res);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Upload failed",
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Upload failed",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // -------- Delete an image (file + from local list) --------
  const removeFile = async (index, filename) => {
    try {
      await deleteImages(`/api/category/deleteImage?img=${filename}`);
      setFiles((prev) => prev.filter((_, i) => i !== index));
      context.setAlertBox({
        open: true,
        error: false,
        msg: "Image Deleted!",
      });
    } catch (err) {
      console.error("Delete error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Delete failed",
      });
    }
  };

  // -------- Submit updated category (replace images) --------
  const editCat = async (e) => {
    e.preventDefault();
    const payload = {
      name: formFields.name,
      color: formFields.color,
      images: files, // replace with this new list
    };

    if (!payload.name || !payload.color || payload.images.length === 0) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please fill all details",
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await editData(`/api/category/${id}`, payload);
      if (res?.success === false) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res.message || "Update failed",
        });
      } else {
        context.fetchCategory?.();
        history("/category");
      }
    } catch (err) {
      console.error("Update error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Update failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 w-100 flex-row p-4 mt-2">
        <h5 className="mb-0">Edit Category</h5>
        <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
          <StyledBreadcrumb
            component="a"
            href="#"
            label="Dashboard"
            icon={<HomeIcon fontSize="small" />}
          />
          <StyledBreadcrumb
            component="a"
            label="Category"
            href="#"
            deleteIcon={<ExpandMoreIcon />}
          />
          <StyledBreadcrumb
            label="Edit Category"
            deleteIcon={<ExpandMoreIcon />}
          />
        </Breadcrumbs>
      </div>

      <form className="form" onSubmit={editCat}>
        <div className="row">
          <div className="col-sm-9">
            <div className="card p-4 mt-0">
              <div className="form-group">
                <h6>Category Name</h6>
                <input
                  type="text"
                  name="name"
                  value={formFields.name}
                  onChange={changeInput}
                />
              </div>

              <div className="form-group">
                <h6>Color</h6>
                <input
                  type="text"
                  name="color"
                  value={formFields.color}
                  onChange={changeInput}
                />
              </div>

              <div className="imagesUploadSec">
                <h5 className="mb-4">Media And Published</h5>

                {uploading ? (
                  <div className="progressBar text-center d-flex align-items-center justify-content-center flex-column">
                    <CircularProgress />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <label htmlFor="file-upload">
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={onChangeFile}
                      style={{ display: "none" }}
                    />
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<FaRegImages />}
                      className="btn-blue"
                    >
                      Choose Files
                    </Button>
                  </label>
                )}

                {files.length > 0 && (
                  <div className="uploaded-files mt-3">
                    <h6>Uploaded Files:</h6>
                    <ul className="list-unstyled">
                      {files.map((fn, index) => (
                        <li
                          key={index}
                          className="d-flex align-items-center justify-content-between border p-2 mb-2 rounded"
                        >
                          <span>{fn}</span>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => removeFile(index, fn)}
                            startIcon={<IoCloseSharp />}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <br />
                <Button
                  type="submit"
                  className="btn-blue btn-lg btn-big w-100"
                  disabled={isLoading}
                >
                  <FaCloudUploadAlt /> &nbsp;
                  {isLoading ? (
                    <CircularProgress color="inherit" className="loader" />
                  ) : (
                    "PUBLISH AND VIEW"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditCategory;
