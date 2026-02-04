import { MdShoppingBag, MdCategory, MdDelete } from "react-icons/md";
import { IoShieldCheckmarkSharp } from "react-icons/io5";
import { FaEye, FaPencilAlt } from "react-icons/fa";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Breadcrumbs,
  Button,
  Chip,
  FormControl,
  MenuItem,
  Pagination,
  Rating,
  Select,
} from "@mui/material";
import { emphasize, styled } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import DashboardBox from "../Dashboard/components/dashboardBox";
import SearchBox from "../../components/SearchBox";
import { MyContext } from "../../App";
import { deleteData, fetchDataFromApi } from "../../utils/api";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

// --- Breadcrumb style ---
const StyledBreadcrumb = styled(Chip)(({ theme }) => {
  const backgroundColor =
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800];
  return {
    backgroundColor,
    height: theme.spacing(3),
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeightRegular,
    "&:hover, &:focus": { backgroundColor: emphasize(backgroundColor, 0.06) },
    "&:active": {
      boxShadow: theme.shadows[1],
      backgroundColor: emphasize(backgroundColor, 0.12),
    },
  };
});

const perPage = 12;

const Products = () => {
  const context = useContext(MyContext);

  const [categoryVal, setCategoryVal] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [productList, setProductList] = useState([]);

  // Dashboard counts
  const [totalProductsAll, setTotalProductsAll] = useState(0);
  const [totalCategory, setTotalCategory] = useState(0);
  const [totalSubCategory, setTotalSubCategory] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalProductsFiltered, setTotalProductsFiltered] = useState(0);

  const [isLoading, setIsLoading] = useState(false);

  // Normalize categories from context
  const categories = useMemo(() => {
    if (Array.isArray(context?.catData?.categoryList)) {
      return context.catData.categoryList;
    }
    if (Array.isArray(context?.catData)) {
      return context.catData;
    }
    return [];
  }, [context?.catData]);

  const parseNumber = (val) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  };

  const formatCurrency = (val) => {
    const num = parseNumber(val);
    if (num === null) return "-";
    return num.toLocaleString("en-IN");
  };

  const extractTotalFromResponse = (res, fallbackLen) => {
    if (!res || typeof res !== "object") return fallbackLen;

    if (typeof res.total === "number") return res.total;
    if (typeof res.productsCount === "number") return res.productsCount;
    if (typeof res.count === "number") return res.count;

    return fallbackLen;
  };

  /**
   * Unified loader:
   * - Uses current categoryVal + searchTerm
   * - Decides which API endpoint to hit:
   *    - /api/search  (when searchTerm present)
   *    - /api/products/catId (when category != all)
   *    - /api/products (default)
   */
  const loadPage = async (pageNumber = 1, overrides = {}) => {
    const cat = overrides.categoryVal !== undefined ? overrides.categoryVal : categoryVal;
    const search = overrides.searchTerm !== undefined ? overrides.searchTerm : searchTerm;

    setIsLoading(true);

    try {
      let url = "";
      const params = new URLSearchParams();
      params.set("page", String(pageNumber));
      params.set("perPage", String(perPage));

      // When we have a search term – prefer /api/search
      if (search && search.trim() !== "") {
        params.set("q", search.trim());
        if (cat && cat !== "all") {
          params.set("catId", cat);
        }
        url = `/api/search?${params.toString()}`;
      } else if (cat && cat !== "all") {
        // Category filter only
        params.set("catId", cat);
        url = `/api/products/catId?${params.toString()}`;
      } else {
        // All products
        url = `/api/products?${params.toString()}`;
      }

      const res = await fetchDataFromApi(url);
      const list = Array.isArray(res?.products) ? res.products : [];
      const total = extractTotalFromResponse(res, list.length);

      setProductList(list);
      setTotalProductsFiltered(total);
      setPage(pageNumber);
    } catch (err) {
      console.error("Load products error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to load products",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load: dashboard counts + first page
  useEffect(() => {
    window.scrollTo(0, 0);
    context.setProgress(40);

    // Global total
    fetchDataFromApi("/api/products/get/count")
      .then((res) => {
        const total = extractTotalFromResponse(res, 0);
        setTotalProductsAll(total);
      })
      .catch((err) => console.error("Total products error:", err));

    fetchDataFromApi("/api/category/get/count")
      .then((res) => {
        const c = typeof res?.categoryCount === "number" ? res.categoryCount : 0;
        setTotalCategory(c);
      })
      .catch((err) => console.error("Total category error:", err));

    fetchDataFromApi("/api/category/subCat/get/count")
      .then((res) => {
        const c = typeof res?.categoryCount === "number" ? res.categoryCount : 0;
        setTotalSubCategory(c);
      })
      .catch((err) => console.error("Total subcategory error:", err));

    // First page of "all products"
    loadPage(1, { categoryVal: "all", searchTerm: "" }).finally(() => {
      context.setProgress(100);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Delete a product ---
  const deleteProduct = async (id) => {
    try {
      context.setProgress(40);
      await deleteData(`/api/products/${id}`);
      context.setProgress(100);
      context.setAlertBox({
        open: true,
        error: false,
        msg: "Product Deleted!",
      });

      // Reload current page with current category + search
      await loadPage(page);

      context.fetchCategory?.();
    } catch (err) {
      console.error("Delete product error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to delete product",
      });
    }
  };

  // --- Category filter ---
  const handleChangeCategory = (event) => {
    const catId = event.target.value;
    setCategoryVal(catId);

    // When category changes, keep current searchTerm, but reset to page 1
    loadPage(1, { categoryVal: catId });
  };

  // --- Search ---
  const searchProducts = (keyword) => {
    const trimmed = (keyword || "").trim();
    setSearchTerm(trimmed);

    // Always go to page 1 whenever search text changes
    loadPage(1, { searchTerm: trimmed });
  };

  const totalPages =
    totalProductsFiltered > 0
      ? Math.ceil(totalProductsFiltered / perPage)
      : 1;

  return (
    <div className="right-content w-100">
      {/* Header */}
      <div className="card shadow border-0 w-100 flex-row p-4 align-items-center">
        <h5 className="mb-0">Product List</h5>

        <div className="ml-auto d-flex align-items-center">
          <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
            <StyledBreadcrumb
              component="a"
              href="#"
              label="Dashboard"
              icon={<HomeIcon fontSize="small" />}
            />
            <StyledBreadcrumb
              label="Products"
              deleteIcon={<ExpandMoreIcon />}
            />
          </Breadcrumbs>

          <Link to="/product/upload">
            <Button className="btn-blue ml-3 pl-3 pr-3">Add Product</Button>
          </Link>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="row dashboardBoxWrapperRow dashboardBoxWrapperRowV2 pt-0">
        <div className="col-md-12">
          <div className="dashboardBoxWrapper d-flex">
            <DashboardBox
              color={["#1da256", "#48d483"]}
              icon={<MdShoppingBag />}
              title="Total Products"
              count={totalProductsAll}
              grow
            />
            <DashboardBox
              color={["#c012e2", "#eb64fe"]}
              icon={<MdCategory />}
              title="Total Categories"
              count={totalCategory}
            />
            <DashboardBox
              color={["#2c78e5", "#60aff5"]}
              icon={<IoShieldCheckmarkSharp />}
              title="Total Sub Category"
              count={totalSubCategory}
            />
          </div>
        </div>
      </div>

      {/* Filters + Cards */}
      <div className="card shadow border-0 p-3 mt-4">
        <h3 className="hd">
          All Products{" "}
          {totalProductsFiltered > 0 && (
            <span style={{ fontSize: 13, fontWeight: 400 }}>
              &nbsp;• Showing {totalProductsFiltered} item
              {totalProductsFiltered > 1 ? "s" : ""}
              {searchTerm ? " (search)" : ""}
            </span>
          )}
        </h3>

        {/* Filters */}
        <div className="row cardFilters mt-2 mb-3">
          <div className="col-md-3">
            <h4>CATEGORY BY</h4>
            <FormControl size="small" className="w-100">
              <Select
                value={categoryVal}
                onChange={handleChangeCategory}
                className="w-100"
              >
                <MenuItem value="all">
                  <em>All</em>
                </MenuItem>
                {categories.map((cat, index) => (
                  <MenuItem key={index} value={cat._id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <div className="col-md-9 d-flex justify-content-end">
            <SearchBox searchProducts={searchProducts} />
          </div>
        </div>

        {/* Product Cards */}
        <div className="row">
          {isLoading && (
            <div className="col-12 text-center py-4">
              <span style={{ fontSize: 14 }}>Loading products...</span>
            </div>
          )}

          {!isLoading && productList.length === 0 && (
            <div className="col-12 text-center py-5">
              <h6 className="text-muted mb-0">No products found.</h6>
            </div>
          )}

          {!isLoading &&
            productList.map((item) => {
              const name = item?.name || "";
              const displayName =
                name.length > 60
                  ? `${name.substring(0, 60).trim()}…`
                  : name;

              const price = parseNumber(item?.price);
              const oldPrice = parseNumber(item?.oldPrice);
              const hasOldPrice =
                oldPrice !== null && price !== null && oldPrice > price;

              const explicitDiscount = parseNumber(item?.discount);
              const computedDiscount =
                hasOldPrice && oldPrice
                  ? Math.round(((oldPrice - price) / oldPrice) * 100)
                  : null;
              const discount = explicitDiscount || computedDiscount;

              const ratingValue = parseNumber(item?.rating) || 0;

              const countInStock = item?.countInStock ?? 0;
              const inStock = countInStock > 0;
              const isLowStock = inStock && countInStock <= 5;

              return (
                <div
                  key={item._id}
                  className="col-xl-3 col-lg-4 col-md-6 col-sm-6 mb-4"
                >
                  <div className="card adminProductCard shadow-sm border-0">
                    {/* Image + badge */}
                    <div className="adminProductCard-imgWrapper">
                      <Link to={`/product/details/${item._id}`}>
                        <LazyLoadImage
                          alt={name}
                          effect="blur"
                          className="w-100"
                          src={item?.images?.[0]}
                        />
                      </Link>

                      {discount ? (
                        <span className="badge badge-primary adminProductCard-badge">
                          {discount}% OFF
                        </span>
                      ) : inStock ? (
                        <span className="badge bg-success adminProductCard-badge">
                          In Stock
                        </span>
                      ) : (
                        <span className="badge bg-secondary adminProductCard-badge">
                          Out of Stock
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="adminProductCard-body">
                      <div className="adminProductCard-metaTop mb-1">
                        {item?.catName && (
                          <span className="badge badge-light mr-1">
                            {item.catName}
                          </span>
                        )}
                        {item?.subCatName && (
                          <span className="badge badge-secondary mr-1">
                            {item.subCatName}
                          </span>
                        )}
                        {item?.brand && (
                          <span className="adminProductCard-brand">
                            {item.brand}
                          </span>
                        )}
                      </div>

                      <Link to={`/product/details/${item._id}`}>
                        <h4 className="adminProductCard-title">
                          {displayName}
                        </h4>
                      </Link>

                      <div className="adminProductCard-rating mb-2">
                        <Rating
                          name="read-only"
                          value={ratingValue}
                          readOnly
                          size="small"
                          precision={0.5}
                        />
                        {ratingValue ? (
                          <span className="adminProductCard-ratingCount ml-1">
                            {ratingValue.toFixed(1)}
                          </span>
                        ) : null}
                      </div>

                      <div className="adminProductCard-priceRow mb-1">
                        <div className="priceMain">
                          {price !== null && (
                            <span className="netPrice">
                              ₹ {formatCurrency(price)}
                            </span>
                          )}
                          {hasOldPrice && (
                            <span className="oldPrice ml-2">
                              ₹ {formatCurrency(oldPrice)}
                            </span>
                          )}
                        </div>
                        {discount ? (
                          <span className="discountTag">-{discount}%</span>
                        ) : null}
                      </div>

                      <div className="adminProductCard-stock mb-2">
                        {inStock ? (
                          <span
                            className={
                              isLowStock
                                ? "stock-pill stock-low"
                                : "stock-pill stock-in"
                            }
                          >
                            {isLowStock
                              ? `Only ${countInStock} left`
                              : "In Stock"}
                          </span>
                        ) : (
                          <span className="stock-pill stock-out">
                            Out of Stock
                          </span>
                        )}
                      </div>

                      <div className="actions d-flex align-items-center mt-2">
                        <Link to={`/product/details/${item._id}`}>
                          <Button size="small" className="secondary">
                            <FaEye />
                          </Button>
                        </Link>
                        <Link to={`/product/edit/${item._id}`}>
                          <Button size="small" className="success">
                            <FaPencilAlt />
                          </Button>
                        </Link>
                        <Button
                          size="small"
                          className="error"
                          onClick={() => deleteProduct(item._id)}
                        >
                          <MdDelete />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Pagination */}
        {totalProductsFiltered > 0 && (
          <div className="d-flex justify-content-center mt-3">
            <Pagination
              color="primary"
              page={page}
              count={totalPages}
              onChange={(_e, value) => {
                loadPage(value);
              }}
              shape="rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
