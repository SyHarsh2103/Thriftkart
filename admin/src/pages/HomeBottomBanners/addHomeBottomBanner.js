import React, { useContext, useState, useEffect } from "react";
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
import { deleteImages, postData, uploadImage } from "../../utils/api";
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
  const [categoryVal, setCategoryVal] = useState("");
  const [subCatVal, setSubCatVal] = useState("");
  const [subCatData, setSubCatData] = useState([]);

  const [formFields, setFormFields] = useState({
    images: [],
    catName: null,
    catId: null,
    subCatId: null,
    subCatName: null,
  });

  const history = useNavigate();
  const context = useContext(MyContext);

  // Collect subcategories
  useEffect(() => {
    const subCatArr = [];
    context.catData?.categoryList?.forEach((cat) => {
      if (cat?.children?.length > 0) {
        cat.children.forEach((sub) => subCatArr.push(sub));
      }
    });
    setSubCatData(subCatArr);
  }, [context.catData]);

  // Upload images
  const onChangeFile = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const fd = new FormData();
    for (let f of selected) {
      if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(f.type)) {
        context.setAlertBox({ open: true, error: true, msg: "Only JPG/PNG/WEBP allowed." });
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        context.setAlertBox({ open: true, error: true, msg: "Max size 5 MB" });
        return;
      }
      fd.append("images", f);
    }

    try {
      setUploading(true);
      const res = await uploadImage("/api/homeBottomBanners/upload", fd);
      if (Array.isArray(res)) {
        setFiles((prev) => [...prev, ...res]);
        setFormFields((prev) => ({ ...prev, images: [...prev.images, ...res] }));
        context.setAlertBox({ open: true, error: false, msg: "Images Uploaded!" });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Remove image
  const removeFile = async (index, filename) => {
    await deleteImages(`/api/homeBottomBanners/deleteImage?img=${filename}`);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFormFields((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Category/Subcategory handlers
  const handleChangeCategory = (e) => {
    setCategoryVal(e.target.value);
    const cat = context.catData.categoryList.find((c) => c._id === e.target.value);
    if (cat) {
      setFormFields((prev) => ({ ...prev, catId: cat._id, catName: cat.name }));
    }
  };

  const handleChangeSubCategory = (e) => {
    setSubCatVal(e.target.value);
    const sub = subCatData.find((s) => s._id === e.target.value);
    if (sub) {
      setFormFields((prev) => ({ ...prev, subCatId: sub._id, subCatName: sub.name }));
    }
  };

  // Submit
  const addBanner = async (e) => {
    e.preventDefault();
    if (formFields.images.length === 0) {
      context.setAlertBox({ open: true, error: true, msg: "Upload at least one image" });
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
          <StyledBreadcrumb component="a" label="Dashboard" icon={<HomeIcon fontSize="small" />} />
          <StyledBreadcrumb component="a" label="Home Banners" deleteIcon={<ExpandMoreIcon />} />
          <StyledBreadcrumb label="Add Banner" deleteIcon={<ExpandMoreIcon />} />
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
                    value={categoryVal || ""}
                    onChange={handleChangeCategory}
                    displayEmpty
                    className="w-100"
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {context.catData?.categoryList?.map((cat) => (
                      <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>
                    ))}
                  </Select>
                </div>

                <div className="col-md-6">
                  <h6>SUB CATEGORY</h6>
                  <Select
                    value={subCatVal || ""}
                    onChange={handleChangeSubCategory}
                    displayEmpty
                    className="w-100"
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {subCatData.map((sub) => (
                      <MenuItem key={sub._id} value={sub._id}>{sub.name}</MenuItem>
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
                    <input id="file-upload" type="file" multiple onChange={onChangeFile} style={{ display: "none" }} />
                    <Button variant="contained" component="span" startIcon={<FaRegImages />} className="btn-blue">
                      Choose Files
                    </Button>
                  </label>
                )}

                {/* File list only */}
                {files.length > 0 && (
                  <ul className="list-unstyled mt-3">
                    {files.map((fn, i) => (
                      <li key={i} className="d-flex justify-content-between align-items-center border p-2 mb-2 rounded">
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
              <Button type="submit" className="btn-blue btn-lg btn-big w-100">
                <FaCloudUploadAlt /> &nbsp;
                {isLoading ? <CircularProgress color="inherit" className="loader" /> : "PUBLISH AND VIEW"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddHomeBottomBanner;
