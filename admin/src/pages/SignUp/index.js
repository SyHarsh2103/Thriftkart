import { useContext, useEffect, useState } from "react";
import Logo from "../../assets/images/tklogo.png";
import patern from "../../assets/images/pattern.webp";
import { MyContext } from "../../App";
import { MdEmail } from "react-icons/md";
import { RiLockPasswordFill } from "react-icons/ri";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import Button from "@mui/material/Button";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { IoShieldCheckmarkSharp } from "react-icons/io5";
import { FaPhoneAlt } from "react-icons/fa";
import CircularProgress from "@mui/material/CircularProgress";

import { postData } from "../../utils/api";

// If you later re-enable Google login, you can keep these imports ready:
// import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
// import { firebaseApp } from "../../firebase";
// const auth = getAuth(firebaseApp);
// const googleProvider = new GoogleAuthProvider();

const SignUp = () => {
  const [inputIndex, setInputIndex] = useState(null);
  const [isShowPassword, setisShowPassword] = useState(false);
  const [isShowConfirmPassword, setisShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formfields, setFormfields] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    isAdmin: true, // ⚠️ server must NOT trust this, always validate/admin-only
  });

  const navigate = useNavigate();
  const context = useContext(MyContext);

  useEffect(() => {
    context.setisHideSidebarAndHeader(true);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusInput = (index) => setInputIndex(index);

  const onchangeInput = (e) => {
    const { name, value } = e.target;
    setFormfields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const name = formfields.name.trim();
    const email = formfields.email.trim().toLowerCase();
    const phone = formfields.phone.trim();
    const password = formfields.password;
    const confirmPassword = formfields.confirmPassword;

    if (!name) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Name can not be blank!",
      });
      return false;
    }

    if (!email) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Email can not be blank!",
      });
      return false;
    }

    // basic email pattern
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please enter a valid email address.",
      });
      return false;
    }

    if (!phone) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Phone can not be blank!",
      });
      return false;
    }

    if (!password) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Password can not be blank!",
      });
      return false;
    }

    if (password.length < 6) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Password must be at least 6 characters.",
      });
      return false;
    }

    if (!confirmPassword) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Confirm password can not be blank!",
      });
      return false;
    }

    if (confirmPassword !== password) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Password and confirm password do not match.",
      });
      return false;
    }

    return true;
  };

  const signUp = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const payload = {
        name: formfields.name.trim(),
        email: formfields.email.trim().toLowerCase(),
        phone: formfields.phone.trim(),
        password: formfields.password,
        isAdmin: true, // server should verify this, not trust blindly
      };

      const res = await postData("/api/user/signup", payload);

      // Support both old {status:'FAILED'} and newer {success:false}
      const isFailed = res?.status === "FAILED" || res?.error || res?.success === false;

      if (!isFailed) {
        // store email for OTP verification screen
        localStorage.setItem("userEmail", payload.email);

        context.setAlertBox({
          open: true,
          error: false,
          msg: res?.message || res?.msg || "Admin account created. Verify your email.",
        });

        setTimeout(() => {
          navigate("/verify-account");
        }, 800);
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.msg || res?.message || "Registration failed.",
        });
      }
    } catch (error) {
      console.error("Error posting data:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: error?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If/when you re-enable Google admin signup, plug it back in securely:
  // const signInWithGoogle = () => { ... }

  return (
    <>
      <img src={patern} className="loginPatern" alt="" />
      <section className="loginSection signUpSection">
        <div className="row">
          <div className="col-md-8 d-flex align-items-center flex-column part1 justify-content-center">
            <h1>
              BEST UX/UI FASHION{" "}
              <span className="text-sky">ECOMMERCE DASHBOARD</span> & ADMIN PANEL
            </h1>
            <p>
              Thriftkart is a modern fashion eCommerce platform designed to deliver the best
              user experience for both customers and administrators. With a sleek dashboard
              and powerful admin panel, Thriftkart simplifies product management, order
              tracking, and customer engagement. It combines cutting-edge design with intuitive
              navigation, making it easier than ever to manage your fashion business online.
            </p>
          </div>

          <div className="col-md-4 pr-0">
            <div className="loginBox">
              <Link to={"/"} className="d-flex align-items-center flex-column logo">
                <img src={Logo} alt="Thriftkart logo" />
                <span className="ml-2">NEW ADMIN</span>
              </Link>

              <div className="wrapper mt-3 card border">
                <form onSubmit={signUp}>
                  <div
                    className={`form-group position-relative ${
                      inputIndex === 0 ? "focus" : ""
                    }`}
                  >
                    <span className="icon">
                      <FaUserCircle />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="enter your name"
                      onFocus={() => focusInput(0)}
                      onBlur={() => setInputIndex(null)}
                      autoFocus
                      name="name"
                      value={formfields.name}
                      onChange={onchangeInput}
                    />
                  </div>

                  <div
                    className={`form-group position-relative ${
                      inputIndex === 1 ? "focus" : ""
                    }`}
                  >
                    <span className="icon">
                      <MdEmail />
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="enter your email"
                      onFocus={() => focusInput(1)}
                      onBlur={() => setInputIndex(null)}
                      name="email"
                      value={formfields.email}
                      onChange={onchangeInput}
                    />
                  </div>

                  <div
                    className={`form-group position-relative ${
                      inputIndex === 2 ? "focus" : ""
                    }`}
                  >
                    <span className="icon">
                      <FaPhoneAlt />
                    </span>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="enter your phone"
                      onFocus={() => focusInput(2)}
                      onBlur={() => setInputIndex(null)}
                      name="phone"
                      value={formfields.phone}
                      onChange={onchangeInput}
                    />
                  </div>

                  <div
                    className={`form-group position-relative ${
                      inputIndex === 3 ? "focus" : ""
                    }`}
                  >
                    <span className="icon">
                      <RiLockPasswordFill />
                    </span>
                    <input
                      type={isShowPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="enter your password"
                      onFocus={() => focusInput(3)}
                      onBlur={() => setInputIndex(null)}
                      name="password"
                      value={formfields.password}
                      onChange={onchangeInput}
                    />
                    <span
                      className="toggleShowPassword"
                      onClick={() => setisShowPassword((prev) => !prev)}
                    >
                      {isShowPassword ? <IoMdEyeOff /> : <IoMdEye />}
                    </span>
                  </div>

                  <div
                    className={`form-group position-relative ${
                      inputIndex === 4 ? "focus" : ""
                    }`}
                  >
                    <span className="icon">
                      <IoShieldCheckmarkSharp />
                    </span>
                    <input
                      type={isShowConfirmPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="confirm your password"
                      onFocus={() => focusInput(4)}
                      onBlur={() => setInputIndex(null)}
                      name="confirmPassword"
                      value={formfields.confirmPassword}
                      onChange={onchangeInput}
                    />
                    <span
                      className="toggleShowPassword"
                      onClick={() =>
                        setisShowConfirmPassword((prev) => !prev)
                      }
                    >
                      {isShowConfirmPassword ? <IoMdEyeOff /> : <IoMdEye />}
                    </span>
                  </div>

                  <div className="form-group">
                    <Button
                      type="submit"
                      className="btn-blue btn-lg w-100 btn-big"
                      disabled={isLoading}
                    >
                      {isLoading ? <CircularProgress size={24} /> : "Sign Up"}
                    </Button>
                  </div>

                  {/* Google sign-up is commented out for now to keep admin creation stricter */}
                  {/* <div className="form-group text-center mb-0">
                    <div className="d-flex align-items-center justify-content-center or mt-3 mb-3">
                      <span className="line"></span>
                      <span className="txt">or</span>
                      <span className="line"></span>
                    </div>
                    <Button
                      variant="outlined"
                      className="w-100 btn-lg btn-big loginWithGoogle"
                      onClick={signInWithGoogle}
                      disabled={isLoading}
                    >
                      <img src={googleIcon} width="25px" alt="Google" /> &nbsp;
                      Sign In with Google
                    </Button>
                  </div> */}
                </form>

                <span className="text-center d-block mt-3">
                  Already have an account?
                  <Link to={"/login"} className="link color ml-2">
                    Sign In
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SignUp;
