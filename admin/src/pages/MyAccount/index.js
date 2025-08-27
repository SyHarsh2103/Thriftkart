import React, { useContext, useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { IoMdCloudUpload } from "react-icons/io";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useNavigate } from "react-router-dom";

import {
  deleteData,
  editData,
  fetchDataFromApi,
  uploadImage,
} from "../../utils/api";

import { MyContext } from "../../App";
import NoUserImg from "../../assets/images/no-user.jpg";

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography component="div">{children}</Typography>
        </Box>
      )}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return { id: `simple-tab-${index}`, "aria-controls": `simple-tabpanel-${index}` };
}

const MyAccount = () => {
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [previews, setPreviews] = useState([]); // array of image URLs (optional)
  const [userData, setUserData] = useState(null);

  const [formFields, setFormFields] = useState({
    name: "",
    email: "",
    phone: "",
    images: [], // optional
    isAdmin: false,
  });

  const [fields, setFields] = useState({
    oldPassword: "",
    password: "",
    confirmPassword: "",
  });

  const context = useContext(MyContext);
  const navigate = useNavigate();

  const userFromLS = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signIn");
      return;
    }

    // Optional: clear temp images if your API supports it
    deleteData("/api/imageUpload/deleteAllImages").catch(() => {});

    if (!userFromLS?.userId) return;

    fetchDataFromApi(`/api/user/${userFromLS.userId}`).then((res) => {
      if (!res) return;
      setUserData(res);
      const imgs = Array.isArray(res.images) ? res.images : [];
      setPreviews(imgs);
      setFormFields((prev) => ({
        ...prev,
        name: res.name || "",
        email: res.email || "",
        phone: res.phone || "",
        images: imgs,
        isAdmin: !!res.isAdmin,
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, userFromLS?.userId]);

  const handleTabChange = (_e, newValue) => setTabValue(newValue);

  const changeInput = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({ ...prev, [name]: value }));
  };

  const changeInput2 = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  // Upload images (optional)
  const onChangeFile = async (e, apiEndPoint) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      const fd = new FormData();
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file || !validTypes.includes(file.type)) {
          context.setAlertBox({
            open: true,
            error: true,
            msg: "Please select JPG, PNG, or WEBP image files.",
          });
          setUploading(false);
          return;
        }
        fd.append("images", file);
      }

      // Upload
      await uploadImage(apiEndPoint, fd);

      // After upload, fetch uploaded URLs (adjust if your API differs)
      const response = await fetchDataFromApi("/api/imageUpload");
      const collected = [];
      if (Array.isArray(response)) {
        response.forEach((item) => {
          (item?.images || []).forEach((img) => collected.push(img));
        });
      }

      // Dedup + merge with existing previews
      const next = Array.from(new Set([...(previews || []), ...collected]));
      setPreviews(next);
      setFormFields((prev) => ({ ...prev, images: next }));

      context.setAlertBox({ open: true, error: false, msg: "Images Uploaded!" });
    } catch (err) {
      console.error(err);
      context.setAlertBox({ open: true, error: true, msg: "Upload failed. Try again." });
    } finally {
      setUploading(false);
      e.target.value = ""; // allow reselect
    }
  };

  const edituser = async (e) => {
    e.preventDefault();

    if (!formFields.name || !formFields.email || !formFields.phone) {
      context.setAlertBox({ open: true, error: true, msg: "Please fill all the details" });
      return;
    }

    try {
      setIsLoading(true);

      const payload = {
        name: formFields.name,
        email: formFields.email,
        phone: formFields.phone,
      };
      // Include images only if provided
      if (Array.isArray(previews) && previews.length) {
        payload.images = previews;
      }

      await editData(`/api/user/${userFromLS?.userId}`, payload);

      // Optional: clear temporary uploaded images store
      deleteData("/api/imageUpload/deleteAllImages").catch(() => {});

      context.setAlertBox({ open: true, error: false, msg: "User updated" });
    } catch (err) {
      console.error(err);
      context.setAlertBox({ open: true, error: true, msg: "Update failed" });
    } finally {
      setIsLoading(false);
    }
  };

  // const changePassword = async (e) => {
  //   e.preventDefault();

  //   if (!fields.oldPassword || !fields.password || !fields.confirmPassword) {
  //     context.setAlertBox({ open: true, error: true, msg: "Please fill all the details" });
  //     return;
  //   }
  //   if (fields.password !== fields.confirmPassword) {
  //     context.setAlertBox({ open: true, error: true, msg: "Password and confirm password do not match" });
  //     return;
  //   }
  //   if (!userData?.email || !userFromLS?.userId) {
  //     context.setAlertBox({ open: true, error: true, msg: "User not found in session" });
  //     return;
  //   }

  //   try {
  //     setIsLoading(true);
  //     const data = {
  //       name: userData?.name || formFields.name,
  //       email: (userData?.email || formFields.email || "").trim().toLowerCase(),
  //       password: fields.oldPassword,
  //       newPass: fields.password,
  //       phone: formFields.phone,
  //     };
  //     // Optionally pass images if you want server to keep/override
  //     if (Array.isArray(previews)) {
  //       data.images = previews;
  //     }

  //     const res = await editData(`/api/user/changePassword/${userFromLS.userId}`, data);
  //     if (res?.error) {
  //       context.setAlertBox({ open: true, error: true, msg: res?.msg || "Password change failed" });
  //     } else {
  //       context.setAlertBox({ open: true, error: false, msg: "Password changed successfully" });
  //       setFields({ oldPassword: "", password: "", confirmPassword: "" });
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     context.setAlertBox({ open: true, error: true, msg: "Password change failed" });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  return (
    <section className="section myAccountPage right-content w-100">
      <div className="card shadow border-0 w-100 flex-row p-4 align-items-center">
        <h5 className="mb-0">My Account</h5>
      </div>

      <Box sx={{ width: "100%" }} className="myAccBox card border-0 pl-3 pr-3">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="my account tabs">
            <Tab label="Edit Profile" {...a11yProps(0)} />
            {/* <Tab label="Change Password" {...a11yProps(1)} /> */}
          </Tabs>
        </Box>

        {/* EDIT PROFILE */}
        <CustomTabPanel value={tabValue} index={0}>
          <form onSubmit={edituser}>
            <div className="row">
              <div className="col-md-4">
                <div className="userImage d-flex align-items-center justify-content-center position-relative">
                  {uploading ? (
                    <CircularProgress />
                  ) : (
                    <>
                      {previews && previews.length > 0 ? (
                        <div className="w-100 d-flex flex-wrap gap-2">
                          {previews.map((img, idx) => (
                            <img
                              src={img}
                              key={img + idx}
                              alt={`user-img-${idx}`}
                              style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8 }}
                            />
                          ))}
                        </div>
                      ) : (
                        <img
                          src={NoUserImg}
                          alt="no user"
                          style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8 }}
                        />
                      )}

                      <div className="overlay d-flex align-items-center justify-content-center">
                        <IoMdCloudUpload />
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          multiple
                          onChange={(e) => onChangeFile(e, "/api/user/upload")}
                          name="images"
                          aria-label="Upload images"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="col-md-8">
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <TextField
                        label="Name"
                        variant="outlined"
                        className="w-100"
                        name="name"
                        onChange={changeInput}
                        value={formFields.name}
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <TextField
                        label="Email"
                        disabled
                        variant="outlined"
                        className="w-100"
                        name="email"
                        onChange={changeInput}
                        value={formFields.email}
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <TextField
                        label="Phone"
                        variant="outlined"
                        className="w-100"
                        name="phone"
                        onChange={changeInput}
                        value={formFields.phone}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <Button type="submit" className="btn-blue btn-lg btn-big" disabled={isLoading}>
                    {isLoading ? <CircularProgress size={24} /> : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CustomTabPanel>

        {/* CHANGE PASSWORD */}
        {/* <CustomTabPanel value={tabValue} index={1}>
          <form onSubmit={changePassword}>
            <div className="row">
              <div className="col-md-12">
                <div className="row">
                  <div className="col-md-4">
                    <div className="form-group">
                      <TextField
                        label="Old Password"
                        type="password"
                        variant="outlined"
                        className="w-100"
                        name="oldPassword"
                        onChange={changeInput2}
                        value={fields.oldPassword}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <TextField
                        label="New Password"
                        type="password"
                        variant="outlined"
                        className="w-100"
                        name="password"
                        onChange={changeInput2}
                        value={fields.password}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <TextField
                        label="Confirm Password"
                        type="password"
                        variant="outlined"
                        className="w-100"
                        name="confirmPassword"
                        onChange={changeInput2}
                        value={fields.confirmPassword}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <Button type="submit" className="btn-blue bg-red btn-lg btn-big" disabled={isLoading}>
                    {isLoading ? <CircularProgress size={24} /> : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CustomTabPanel> */}
      </Box>
    </section>
  );
};

export default MyAccount;
