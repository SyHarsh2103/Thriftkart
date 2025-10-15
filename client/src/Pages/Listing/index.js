import Sidebar from "../../Components/Sidebar";
import Button from "@mui/material/Button";
import { IoIosMenu } from "react-icons/io";
import { CgMenuGridR } from "react-icons/cg";
import { TfiLayoutGrid4Alt } from "react-icons/tfi";
import { FaAngleDown } from "react-icons/fa6";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import ProductItem from "../../Components/ProductItem";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchDataFromApi, isCanceledError } from "../../utils/api";
import CircularProgress from "@mui/material/CircularProgress";

import { MyContext } from "../../App";

const DEFAULT_PER_PAGE = 10;

const Listing = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [productView, setProductView] = useState("four");
  const [productData, setProductData] = useState({ products: [], total: 0, page: 1, perPage: DEFAULT_PER_PAGE });
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [err, setErr] = useState("");

  const history = useNavigate();
  const context = useContext(MyContext);
  const { id } = useParams();
  const location = useLocation();
  const openDropdown = Boolean(anchorEl);
  const abortRef = useRef(null);

  const mode = useMemo(
    () => (location.pathname.includes("/products/subCat/") ? "subCat" : "category"),
    [location.pathname]
  );

  const selectedLocation = useMemo(
    () => localStorage.getItem("location") || "All",
    [location.key]
  );

  const loadProducts = async ({ pageArg = page, perPageArg = perPage } = {}) => {
    if (!id) return;

    // cancel in-flight
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setErr("");

    try {
      const base =
        mode === "category"
          ? `/api/products/catId?catId=${encodeURIComponent(id)}`
          : `/api/products/subCatId?subCatId=${encodeURIComponent(id)}`;

      const url = `${base}&location=${encodeURIComponent(selectedLocation)}&page=${pageArg}&perPage=${perPageArg}`;
      const res = await fetchDataFromApi(url, { signal: controller.signal });

      const normalized = {
        products: Array.isArray(res?.products) ? res.products : Array.isArray(res) ? res : [],
        total: Number(res?.total ?? 0),
        page: Number(res?.page ?? pageArg),
        perPage: Number(res?.perPage ?? perPageArg),
      };

      setProductData(normalized);
    } catch (e) {
      if (isCanceledError(e)) return; // ignore aborts
      setErr(e?.message || "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    context.setEnableFilterTab(true);
    setPage(1);
    loadProducts({ pageArg: 1, perPageArg: perPage });
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode]);

  const openShowMenu = (event) => setAnchorEl(event.currentTarget);
  const closeShowMenu = () => setAnchorEl(null);

  const handleSelectPerPage = async (val) => {
    setPerPage(val);
    setPage(1);
    closeShowMenu();
    await loadProducts({ pageArg: 1, perPageArg: val });
  };

  const handleChangePage = async (_, value) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setPage(value);
    await loadProducts({ pageArg: value, perPageArg: perPage });
  };

  const filterData = (subCatId) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    history(`/products/subCat/${subCatId}`);
  };

  const filterByPrice = async (priceRange) => {
    if (!id) return;
    const [min, max] = priceRange || [];

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setErr("");

    try {
      const base = `/api/products/fiterByPrice?minPrice=${min}&maxPrice=${max}`;
      const url =
        mode === "category"
          ? `${base}&catId=${encodeURIComponent(id)}&location=${encodeURIComponent(selectedLocation)}`
          : `${base}&subCatId=${encodeURIComponent(id)}&location=${encodeURIComponent(selectedLocation)}`;

      const res = await fetchDataFromApi(url, { signal: controller.signal });
      const normalized = {
        products: Array.isArray(res?.products) ? res.products : Array.isArray(res) ? res : [],
        total: Number(res?.total ?? 0),
        page: 1,
        perPage,
      };
      setPage(1);
      setProductData(normalized);
    } catch (e) {
      if (isCanceledError(e)) return; // ignore aborts
      setErr(e?.message || "Failed to filter by price");
    } finally {
      setIsLoading(false);
    }
  };

  const filterByRating = async (ratingVal) => {
    if (!id) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setErr("");

    try {
      const base = `/api/products/rating?rating=${ratingVal}`;
      const url =
        mode === "category"
          ? `${base}&catId=${encodeURIComponent(id)}&location=${encodeURIComponent(selectedLocation)}`
          : `${base}&subCatId=${encodeURIComponent(id)}&location=${encodeURIComponent(selectedLocation)}`;

      const res = await fetchDataFromApi(url, { signal: controller.signal });
      const normalized = {
        products: Array.isArray(res?.products) ? res.products : Array.isArray(res) ? res : [],
        total: Number(res?.total ?? 0),
        page: 1,
        perPage,
      };
      setPage(1);
      setProductData(normalized);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (isCanceledError(e)) return; // ignore aborts
      setErr(e?.message || "Failed to filter by rating");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <section className="product_Listing_Page pt-5">
        <div className="container">
          <div className="productListing d-flex">
            <Sidebar
              filterData={filterData}
              filterByPrice={filterByPrice}
              filterByRating={filterByRating}
              isOpenFilter={context?.isOpenFilters}
            />

            <div className="content_right">
              <div className="showBy mt-0 mb-3 d-flex align-items-center">
                <div className="d-flex align-items-center btnWrapper">
                  <Button className={productView === "one" ? "act" : ""} onClick={() => setProductView("one")}>
                    <IoIosMenu />
                  </Button>
                  <Button className={productView === "three" ? "act" : ""} onClick={() => setProductView("three")}>
                    <CgMenuGridR />
                  </Button>
                  <Button className={productView === "four" ? "act" : ""} onClick={() => setProductView("four")}>
                    <TfiLayoutGrid4Alt />
                  </Button>
                </div>

                <div className="ml-auto showByFilter">
                  <Button onClick={openShowMenu}>
                    Show {perPage} <FaAngleDown />
                  </Button>
                  <Menu
                    className="w-100 showPerPageDropdown"
                    id="basic-menu"
                    anchorEl={anchorEl}
                    open={openDropdown}
                    onClose={closeShowMenu}
                    MenuListProps={{ "aria-labelledby": "basic-button" }}
                  >
                    {[10, 20, 30, 40, 50, 60].map((n) => (
                      <MenuItem key={n} onClick={() => handleSelectPerPage(n)}>
                        {n}
                      </MenuItem>
                    ))}
                  </Menu>
                </div>
              </div>

              <div className="productListing">
                {isLoading ? (
                  <div className="loading d-flex align-items-center justify-content-center">
                    <CircularProgress color="inherit" />
                  </div>
                ) : err ? (
                  <div className="p-3 text-danger">Error: {err}</div>
                ) : productData?.products?.length ? (
                  <>
                    {productData.products
                      .slice(0)
                      .reverse()
                      .map((item, index) => (
                        <ProductItem key={item?._id || index} itemView={productView} item={item} />
                      ))}

                    {/* Example MUI Pagination hook-up:
                    <Pagination
                      className="mt-3"
                      count={Math.max(1, Math.ceil(productData.total / productData.perPage))}
                      page={page}
                      onChange={handleChangePage}
                    />
                    */}
                  </>
                ) : (
                  <div className="p-3">No products found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Listing;
