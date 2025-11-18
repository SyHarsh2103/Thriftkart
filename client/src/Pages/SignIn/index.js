import { useContext, useEffect, useState } from "react";
import Logo from "../../assets/images/TKlogo.png";
import { MyContext } from "../../App";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Link, useNavigate } from "react-router-dom";

import GoogleImg from "../../assets/images/googleImg.png";
import CircularProgress from "@mui/material/CircularProgress";
import { postData } from "../../utils/api";

import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { firebaseApp } from "../../firebase";

const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const SignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpenVerifyEmailBox, setIsOpenVerifyEmailBox] = useState(false);
  const context = useContext(MyContext);
  const history = useNavigate();

  const [formfields, setFormfields] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    context.setisHeaderFooterShow(false);
    context.setEnableFilterTab(false);
  }, []);

  const onchangeInput = (e) => {
    setFormfields((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ---------------- LOGIN FLOW ----------------
  const login = async (e) => {
    e.preventDefault();

    if (!formfields.email) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Email cannot be blank!",
      });
      return;
    }

    // ------------ STEP 1: Normal Sign In ------------
    if (!isOpenVerifyEmailBox) {
      if (!formfields.password) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Password cannot be blank!",
        });
        return;
      }

      try {
        setIsLoading(true);
        const res = await postData("/api/user/signin", formfields);

        if (res.error !== true) {
          // ✅ Login success
          localStorage.setItem("token", res.token);

          const user = {
            name: res.user?.name,
            email: res.user?.email,
            userId: res.user?.id,
            image: res?.user?.images?.[0],
          };

          localStorage.setItem("user", JSON.stringify(user));
          context.setUser(JSON.stringify(user));

          context.setAlertBox({
            open: true,
            error: false,
            msg: res.msg,
          });

          setTimeout(() => {
            history("/");
            context.setIsLogin(true);
            setIsLoading(false);
            context.setisHeaderFooterShow(true);
          }, 1500);
        } else {
          // ❌ Login failed
          if (res?.isVerify === false) {
            // Account exists but not verified
            setIsOpenVerifyEmailBox(true);
            localStorage.setItem("userEmail", formfields.email);
          }

          context.setAlertBox({
            open: true,
            error: true,
            msg: res.msg,
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error(error);
        context.setAlertBox({
          open: true,
          error: true,
          msg: error.message || "Login failed",
        });
        setIsLoading(false);
      }

      return;
    }

    // ------------ STEP 2: Send verification OTP ------------
    if (isOpenVerifyEmailBox) {
      try {
        setIsLoading(true);
        const email = formfields.email;

        const res = await postData("/api/user/verifyAccount/resendOtp", {
          email,
        });

        if (res?.success) {
          context.setAlertBox({
            open: true,
            error: false,
            msg: res?.message || "Verification OTP sent to your email",
          });

          // Go to OTP page for verification
          localStorage.setItem("userEmail", email);
          history("/verifyOTP");
        } else {
          context.setAlertBox({
            open: true,
            error: true,
            msg: res?.message || res?.msg || "Failed to send OTP",
          });
        }
      } catch (err) {
        console.error("verifyAccount/resendOtp error:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: err.message || "Failed to send OTP",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // ---------------- GOOGLE SIGN IN ----------------
  const signInWithGoogle = () => {
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        const user = result.user;

        const fields = {
          name: user.providerData[0].displayName,
          email: user.providerData[0].email,
          password: null,
          images: user.providerData[0].photoURL,
          phone: user.providerData[0].phoneNumber,
        };

        postData("/api/user/authWithGoogle", fields).then((res) => {
          try {
            if (res.error !== true) {
              localStorage.setItem("token", res.token);

              const userObj = {
                name: res.user?.name,
                email: res.user?.email,
                userId: res.user?.id,
              };

              localStorage.setItem("user", JSON.stringify(userObj));

              context.setAlertBox({
                open: true,
                error: false,
                msg: res.msg,
              });

              setTimeout(() => {
                history("/");
                context.setIsLogin(true);
                setIsLoading(false);
                context.setisHeaderFooterShow(true);
              }, 1500);
            } else {
              context.setAlertBox({
                open: true,
                error: true,
                msg: res.msg,
              });
              setIsLoading(false);
            }
          } catch (error) {
            console.log(error);
            setIsLoading(false);
          }
        });

        context.setAlertBox({
          open: true,
          error: false,
          msg: "User authenticated successfully!",
        });
      })
      .catch((error) => {
        const errorMessage = error.message;
        context.setAlertBox({
          open: true,
          error: true,
          msg: errorMessage,
        });
      });
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
            d="M1921,413.1v406.7H0V0.5h0.4l228.1,598.3c30,74.4,80.8,130.6,152.5,168.6c107.6,57,212.1,40.7,245.7,34.4 c22.4-4.2,54.9-13.1,97.5-26.6L1921,400.5V413.1z"
          ></path>
        </svg>
      </div>

      <div className="container">
        <div className="box card p-3 shadow border-0">
          <div className="text-center">
            <img src={Logo} alt="Thriftkart" />
          </div>

          <form className="mt-3" onSubmit={login}>
            <h2 className="mb-4">
              {isOpenVerifyEmailBox === false ? "Sign In" : "Verify Email"}
            </h2>

            <div className="form-group position-relative">
              <TextField
                label="Email"
                type="email"
                required
                variant="standard"
                className="w-100"
                name="email"
                onChange={onchangeInput}
              />
            </div>

            {isOpenVerifyEmailBox === false ? (
              <>
                <div className="form-group">
                  <TextField
                    label="Password"
                    type="password"
                    required
                    variant="standard"
                    className="w-100"
                    name="password"
                    onChange={onchangeInput}
                  />
                </div>

                <div className="text-right mb-3">
                  <Link
                    to="/forgotPassword"
                    className="border-effect cursor txt"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <div className="d-flex align-items-center mt-3 mb-3 ">
                  <Button type="submit" className="btn-blue col btn-lg btn-big">
                    {isLoading ? <CircularProgress /> : "Sign In"}
                  </Button>
                  <Link to="/">
                    <Button
                      className="btn-lg btn-big col ml-3"
                      variant="outlined"
                      onClick={() => context.setisHeaderFooterShow(true)}
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>

                <p className="txt">
                  Not Registered?{" "}
                  <Link to="/signUp" className="border-effect">
                    Sign Up
                  </Link>
                </p>

                <h6 className="mt-4 text-center font-weight-bold">
                  Or continue with social account
                </h6>

                <Button
                  className="loginWithGoogle mt-2"
                  variant="outlined"
                  onClick={signInWithGoogle}
                >
                  <img src={GoogleImg} alt="Google" /> Sign In with Google
                </Button>
              </>
            ) : (
              <Button type="submit" className="btn-blue col btn-lg btn-big">
                {isLoading ? <CircularProgress /> : "Send Verification OTP"}
              </Button>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignIn;
