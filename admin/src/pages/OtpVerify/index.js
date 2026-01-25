// admin/src/pages/VerifyAccount/index.jsx
import { useContext, useEffect, useState } from "react";
import Logo from "../../assets/images/logo.png";
import patern from "../../assets/images/pattern.webp";
import { MyContext } from "../../App";
import Button from "@mui/material/Button";
import { Link, useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import OtpBox from "../../components/OtpBox";
import { postData } from "../../utils/api";

const VerifyAccount = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");

  const navigate = useNavigate();
  const context = useContext(MyContext);

  const userEmail = localStorage.getItem("userEmail") || "";

  useEffect(() => {
    // hide admin header + sidebar on this screen
    context.setisHideSidebarAndHeader(true);

    // if no email stored, user shouldn't be here
    if (!userEmail) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Session expired. Please sign up / log in again.",
      });
      navigate("/login");
    }
  }, [userEmail, context, navigate]);

  const handleOtpChange = (value) => {
    setOtp(value);
  };

  const verify = async (e) => {
    e.preventDefault();

    if (!otp || otp.trim().length === 0) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please enter OTP",
      });
      return;
    }

    if (!userEmail) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Session expired. Please sign up / log in again.",
      });
      navigate("/login");
      return;
    }

    const payload = {
      otp: otp.trim(),
      email: userEmail,
    };

    try {
      setIsLoading(true);
      const res = await postData("/api/user/verifyemail", payload);

      if (res?.success) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "Account verified successfully!",
        });
        localStorage.removeItem("userEmail");
        navigate("/login");
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.message || res?.msg || "Invalid or expired OTP",
        });
      }
    } catch (err) {
      console.error(err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Verification failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!userEmail) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Session expired. Please sign up / log in again.",
      });
      navigate("/login");
      return;
    }

    try {
      setIsLoading(true);
      const res = await postData("/api/user/verifyAccount/resendOtp", {
        email: userEmail,
      });

      if (res?.success) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "OTP resent to your email.",
        });
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.message || res?.msg || "Failed to resend OTP",
        });
      }
    } catch (err) {
      console.error(err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Failed to resend OTP",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <img src={patern} className="loginPatern" alt="" />

      <section className="loginSection signUpSection">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-10">
              <div className="row signupCard">
                {/* LEFT: OTP verification card */}
                <div className="col-md-6 signupLeft d-flex flex-column justify-content-center">
                  <Link
                    to={"/"}
                    className="d-flex align-items-center flex-column logo mb-3"
                  >
                    <img src={Logo} alt="Logo" />
                    <span className="ml-2 signup-title">VERIFY ACCOUNT</span>
                  </Link>

                  <div className="wrapper mt-2 card border text-center">
                    <form onSubmit={verify}>
                      <img src={"/shield.png"} width="80px" alt="shield" />
                      <p className="text-center mt-3">
                        OTP has been sent to <b>{userEmail}</b>
                      </p>

                      <OtpBox length={6} onChange={handleOtpChange} />

                      <div className="form-group mt-3">
                        <Button
                          type="submit"
                          className="btn-blue btn-lg w-100 btn-big"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <CircularProgress size={24} />
                          ) : (
                            "Verify OTP"
                          )}
                        </Button>
                      </div>

                      <div className="form-group d-flex justify-content-between align-items-center mt-2">
                        <Button
                          type="button"
                          variant="text"
                          className="link color p-0"
                          onClick={resendOtp}
                          disabled={isLoading}
                          style={{ fontSize: 13 }}
                        >
                          Resend OTP
                        </Button>
                        <Link
                          to={"/login"}
                          className="link color"
                          style={{ fontSize: 13 }}
                        >
                          Back to Login
                        </Link>
                      </div>
                    </form>
                  </div>
                </div>

                {/* RIGHT: Info / security panel */}
                <div className="col-md-6 signupRight d-flex flex-column justify-content-center">
                  <h2 className="signup-heading">
                    Verify your Thriftkart admin email
                  </h2>
                  <p className="signup-text">
                    To keep your admin panel secure, we verify every new admin
                    email with a one-time password (OTP). Enter the 6-digit code
                    you received and complete your account activation.
                  </p>
                  <ul className="signup-bullets">
                    <li>Check your inbox and spam folder for the OTP email.</li>
                    <li>The OTP is valid for a limited time for your security.</li>
                    <li>
                      Do not share your OTP or admin account details with anyone.
                    </li>
                    <li>
                      If you didn't receive the mail, use the{" "}
                      <strong>Resend OTP</strong> option.
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

export default VerifyAccount;
