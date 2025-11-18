import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../../assets/images/logo.jpg";
import { MyContext } from "../../App";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

import { fetchDataFromApi, editData } from "../../utils/api";

const ChangePassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const [formfields, setFormfields] = useState({
    currentPass: "",
    newPass: "",
    confirmPass: "",
  });

  const context = useContext(MyContext);
  const history = useNavigate();

  useEffect(() => {
    context.setisHeaderFooterShow(false);
    context.setEnableFilterTab(false);

    const userStr = localStorage.getItem("user");
    if (!userStr) {
      history("/signIn");
      return;
    }

    const user = JSON.parse(userStr || "{}");
    const userId = user.userId || user.id;

    // Load latest user info from backend for email / phone / images
    const loadUser = async () => {
      try {
        const data = await fetchDataFromApi(`/api/user/${userId}`);
        setUserInfo(data);
      } catch (err) {
        console.error("Load user error:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Unable to load user info. Please login again.",
        });
        history("/signIn");
      }
    };

    loadUser();

    return () => {
      context.setisHeaderFooterShow(true);
      context.setEnableFilterTab(true);
    };
  }, []);

  const onchangeInput = (e) => {
    setFormfields((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const changePass = async (e) => {
    e.preventDefault();

    if (!userInfo) return;

    if (!formfields.currentPass) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please enter current password",
      });
      return;
    }

    if (!formfields.newPass) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please enter new password",
      });
      return;
    }

    if (!formfields.confirmPass) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please confirm password",
      });
      return;
    }

    if (formfields.newPass !== formfields.confirmPass) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Password and confirm password do not match",
      });
      return;
    }

    try {
      setIsLoading(true);

      const payload = {
        email: userInfo.email,
        name: userInfo.name,
        phone: userInfo.phone,
        images: userInfo.images || [],
        password: formfields.currentPass,
        newPass: formfields.newPass,
      };

      const res = await editData(
        `/api/user/changePassword/${userInfo.id}`,
        payload
      );

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Password updated successfully",
      });

      // Optionally log them out or just redirect to profile/home
      setTimeout(() => {
        history("/");
      }, 1500);
    } catch (err) {
      console.error("changePassword error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.msg || err?.message || "Failed to change password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="section signInPage">
      <div className="shape-bottom">
        <svg
          fill="#fff"
          x="0px"
          y="0px"
          viewBox="0 0 1921 819.8"
          style={{ enableBackground: "new 0 0 1921 819.8" }}
        >
          <path
            className="st0"
            d="M1921,413.1v406.7H0V0.5h0.4l228.1,598.3c30,74.4,80.8,130.6,152.5,168.6c107.6,57,212.1,40.7,245.7,34.4 c22.4-4.2,54.9-13.1,97.5-26.6L1921,400.5V413.1z"
          ></path>
        </svg>
      </div>

      <div className="container">
        <div className="box card p-3 shadow border-0">
          <div className="text-center">
            <img src={Logo} alt="Thriftkart" />
          </div>

          <form className="mt-3" onSubmit={changePass}>
            <h2 className="mb-4">Change Password</h2>

            <div className="form-group position-relative">
              <TextField
                label="Current Password"
                type="password"
                required
                variant="standard"
                className="w-100"
                name="currentPass"
                onChange={onchangeInput}
              />
            </div>

            <div className="form-group position-relative">
              <TextField
                label="New Password"
                type="password"
                required
                variant="standard"
                className="w-100"
                name="newPass"
                onChange={onchangeInput}
              />
            </div>

            <div className="form-group position-relative">
              <TextField
                label="Confirm Password"
                type="password"
                required
                variant="standard"
                className="w-100"
                name="confirmPass"
                onChange={onchangeInput}
              />
            </div>

            <Button type="submit" className="btn-blue col btn-lg btn-big">
              {isLoading ? <CircularProgress /> : "Change Password"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ChangePassword;
