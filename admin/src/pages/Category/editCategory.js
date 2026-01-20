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

import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

//breadcrumb code
const StyledBreadcrumb = styled(Chip)(({ theme }) => {
  const backgroundColor =
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800];
  return {
    backgroundColor,
    height: theme.spacing(3),
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeightRegular,
    "&:hover, &:focus": {
      backgroundColor: emphasize(backgroundColor, 0.06),
    },
    "&:active": {
      boxShadow: theme.shadows[1],
      backgroundColor: emphasize(backgroundColor, 0.12),
    },
  };
});

const EditCategory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Text fields
  const [formFields, setFormFields] = useState({
    name: "",
    color: "",
  });

  // 👉 Full image URLs for preview (what backend sends in GET /api/category/:id)
  const [previews, setPreviews] = useState([]);

  // 👉 Pure filenames stored in Mongo (what backend expects for `images` + deleteImage)
  const [imageFiles, setImageFiles] = useState([]);

  const { id } = useParams();
  const history = useNavigate();
  const context = useContext(MyContext);

  // ---------------- Load category on mount ----------------
  useEffect(() => {
    const loadCategory = async () => {
      try {
        context.setProgress?.(20);

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

        // Backend already returns full URLs for images
        const urls = Array.isArray(cat.images) ? cat.images : [];

        // Extract filenames from URLs for backend operations
        const filenames = urls
          .map((u) => {
            if (!u) return null;
            const parts = String(u).split("/");
            return parts[parts.length - 1] || null;
          })
          .filter(Boolean);

        setPreviews(urls);            // for <img src=...>
        setImageFiles(filenames);     // for PUT / DELETE
        setFormFields({
          name: cat.name || "",
          color: cat.color || "",
        });
      } catch (err) {
        console.error("Fetch category error:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Failed to load category",
        });
      } finally {
        context.setProgress?.(100);
      }
    };

    loadCategory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------- Handlers ----------------

  const changeInput = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Upload new images
  const onChangeFile = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const formdata = new FormData();

    for (const file of selected) {
      if (
        !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
          file.type
        )
      ) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Please select a valid JPG / PNG / WEBP image file.",
        });
        e.target.value = "";
        return;
      }

      if (file.size > 1024 * 1024) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Each file must be ≤ 1 MB.",
        });
        e.target.value = "";
        return;
      }

      formdata.append("images", file);
    }

    try {
      setUploading(true);

      // Backend returns an array of filenames
      const res = await uploadImage("/api/category/upload", formdata);

      if (Array.isArray(res) && res.length > 0) {
        // Add filenames to imageFiles
        setImageFiles((prev) => [...prev, ...res]);

        // Build preview URLs for these new filenames
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const newUrls = res.map(
          (fn) => `${origin}/uploads/categories/${fn}`
        );

        setPreviews((prev) => [...prev, ...newUrls]);

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
    } catch (error) {
      console.error("Upload error:", error);
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

  // Delete image (disk + state)
  const removeImg = async (index) => {
    const userInfo = JSON.parse(localStorage.getItem("user"));

    if (userInfo?.email !== "admin9643@gmail.com") {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Only Admin can delete Category Image",
      });
      return;
    }

    const filename = imageFiles[index]; // pure filename
    if (!filename) {
      // Safeguard: if somehow missing, just remove from preview
      setPreviews((prev) => prev.filter((_, i) => i !== index));
      setImageFiles((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    try {
      await deleteImages(`/api/category/deleteImage?img=${filename}`);

      // Remove from local state
      setPreviews((prev) => prev.filter((_, i) => i !== index));
      setImageFiles((prev) => prev.filter((_, i) => i !== index));

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Image Deleted!",
      });
    } catch (err) {
      console.error("Delete image error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to delete image",
      });
    }
  };

  // Submit edited category
  const editCat = async (e) => {
    e.preventDefault();

    if (!formFields.name || !formFields.color || imageFiles.length === 0) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please fill all the details and keep at least one image.",
      });
      return;
    }

    const payload = {
      name: formFields.name,
      color: formFields.color,
      images: imageFiles, // IMPORTANT: send filenames only
    };

    try {
      setIsLoading(true);

      const res = await editData(`/api/category/${id}`, payload);
      if (res?.success === false) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res.message || "Update failed",
        });
        setIsLoading(false);
        return;
      }

      context.fetchCategory?.();

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Category updated successfully!",
      });

      history("/category");
    } catch (err) {
      console.error("Update category error:", err);
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

                <div className="imgUploadBox d-flex align-items-center">
                  {/* Existing + newly added previews */}
                  {previews?.length > 0 &&
                    previews.map((img, index) => (
                      <div className="uploadBox" key={index}>
                        <span
                          className="remove"
                          onClick={() => removeImg(index)}
                        >
                          <IoCloseSharp />
                        </span>
                        <div className="box">
                          <LazyLoadImage
                            alt={"image"}
                            effect="blur"
                            className="w-100"
                            src={img}
                          />
                        </div>
                      </div>
                    ))}

                  {/* Upload Box */}
                  <div className="uploadBox">
                    {uploading ? (
                      <div className="progressBar text-center d-flex align-items-center justify-content-center flex-column">
                        <CircularProgress />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          multiple
                          onChange={onChangeFile}
                          name="images"
                        />
                        <div className="info">
                          <FaRegImages />
                          <h5>image upload</h5>
                        </div>
                      </>
                    )}
                  </div>
                </div>

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
