// admin/src/pages/Login/index.jsx
import { useContext, useEffect, useState } from "react";
import Logo from "../../assets/images/tklogo.png";
import patern from "../../assets/images/pattern.webp";
import { MyContext } from "../../App";
import { MdEmail } from "react-icons/md";
import { RiLockPasswordFill } from "react-icons/ri";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import Button from "@mui/material/Button";
import { Link, useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";

import { postData, editData } from "../../utils/api";

const Login = () => {
  const [inputIndex, setInputIndex] = useState(null);
  const [isShowPassword, setisShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenVerifyEmailBox, setIsOpenVerifyEmailBox] = useState(false);

  const history = useNavigate();
  const context = useContext(MyContext);

  const [formfields, setFormfields] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // Hide header + sidebar on login page
    context.setisHideSidebarAndHeader(true);

    const token = localStorage.getItem("token");
    if (token) {
      history("/dashboard");
    } else {
      history("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusInput = (index) => setInputIndex(index);

  const onchangeInput = (e) => {
    setFormfields((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const signIn = async (e) => {
    e.preventDefault();

    if (!formfields.email) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Email cannot be blank!",
      });
      return;
    }

    if (!isOpenVerifyEmailBox && !formfields.password) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Password cannot be blank!",
      });
      return;
    }

    // -------- NORMAL LOGIN FLOW --------
    if (!isOpenVerifyEmailBox) {
      try {
        setIsLoading(true);
        const res = await postData("/api/user/signin", formfields);

        if (res?.error === true) {
          if (res?.isVerify === false) {
            setIsOpenVerifyEmailBox(true);
          }

          context.setAlertBox({
            open: true,
            error: true,
            msg: res?.msg || "Login failed",
          });
          setIsLoading(false);
          return;
        }

        // Enforce admin
        if (!res?.user?.isAdmin) {
          context.setAlertBox({
            open: true,
            error: true,
            msg: "You are not an admin.",
          });
          setIsLoading(false);
          return;
        }

        const adminUser = {
          name: res.user?.name,
          email: res.user?.email,
          userId: res.user?.id,
          isAdmin: true,
        };

        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(adminUser));

        context.setUser(adminUser);
        context.setIsLogin(true);

        context.setAlertBox({
          open: true,
          error: false,
          msg: "Admin login successful!",
        });

        setTimeout(() => {
          context.setisHideSidebarAndHeader(false);
          history("/dashboard");
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error(error);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Something went wrong during login.",
        });
        setIsLoading(false);
      }
      return;
    }

    // -------- EMAIL VERIFY RESEND FLOW --------
    if (isOpenVerifyEmailBox) {
      try {
        setIsLoading(true);
        localStorage.setItem("userEmail", formfields.email);

        const resendRes = await postData("/api/user/verifyAccount/resendOtp", {
          email: formfields.email,
        });

        if (resendRes?.otp) {
          await editData(
            `/api/user/verifyAccount/emailVerify/${resendRes.existingUserId}`,
            {
              email: formfields.email,
              otp: resendRes.otp,
            }
          );

          setTimeout(() => {
            history("/verify-account");
          }, 1000);
        } else {
          context.setAlertBox({
            open: true,
            error: true,
            msg: resendRes?.msg || "Failed to resend OTP",
          });
        }
      } catch (err) {
        console.error(err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Error while resending verification OTP",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <img src={patern} className="loginPatern" alt="pattern" />

      <section className="loginSection signUpSection">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-10">
              <div className="row signupCard">
                {/* LEFT: Login form */}
                <div className="col-md-6 signupLeft d-flex flex-column justify-content-center">
                  <Link
                    to={"/"}
                    className="d-flex align-items-center flex-column logo mb-3"
                  >
                    <img src={Logo} alt="Thriftkart Admin" />
                    <span className="ml-2 signup-title">Admin Login</span>
                  </Link>

                  <div className="wrapper mt-2">
                    {isOpenVerifyEmailBox && (
                      <h4 className="mb-3 font-weight-bold">Verify Email</h4>
                    )}

                    <form onSubmit={signIn}>
                      {/* Email */}
                      <div
                        className={`form-group position-relative ${
                          inputIndex === 0 ? "focus" : ""
                        }`}
                      >
                        <span className="icon">
                          <MdEmail />
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter your email"
                          onFocus={() => focusInput(0)}
                          onBlur={() => setInputIndex(null)}
                          autoFocus
                          name="email"
                          value={formfields.email}
                          onChange={onchangeInput}
                        />
                      </div>

                      {/* Password OR Verify button */}
                      {!isOpenVerifyEmailBox ? (
                        <>
                          <div
                            className={`form-group position-relative ${
                              inputIndex === 1 ? "focus" : ""
                            }`}
                          >
                            <span className="icon">
                              <RiLockPasswordFill />
                            </span>
                            <input
                              type={isShowPassword ? "text" : "password"}
                              className="form-control"
                              placeholder="Enter your password"
                              onFocus={() => focusInput(1)}
                              onBlur={() => setInputIndex(null)}
                              name="password"
                              value={formfields.password}
                              onChange={onchangeInput}
                            />
                            <span
                              className="toggleShowPassword"
                              onClick={() =>
                                setisShowPassword((prev) => !prev)
                              }
                            >
                              {isShowPassword ? <IoMdEyeOff /> : <IoMdEye />}
                            </span>
                          </div>

                          <div className="form-group">
                            <Button
                              type="submit"
                              className="btn-blue btn-lg w-100 btn-big"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <CircularProgress size={24} />
                              ) : (
                                "Sign In"
                              )}
                            </Button>
                          </div>

                          <div className="form-group d-flex justify-content-between align-items-center">
                            <Link
                              to={"/forgot-password"}
                              className="link text-uppercase"
                              style={{ fontSize: 12 }}
                            >
                              Forgot Password?
                            </Link>
                          </div>

                          <div className="form-group text-center mb-0">
                            <span style={{ fontSize: 13 }}>
                              Don't have an account?
                              <Link
                                to={"/signUp"}
                                className="link color ml-2"
                              >
                                Register
                              </Link>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="form-group mt-3">
                          <Button
                            type="submit"
                            className="btn-blue btn-lg w-100 btn-big"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <CircularProgress size={24} />
                            ) : (
                              "Resend & Verify Email"
                            )}
                          </Button>

                          <p
                            className="mt-3 mb-0 text-muted"
                            style={{ fontSize: 13 }}
                          >
                            Your email is not verified yet. We’ll send a fresh
                            OTP to the entered email so you can activate your
                            admin account.
                          </p>
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* RIGHT: Info / marketing panel */}
                <div className="col-md-6 signupRight d-flex flex-column justify-content-center">
                  <h2 className="signup-heading">
                    Welcome back to Thriftkart Admin
                  </h2>
                  <p className="signup-text">
                    Manage your entire fashion store from one powerful dashboard.
                    Track orders, handle returns, control banners, and update
                    products in real time with a clean and modern interface.
                  </p>
                  <ul className="signup-bullets">
                    <li>Monitor new orders, payments, and delivery status.</li>
                    <li>Manage products, categories, and pricing with ease.</li>
                    <li>Control homepage banners and campaigns in one place.</li>
                    <li>Stay on top of returns and customer experience.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Login;
