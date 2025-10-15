import Button from "@mui/material/Button";
import { IoIosMenu } from "react-icons/io";
import { FaAngleDown, FaAngleRight } from "react-icons/fa6";
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

  const [isOpenSidebarVal, setIsOpenSidebarVal] = useState(false);
  const [openSubIdx, setOpenSubIdx] = useState(null);

  const context = useContext(MyContext);
  const history = useNavigate();

  // Normalize categories once
  const categories = useMemo(() => (Array.isArray(navData) ? navData : []), [navData]);

  // Close submenu if nav closes
  useEffect(() => {
    if (!isOpenNav) setOpenSubIdx(null);
  }, [isOpenNav]);

  const toggleSidebar = () => setIsOpenSidebarVal((v) => !v);

  const toggleSubmenu = (idx) => {
    setOpenSubIdx((cur) => (cur === idx ? null : idx));
  };

  const handleNavigate = (to) => {
    // ❗ Auto-close the "ALL CATEGORIES" sidebar after any click
    setIsOpenSidebarVal(false);

    // Close mobile drawer + run parent hook
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
          {/* Left: ALL CATEGORIES dropdown (desktop) */}
          <div className="col-sm-2 navPart1">
            <div className="catWrapper">
              <Button
                className="allCatTab align-items-center res-hide"
                onClick={toggleSidebar}
                aria-haspopup="true"
                aria-expanded={isOpenSidebarVal ? "true" : "false"}
              >
                <span className="icon1 mr-2" aria-hidden="true">
                  <IoIosMenu />
                </span>
                <span className="text">ALL CATEGORIES</span>
                <span className="icon2 ml-2" aria-hidden="true">
                  <FaAngleDown />
                </span>
              </Button>

              <div className={`sidebarNav ${isOpenSidebarVal ? "open" : ""}`}>
                <ul>
                  {categories.map((item, idx) => (
                    <li key={item?._id || idx}>
                      <NavLink
                        to={`/products/category/${item?._id}`}
                        onClick={() => handleNavigate(`/products/category/${item?._id}`)}
                      >
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
                          <FaAngleRight className="ml-auto" aria-hidden="true" />
                        </Button>
                      </NavLink>

                      {Array.isArray(item?.children) && item.children.length > 0 && (
                        <div className="submenu">
                          {item.children.map((subCat, skey) => (
                            <NavLink
                              to={`/products/subCat/${subCat?._id}`}
                              key={subCat?._id || skey}
                              onClick={() => handleNavigate(`/products/subCat/${subCat?._id}`)}
                            >
                              <Button>{subCat?.name}</Button>
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right: top nav including mobile drawer */}
          <div
            className={`col-sm-10 navPart2 d-flex align-items-center res-nav-wrapper ${
              isOpenNav ? "open" : "close"
            }`}
          >
            {/* Overlay to close mobile nav */}
            <div className="res-nav-overlay" onClick={closeNav} />

            <div className="res-nav">
              {/* Mobile header inside drawer */}
              {context.windowWidth < 992 && (
                <div className="pl-3 d-flex align-items-center" style={{ height: 56 }}>
                  <Link to="/" className="logo" onClick={() => handleNavigate("/")}>
                    <img src={Logo} alt="logo" />
                  </Link>
                </div>
              )}

              <ul className="list list-inline ml-auto">
                {/* Mobile: country picker */}
                {context.windowWidth < 992 && (
                  <li className="list-inline-item">
                    <div className="p-3">
                      {context.countryList.length !== 0 && <CountryDropdown />}
                    </div>
                  </li>
                )}

                {/* Show first 7 categories in top bar */}
                {categories
                  .filter((_, idx) => idx < 7)
                  .map((item, index) => {
                    const catTo = `/products/category/${item?._id}`;
                    const hasChildren = Array.isArray(item?.children) && item.children.length > 0;

                    return (
                      <li className="list-inline-item" key={item?._id || index}>
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
                        {hasChildren && context.windowWidth < 992 && (
                          <span
                            className={`arrow ${openSubIdx === index ? "rotate" : ""}`}
                            onClick={() => toggleSubmenu(index)}
                            role="button"
                            aria-label="Toggle subcategories"
                            aria-expanded={openSubIdx === index ? "true" : "false"}
                          >
                            <FaAngleDown />
                          </span>
                        )}

                        {/* Submenu */}
                        {hasChildren && (
                          <div
                            className={`submenu ${
                              context.windowWidth < 992 && openSubIdx === index ? "open" : ""
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
              {context.windowWidth < 992 && (
                <>
                  {!context?.isLogin ? (
                    <div className="pt-3 pl-3 pr-3">
                      <Link to="/signIn" onClick={() => handleNavigate("/signIn")}>
                        <Button className="btn-blue w-100 btn-big">Sign In</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="pt-3 pl-3 pr-3">
                      <Button className="btn-blue w-100 btn-big" onClick={logout}>
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
