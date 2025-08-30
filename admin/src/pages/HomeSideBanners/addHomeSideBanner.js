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
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useNavigate } from "react-router-dom";
import { MyContext } from "../../App";

import { deleteImages, postData, uploadImage } from "../../utils/api";

// Breadcrumb style
const StyledBreadcrumb = styled(Chip)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800],
  height: theme.spacing(3),
  color: theme.palette.text.primary,
  fontWeight: theme.typography.fontWeightRegular,
}));

const AddSideBanner = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]); // filenames only
  const [categoryVal, setCategoryVal] = useState(null);
  const [subCatVal, setSubCatVal] = useState(null);
  const [subCatData, setSubCatData] = useState([]);

  const history = useNavigate();
  const context = useContext(MyContext);

  useEffect(() => {
    // collect all subcats into flat array
    const subCatArr = [];
    context.catData?.categoryList?.forEach((cat) => {
      if (cat?.children?.length) {
        cat.children.forEach((s) => subCatArr.push(s));
      }
    });
    setSubCatData(subCatArr);
  }, [context.catData]);

  // Upload files
  const onChangeFile = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const formdata = new FormData();
    for (let f of selected) {
      if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(f.type)) {
        context.setAlertBox({ open: true, error: true, msg: "Only JPG/PNG/WEBP allowed." });
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        context.setAlertBox({ open: true, error: true, msg: "Max size 5 MB per file." });
        return;
      }
      formdata.append("images", f);
    }

    try {
      setUploading(true);
      const res = await uploadImage("/api/homeSideBanners/upload", formdata);
      if (Array.isArray(res)) {
        setFiles((prev) => [...prev, ...res]);
        context.setAlertBox({ open: true, error: false, msg: "Images Uploaded!" });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Remove file
  const removeFile = async (index, filename) => {
    await deleteImages(`/api/homeSideBanners/deleteImage?img=${filename}`);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit
  const addSideBanner = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      context.setAlertBox({ open: true, error: true, msg: "Upload at least one image" });
      return;
    }

    setIsLoading(true);
    await postData("/api/homeSideBanners/create", {
      images: files,
      catId: categoryVal,
      subCatId: subCatVal,
    });
    setIsLoading(false);
    history("/homeSideBanners");
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 w-100 flex-row p-4 mt-2">
        <h5 className="mb-0">Add Home Side Banner</h5>
        <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
          <StyledBreadcrumb component="a" label="Dashboard" icon={<HomeIcon fontSize="small" />} />
          <StyledBreadcrumb component="a" label="Home Side Banners" deleteIcon={<ExpandMoreIcon />} />
          <StyledBreadcrumb label="Add Home Side Banner" deleteIcon={<ExpandMoreIcon />} />
        </Breadcrumbs>
      </div>

      <form className="form" onSubmit={addSideBanner}>
        <div className="row">
          <div className="col-sm-9">
            <div className="card p-4 mt-0">
              <div className="row">
                <div className="col-md-6">
                  <h6>CATEGORY</h6>
                  <Select
                    value={categoryVal || ""}
                    onChange={(e) => setCategoryVal(e.target.value)}
                    className="w-100"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {context.catData?.categoryList?.map((cat, i) => (
                      <MenuItem key={i} value={cat._id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
                <div className="col-md-6">
                  <h6>SUB CATEGORY</h6>
                  <Select
                    value={subCatVal || ""}
                    onChange={(e) => setSubCatVal(e.target.value)}
                    className="w-100"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {subCatData.map((s, i) => (
                      <MenuItem key={i} value={s._id}>
                        {s.name}
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
                  <Button variant="contained" component="span" startIcon={<FaRegImages />} className="btn-blue">
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

export default AddSideBanner;
