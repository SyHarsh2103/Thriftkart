import { BrowserRouter, Route, Routes } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "./responsive.css";
import Dashboard from "./pages/Dashboard";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import React, { createContext, useEffect, useState } from "react";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Products from "./pages/Products";
import Category from "./pages/Category/categoryList";
import ProductDetails from "./pages/ProductDetails";
import ProductUpload from "./pages/Products/addProduct";
import EditProduct from "./pages/Products/editProduct";
import CategoryAdd from "./pages/Category/addCategory";
import EditCategory from "./pages/Category/editCategory";
import SubCatAdd from "./pages/Category/addSubCat";
import EditSubCat from "./pages/Category/editSubCat";
import SubCatList from "./pages/Category/subCategoryList";
import AddProductRAMS from "./pages/Products/addProductRAMS";
import ProductWeight from "./pages/Products/addProductWeight";
import ProductSize from "./pages/Products/addProductSize";
import Orders from "./pages/Orders";
import AddHomeBannerSlide from "./pages/HomeBanner/addHomeSlide";
import HomeBannerSlideList from "./pages/HomeBanner/homeSlideList";
import EditHomeBannerSlide from "./pages/HomeBanner/editSlide";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import LoadingBar from "react-top-loading-bar";
import { fetchDataFromApi } from "./utils/api";

import axios from "axios";
import BannersList from "./pages/Banners/bannerList";
import AddBanner from "./pages/Banners/addHomeBanner";
import EditBanner from "./pages/Banners/editHomeBanner";

import HomeSideBannersList from "./pages/HomeSideBanners/bannerList";
import AddHomeSideBanner from "./pages/HomeSideBanners/addHomeSideBanner";
import EditHomeSideBanner from "./pages/HomeSideBanners/editHomeSideBanner";

import HomeBottomBannersList from "./pages/HomeBottomBanners/bannerList";
import AddHomeBottomBanner from "./pages/HomeBottomBanners/addHomeBottomBanner";
import EditHomeBottomBanner from "./pages/HomeBottomBanners/editHomeBottomBanner";
import MyAccount from "./pages/MyAccount";
import VerifyAccount from "./pages/OtpVerify";
import ForgotPassword from "./pages/ForgotPassword";

// 🔹 NEW: Admin return requests page
import ReturnRequests from "./pages/ReturnRequests";

const MyContext = createContext();

