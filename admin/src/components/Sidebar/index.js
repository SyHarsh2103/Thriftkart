// admin/src/components/Sidebar/index.jsx
import Button from "@mui/material/Button";
import { MdDashboard } from "react-icons/md";
import { FaAngleRight } from "react-icons/fa6";
import { FaProductHunt, FaUserPlus } from "react-icons/fa"; // 👈 added FaUserPlus
import { FaCartArrowDown } from "react-icons/fa6";
import { IoMdLogOut } from "react-icons/io";
import { FaClipboardCheck } from "react-icons/fa";
import { BiSolidCategory } from "react-icons/bi";
import { TbSlideshow } from "react-icons/tb";

import { Link, NavLink, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { MyContext } from "../../App";

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isToggleSubmenu, setIsToggleSubmenu] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  // inner dropdowns for each banner type
  const [openHomeSlides, setOpenHomeSlides] = useState(false);
  const [openHomeBanners, setOpenHomeBanners] = useState(false);
  const [openSideBanners, setOpenSideBanners] = useState(false);
  const [openBottomBanners, setOpenBottomBanners] = useState(false);

  const context = useContext(MyContext);
  const history = useNavigate();

  const isOpenSubmenu = (index) => {
    setActiveTab(index);
    if (activeTab === index) {
      setIsToggleSubmenu(!isToggleSubmenu);
    } else {
      setIsToggleSubmenu(true);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token !== "" && token !== undefined && token !== null) {
      setIsLogin(true);
    } else {
      history("/login");
    }
  }, [history]);

  const logout = () => {
    localStorage.clear();

    context.setAlertBox({
      open: true,
      error: false,
      msg: "Logout successfull",
    });

    setTimeout(() => {
      history("/login");
    }, 2000);
  };

  // helpers to toggle inner banner groups
  const toggleHomeSlides = () => setOpenHomeSlides((p) => !p);
  const toggleHomeBanners = () => setOpenHomeBanners((p) => !p);
  const toggleSideBanners = () => setOpenSideBanners((p) => !p);
  const toggleBottomBanners = () => setOpenBottomBanners((p) => !p);

  return (
    <>
      <div className="sidebar">
        <ul>
          {/* Dashboard */}
          <li>
            <NavLink exact activeClassName="is-active" to="/">
              <Button
                className={`w-100 ${activeTab === 0 ? "active" : ""}`}
                onClick={() => {
                  isOpenSubmenu(0);
                  context.setIsOpenNav(false);
                }}
              >
                <span className="icon">
                  <MdDashboard />
                </span>
                Dashboard
              </Button>
            </NavLink>
          </li>

          {/* Banners - parent */}
          <li>
            <Button
              className={`w-100 ${
                activeTab === 1 && isToggleSubmenu === true ? "active" : ""
              }`}
              onClick={() => isOpenSubmenu(1)}
            >
              <span className="icon">
                <TbSlideshow />
              </span>
              Banners
              <span className="arrow">
                <FaAngleRight />
              </span>
            </Button>

            <div
              className={`submenuWrapper ${
                activeTab === 1 && isToggleSubmenu === true
                  ? "colapse"
                  : "colapsed"
              }`}
            >
              <ul className="submenu submenu-banners">
                {/* Home Banner Slides group */}
                <li className="submenu-group">
                  <div
                    className="submenu-group-header"
                    onClick={toggleHomeSlides}
                  >
                    <span className="submenu-title">Home Banner Slides</span>
                    <span
                      className={`inner-arrow ${
                        openHomeSlides ? "open" : ""
                      }`}
                    >
                      <FaAngleRight />
                    </span>
                  </div>
                  <ul
                    className={`inner-submenu ${
                      openHomeSlides ? "open" : "closed"
                    }`}
                  >
                    <li>
                      <NavLink
                        exact
                        activeClassName="is-active"
                        to="/homeBannerSlide/list"
                        onClick={() => context.setIsOpenNav(false)}
                      >
                        Banner List
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        exact
                        activeClassName="is-active"
                        to="/homeBannerSlide/add"
                        onClick={() => context.setIsOpenNav(false)}
                      >
                        Add Banner
                      </NavLink>
                    </li>
                  </ul>
                </li>

                <li className="submenu-divider" />

                {/* Home Banners group */}
                <li className="submenu-group">
                  <div
                    className="submenu-group-header"
                    onClick={toggleHomeBanners}
                  >
                    <span className="submenu-title">Home Banners</span>
                    <span
                      className={`inner-arrow ${
                        openHomeBanners ? "open" : ""
                      }`}
                    >
                      <FaAngleRight />
                    </span>
                  </div>
                  <ul
                    className={`inner-submenu ${
                      openHomeBanners ? "open" : "closed"
                    }`}
                  >
                    <li>
                      <NavLink
                        exact
                        activeClassName="is-active"
                        to="/banners"
                        onClick={() => context.setIsOpenNav(false)}
                      >
                        Banner List
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        exact
                        activeClassName="is-active"
                        to="/banners/add"
                        onClick={() => context.setIsOpenNav(false)}
                      >
                        Add Banner
                      </NavLink>
                    </li>
                  </ul>
                </li>

                <li className="submenu-divider" />

                {/* Home Side Banners group */}
                <li className="submenu-group">
                  <div
                    className="submenu-group-header"
                    onClick={toggleSideBanners}
                  >
                    <span className="submenu-title">Home Side Banners</span>
                    <span
                      className={`inner-arrow ${
                        openSideBanners ? "open" : ""
                      }`}
                    >
                      <FaAngleRight />
                    </span>
                  </div>
                  <ul
                    className={`inner-submenu ${
                      openSideBanners ? "open" : "closed"
                    }`}
                  >
                    <li>
                      <NavLink
                        exact
                        activeClassName="is-active"
                        to="/homeSideBanners"
                        onClick={() => context.setIsOpenNav(false)}
                      >
                        Banner List
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        exact
                        activeClassName="is-active"
                        to="/homeSideBanners/add"
                        onClick={() => context.setIsOpenNav(false)}
                      >
                        Add Banner
                      </NavLink>
                    </li>
                  </ul>
                </li>

                <li className="submenu-divider" />

                {/* Home Bottom Banners group */}
                <li className="submenu-group">
                  <div
                    className="submenu-group-header"
                    onClick={toggleBottomBanners}
                  >
                    <span className="submenu-title">Home Bottom Banners</span>
                    <span
                      className={`inner-arrow ${
                        openBottomBanners ? "open" : ""
                      }`}
                    >
                      <FaAngleRight />
                    </span>
                  </div>
                  <ul
                    className={`inner-submenu ${
                      openBottomBanners ? "open" : "closed"
                    }`}
                  >
                    <li>
                      <NavLink
                        exact
                        activeClassName="is-active"
                        to="/homeBottomBanners"
                        onClick={() => context.setIsOpenNav(false)}
                      >
                        Banner List
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        exact
                        activeClassName="is-active"
                        to="/homeBottomBanners/add"
                        onClick={() => context.setIsOpenNav(false)}
                      >
                        Add Banner
                      </NavLink>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </li>

          {/* Category */}
          <li>
            <Button
              className={`w-100 ${
                activeTab === 2 && isToggleSubmenu === true ? "active" : ""
              }`}
              onClick={() => isOpenSubmenu(2)}
            >
              <span className="icon">
                <BiSolidCategory />
              </span>
              Category
              <span className="arrow">
                <FaAngleRight />
              </span>
            </Button>
            <div
              className={`submenuWrapper ${
                activeTab === 2 && isToggleSubmenu === true
                  ? "colapse"
                  : "colapsed"
              }`}
            >
              <ul className="submenu">
                <li>
                  <Link
                    to="/category"
                    onClick={() => context.setIsOpenNav(false)}
                  >
                    Category List
                  </Link>
                </li>
                <li>
                  <Link
                    to="/category/add"
                    onClick={() => context.setIsOpenNav(false)}
                  >
                    Add a category
                  </Link>
                </li>
                <li>
                  <Link
                    to="/subCategory"
                    onClick={() => context.setIsOpenNav(false)}
                  >
                    Sub Category List
                  </Link>
                </li>
                <li>
                  <Link
                    to="/subCategory/add"
                    onClick={() => context.setIsOpenNav(false)}
                  >
                    Add a sub category
                  </Link>
                </li>
              </ul>
            </div>
          </li>

          {/* Products */}
          <li>
            <Button
              className={`w-100 ${
                activeTab === 3 && isToggleSubmenu === true ? "active" : ""
              }`}
              onClick={() => isOpenSubmenu(3)}
            >
              <span className="icon">
                <FaProductHunt />
              </span>
              Products
              <span className="arrow">
                <FaAngleRight />
              </span>
            </Button>
            <div
              className={`submenuWrapper ${
                activeTab === 3 && isToggleSubmenu === true
                  ? "colapse"
                  : "colapsed"
              }`}
            >
              <ul className="submenu">
                <li>
                  <NavLink
                    exact
                    activeClassName="is-active"
                    to="/products"
                    onClick={() => context.setIsOpenNav(false)}
                  >
                    Product List
                  </NavLink>
                </li>

                <li>
                  <NavLink
                    exact
                    activeClassName="is-active"
                    to="/product/upload"
                    onClick={() => context.setIsOpenNav(false)}
                  >
                    Product Upload
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    exact
                    activeClassName="is-active"
                    to="/productRAMS/add"
                    onClick={() => context.setIsOpenNav(false)}
                  >
                    Add Product RAMS
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    exact
                    activeClassName="is-active"
                    to="/productWEIGHT/add"
                    onClick={() => context.setIsOpenNav(false)}
                  >
                    Add Product WEIGHT
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    exact
                    activeClassName="is-active"
                    to="/productSIZE/add"
                    onClick={() => context.setIsOpenNav(false)}
                  >
                    Add Product SIZE
                  </NavLink>
                </li>
              </ul>
            </div>
          </li>

          {/* Orders */}
          <li>
            <NavLink exact activeClassName="is-active" to="/orders">
              <Button
                className={`w-100 ${
                  activeTab === 4 && isToggleSubmenu === true ? "active" : ""
                }`}
                onClick={() => {
                  isOpenSubmenu(4);
                  context.setIsOpenNav(false);
                }}
              >
                <span className="icon">
                  <FaClipboardCheck fontSize="small" />
                </span>
                Orders
              </Button>
            </NavLink>
          </li>

          {/* Return Requests */}
          <li>
            <NavLink exact activeClassName="is-active" to="/returns">
              <Button
                className={`w-100 ${
                  activeTab === 5 && isToggleSubmenu === true ? "active" : ""
                }`}
                onClick={() => {
                  isOpenSubmenu(5);
                  context.setIsOpenNav(false);
                }}
              >
                <span className="icon">
                  <FaCartArrowDown fontSize="small" />
                </span>
                Return Requests
              </Button>
            </NavLink>
          </li>

          {/* ✅ New Admin Registration */}
          <li>
            <NavLink exact activeClassName="is-active" to="/signUp">
              <Button
                className={`w-100 ${
                  activeTab === 6 && isToggleSubmenu === true ? "active" : ""
                }`}
                onClick={() => {
                  isOpenSubmenu(6);
                  context.setIsOpenNav(false);
                }}
              >
                <span className="icon">
                  <FaUserPlus fontSize="small" />
                </span>
                New Admin
              </Button>
            </NavLink>
          </li>
        </ul>

        {/* Logout */}
        <div className="logoutWrapper">
          <div className="logoutBox">
            <Button
              variant="contained"
              onClick={() => {
                logout();
                context.setIsOpenNav(false);
              }}
            >
              <IoMdLogOut /> Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
