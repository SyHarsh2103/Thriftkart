import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

import { MyContext } from "../../App";
import { postData } from "../../utils/api";
import OtpBox from "../../Components/OtpBox";

const VerifyOTP = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");

  const context = useContext(MyContext);
  const history = useNavigate();

  const userEmail = localStorage.getItem("userEmail") || "";

  useEffect(() => {
    context.setisHeaderFooterShow(false);
    context.setEnableFilterTab(false);

    // If no email in storage, send them back
    if (!userEmail) {
      history("/signIn");
    }

    return () => {
      context.setisHeaderFooterShow(true);
      context.setEnableFilterTab(true);
    };
  }, []);

  const handleOtpChange = (value) => {
    setOtp(value);
  };

  const verify = async (e) => {
    e.preventDefault();

    if (!otp) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please enter OTP",
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await postData(`/api/user/verifyemail`, {
        otp,
        email: userEmail,
      });

      if (res?.success) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "OTP verified successfully",
        });
        localStorage.removeItem("userEmail");

        setTimeout(() => {
          history("/signIn");
        }, 1500);
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.message || "Invalid or expired OTP",
        });
      }
    } catch (err) {
      console.error("verifyemail error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err.message || "Error verifying OTP",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!userEmail) return;

    try {
      setIsLoading(true);
      const res = await postData("/api/user/verifyAccount/resendOtp", {
        email: userEmail,
      });

      if (res?.success) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || "OTP resent to your email",
        });
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.message || "Failed to resend OTP",
        });
      }
    } catch (err) {
      console.error("resendOtp error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err.message || "Failed to resend OTP",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="section signInPage otpPage">
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
            <img src={"/shield.png"} width={"100px"} alt="shield" />
          </div>

          <form className="mt-3" onSubmit={verify}>
            <h2 className="mb-1 text-center">OTP Verification</h2>
            <p className="text-center text-light">
              OTP has been sent to <b>{userEmail}</b>
            </p>

            <OtpBox length={6} onChange={handleOtpChange} />

            <div className="d-flex align-items-center mt-3 mb-3 ">
              <Button type="submit" className="btn-blue col btn-lg btn-big">
                {isLoading ? <CircularProgress /> : "Verify OTP"}
              </Button>
            </div>

            <p className="text-center">
              <button
                type="button"
                className="border-effect cursor txt btn btn-link p-0"
                onClick={resendOtp}
                disabled={isLoading}
              >
                Resend OTP
              </button>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default VerifyOTP;
