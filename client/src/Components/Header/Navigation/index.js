// client/src/components/Navigation/index.jsx
import Button from "@mui/material/Button";
import { FaAngleDown } from "react-icons/fa6";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import { MyContext } from "../../../App";
import CountryDropdown from "../../CountryDropdown";
import Logo from "../../../assets/images/logo.png";
import { RiLogoutCircleRFill } from "react-icons/ri";

const Navigation = (props) => {
  const {
    navData = [],
    isOpenNav = false,
    closeNav = () => {},
    onNavigate = () => {},
  } = props;

  const [openSubIdx, setOpenSubIdx] = useState(null);

  const context = useContext(MyContext);
  const history = useNavigate();

  const isMobile = context.windowWidth < 992;

  // Normalize categories once
  const categories = useMemo(
    () => (Array.isArray(navData) ? navData : []),
    [navData]
  );

  // Close submenu if nav closes
  useEffect(() => {
    if (!isOpenNav) setOpenSubIdx(null);
  }, [isOpenNav]);

  const toggleSubmenu = (idx) => {
    setOpenSubIdx((cur) => (cur === idx ? null : idx));
  };

  const handleNavigate = (to) => {
    closeNav();
    onNavigate(to);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    context.setIsLogin(false);
    handleNavigate("/signIn");
    history("/signIn");
  };

  return (
    <nav>
      <div className="container">
        <div className="row">
          {/* Single full-width navigation (no ALL CATEGORIES button) */}
          <div
            className={`col-sm-12 navPart2 d-flex align-items-center res-nav-wrapper ${
              isOpenNav ? "open" : "close"
            }`}
          >
            {/* Overlay to close mobile nav */}
            <div className="res-nav-overlay" onClick={closeNav} />

            <div className="res-nav w-100">
              {/* Mobile header inside drawer */}
              {isMobile && (
                <div
                  className="pl-3 d-flex align-items-center"
                  style={{ height: 56 }}
                >
                  <Link
                    to="/"
                    className="logo"
                    onClick={() => handleNavigate("/")}
                  >
                    <img src={Logo} alt="logo" />
                  </Link>
                </div>
              )}

              {/* CATEGORY NAV */}
              <ul
                className={`nav-category-list list list-inline ${
                  isMobile
                    ? "nav-category-list--mobile"
                    : "nav-category-list--desktop"
                }`}
              >
                {/* Mobile: country picker at top */}
                {isMobile && (
                  <li className="list-inline-item w-100">
                    <div className="p-3">
                      {context.countryList.length !== 0 && <CountryDropdown />}
                    </div>
                  </li>
                )}

                {/* Show all categories (no hard limit now) */}
                {categories.map((item, index) => {
                  const catTo = `/products/category/${item?._id}`;
                  const hasChildren =
                    Array.isArray(item?.children) && item.children.length > 0;

                  return (
                    <li
                      className="list-inline-item position-relative"
                      key={item?._id || index}
                    >
                      <div className="d-flex align-items-center">
                        <NavLink to={catTo} onClick={() => handleNavigate(catTo)}>
                          <Button>
                            {item?.images?.[0] && (
                              <img
                                src={item.images[0]}
                                width="20"
                                className="mr-2"
                                alt={`${item?.name || "Category"} icon`}
                              />
                            )}
                            {item?.name}
                          </Button>
                        </NavLink>

                        {/* Mobile-only submenu caret */}
                        {hasChildren && isMobile && (
                          <span
                            className={`arrow ml-1 ${
                              openSubIdx === index ? "rotate" : ""
                            }`}
                            onClick={() => toggleSubmenu(index)}
                            role="button"
                            aria-label="Toggle subcategories"
                            aria-expanded={openSubIdx === index ? "true" : "false"}
                          >
                            <FaAngleDown />
                          </span>
                        )}
                      </div>

                      {/* Submenu (desktop: hover via CSS, mobile: toggle via state) */}
                      {hasChildren && (
                        <div
                          className={`submenu ${
                            isMobile && openSubIdx === index ? "open" : ""
                          }`}
                        >
                          {item.children.map((subCat, skey) => {
                            const subTo = `/products/subCat/${subCat?._id}`;
                            return (
                              <NavLink
                                to={subTo}
                                key={subCat?._id || skey}
                                onClick={() => handleNavigate(subTo)}
                              >
                                <Button>{subCat?.name}</Button>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Mobile footer: auth CTA */}
              {isMobile && (
                <>
                  {!context?.isLogin ? (
                    <div className="pt-3 pl-3 pr-3">
                      <Link
                        to="/signIn"
                        onClick={() => handleNavigate("/signIn")}
                      >
                        <Button className="btn-blue w-100 btn-big">Sign In</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="pt-3 pl-3 pr-3">
                      <Button
                        className="btn-blue w-100 btn-big"
                        onClick={logout}
                      >
                        <RiLogoutCircleRFill /> Logout
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
