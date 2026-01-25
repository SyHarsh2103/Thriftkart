// admin/src/pages/ForgotPassword/index.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { MdEmail } from "react-icons/md";
import { RiLockPasswordFill } from "react-icons/ri";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { IoShieldCheckmarkSharp } from "react-icons/io5";

import Logo from "../../assets/images/tklogo.png";
import patern from "../../assets/images/pattern.webp";
import { MyContext } from "../../App";
import { postData } from "../../utils/api";

/**
 * Forgot Password flow (OTP -> resetToken -> reset)
 * Endpoints:
 * 1) POST /api/user/forgotPassword/send-otp   { email }
 * 2) POST /api/user/forgotPassword/verify-otp { email, otp } -> { resetToken }
 * 3) POST /api/user/forgotPassword/reset      { email, resetToken, newPass }
 */

const ForgotPassword = () => {
  const [inputIndex, setInputIndex] = useState(null);
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [isShowConfirmPassword, setIsShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // step: 1 = send OTP, 2 = verify & reset
  const [step, setStep] = useState(1);

  const [formfields, setFormfields] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [resetToken, setResetToken] = useState(null);

  const context = useContext(MyContext);
  const history = useNavigate();

  useEffect(() => {
    // Hide admin chrome on auth pages
    context?.setisHideSidebarAndHeader?.(true);

    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    let user = null;
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch {
      user = null;
    }

    if (token && user?.isAdmin) {
      history("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusInput = (index) => setInputIndex(index);

  const onChangeInput = (e) => {
    const { name, value } = e.target;
    setFormfields((prev) => ({ ...prev, [name]: value }));
  };

  const canSubmitStep1 = useMemo(
    () => formfields.email.trim().length > 0,
    [formfields.email]
  );

  const canSubmitStep2 = useMemo(() => {
    return (
      formfields.otp.trim().length > 0 &&
      formfields.newPassword.length >= 6 &&
      formfields.newPassword === formfields.confirmPassword
    );
  }, [formfields]);

  // ---------- Step 1: Send OTP ----------
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!canSubmitStep1) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Email can not be blank!",
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await postData("/api/user/forgotPassword/send-otp", {
        email: formfields.email.trim(),
      });

      if (res?.success) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "OTP sent to your email.",
        });
        setStep(2);
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.msg || "Failed to send OTP",
        });
      }
    } catch (err) {
      console.error(err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Step 2a: Verify OTP ----------
  const handleVerifyOtp = async () => {
    try {
      setIsLoading(true);
      const res = await postData("/api/user/forgotPassword/verify-otp", {
        email: formfields.email.trim(),
        otp: formfields.otp.trim(),
      });

      if (res?.success) {
        setResetToken(res?.resetToken);
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "OTP verified",
        });
      } else {
        setResetToken(null);
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.msg || "Invalid/Expired OTP",
        });
      }
    } catch (err) {
      console.error(err);
      setResetToken(null);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Step 2b: Reset Password ----------
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!canSubmitStep2) {
      let msg = "";
      if (!formfields.otp) msg = "OTP can not be blank!";
      else if (formfields.newPassword.length < 6)
        msg = "Password must be at least 6 characters.";
      else if (formfields.newPassword !== formfields.confirmPassword)
        msg = "Passwords do not match.";
      context.setAlertBox({ open: true, error: true, msg });
      return;
    }
    if (!resetToken) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please verify OTP first.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await postData("/api/user/forgotPassword/reset", {
        email: formfields.email.trim(),
        resetToken,
        newPass: formfields.newPassword,
      });

      if (res?.success) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "Password reset successfully",
        });
        setTimeout(() => history("/login"), 1200);
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.msg || "Reset failed. Try again.",
        });
      }
    } catch (err) {
      console.error(err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      setIsLoading(true);
      const res = await postData("/api/user/forgotPassword/send-otp", {
        email: formfields.email.trim(),
      });

      if (res?.success) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "OTP sent again",
        });
        setResetToken(null);
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.msg || "Failed to send OTP",
        });
      }
    } catch (err) {
      console.error(err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
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
                {/* LEFT: Forgot / Reset form */}
                <div className="col-md-6 signupLeft d-flex flex-column justify-content-center">
                  <Link
                    to={"/"}
                    className="d-flex align-items-center flex-column logo mb-3"
                  >
                    <img src={Logo} alt="Thriftkart logo" />
                    <span className="ml-2 signup-title">
                      {step === 1 ? "Forgot Password" : "Reset Password"}
                    </span>
                  </Link>

                  <div className="wrapper mt-2">
                    <h4 className="mb-3 font-weight-bold">
                      {step === 1
                        ? "Forgot your admin password?"
                        : "Enter OTP & set a new password"}
                    </h4>

                    {step === 1 && (
                      <form onSubmit={handleSendOtp}>
                        <div
                          className={`form-group position-relative ${
                            inputIndex === 0 ? "focus" : ""
                          }`}
                        >
                          <span className="icon">
                            <MdEmail />
                          </span>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="enter your admin email"
                            onFocus={() => focusInput(0)}
                            onBlur={() => setInputIndex(null)}
                            autoFocus
                            name="email"
                            value={formfields.email}
                            onChange={onChangeInput}
                          />
                        </div>

                        <div className="form-group">
                          <Button
                            type="submit"
                            className="btn-blue btn-lg w-100 btn-big"
                            disabled={!canSubmitStep1 || isLoading}
                          >
                            {isLoading ? (
                              <CircularProgress size={24} />
                            ) : (
                              "Send OTP"
                            )}
                          </Button>
                        </div>

                        <div className="form-group d-flex justify-content-between align-items-center">
                          <Link to={"/login"} className="link" style={{ fontSize: 13 }}>
                            Back to Login
                          </Link>
                          <span style={{ fontSize: 13, color: "#777" }}>
                            Remember your password?{" "}
                            <Link to={"/login"} className="link color ml-1">
                              Sign In
                            </Link>
                          </span>
                        </div>

                        <div className="form-group text-center mb-0">
                          <span style={{ fontSize: 13 }}>
                            Don't have an account?
                            <Link to={"/signUp"} className="link color ml-2">
                              Register
                            </Link>
                          </span>
                        </div>
                      </form>
                    )}

                    {step === 2 && (
                      <form onSubmit={handleResetPassword}>
                        {/* Email (locked) */}
                        <div
                          className={`form-group position-relative ${
                            inputIndex === 0 ? "focus" : ""
                          }`}
                        >
                          <span className="icon">
                            <MdEmail />
                          </span>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="enter your email"
                            onFocus={() => focusInput(0)}
                            onBlur={() => setInputIndex(null)}
                            name="email"
                            value={formfields.email}
                            onChange={onChangeInput}
                            disabled
                          />
                        </div>

                        {/* OTP */}
                        <div
                          className={`form-group position-relative ${
                            inputIndex === 1 ? "focus" : ""
                          }`}
                        >
                          <span className="icon">
                            <IoShieldCheckmarkSharp />
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="enter OTP"
                            onFocus={() => focusInput(1)}
                            onBlur={() => setInputIndex(null)}
                            name="otp"
                            value={formfields.otp}
                            onChange={onChangeInput}
                          />
                        </div>

                        <div className="form-group">
                          <Button
                            type="button"
                            className="btn-outline w-100 btn-big"
                            onClick={handleVerifyOtp}
                            disabled={isLoading || !formfields.otp.trim()}
                          >
                            {isLoading ? (
                              <CircularProgress size={24} />
                            ) : resetToken ? (
                              "OTP Verified"
                            ) : (
                              "Verify OTP"
                            )}
                          </Button>
                        </div>

                        {/* New Password */}
                        <div
                          className={`form-group position-relative ${
                            inputIndex === 2 ? "focus" : ""
                          }`}
                        >
                          <span className="icon">
                            <RiLockPasswordFill />
                          </span>
                          <input
                            type={isShowPassword ? "text" : "password"}
                            className="form-control"
                            placeholder="enter new password"
                            onFocus={() => focusInput(2)}
                            onBlur={() => setInputIndex(null)}
                            name="newPassword"
                            value={formfields.newPassword}
                            onChange={onChangeInput}
                          />
                          <span
                            className="toggleShowPassword"
                            onClick={() =>
                              setIsShowPassword((prev) => !prev)
                            }
                          >
                            {isShowPassword ? <IoMdEyeOff /> : <IoMdEye />}
                          </span>
                        </div>

                        {/* Confirm Password */}
                        <div
                          className={`form-group position-relative ${
                            inputIndex === 3 ? "focus" : ""
                          }`}
                        >
                          <span className="icon">
                            <RiLockPasswordFill />
                          </span>
                          <input
                            type={isShowConfirmPassword ? "text" : "password"}
                            className="form-control"
                            placeholder="confirm new password"
                            onFocus={() => focusInput(3)}
                            onBlur={() => setInputIndex(null)}
                            name="confirmPassword"
                            value={formfields.confirmPassword}
                            onChange={onChangeInput}
                          />
                          <span
                            className="toggleShowPassword"
                            onClick={() =>
                              setIsShowConfirmPassword((prev) => !prev)
                            }
                          >
                            {isShowConfirmPassword ? (
                              <IoMdEyeOff />
                            ) : (
                              <IoMdEye />
                            )}
                          </span>
                        </div>

                        <div className="form-group">
                          <Button
                            type="submit"
                            className="btn-blue btn-lg w-100 btn-big"
                            disabled={!canSubmitStep2 || isLoading || !resetToken}
                          >
                            {isLoading ? (
                              <CircularProgress size={24} />
                            ) : (
                              "Reset Password"
                            )}
                          </Button>
                        </div>

                        <div className="form-group d-flex justify-content-between align-items-center">
                          <Button
                            variant="text"
                            className="link p-0"
                            type="button"
                            onClick={resendOtp}
                            disabled={isLoading}
                            style={{ fontSize: 13 }}
                          >
                            Resend OTP
                          </Button>
                          <Link
                            to={"/login"}
                            className="link"
                            style={{ fontSize: 13 }}
                          >
                            Back to Login
                          </Link>
                        </div>

                        <div className="form-group text-center mb-0">
                          <span style={{ fontSize: 13 }}>
                            Don't have an account?
                            <Link to={"/signUp"} className="link color ml-2">
                              Register
                            </Link>
                          </span>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* RIGHT: Info / helper panel */}
                <div className="col-md-6 signupRight d-flex flex-column justify-content-center">
                  <h2 className="signup-heading">
                    Secure access to your Thriftkart Admin
                  </h2>
                  <p className="signup-text">
                    Forgotten passwords happen. Use your registered admin email
                    to receive an OTP, verify it, and create a new password in
                    a few simple steps.
                  </p>
                  <ul className="signup-bullets">
                    <li>Only verified admin accounts can reset passwords.</li>
                    <li>OTP is valid for a short time to keep your account safe.</li>
                    <li>
                      Choose a strong password (at least 6 characters,
                      preferably more).
                    </li>
                    <li>
                      Never share your OTP or admin credentials with anyone.
                    </li>
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

export default ForgotPassword;
