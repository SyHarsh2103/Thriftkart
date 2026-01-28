import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { emphasize, styled } from "@mui/material/styles";
import Chip from "@mui/material/Chip";
import { FaCloudUploadAlt, FaRegImages } from "react-icons/fa";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { IoCloseSharp } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import {
  deleteImages,
  postData,
  uploadImage,
  fetchDataFromApi,
} from "../../utils/api";
import { MyContext } from "../../App";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

// -------- Breadcrumb styling --------
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

const AddHomeBottomBanner = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);

  const [catData, setCatData] = useState([]);
  const [subCatData, setSubCatData] = useState([]);

  const [categoryVal, setCategoryVal] = useState("");
  const [subCatVal, setSubCatVal] = useState("");

  const [formFields, setFormFields] = useState({
    images: [],
    catName: null,
    catId: null,
    subCatId: null,
    subCatName: null,
  });

  const history = useNavigate();
  const context = useContext(MyContext);

  /* ------------------------------
     CATEGORIES – normalize
     ------------------------------ */
  useEffect(() => {
    const rawCat = context.catData;
    let catList = [];

    if (Array.isArray(rawCat?.categoryList)) {
      // case: { categoryList: [...] }
      catList = rawCat.categoryList;
    } else if (Array.isArray(rawCat)) {
      // case: [...] directly
      catList = rawCat;
    }

    setCatData(catList || []);
  }, [context.catData]);

  /* ------------------------------
     SUB CATEGORIES – via API
     ------------------------------ */
  useEffect(() => {
    fetchDataFromApi("/api/subCat")
      .then((res) => {
        const list = Array.isArray(res?.subCategoryList)
          ? res.subCategoryList
          : Array.isArray(res)
          ? res
          : [];
        setSubCatData(list);
      })
      .catch((err) => {
        console.error("subCat fetch error:", err);
        setSubCatData([]);
      });
  }, []);

  // Helper: get parent category id from a subcategory in multiple possible shapes
  const getSubCatParentId = (s) => {
    if (!s) return null;

    if (s.catId && typeof s.catId === "object" && s.catId._id)
      return String(s.catId._id);
    if (s.catId) return String(s.catId);

    if (s.categoryId && typeof s.categoryId === "object" && s.categoryId._id)
      return String(s.categoryId._id);
    if (s.categoryId) return String(s.categoryId);

    if (s.category && typeof s.category === "object" && s.category._id)
      return String(s.category._id);
    if (s.category) return String(s.category);

    return null;
  };

  // Only show subcategories belonging to selected category
  const filteredSubCats = useMemo(() => {
    if (!categoryVal) return [];
    return subCatData.filter(
      (s) => getSubCatParentId(s) === String(categoryVal)
    );
  }, [categoryVal, subCatData]);

  /* ------------------------------
     Upload images
     ------------------------------ */
  const onChangeFile = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const fd = new FormData();
    for (let f of selected) {
      if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(f.type)) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Only JPG/PNG/WEBP allowed.",
        });
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Max size 5 MB",
        });
        return;
      }
      fd.append("images", f);
    }

    try {
      setUploading(true);
      const res = await uploadImage("/api/homeBottomBanners/upload", fd);
      if (Array.isArray(res)) {
        setFiles((prev) => [...prev, ...res]);
        setFormFields((prev) => ({
          ...prev,
          images: [...prev.images, ...res],
        }));
        context.setAlertBox({
          open: true,
          error: false,
          msg: "Images Uploaded!",
        });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  /* ------------------------------
     Remove image
     ------------------------------ */
  const removeFile = async (index, filename) => {
    await deleteImages(`/api/homeBottomBanners/deleteImage?img=${filename}`);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFormFields((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  /* ------------------------------
     Category/Subcategory handlers
     ------------------------------ */
  const handleChangeCategory = (e) => {
    const val = e.target.value;
    setCategoryVal(val);
    setSubCatVal("");

    const cat = catData.find((c) => String(c._id) === String(val));

    setFormFields((prev) => ({
      ...prev,
      catId: val || null,
      catName: cat?.name || null,
      subCatId: null,
      subCatName: null,
    }));
  };

  const handleChangeSubCategory = (e) => {
    const val = e.target.value;
    setSubCatVal(val);

    const sub = filteredSubCats.find((s) => String(s._id) === String(val));

    setFormFields((prev) => ({
      ...prev,
      subCatId: val || null,
      subCatName: sub?.name || null,
    }));
  };

  /* ------------------------------
     Submit
     ------------------------------ */
  const addBanner = async (e) => {
    e.preventDefault();
    if (formFields.images.length === 0) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Upload at least one image",
      });
      return;
    }
    setIsLoading(true);
    await postData("/api/homeBottomBanners/create", formFields);
    setIsLoading(false);
    history("/homeBottomBanners");
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 w-100 flex-row p-4 mt-2">
        <h5 className="mb-0">Add Home Bottom Banner</h5>
        <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
          <StyledBreadcrumb
            component="a"
            label="Dashboard"
            icon={<HomeIcon fontSize="small" />}
          />
          <StyledBreadcrumb
            component="a"
            label="Home Banners"
            deleteIcon={<ExpandMoreIcon />}
          />
          <StyledBreadcrumb
            label="Add Banner"
            deleteIcon={<ExpandMoreIcon />}
          />
        </Breadcrumbs>
      </div>

      <form className="form" onSubmit={addBanner}>
        <div className="row">
          <div className="col-sm-9">
            <div className="card p-4 mt-0">
              {/* Category + SubCategory */}
              <div className="row">
                <div className="col-md-6">
                  <h6>CATEGORY</h6>
                  <Select
                    value={categoryVal}
                    onChange={handleChangeCategory}
                    displayEmpty
                    className="w-100"
                  >
                    <MenuItem value="">
                      <em>Select Category</em>
                    </MenuItem>
                    {catData.map((cat) => (
                      <MenuItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </div>

                <div className="col-md-6">
                  <h6>SUB CATEGORY</h6>
                  <Select
                    value={subCatVal}
                    onChange={handleChangeSubCategory}
                    displayEmpty
                    className="w-100"
                    disabled={!categoryVal || filteredSubCats.length === 0}
                  >
                    <MenuItem value="">
                      <em>
                        {!categoryVal
                          ? "Select Category first"
                          : filteredSubCats.length
                          ? "Select Sub Category"
                          : "No Subcategories for this Category"}
                      </em>
                    </MenuItem>
                    {filteredSubCats.map((sub) => (
                      <MenuItem key={sub._id} value={sub._id}>
                        {sub.subCat}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Upload Section */}
              <div className="imagesUploadSec mt-4">
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

                {/* File list only */}
                {files.length > 0 && (
                  <ul className="list-unstyled mt-3">
                    {files.map((fn, i) => (
                      <li
                        key={i}
                        className="d-flex justify-content-between align-items-center border p-2 mb-2 rounded"
                      >
                        <span>{fn}</span>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => removeFile(i, fn)}
                          startIcon={<IoCloseSharp />}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
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
      </form>
    </div>
  );
};

export default AddHomeBottomBanner;
