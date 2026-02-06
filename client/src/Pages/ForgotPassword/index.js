import { useContext, useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

import Logo from "../../assets/images/logo.png"; // or TKlogo if you prefer
import { MyContext } from "../../App";
import { postData } from "../../utils/api";

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = send OTP, 2 = verify + reset
  const [resetToken, setResetToken] = useState(null);

  const [formfields, setFormfields] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const context = useContext(MyContext);
  const history = useNavigate();

  useEffect(() => {
    // hide header/footer for this page
    context.setisHeaderFooterShow(false);
    context.setEnableFilterTab(false);

    return () => {
      // restore when leaving page
      context.setisHeaderFooterShow(true);
      context.setEnableFilterTab(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeInput = (e) => {
    setFormfields({ ...formfields, [e.target.name]: e.target.value });
  };

  const canSubmitStep1 = useMemo(
    () => formfields.email.trim().length > 0,
    [formfields.email]
  );

  const canSubmitStep2 = useMemo(() => {
    return (
      formfields.otp.trim() &&
      formfields.newPassword.length >= 6 &&
      formfields.newPassword === formfields.confirmPassword
    );
  }, [formfields]);

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();

    if (!canSubmitStep1) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Email cannot be blank!",
      });
      return;
    }

    try {
      setIsLoading(true);

      const res = await postData("/api/user/forgotPassword/send-otp", {
        email: formfields.email,
      });

      if (res?.success) {
        // keep consistency with other flows
        localStorage.setItem("userEmail", formfields.email);
        localStorage.setItem("actionType", "changePassword");

        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "OTP sent to your email",
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
      console.error("Send OTP error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Something went wrong while sending OTP",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2a: Verify OTP
  const handleVerifyOtp = async () => {
    if (!formfields.otp.trim()) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please enter OTP",
      });
      return;
    }

    try {
      setIsLoading(true);

      const res = await postData("/api/user/forgotPassword/verify-otp", {
        email: formfields.email,
        otp: formfields.otp,
      });

      if (res?.success) {
        setResetToken(res.resetToken);
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "OTP verified. You can now set a new password.",
        });
      } else {
        setResetToken(null);
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.msg || "Invalid OTP",
        });
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      setResetToken(null);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Something went wrong while verifying OTP",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2b: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!canSubmitStep2) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please fill all fields correctly",
      });
      return;
    }
    if (!resetToken) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please verify OTP first",
      });
      return;
    }

    try {
      setIsLoading(true);

      const res = await postData("/api/user/forgotPassword/reset", {
        email: formfields.email,
        resetToken,
        newPass: formfields.newPassword,
      });

      if (res?.success) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "Password reset successfully!",
        });

        setTimeout(() => {
          history("/signIn");
        }, 1500);
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.msg || "Reset failed",
        });
      }
    } catch (err) {
      console.error("Reset password error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Something went wrong while resetting password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const title =
    step === 1 ? "Forgot your password?" : "Verify OTP & reset password";

  const subtitle =
    step === 1
      ? "Enter your registered email and we’ll send you a one-time code to reset your password."
      : "We’ve sent an OTP to your email. Verify it and set a new password.";

  return (
    <section className="section signInPage otpPage">
      {/* gradient background & wave, matches SignIn / SignUp */}
      <div className="shape-bottom">
        <svg
          fill="#fff"
          viewBox="0 0 1921 819.8"
          style={{ enableBackground: "new 0 0 1921 819.8" }}
        >
          <path d="M1921,413.1v406.7H0V0.5h0.4l228.1,598.3c30,74.4,80.8,130.6,152.5,168.6c107.6,57,212.1,40.7,245.7,34.4 
            c22.4-4.2,54.9-13.1,97.5-26.6L1921,400.5V413.1z" />
        </svg>
      </div>

      <div className="container">
        <div
          className="box card p-3 shadow border-0"
          style={{
            maxWidth: "460px",
            width: "100%",
            borderRadius: 14,
            margin: "auto",
          }}
        >
          <div className="text-center mb-2">
            <img
              src={Logo}
              alt="Logo"
              style={{ maxWidth: 120, height: "auto" }}
            />
          </div>

          <form
            className="mt-2"
            onSubmit={step === 1 ? handleSendOtp : handleResetPassword}
          >
            {/* Title + Step indicator */}
            <div className="text-center mb-3">
              <h2
                className="mb-1"
                style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}
              >
                {title}
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  marginBottom: 6,
                }}
              >
                {subtitle}
              </p>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                }}
              >
                Step {step} of 2
              </span>
            </div>

            {/* Email – always visible */}
            <div className="form-group mb-3">
              <TextField
                label="Registered Email"
                type="email"
                required
                variant="standard"
                className="w-100"
                name="email"
                value={formfields.email}
                onChange={onChangeInput}
                disabled={step === 2}
              />
            </div>

            {step === 1 && (
              <p
                className="mb-3"
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                We&apos;ll send a one-time OTP code to this email to verify it
                belongs to you.
              </p>
            )}

            {step === 2 && (
              <>
                <div className="form-group mb-3">
                  <TextField
                    label="OTP"
                    type="text"
                    required
                    variant="standard"
                    className="w-100"
                    name="otp"
                    value={formfields.otp}
                    onChange={onChangeInput}
                  />
                </div>

                <div
                  className="d-flex mb-3"
                  style={{ gap: "10px", alignItems: "center" }}
                >
                  <Button
                    type="button"
                    variant={resetToken ? "contained" : "outlined"}
                    className={
                      resetToken ? "btn-blue w-100 btn-big" : "w-100 btn-big"
                    }
                    onClick={handleVerifyOtp}
                    disabled={!formfields.otp || isLoading}
                  >
                    {resetToken ? "OTP Verified" : "Verify OTP"}
                  </Button>

                  <Button
                    type="button"
                    variant="text"
                    className="w-100"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    style={{ fontSize: 13 }}
                  >
                    Resend OTP
                  </Button>
                </div>

                <div className="form-group mb-3">
                  <TextField
                    label="New Password"
                    type="password"
                    required
                    variant="standard"
                    className="w-100"
                    name="newPassword"
                    value={formfields.newPassword}
                    onChange={onChangeInput}
                  />
                </div>

                <div className="form-group mb-3">
                  <TextField
                    label="Confirm New Password"
                    type="password"
                    required
                    variant="standard"
                    className="w-100"
                    name="confirmPassword"
                    value={formfields.confirmPassword}
                    onChange={onChangeInput}
                  />
                </div>

                <p
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    marginTop: -4,
                    marginBottom: 12,
                  }}
                >
                  Password must be at least 6 characters. Make sure both fields
                  match.
                </p>
              </>
            )}

            <Button
              type="submit"
              className="btn-blue col btn-lg btn-big w-100"
              disabled={
                isLoading ||
                (step === 1 && !canSubmitStep1) ||
                (step === 2 && !canSubmitStep2)
              }
            >
              {isLoading ? (
                <CircularProgress size={22} />
              ) : step === 1 ? (
                "Send OTP"
              ) : (
                "Reset Password"
              )}
            </Button>

            <div className="text-center mt-3">
              <Link to="/signIn" className="border-effect">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ForgotPassword;
