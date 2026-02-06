import Sidebar from "../../Components/Sidebar";
import Button from "@mui/material/Button";
// ❌ Removed IoIosMenu
import { CgMenuGridR } from "react-icons/cg";
import { TfiLayoutGrid4Alt } from "react-icons/tfi";
import { FaAngleDown } from "react-icons/fa6";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import ProductItem from "../../Components/ProductItem";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchDataFromApi, isCanceledError } from "../../utils/api";
import CircularProgress from "@mui/material/CircularProgress";

import { MyContext } from "../../App";

const DEFAULT_PER_PAGE = 12;

// Sort options and mapping to backend `sort` query
const SORT_OPTIONS = [
  { value: "default", label: "Relevance" },
  { value: "newest", label: "Newest First" },
  { value: "priceAsc", label: "Price: Low to High" },
  { value: "priceDesc", label: "Price: High to Low" },
  { value: "ratingDesc", label: "Rating: High to Low" },
];

const sortParamMap = {
  default: "",
  newest: "-createdAt",
  priceAsc: "price",
  priceDesc: "-price",
  ratingDesc: "-rating",
};

const Listing = () => {
  // --- UI state ---
  const [showAnchorEl, setShowAnchorEl] = useState(null);
  const [sortAnchorEl, setSortAnchorEl] = useState(null);

  // ✅ Only using "three" / "four" views now
  const [productView, setProductView] = useState("four");
  const [productData, setProductData] = useState({
    products: [],
    total: 0,
    page: 1,
    perPage: DEFAULT_PER_PAGE,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [err, setErr] = useState("");

  const [sortBy, setSortBy] = useState("default");

  const [activePriceRange, setActivePriceRange] = useState(null);
  const [activeRating, setActiveRating] = useState(null);

  const history = useNavigate();
  const context = useContext(MyContext);
  const { id } = useParams();
  const location = useLocation();
  const abortRef = useRef(null);

  const showMenuOpen = Boolean(showAnchorEl);
  const sortMenuOpen = Boolean(sortAnchorEl);

  const mode = useMemo(
    () =>
      location.pathname.includes("/products/subCat/") ? "subCat" : "category",
    [location.pathname]
  );

  const selectedLocation = useMemo(
    () => localStorage.getItem("location") || "All",
    [location.key]
  );

  const loadProducts = async ({
    pageArg = page,
    perPageArg = perPage,
    sortArg = sortBy,
  } = {}) => {
    if (!id) return;

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

      const sortParam = sortParamMap[sortArg] || "";
      const sortQuery = sortParam
        ? `&sort=${encodeURIComponent(sortParam)}`
        : "";

      const url = `${base}&location=${encodeURIComponent(
        selectedLocation
      )}&page=${pageArg}&perPage=${perPageArg}${sortQuery}`;

      const res = await fetchDataFromApi(url, { signal: controller.signal });

      const products = Array.isArray(res?.products)
        ? res.products
        : Array.isArray(res)
        ? res
        : [];

      let total = 0;
      if (typeof res?.total === "number") total = res.total;
      else if (typeof res?.productsCount === "number")
        total = res.productsCount;
      else if (typeof res?.count === "number") total = res.count;
      else total = products.length;

      const normalized = {
        products,
        total,
        page: typeof res?.page === "number" ? res.page : pageArg,
        perPage:
          typeof res?.perPage === "number" ? res.perPage : perPageArg,
      };

      setProductData(normalized);
      setPage(normalized.page);
    } catch (e) {
      if (isCanceledError(e)) return;
      console.error("Listing load error:", e);
      setErr(e?.message || "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    context.setEnableFilterTab(true);
    setPage(1);
    setActivePriceRange(null);
    setActiveRating(null);
    loadProducts({ pageArg: 1, perPageArg: perPage, sortArg: sortBy });

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode, selectedLocation]);

  const openShowMenu = (event) => setShowAnchorEl(event.currentTarget);
  const closeShowMenu = () => setShowAnchorEl(null);

  const handleSelectPerPage = async (val) => {
    setPerPage(val);
    setPage(1);
    closeShowMenu();
    await loadProducts({ pageArg: 1, perPageArg: val, sortArg: sortBy });
  };

  const openSortMenu = (event) => setSortAnchorEl(event.currentTarget);
  const closeSortMenu = () => setSortAnchorEl(null);

  const handleChangeSort = async (val) => {
    setSortBy(val);
    setPage(1);
    closeSortMenu();
    await loadProducts({ pageArg: 1, perPageArg: perPage, sortArg: val });
  };

  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || "Relevance";

  const handleChangePage = async (_, value) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setPage(value);
    await loadProducts({ pageArg: value, perPageArg: perPage, sortArg: sortBy });
  };

  const filterData = (subCatId) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActivePriceRange(null);
    setActiveRating(null);
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
      const sortParam = sortParamMap[sortBy] || "";
      const sortQuery = sortParam
        ? `&sort=${encodeURIComponent(sortParam)}`
        : "";

      const url =
        mode === "category"
          ? `${base}&catId=${encodeURIComponent(
              id
            )}&location=${encodeURIComponent(
              selectedLocation
            )}${sortQuery}`
          : `${base}&subCatId=${encodeURIComponent(
              id
            )}&location=${encodeURIComponent(
              selectedLocation
            )}${sortQuery}`;

      const res = await fetchDataFromApi(url, { signal: controller.signal });
      const products = Array.isArray(res?.products)
        ? res.products
        : Array.isArray(res)
        ? res
        : [];

      let total = 0;
      if (typeof res?.total === "number") total = res.total;
      else if (typeof res?.productsCount === "number")
        total = res.productsCount;
      else if (typeof res?.count === "number") total = res.count;
      else total = products.length;

      const normalized = {
        products,
        total,
        page: 1,
        perPage,
      };
      setPage(1);
      setProductData(normalized);
      setActivePriceRange(priceRange || null);
    } catch (e) {
      if (isCanceledError(e)) return;
      console.error("Price filter error:", e);
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
      const sortParam = sortParamMap[sortBy] || "";
      const sortQuery = sortParam
        ? `&sort=${encodeURIComponent(sortParam)}`
        : "";

      const url =
        mode === "category"
          ? `${base}&catId=${encodeURIComponent(
              id
            )}&location=${encodeURIComponent(
              selectedLocation
            )}${sortQuery}`
          : `${base}&subCatId=${encodeURIComponent(
              id
            )}&location=${encodeURIComponent(
              selectedLocation
            )}${sortQuery}`;

      const res = await fetchDataFromApi(url, { signal: controller.signal });
      const products = Array.isArray(res?.products)
        ? res.products
        : Array.isArray(res)
        ? res
        : [];

      let total = 0;
      if (typeof res?.total === "number") total = res.total;
      else if (typeof res?.productsCount === "number")
        total = res.productsCount;
      else if (typeof res?.count === "number") total = res.count;
      else total = products.length;

      const normalized = {
        products,
        total,
        page: 1,
        perPage,
      };
      setPage(1);
      setProductData(normalized);
      window.scrollTo({ top: 0, behavior: "smooth" });

      setActiveRating(ratingVal);
    } catch (e) {
      if (isCanceledError(e)) return;
      console.error("Rating filter error:", e);
      setErr(e?.message || "Failed to filter by rating");
    } finally {
      setIsLoading(false);
    }
  };

  const clearPriceFilter = () => {
    setActivePriceRange(null);
    loadProducts({ pageArg: 1, perPageArg: perPage, sortArg: sortBy });
  };

  const clearRatingFilter = () => {
    setActiveRating(null);
    loadProducts({ pageArg: 1, perPageArg: perPage, sortArg: sortBy });
  };

  const clearAllFilters = () => {
    setActivePriceRange(null);
    setActiveRating(null);
    setSortBy("default");
    setPage(1);
    loadProducts({ pageArg: 1, perPageArg: perPage, sortArg: "default" });
  };

  const totalItems =
    productData && productData.total > 0
      ? productData.total
      : productData?.products?.length || 0;
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / (productData?.perPage || perPage || 1))
  );

  const startItem = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem =
    totalItems === 0 ? 0 : Math.min(page * perPage, totalItems);

  return (
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
            <div className="listingHeader mb-3">
              <h2 className="listingTitle mb-1">
                {mode === "category" ? "Category Products" : "Subcategory Products"}
              </h2>
              <p className="listingMeta mb-0">
                Showing{" "}
                <strong>
                  {startItem}-{endItem}
                </strong>{" "}
                of <strong>{totalItems}</strong> products
                {selectedLocation !== "All" && (
                  <>
                    {" "}
                    • Location: <strong>{selectedLocation}</strong>
                  </>
                )}
              </p>
            </div>

            <div className="showBy mt-0 mb-3 d-flex align-items-center listingControls">
              {/* ✅ Only 3-grid & 4-grid toggles */}
              <div className="d-flex align-items-center btnWrapper">
                <Button
                  className={productView === "three" ? "act" : ""}
                  onClick={() => setProductView("three")}
                >
                  <CgMenuGridR />
                </Button>
                <Button
                  className={productView === "four" ? "act" : ""}
                  onClick={() => setProductView("four")}
                >
                  <TfiLayoutGrid4Alt />
                </Button>
              </div>

              <div className="ml-auto d-flex align-items-center showByFilter gap-2">
                <div className="mr-2">
                  <Button onClick={openSortMenu}>
                    Sort by: {currentSortLabel} <FaAngleDown />
                  </Button>
                  <Menu
                    id="sort-menu"
                    anchorEl={sortAnchorEl}
                    open={sortMenuOpen}
                    onClose={closeSortMenu}
                    MenuListProps={{ "aria-labelledby": "sort-button" }}
                    className="sortDropdown"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <MenuItem
                        key={opt.value}
                        selected={opt.value === sortBy}
                        onClick={() => handleChangeSort(opt.value)}
                      >
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </div>

                <div>
                  <Button onClick={openShowMenu}>
                    Show {perPage} <FaAngleDown />
                  </Button>
                  <Menu
                    className="w-100 showPerPageDropdown"
                    id="show-menu"
                    anchorEl={showAnchorEl}
                    open={showMenuOpen}
                    onClose={closeShowMenu}
                    MenuListProps={{ "aria-labelledby": "show-button" }}
                  >
                    {[12, 24, 36, 48, 60].map((n) => (
                      <MenuItem key={n} onClick={() => handleSelectPerPage(n)}>
                        {n}
                      </MenuItem>
                    ))}
                  </Menu>
                </div>
              </div>
            </div>

            {(selectedLocation !== "All" ||
              activePriceRange ||
              activeRating ||
              sortBy !== "default") && (
              <div className="activeFiltersBar d-flex align-items-center mb-3 flex-wrap">
                <span className="label mr-2">Active filters:</span>

                {selectedLocation !== "All" && (
                  <span className="filterChip">
                    Location: {selectedLocation}
                  </span>
                )}

                {activePriceRange && (
                  <span className="filterChip">
                    Price: ₹{activePriceRange[0]} - ₹{activePriceRange[1]}
                    <button
                      type="button"
                      className="filterChipClose"
                      onClick={clearPriceFilter}
                    >
                      ×
                    </button>
                  </span>
                )}

                {activeRating && (
                  <span className="filterChip">
                    Rating: {activeRating}★ &amp; up
                    <button
                      type="button"
                      className="filterChipClose"
                      onClick={clearRatingFilter}
                    >
                      ×
                    </button>
                  </span>
                )}

                {sortBy !== "default" && (
                  <span className="filterChip">
                    Sort: {currentSortLabel}
                    <button
                      type="button"
                      className="filterChipClose"
                      onClick={() => handleChangeSort("default")}
                    >
                      ×
                    </button>
                  </span>
                )}

                <Button
                  size="small"
                  className="ml-2"
                  onClick={clearAllFilters}
                >
                  Clear all
                </Button>
              </div>
            )}

            <div className="productListingGrid">
              {isLoading ? (
                <div className="productListing skeletonGrid">
                  {Array.from({ length: Math.min(perPage, 12) }).map(
                    (_, idx) => (
                      <div
                        key={idx}
                        className={`productItem ${productView || "four"}`}
                      >
                        <div className="productCard-inner">
                          <div className="img_rapper">
                            <Skeleton
                              variant="rectangular"
                              width="100%"
                              height={220}
                            />
                          </div>
                          <div className="info productCard-info mt-2">
                            <Skeleton variant="text" width="80%" />
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="text" width="40%" />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : err ? (
                <div className="p-3 text-danger">Error: {err}</div>
              ) : productData?.products?.length ? (
                <div className="productListing">
                  {productData.products
                    .slice(0)
                    .reverse()
                    .map((item, index) => (
                      <ProductItem
                        key={item?._id || item?.id || index}
                        itemView={productView}
                        item={item}
                      />
                    ))}
                </div>
              ) : (
                <div className="p-3">No products found.</div>
              )}
            </div>

            {totalItems > 0 && !isLoading && (
              <div className="d-flex justify-content-center mt-4 mb-3">
                <Pagination
                  color="primary"
                  page={page}
                  count={totalPages}
                  onChange={handleChangePage}
                  shape="rounded"
                />
              </div>
            )}

            {isLoading && !productData.products.length && (
              <div className="loadingOverlay d-flex align-items-center justify-content-center">
                <CircularProgress color="inherit" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Listing;
