import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "./responsive.css";

import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Home from "./Pages/Home";
import Listing from "./Pages/Listing";
import ProductDetails from "./Pages/ProductDetails";
import Header from "./Components/Header";
import { createContext, useEffect, useState, useContext } from "react";
import axios from "axios";
import Footer from "./Components/Footer";
import ScrollToTop from "./Components/Scrollbar";
import ProductModal from "./Components/ProductModal";
import Cart from "./Pages/Cart";
import SignIn from "./Pages/SignIn";
import SignUp from "./Pages/SignUp";
import MyList from "./Pages/MyList";
import Checkout from "./Pages/Checkout";
import Orders from "./Pages/Orders";
import MyAccount from "./Pages/MyAccount";
import SearchPage from "./Pages/Search";
import VerifyOTP from "./Pages/VerifyOTP";
import ChangePassword from "./Pages/ChangePassword";
import ForgotPassword from "./Pages/ForgotPassword";
import { fetchDataFromApi, postData } from "./utils/api";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import AboutUs from "./Pages/AboutUs";
import TermsConditions from "./Pages/TermsConditions";
import PrivacyPolicy from "./Pages/PrivacyPolicy";
import RefundPolicy from "./Pages/RefundPolicy";
import Contact from "./Pages/Contact";

const MyContext = createContext();

/**
 * Simple wrapper to protect routes that require login.
 * If not logged in → show alert + redirect to /signIn.
 */
const RequireAuth = ({ children }) => {
  const { isLogin, setAlertBox } = useContext(MyContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLogin) {
      setAlertBox({
        open: true,
        error: true,
        msg: "Please login first",
      });
      navigate("/signIn");
    }
  }, [isLogin, navigate, setAlertBox]);

  if (!isLogin) return null;
  return children;
};

function App() {
  const location = useLocation();

  const [countryList, setCountryList] = useState([]);
  const [selectedCountry, setselectedCountry] = useState("");
  const [isOpenProductModal, setisOpenProductModal] = useState(false);
  const [isHeaderFooterShow, setisHeaderFooterShow] = useState(true);
  const [isLogin, setIsLogin] = useState(false);
  const [productData, setProductData] = useState([]);

  const [categoryData, setCategoryData] = useState([]);
  const [subCategoryData, setsubCategoryData] = useState([]);
  const [addingInCart, setAddingInCart] = useState(false);

  const [cartData, setCartData] = useState();
  const [searchData, setSearchData] = useState([]);
  const [isOpenNav, setIsOpenNav] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [enableFilterTab, setEnableFilterTab] = useState(false);
  const [isOpenFilters, setIsOpenFilters] = useState(false);
  const [isBottomShow, setIsBottomShow] = useState(true);

  const [alertBox, setAlertBox] = useState({
    msg: "",
    error: false,
    open: false,
  });

  const [user, setUser] = useState({ name: "", email: "", userId: "" });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.userId) {
      fetchDataFromApi(`/api/cart?userId=${user?.userId}`).then((res) => {
        setCartData(res);
      });
    }
  }, [isLogin]);

  useEffect(() => {
    getCountry("https://countriesnow.space/api/v0.1/countries/");

    fetchDataFromApi("/api/category").then((res) => {
      setCategoryData(res.categoryList);
      const subCatArr = [];
      res.categoryList?.forEach((cat) => {
        if (cat?.children?.length) {
          cat.children.forEach((subCat) => subCatArr.push(subCat));
        }
      });
      setsubCategoryData(subCatArr);
    });

    const handleResize = () => setWindowWidth(window.innerWidth);

    const locationStr = localStorage.getItem("location");
    if (locationStr) setselectedCountry(locationStr);
    else {
      setselectedCountry("All");
      localStorage.setItem("location", "All");
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCartData = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.userId) return;
    fetchDataFromApi(`/api/cart?userId=${user?.userId}`).then((res) =>
      setCartData(res)
    );
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLogin(true);
      const userData = JSON.parse(localStorage.getItem("user"));
      setUser(userData);
    } else {
      setIsLogin(false);
    }
  }, [isLogin]);

  const openProductDetailsModal = (id, status) => {
    fetchDataFromApi(`/api/products/${id}`).then((res) => {
      setProductData(res);
      setisOpenProductModal(status);
    });
  };

  const getCountry = async (url) => {
    const responsive = await axios.get(url);
    setCountryList(responsive.data.data);
  };

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setAlertBox({ open: false });
  };

  const addToCart = (data) => {
    if (isLogin) {
      setAddingInCart(true);
      postData(`/api/cart/add`, data).then((res) => {
        if (res.status !== false) {
          setAlertBox({
            open: true,
            error: false,
            msg: "Item is added in the cart",
          });
          setTimeout(() => setAddingInCart(false), 1000);
          getCartData();
        } else {
          setAlertBox({
            open: true,
            error: true,
            msg: res.msg,
          });
          setAddingInCart(false);
        }
      });
    } else {
      setAlertBox({
        open: true,
        error: true,
        msg: "Please login first",
      });
    }
  };

  const values = {
    countryList,
    setselectedCountry,
    selectedCountry,
    isOpenProductModal,
    setisOpenProductModal,
    isHeaderFooterShow,
    setisHeaderFooterShow,
    isLogin,
    setIsLogin,
    user,
    setUser,
    categoryData,
    setCategoryData,
    subCategoryData,
    setsubCategoryData,
    openProductDetailsModal,
    alertBox,
    setAlertBox,
    addToCart,
    addingInCart,
    setAddingInCart,
    cartData,
    setCartData,
    getCartData,
    searchData,
    setSearchData,
    windowWidth,
    isOpenNav,
    setIsOpenNav,
    setEnableFilterTab,
    enableFilterTab,
    setIsOpenFilters,
    isOpenFilters,
    setIsBottomShow,
    isBottomShow,
  };

  return (
    <MyContext.Provider value={values}>
      <Snackbar
        open={alertBox.open}
        autoHideDuration={6000}
        onClose={handleClose}
        className="snackbar"
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

      {isHeaderFooterShow && <Header />}
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<Home />} />
        {/* Force remount on path change */}
        <Route
          path="/products/category/:id"
          element={<Listing key={location.pathname} />}
        />
        <Route
          path="/products/subCat/:id"
          element={<Listing key={location.pathname} />}
        />
        <Route
          path="/products/:id"
          element={<ProductDetails key={location.pathname} />}
        />

        {/* Public routes */}
        <Route path="/signIn" element={<SignIn />} />
        <Route path="/signUp" element={<SignUp />} />
        <Route path="/forgotPassword" element={<ForgotPassword />} />
        <Route path="/verifyOTP" element={<VerifyOTP />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/search" element={<SearchPage />} />

        {/* Routes that make sense even if not logged in (optional) */}
        <Route path="/cart" element={<Cart />} />

        {/* Protected routes (login required) */}
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Checkout />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <Orders />
            </RequireAuth>
          }
        />
        <Route
          path="/my-account"
          element={
            <RequireAuth>
              <MyAccount />
            </RequireAuth>
          }
        />
        <Route
          path="/my-list"
          element={
            <RequireAuth>
              <MyList />
            </RequireAuth>
          }
        />
        <Route
          path="/changePassword"
          element={
            <RequireAuth>
              <ChangePassword />
            </RequireAuth>
          }
        />
      </Routes>

      {isHeaderFooterShow && <Footer />}
      {isOpenProductModal && <ProductModal data={productData} />}
    </MyContext.Provider>
  );
}

export default App;
export { MyContext };
