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

// If you want Google login later, you can keep these imports,
// but for now button is commented out so it’s effectively disabled.
// import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
// import { firebaseApp } from "../../firebase";

// const auth = getAuth(firebaseApp);
// const googleProvider = new GoogleAuthProvider();

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
      // Already logged in → go to dashboard
      history("/dashboard");
    } else {
      history("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusInput = (index) => {
    setInputIndex(index);
  };

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

        // Backend error (wrong cred, etc.)
        if (res?.error === true) {
          if (res?.isVerify === false) {
            // user exists but email not verified yet
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

        // ✅ At this point, credentials are valid. NOW enforce admin.
        if (!res?.user?.isAdmin) {
          context.setAlertBox({
            open: true,
            error: true,
            msg: "You are not an admin.",
          });
          setIsLoading(false);
          return;
        }

        // ✅ Admin user → store token and user
        const adminUser = {
          name: res.user?.name,
          email: res.user?.email,
          userId: res.user?.id,
          isAdmin: true,
        };

        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(adminUser));

        // Sync React context so RequireAdmin works
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

  // If you want Google admin login later, you can harden like this:
  /*
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
            if (res.error === true) {
              context.setAlertBox({
                open: true,
                error: true,
                msg: res.msg,
              });
              setIsLoading(false);
              return;
            }

            if (!res.user?.isAdmin) {
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
              msg: res.msg || "Login successful",
            });

            setTimeout(() => {
              context.setisHideSidebarAndHeader(false);
              history("/dashboard");
            }, 1000);
          } catch (error) {
            console.log(error);
            setIsLoading(false);
          }
        });
      })
      .catch((error) => {
        context.setAlertBox({
          open: true,
          error: true,
          msg: error.message,
        });
      });
  };
  */

  return (
    <>
      <img src={patern} className="loginPatern" alt="pattern" />
      <section className="loginSection">
        <div className="loginBox">
          <Link
            to={"/"}
            className="d-flex align-items-center flex-column logo"
          >
            <img src={Logo} alt="Thriftkart Admin" />
            <span className="ml-2">ADMIN LOGIN</span>
          </Link>

          <div className="wrapper mt-3 card border">
            {isOpenVerifyEmailBox && <h2 className="mb-4">Verify Email</h2>}

            <form onSubmit={signIn}>
              <div
                className={`form-group position-relative ${
                  inputIndex === 0 && "focus"
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
                  onChange={onchangeInput}
                />
              </div>

              {!isOpenVerifyEmailBox ? (
                <>
                  <div
                    className={`form-group position-relative ${
                      inputIndex === 1 && "focus"
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
                      onChange={onchangeInput}
                    />

                    <span
                      className="toggleShowPassword"
                      onClick={() => setisShowPassword(!isShowPassword)}
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
                      {isLoading ? <CircularProgress size={24} /> : "Sign In"}
                    </Button>
                  </div>

                  <div className="form-group text-center mb-0">
                    <Link to={"/forgot-password"} className="link">
                      FORGOT PASSWORD
                    </Link>

                    <div className="d-flex align-items-center justify-content-center or mt-3 mb-3">
                      <span className="line"></span>
                      <span className="txt">or</span>
                      <span className="line"></span>
                    </div>

                    {/* Google login disabled for now for security / clarity */}
                    {/*
                    <Button
                      variant="outlined"
                      className="w-100 btn-lg btn-big loginWithGoogle"
                      onClick={signInWithGoogle}
                    >
                      <img src={googleIcon} width="25px" alt="Google" /> &nbsp;
                      Sign In with Google
                    </Button>
                    */}
                  </div>
                </>
              ) : (
                <Button
                  type="submit"
                  className="btn-blue btn-lg w-100 btn-big"
                  disabled={isLoading}
                >
                  {isLoading ? <CircularProgress size={24} /> : "Verify Email"}
                </Button>
              )}
            </form>
          </div>

          {!isOpenVerifyEmailBox && (
            <div className="wrapper mt-3 card border footer p-3">
              <span className="text-center">
                Don't have an account?
                <Link to={"/signUp"} className="link color ml-2">
                  Register
                </Link>
              </span>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Login;