function App() {
  const [isToggleSidebar, setIsToggleSidebar] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [isHideSidebarAndHeader, setisHideSidebarAndHeader] = useState(false);
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") ? localStorage.getItem("theme") : "light"
  );
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [catData, setCatData] = useState([]);
  const [subCatData, setSubCatData] = useState([]);
  const [user, setUser] = useState({
    name: "",
    email: "",
    userId: "",
    isAdmin: false,
  });

  const [isOpenNav, setIsOpenNav] = useState(false);

  const [baseUrl, setBaseUrl] = useState("http://localhost:4000");

  const [progress, setProgress] = useState(0);
  const [alertBox, setAlertBox] = useState({
    msg: "",
    error: false,
    open: false,
  });

  const [selectedLocation, setSelectedLocation] = useState("");
  const [countryList, setCountryList] = useState([]);
  const [selectedCountry, setselectedCountry] = useState("");

  // ---------- Theme ----------
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  // ---------- Window resize (optional, used in context) ----------
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ---------- Admin session init (IMPORTANT) ----------
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || !rawUser) {
      setIsLogin(false);
      setUser({ name: "", email: "", userId: "", isAdmin: false });
      return;
    }

    try {
      const parsed = JSON.parse(rawUser);

      // 🔒 Only allow admins in admin panel
      if (parsed?.isAdmin !== true) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLogin(false);
        setUser({ name: "", email: "", userId: "", isAdmin: false });
        return;
      }

      setIsLogin(true);
      setUser(parsed);
    } catch (err) {
      console.error("Failed to parse user from localStorage:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsLogin(false);
      setUser({ name: "", email: "", userId: "", isAdmin: false });
    }
  }, []);

  // ---------- Listen for global admin logout event from api.js ----------
  useEffect(() => {
    const onAdminLogout = (e) => {
      // Clear local state
      setIsLogin(false);
      setUser({ name: "", email: "", userId: "", isAdmin: false });

      setAlertBox({
        open: true,
        error: true,
        msg:
          e?.detail?.reason ||
          "Your admin session has expired. Please login again.",
      });
    };

    window.addEventListener("thriftkart:admin-logout", onAdminLogout);
    return () => {
      window.removeEventListener("thriftkart:admin-logout", onAdminLogout);
    };
  }, []);

  // ---------- Country list (skip external API on localhost to avoid CORS noise) ----------
  useEffect(() => {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      getCountry("https://countriesnow.space/api/v0.1/countries/");
    } else {
      // In dev/admin localhost, we don't really need this → keep empty
      setCountryList([]);
    }
  }, []);

  const countryListArr = [];

  const getCountry = async (url) => {
    try {
      const res = await axios.get(url);
      if (res && res.data && Array.isArray(res.data.data)) {
        res.data.data.forEach((item) => {
          countryListArr.push({
            value: item?.iso2,
            label: item?.country,
          });
        });

        setCountryList(countryListArr);
      }
    } catch (err) {
      console.error("Admin country API error:", err?.message || err);
      setCountryList([]);
    }
  };

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    setAlertBox((prev) => ({ ...prev, open: false }));
  };

  // ---------- Categories ----------
  useEffect(() => {
    setProgress(20);
    fetchCategory();
  }, []);

  const fetchCategory = () => {
    fetchDataFromApi("/api/category")
      .then((res) => {
        // backend often sends { categoryList: [...] }
        if (res && Array.isArray(res.categoryList)) {
          setCatData(res.categoryList);
        } else if (Array.isArray(res)) {
          // fallback if API returns a direct array
          setCatData(res);
        } else {
          setCatData([]);
          console.error("Failed to load categories", res);
        }
      })
      .catch((err) => {
        console.error("Admin category fetch error:", err);
        setCatData([]);
      })
      .finally(() => setProgress(100));
  };

  const fetchSubCategory = () => {
    fetchDataFromApi("/api/subCat")
      .then((res) => {
        // backend sends { subCategoryList: [...] }
        if (res && Array.isArray(res.subCategoryList)) {
          setSubCatData(res.subCategoryList);
        } else if (Array.isArray(res)) {
          setSubCatData(res);
        } else {
          setSubCatData([]);
        }
      })
      .catch((err) => {
        console.error("Admin subCategory fetch error:", err);
        setSubCatData([]);
      });
  };

  const openNav = () => {
    setIsOpenNav(true);
  };

  const values = {
    isToggleSidebar,
    setIsToggleSidebar,
    isLogin,
    setIsLogin,
    isHideSidebarAndHeader,
    setisHideSidebarAndHeader,
    theme,
    setTheme,
    alertBox,
    setAlertBox,
    setProgress,
    baseUrl,
    catData,
    fetchCategory,
    subCatData,
    fetchSubCategory,
    setUser,
    user,
    countryList,
    selectedCountry,
    setselectedCountry,
    windowWidth,
    openNav,
    setIsOpenNav,
  };

  return (
    <BrowserRouter>
      <MyContext.Provider value={values}>
        <LoadingBar
          color="#f11946"
          progress={progress}
          onLoaderFinished={() => setProgress(0)}
          className="topLoadingBar"
        />

        <Snackbar
          open={alertBox.open}
          autoHideDuration={6000}
          onClose={handleClose}
        >
          <Alert
            onClose={handleClose}
            autoHideDuration={6000}
            severity={alertBox.error === false ? "success" : "error"}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {alertBox.msg}
          </Alert>
        </Snackbar>

        {isHideSidebarAndHeader !== true && <Header />}
        <div className="main d-flex">
          {isHideSidebarAndHeader !== true && (
            <>
              <div
                className={`sidebarOverlay d-none ${
                  isOpenNav === true && "show"
                }`}
                onClick={() => setIsOpenNav(false)}
              ></div>
              <div
                className={`sidebarWrapper ${
                  isToggleSidebar === true ? "toggle" : ""
                } ${isOpenNav === true ? "open" : ""}`}
              >
                <Sidebar />
              </div>
            </>
          )}

          <div
            className={`content ${
              isHideSidebarAndHeader === true && "full"
            } ${isToggleSidebar === true ? "toggle" : ""}`}
          >
            <Routes>
              <Route path="/" exact={true} element={<Dashboard />} />
              <Route path="/dashboard" exact={true} element={<Dashboard />} />
              <Route path="/login" exact={true} element={<Login />} />
              <Route path="/signUp" exact={true} element={<SignUp />} />
              <Route path="/products" exact={true} element={<Products />} />
              <Route
                path="/product/details/:id"
                exact={true}
                element={<ProductDetails />}
              />
              <Route
                path="/product/upload"
                exact={true}
                element={<ProductUpload />}
              />
              <Route
                path="/product/edit/:id"
                exact={true}
                element={<EditProduct />}
              />
              <Route path="/category" exact={true} element={<Category />} />
              <Route
                path="/category/add"
                exact={true}
                element={<CategoryAdd />}
              />
              <Route
                path="/category/edit/:id"
                exact={true}
                element={<EditCategory />}
              />
              <Route
                path="/subCategory/"
                exact={true}
                element={<SubCatList />}
              />
              <Route
                path="/subCategory/add"
                exact={true}
                element={<SubCatAdd />}
              />
              <Route
                path="/subCategory/edit/:id"
                exact={true}
                element={<EditSubCat />}
              />
              <Route
                path="/productRAMS/add"
                exact={true}
                element={<AddProductRAMS />}
              />
              <Route
                path="/productWEIGHT/add"
                exact={true}
                element={<ProductWeight />}
              />
              <Route
                path="/productSIZE/add"
                exact={true}
                element={<ProductSize />}
              />
              <Route path="/orders/" exact={true} element={<Orders />} />

              {/* 🔹 NEW: Admin Return Requests list */}
              <Route
                path="/returns"
                exact={true}
                element={<ReturnRequests />}
              />

              <Route
                path="/homeBannerSlide/add"
                exact={true}
                element={<AddHomeBannerSlide />}
              />
              <Route
                path="/homeBannerSlide/list"
                exact={true}
                element={<HomeBannerSlideList />}
              />
              <Route
                path="/homeBannerSlide/edit/:id"
                exact={true}
                element={<EditHomeBannerSlide />}
              />

              <Route path="/banners" exact={true} element={<BannersList />} />
              <Route path="/banners/add" exact={true} element={<AddBanner />} />
              <Route
                path="/banners/edit/:id"
                exact={true}
                element={<EditBanner />}
              />

              <Route
                path="/homeSideBanners"
                exact={true}
                element={<HomeSideBannersList />}
              />
              <Route
                path="/homeSideBanners/add"
                exact={true}
                element={<AddHomeSideBanner />}
              />
              <Route
                path="/homeSideBanners/edit/:id"
                exact={true}
                element={<EditHomeSideBanner />}
              />

              <Route
                path="/homeBottomBanners"
                exact={true}
                element={<HomeBottomBannersList />}
              />
              <Route
                path="/homeBottomBanners/add"
                exact={true}
                element={<AddHomeBottomBanner />}
              />
              <Route
                path="/homeBottomBanners/edit/:id"
                exact={true}
                element={<EditHomeBottomBanner />}
              />
              <Route exact={true} path="/my-account" element={<MyAccount />} />
              <Route
                exact={true}
                path="/verify-account"
                element={<VerifyAccount />}
              />
              <Route
                exact={true}
                path="/forgot-password"
                element={<ForgotPassword />}
              />
            </Routes>
          </div>
        </div>
      </MyContext.Provider>
    </BrowserRouter>
  );
}

export default App;
export { MyContext };
