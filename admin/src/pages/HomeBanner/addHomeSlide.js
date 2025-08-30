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
import { useNavigate } from "react-router-dom";
import { deleteImages, postData, uploadImage } from "../../utils/api";
import { MyContext } from "../../App";

const StyledBreadcrumb = styled(Chip)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800],
  height: theme.spacing(3),
  color: theme.palette.text.primary,
  fontWeight: theme.typography.fontWeightRegular,
}));

const AddHomeSlide = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const history = useNavigate();
  const context = useContext(MyContext);

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
      const res = await uploadImage("/api/homeBanner/upload", formdata);
      if (Array.isArray(res)) {
        setFiles((prev) => [...prev, ...res]);
        context.setAlertBox({ open: true, error: false, msg: "Images Uploaded!" });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = async (index, filename) => {
    await deleteImages(`/api/homeBanner/deleteImage?img=${filename}`);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addHomeSlide = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      context.setAlertBox({ open: true, error: true, msg: "Upload at least one image" });
      return;
    }
    setIsLoading(true);
    await postData("/api/homeBanner/create", { images: files });
    setIsLoading(false);
    history("/homeBannerSlide/list");
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 w-100 flex-row p-4 mt-2">
        <h5 className="mb-0">Add Home Slide</h5>
        <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
          <StyledBreadcrumb component="a" label="Dashboard" icon={<HomeIcon fontSize="small" />} />
          <StyledBreadcrumb component="a" label="Home Slide" deleteIcon={<ExpandMoreIcon />} />
          <StyledBreadcrumb label="Add Home Slide" deleteIcon={<ExpandMoreIcon />} />
        </Breadcrumbs>
      </div>

      <form className="form" onSubmit={addHomeSlide}>
        <div className="row">
          <div className="col-sm-9">
            <div className="card p-4 mt-0">
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

              {files.length > 0 && (
                <ul className="list-unstyled mt-3">
                  {files.map((fn, i) => (
                    <li key={i} className="d-flex justify-content-between align-items-center border p-2 mb-2 rounded">
                      <span>{fn}</span>
                      <Button size="small" color="error" variant="outlined" onClick={() => removeFile(i, fn)} startIcon={<IoCloseSharp />}>
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

export default AddHomeSlide;
