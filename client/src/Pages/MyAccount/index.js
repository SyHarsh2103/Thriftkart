import React, { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { IoMdCloudUpload } from "react-icons/io";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import { editData, fetchDataFromApi, uploadImage } from "../../utils/api";

import { MyContext } from "../../App";

import NoUserImg from "../../assets/images/no-user.jpg";
import CircularProgress from "@mui/material/CircularProgress";

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
          <Typography>{children}</Typography>
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
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const MyAccount = () => {
  const [value, setValue] = useState(0);
  const history = useNavigate();
  const context = useContext(MyContext);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [previews, setPreviews] = useState([]);
  const [userData, setUserData] = useState(null);

  const [formFields, setFormFields] = useState({
    name: "",
    email: "",
    phone: "",
    images: [],
    isAdmin: false,
  });

  const [fields, setFields] = useState({
    oldPassword: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser?.userId) {
      // Fallback safety – App.js already protects this route with RequireAuth
      history("/signIn");
      return;
    }

    // Load user profile
    (async () => {
      try {
        const res = await fetchDataFromApi(`/api/user/${storedUser.userId}`);
        setUserData(res || null);
        const imgs = Array.isArray(res?.images) ? res.images : [];

        setPreviews(imgs);
        setFormFields({
          name: res?.name || "",
          email: res?.email || "",
          phone: res?.phone || "",
          images: imgs,
          isAdmin: !!res?.isAdmin,
        });
      } catch (err) {
        console.error("Failed to load user profile:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Failed to load profile",
        });
      }
    })();

    context.setEnableFilterTab(false);
  }, []);

  const changeInput = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const changeInput2 = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ---------- Profile image upload ----------
  const onChangeFile = async (e, apiEndPoint) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      setUploading(true);

      const formdata = new FormData();
      for (const file of files) {
        if (
          file.type === "image/jpeg" ||
          file.type === "image/jpg" ||
          file.type === "image/png" ||
          file.type === "image/webp"
        ) {
          formdata.append("images", file);
        } else {
          context.setAlertBox({
            open: true,
            error: true,
            msg: "Please select a valid JPG, PNG, or WEBP image file.",
          });
          setUploading(false);
          return;
        }
      }

      // Upload to /api/user/upload -> returns array of URLs
      const uploadedUrls = await uploadImage(apiEndPoint, formdata);

      if (!Array.isArray(uploadedUrls)) {
        throw new Error("Unexpected upload response");
      }

      setPreviews(uploadedUrls);

      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.userId) {
        throw new Error("User not found in local storage");
      }

      // Save new image URLs to user profile
      const payload = {
        name: formFields.name,
        email: formFields.email,
        phone: formFields.phone,
        images: uploadedUrls,
      };

      const updatedUser = await editData(
        `/api/user/${storedUser.userId}`,
        payload
      );

      setFormFields((prev) => ({
        ...prev,
        images: updatedUser?.images || uploadedUrls,
      }));

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Profile image updated",
      });
    } catch (error) {
      console.error("Upload error:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: error?.message || "Image upload failed",
      });
    } finally {
      setUploading(false);
    }
  };

  // ---------- Save profile ----------
  const edituser = async (e) => {
    e.preventDefault();

    if (!formFields.name || !formFields.email || !formFields.phone) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please fill all the details",
      });
      return;
    }

    try {
      setIsSavingProfile(true);
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.userId) {
        throw new Error("User not found");
      }

      const imagesToSave =
        previews?.length > 0 ? previews : formFields.images || [];

      const payload = {
        name: formFields.name,
        email: formFields.email,
        phone: formFields.phone,
        images: imagesToSave,
      };

      const updated = await editData(`/api/user/${storedUser.userId}`, payload);

      setFormFields((prev) => ({
        ...prev,
        name: updated?.name || prev.name,
        email: updated?.email || prev.email,
        phone: updated?.phone || prev.phone,
        images: updated?.images || imagesToSave,
      }));

      context.setAlertBox({
        open: true,
        error: false,
        msg: "User updated",
      });
    } catch (error) {
      console.error("Update user error:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: error?.message || "Failed to update user",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ---------- Change password (tab) ----------
  const changePassword = async (e) => {
    e.preventDefault();

    if (!fields.oldPassword || !fields.password || !fields.confirmPassword) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please fill all the details",
      });
      return;
    }

    if (fields.password !== fields.confirmPassword) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Password and confirm password not match",
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.userId) {
        throw new Error("User not found");
      }

      const imagesToSend =
        previews?.length > 0 ? previews : formFields.images || [];

      const data = {
        name: formFields.name,
        email: formFields.email,
        phone: formFields.phone,
        password: fields.oldPassword, // current password
        newPass: fields.password, // new password
        images: imagesToSend,
      };

      await editData(`/api/user/changePassword/${storedUser.userId}`, data);

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Password changed successfully",
      });

      setFields({
        oldPassword: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Change password error:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: error?.message || "Failed to change password",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section className="section myAccountPage">
      <div className="container">
        <h2 className="hd">My Account</h2>

        <Box sx={{ width: "100%" }} className="myAccBox card border-0">
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="basic tabs example"
            >
              <Tab label="Edit Profile" {...a11yProps(0)} />
              <Tab label="Change Password" {...a11yProps(1)} />
            </Tabs>
          </Box>

          {/* Edit Profile tab */}
          <CustomTabPanel value={value} index={0}>
            <form onSubmit={edituser}>
              <div className="row">
                <div className="col-md-4">
                  <div className="userImage d-flex align-items-center justify-content-center">
                    {uploading ? (
                      <CircularProgress />
                    ) : (
                      <>
                        {previews?.length ? (
                          previews.map((img, index) => (
                            <img src={img} key={index} alt="Profile" />
                          ))
                        ) : (
                          <img src={NoUserImg} alt="No user" />
                        )}
                        <div className="overlay d-flex align-items-center justify-content-center">
                          <IoMdCloudUpload />
                          <input
                            type="file"
                            multiple
                            onChange={(e) =>
                              onChangeFile(e, "/api/user/upload")
                            }
                            name="images"
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
                    <Button
                      type="submit"
                      className="btn-blue bg-red btn-lg btn-big"
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? <CircularProgress /> : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CustomTabPanel>

          {/* Change Password tab */}
          <CustomTabPanel value={value} index={1}>
            <form onSubmit={changePassword}>
              <div className="row">
                <div className="col-md-12">
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <TextField
                          label="Old Password"
                          variant="outlined"
                          className="w-100"
                          name="oldPassword"
                          type="password"
                          value={fields.oldPassword}
                          onChange={changeInput2}
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-group">
                        <TextField
                          label="New Password"
                          variant="outlined"
                          className="w-100"
                          name="password"
                          type="password"
                          value={fields.password}
                          onChange={changeInput2}
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-group">
                        <TextField
                          label="Confirm Password"
                          variant="outlined"
                          className="w-100"
                          name="confirmPassword"
                          type="password"
                          value={fields.confirmPassword}
                          onChange={changeInput2}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <Button
                      type="submit"
                      className="btn-blue bg-red btn-lg btn-big"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? <CircularProgress /> : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CustomTabPanel>
        </Box>
      </div>
    </section>
  );
};

export default MyAccount;
