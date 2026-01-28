import React, { useContext, useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { styled } from "@mui/material/styles";
import Chip from "@mui/material/Chip";
import { FaCloudUploadAlt, FaRegImages } from "react-icons/fa";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { IoCloseSharp } from "react-icons/io5";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useNavigate } from "react-router-dom";
import { MyContext } from "../../App";

import {
  deleteImages,
  postData,
  uploadImage,
  fetchDataFromApi,
} from "../../utils/api";

const StyledBreadcrumb = styled(Chip)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800],
  height: theme.spacing(3),
  color: theme.palette.text.primary,
  fontWeight: theme.typography.fontWeightRegular,
}));

const AddBanner = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);

  const [catData, setCatData] = useState([]);
  const [subCatData, setSubCatData] = useState([]);

  const [categoryVal, setCategoryVal] = useState("");
  const [subCatVal, setSubCatVal] = useState("");

  const history = useNavigate();
  const context = useContext(MyContext);

  /* ----------------------------------------
     CATEGORIES – normalize from context
     ---------------------------------------- */
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

  /* ----------------------------------------
     SUB CATEGORIES – API + normalization
     ---------------------------------------- */
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

  // 🔍 Helper: extract parent category id from subCat in a robust way
  const getSubCatParentId = (s) => {
    if (!s) return null;

    // catId can be object or string
    if (s.catId && typeof s.catId === "object" && s.catId._id)
      return String(s.catId._id);
    if (s.catId) return String(s.catId);

    // categoryId can be object or string
    if (s.categoryId && typeof s.categoryId === "object" && s.categoryId._id)
      return String(s.categoryId._id);
    if (s.categoryId) return String(s.categoryId);

    // category can be object or string
    if (s.category && typeof s.category === "object" && s.category._id)
      return String(s.category._id);
    if (s.category) return String(s.category);

    return null;
  };

  // ✅ Filter subcats that belong to the selected primary category
  const filteredSubCats = useMemo(() => {
    if (!categoryVal) return [];
    return subCatData.filter(
      (s) => getSubCatParentId(s) === String(categoryVal)
    );
  }, [categoryVal, subCatData]);

  /* ----------------------------------------
     FILE UPLOAD HANDLERS
     ---------------------------------------- */
  const onChangeFile = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const formdata = new FormData();
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
          msg: "Max size 5 MB per file.",
        });
        return;
      }
      formdata.append("images", f);
    }

    try {
      setUploading(true);
      const res = await uploadImage("/api/banners/upload", formdata);
      if (Array.isArray(res)) {
        setFiles((prev) => [...prev, ...res]);
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

  const removeFile = async (index, filename) => {
    await deleteImages(`/api/banners/deleteImage?img=${filename}`);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* ----------------------------------------
     SUBMIT
     ---------------------------------------- */
  const addBanner = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Upload at least one image",
      });
      return;
    }

    setIsLoading(true);
    await postData("/api/banners/create", {
      images: files,
      catId: categoryVal || null,
      subCatId: subCatVal || null,
    });
    setIsLoading(false);
    history("/banners");
  };

  const handleCategoryChange = (e) => {
    setCategoryVal(e.target.value);
    setSubCatVal(""); // reset subcat whenever primary changes
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 w-100 flex-row p-4 mt-2">
        <h5 className="mb-0">Add Home Banner</h5>
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
            label="Add Home Banner"
            deleteIcon={<ExpandMoreIcon />}
          />
        </Breadcrumbs>
      </div>

      <form className="form" onSubmit={addBanner}>
        <div className="row">
          <div className="col-sm-9">
            <div className="card p-4 mt-0">
              <div className="row">
                {/* CATEGORY */}
                <div className="col-md-6">
                  <h6>CATEGORY</h6>
                  <Select
                    value={categoryVal}
                    onChange={handleCategoryChange}
                    className="w-100"
                    displayEmpty
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

                {/* SUB CATEGORY */}
                <div className="col-md-6">
                  <h6>SUB CATEGORY</h6>
                  <Select
                    value={subCatVal}
                    onChange={(e) => setSubCatVal(e.target.value)}
                    className="w-100"
                    displayEmpty
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
                    {filteredSubCats.map((s) => (
                      <MenuItem key={s._id} value={s._id}>
                        {s.subCat}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              </div>

              <h5 className="mb-4 mt-4">Media And Published</h5>

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

export default AddBanner;
