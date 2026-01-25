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
    isAdmin: true, // server must validate this, not trust blindly
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
        isAdmin: true,
      };

      const res = await postData("/api/user/signup", payload);

      const isFailed =
        res?.status === "FAILED" || res?.error || res?.success === false;

      if (!isFailed) {
        localStorage.setItem("userEmail", payload.email);

        context.setAlertBox({
          open: true,
          error: false,
          msg:
            res?.message ||
            res?.msg ||
            "Admin account created. Verify your email.",
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

  return (
    <>
      <img src={patern} className="loginPatern" alt="" />

      <section className="loginSection signUpSection">
        <div className="container h-100">
          <div className="row justify-content-center align-items-center h-100">
            <div className="col-lg-10 col-xl-8">
              {/* Main signup card */}
              <div className="signupCard shadow-lg border-0 bg-white d-flex flex-column flex-md-row overflow-hidden">
                {/* Left: logo + form */}
                <div className="signupLeft col-md-6 px-4 px-md-5 py-4 py-md-5">
                  <div className="text-center mb-4">
                    <Link
                      to="/"
                      className="d-flex align-items-center flex-column logo"
                    >
                      <img src={Logo} alt="Thriftkart logo" />
                      <span className="ml-2 mt-2 signup-title">
                        Create New Admin
                      </span>
                    </Link>
                  </div>

                  <form onSubmit={signUp}>
                    {/* Name */}
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
                        placeholder="Full name"
                        onFocus={() => focusInput(0)}
                        onBlur={() => setInputIndex(null)}
                        autoFocus
                        name="name"
                        value={formfields.name}
                        onChange={onchangeInput}
                      />
                    </div>

                    {/* Email */}
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
                        placeholder="Admin email"
                        onFocus={() => focusInput(1)}
                        onBlur={() => setInputIndex(null)}
                        name="email"
                        value={formfields.email}
                        onChange={onchangeInput}
                      />
                    </div>

                    {/* Phone */}
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
                        placeholder="Phone number"
                        onFocus={() => focusInput(2)}
                        onBlur={() => setInputIndex(null)}
                        name="phone"
                        value={formfields.phone}
                        onChange={onchangeInput}
                      />
                    </div>

                    {/* Password */}
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
                        placeholder="Password"
                        onFocus={() => focusInput(3)}
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

                    {/* Confirm Password */}
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
                        placeholder="Confirm password"
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
                        {isShowConfirmPassword ? (
                          <IoMdEyeOff />
                        ) : (
                          <IoMdEye />
                        )}
                      </span>
                    </div>

                    {/* Submit */}
                    <div className="form-group mt-3">
                      <Button
                        type="submit"
                        className="btn-blue btn-lg w-100 btn-big"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <CircularProgress size={24} />
                        ) : (
                          "Create Admin Account"
                        )}
                      </Button>
                    </div>

                    <span className="text-center d-block mt-3">
                      Already have an admin account?
                      <Link to={"/login"} className="link color ml-2">
                        Sign In
                      </Link>
                    </span>
                  </form>
                </div>

                {/* Right: short marketing / explanation */}
                <div className="signupRight col-md-6 d-flex flex-column justify-content-center px-4 px-md-5 py-4 py-md-5">
                  <h2 className="mb-3 signup-heading">
                    Thriftkart Admin Console
                  </h2>
                  <p className="signup-text">
                    Manage products, orders, returns, and banners from a single,
                    powerful admin panel. Thriftkart is designed for fast daily
                    operations, clean analytics, and a smooth UX for your entire
                    fashion business.
                  </p>
                  <ul className="signup-bullets mt-2">
                    <li>Centralized product & inventory management</li>
                    <li>Order & return workflow with Shiprocket integration</li>
                    <li>Flexible banner management for homepage layouts</li>
                    <li>Secure, email-verified admin access</li>
                  </ul>
                </div>
              </div>
              {/* /signupCard */}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SignUp;
