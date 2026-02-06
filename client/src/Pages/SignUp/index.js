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

const SignUp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formfields, setFormfields] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const context = useContext(MyContext);
  const history = useNavigate();

  useEffect(() => {
    context.setisHeaderFooterShow(false);
    context.setEnableFilterTab(false);

    return () => {
      context.setisHeaderFooterShow(true);
      context.setEnableFilterTab(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onchangeInput = (e) => {
    const { name, value } = e.target;
    setFormfields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const { name, email, phone, password } = formfields;

    if (!name.trim()) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Name cannot be blank!",
      });
      return false;
    }

    if (!email.trim()) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Email cannot be blank!",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please enter a valid email address",
      });
      return false;
    }

    if (!phone.trim()) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Phone cannot be blank!",
      });
      return false;
    }

    if (!password) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Password cannot be blank!",
      });
      return false;
    }

    if (password.length < 6) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Password must be at least 6 characters",
      });
      return false;
    }

    return true;
  };

  const register = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const payload = {
        name: formfields.name.trim(),
        email: formfields.email.trim(),
        phone: formfields.phone.trim(),
        password: formfields.password,
      };

      const res = await postData("/api/user/signup", payload);

      if (res.status !== "FAILED") {
        localStorage.setItem("userEmail", payload.email);
        localStorage.setItem("actionType", "verifyAccount");

        context.setAlertBox({
          open: true,
          error: false,
          msg:
            res?.message ||
            "Registered successfully! Please check your email for OTP.",
        });

        setTimeout(() => {
          history("/verifyOTP");
        }, 800);
      } else {
        setIsLoading(false);
        context.setAlertBox({
          open: true,
          error: true,
          msg: res.msg || "Registration failed",
        });
      }
    } catch (error) {
      console.error("Error posting data:", error);
      setIsLoading(false);
      context.setAlertBox({
        open: true,
        error: true,
        msg: error?.message || "Something went wrong while signing up",
      });
    }
  };

  const signInWithGoogle = () => {
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        const user = result.user;

        const fields = {
          name: user?.providerData?.[0]?.displayName || "",
          email: user?.providerData?.[0]?.email || "",
          password: null,
          images: user?.providerData?.[0]?.photoURL || "",
          phone: user?.providerData?.[0]?.phoneNumber || "",
        };

        postData("/api/user/authWithGoogle", fields).then((res) => {
          try {
            if (res.error !== true) {
              localStorage.setItem("token", res.token);

              const safeUser = {
                name: res.user?.name,
                email: res.user?.email,
                userId: res.user?.id,
              };

              localStorage.setItem("user", JSON.stringify(safeUser));

              context.setAlertBox({
                open: true,
                error: false,
                msg: res.msg || "User authenticated successfully!",
              });

              setTimeout(() => {
                history("/");
                context.setIsLogin(true);
                setIsLoading(false);
                context.setisHeaderFooterShow(true);
              }, 800);
            } else {
              context.setAlertBox({
                open: true,
                error: true,
                msg: res.msg || "Google login failed",
              });
              setIsLoading(false);
            }
          } catch (error) {
            console.log(error);
            setIsLoading(false);
          }
        });
      })
      .catch((error) => {
        const errorMessage = error.message;
        context.setAlertBox({
          open: true,
          error: true,
          msg: errorMessage || "Google authentication failed",
        });
      });
  };

  const handleCancel = () => {
    context.setisHeaderFooterShow(true);
    history("/");
  };

  return (
    <section className="section signInPage signUpPage">
      {/* keep your gradient + wave background */}
      <div className="shape-bottom">
        <svg
          fill="#fff"
          x="0px"
          y="0px"
          viewBox="0 0 1921 819.8"
          style={{ enableBackground: "new 0 0 1921 819.8" }}
        >
          <path d="M1921,413.1v406.7H0V0.5h0.4l228.1,598.3c30,74.4,80.8,130.6,152.5,168.6c107.6,57,212.1,40.7,245.7,34.4 c22.4-4.2,54.9-13.1,97.5-26.6L1921,400.5V413.1z"></path>
        </svg>
      </div>

      <div className="container">
        <div
          className="box card p-3 shadow border-0"
          style={{
            borderRadius: 14,
            maxWidth: "500px",
            width: "100%",
          }}
        >
          <div className="text-center mb-2">
            <img
              src={Logo}
              alt="Thriftkart"
              style={{ maxWidth: 120, height: "auto" }}
            />
          </div>

          <form className="mt-2" onSubmit={register}>
            <h2 className="mb-1" style={{ fontWeight: 600, fontSize: 24 }}>
              Create your account
            </h2>
            <p
              className="txt mb-3"
              style={{ fontWeight: 400, fontSize: 13, color: "#6b7280" }}
            >
              Sign up to save favourites, track orders and get personalised
              offers from Thriftkart.
            </p>

            <div className="row">
              <div className="col-sm-6">
                <div className="form-group">
                  <TextField
                    label="Full Name"
                    name="name"
                    onChange={onchangeInput}
                    type="text"
                    variant="standard"
                    className="w-100"
                    value={formfields.name}
                    required
                  />
                </div>
              </div>

              <div className="col-sm-6">
                <div className="form-group">
                  <TextField
                    label="Phone No."
                    name="phone"
                    onChange={onchangeInput}
                    type="tel"
                    variant="standard"
                    className="w-100"
                    value={formfields.phone}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <TextField
                label="Email"
                type="email"
                name="email"
                onChange={onchangeInput}
                variant="standard"
                className="w-100"
                value={formfields.email}
                required
              />
            </div>

            <div className="form-group">
              <TextField
                label="Password"
                name="password"
                onChange={onchangeInput}
                type="password"
                variant="standard"
                className="w-100"
                value={formfields.password}
                required
              />
            </div>

            <div className="d-flex align-items-center mt-3 mb-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="btn-blue btn-lg btn-big col"
              >
                {isLoading ? <CircularProgress size={22} /> : "Sign Up"}
              </Button>

              <Button
                className="btn-lg btn-big col ml-3"
                variant="outlined"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>

            <p className="txt mb-1" style={{ fontSize: 14 }}>
              Already have an account?{" "}
              <Link to="/signIn" className="border-effect">
                Sign In
              </Link>
            </p>

            <h6 className="mt-3 text-center font-weight-bold">
              Or continue with social account
            </h6>

            <Button
              className="loginWithGoogle mt-2"
              variant="outlined"
              onClick={signInWithGoogle}
            >
              <img src={GoogleImg} alt="Google" /> Sign Up with Google
            </Button>

            <p
              className="mt-3 mb-0 text-center"
              style={{ fontSize: 11, color: "#6b7280" }}
            >
              By creating an account, you agree to Thriftkart&apos;s{" "}
              <span className="border-effect">Terms of Use</span> and{" "}
              <span className="border-effect">Privacy Policy</span>.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignUp;
