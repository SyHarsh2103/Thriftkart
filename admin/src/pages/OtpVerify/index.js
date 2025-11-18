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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

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
      <section className="loginSection">
        <div className="loginBox">
          <Link to={"/"} className="d-flex align-items-center flex-column logo">
            <img src={Logo} alt="Logo" />
            <span className="ml-2">ECOMMERCE</span>
          </Link>

          <div className="wrapper mt-3 card border text-center">
            <form onSubmit={verify}>
              <img src={"/shield.png"} width="80px" alt="shield" />
              <p className="text-center mt-3">
                OTP has been sent to <b>{userEmail}</b>
              </p>

              <OtpBox length={6} onChange={handleOtpChange} />

              <div className="form-group mt-3 row">
                <Button
                  type="submit"
                  className="btn-blue btn-lg w-100 btn-big"
                  disabled={isLoading}
                >
                  {isLoading ? <CircularProgress size={24} /> : "Verify OTP"}
                </Button>
              </div>
            </form>
          </div>

          <div className="wrapper mt-3 card border footer p-3">
            <span className="text-center d-flex flex-column flex-md-row justify-content-center">
              <Button
                type="button"
                variant="text"
                className="link color"
                onClick={resendOtp}
                disabled={isLoading}
              >
                Resend OTP
              </Button>
              <span className="mx-2 d-none d-md-inline">•</span>
              <Link to={"/login"} className="link color ml-md-2 mt-2 mt-md-0">
                Back to Login
              </Link>
            </span>
          </div>
        </div>
      </section>
    </>
  );
};

export default VerifyAccount;
