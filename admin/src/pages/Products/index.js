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

const Products = () => {
  const context = useContext(MyContext);

  const [categoryVal, setCategoryVal] = useState("all");
  const [productList, setProductList] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalCategory, setTotalCategory] = useState(0);
  const [totalSubCategory, setTotalSubCategory] = useState(0);

  // Card pagination (client-side)
  const [page, setPage] = useState(1);
  const perPage = 12; // cards per page

  // ---- Derive category list from context (supports both shapes) ----
  const categories = useMemo(() => {
    if (Array.isArray(context?.catData?.categoryList)) {
      return context.catData.categoryList;
    }
    if (Array.isArray(context?.catData)) {
      return context.catData;
    }
    return [];
  }, [context?.catData]);

  useEffect(() => {
    window.scrollTo(0, 0);
    context.setProgress(40);

    // Load all products (filtered client-side by pagination)
    fetchDataFromApi(`/api/products?page=1&perPage=1000`).then((res) => {
      const list = res?.products || [];
      setProductList(list);
      setTotalProducts(res?.total || list.length || 0);
      context.setProgress(100);
    });

    fetchDataFromApi("/api/products/get/count").then((res) => {
      setTotalProducts(res.productsCount || 0);
    });
    fetchDataFromApi("/api/category/get/count").then((res) => {
      setTotalCategory(res.categoryCount || 0);
    });
    fetchDataFromApi("/api/category/subCat/get/count").then((res) => {
      setTotalSubCategory(res.categoryCount || 0);
    });
  }, []);

  // --- Delete a product ---
  const deleteProduct = async (id) => {
    context.setProgress(40);
    await deleteData(`/api/products/${id}`);
    context.setProgress(100);
    context.setAlertBox({
      open: true,
      error: false,
      msg: "Product Deleted!",
    });

    // Refresh list after delete (keep current filters)
    if (categoryVal === "all") {
      fetchDataFromApi(`/api/products?page=1&perPage=1000`).then((res) => {
        const list = res?.products || [];
        setProductList(list);
      });
    } else {
      fetchDataFromApi(
        `/api/products/catId?catId=${categoryVal}&page=1&perPage=1000`
      ).then((res) => {
        const list = res?.products || [];
        setProductList(list);
      });
    }
  };

  // --- Category filter ---
  const handleChangeCategory = (event) => {
    const catId = event.target.value;
    setCategoryVal(catId);
    setPage(1); // reset to first page on filter change

    if (catId === "all") {
      fetchDataFromApi(`/api/products?page=1&perPage=1000`).then((res) => {
        const list = res?.products || [];
        setProductList(list);
      });
    } else {
      fetchDataFromApi(
        `/api/products/catId?catId=${catId}&page=1&perPage=1000`
      ).then((res) => {
        const list = res?.products || [];
        setProductList(list);
      });
    }
  };

  // --- Search ---
  const searchProducts = (keyword) => {
    setPage(1); // reset to page 1 for new search

    if (keyword !== "") {
      fetchDataFromApi(
        `/api/search?q=${keyword}&page=1&perPage=10000`
      ).then((res) => {
        const list = res?.products || [];
        setProductList(list);
      });
    } else {
      // back to normal (respect current category filter)
      if (categoryVal === "all") {
        fetchDataFromApi(`/api/products?page=1&perPage=1000`).then((res) => {
          const list = res?.products || [];
          setProductList(list);
        });
      } else {
        fetchDataFromApi(
          `/api/products/catId?catId=${categoryVal}&page=1&perPage=1000`
        ).then((res) => {
          const list = res?.products || [];
          setProductList(list);
        });
      }
    }
  };

  // --- Client-side pagination slice ---
  const totalPages = Math.max(
    1,
    Math.ceil((productList?.length || 0) / perPage)
  );

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return (productList || []).slice(start, end);
  }, [productList, page]);

  return (
    <div className="right-content w-100">
      {/* Header */}
      <div className="card shadow border-0 w-100 flex-row p-4 align-items-center">
        <h5 className="mb-0">Product List</h5>

        <div className="ml-auto d-flex align-items-center">
          <Breadcrumbs
            aria-label="breadcrumb"
            className="ml-auto breadcrumbs_"
          >
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
              count={totalProducts}
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

      {/* Filters */}
      <div className="card shadow border-0 p-3 mt-4">
        <h3 className="hd">All Products</h3>

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
          {paginatedProducts.length === 0 && (
            <div className="col-12 text-center py-5">
              <h6 className="text-muted mb-0">No products found.</h6>
            </div>
          )}

          {paginatedProducts.map((item) => (
            <div
              key={item._id}
              className="col-xl-3 col-lg-4 col-md-6 col-sm-6 mb-4"
            >
              <div className="card h-100 shadow-sm product-card-admin">
                <div className="position-relative">
                  <div className="product-card-image-wrapper">
                    <LazyLoadImage
                      alt={item?.name || "product"}
                      effect="blur"
                      className="w-100"
                      src={item.images?.[0]}
                    />
                  </div>
                  {item.discount ? (
                    <span className="badge bg-danger position-absolute m-2">
                      {item.discount}% OFF
                    </span>
                  ) : null}
                </div>

                <div className="card-body d-flex flex-column">
                  <div className="mb-1">
                    <span className="badge badge-light mr-2">
                      {item?.catName || "No Category"}
                    </span>
                    {item?.subCatName && (
                      <span className="badge badge-secondary">
                        {item.subCatName}
                      </span>
                    )}
                  </div>

                  <Link to={`/product/details/${item._id}`}>
                    <h6 className="mb-1 text-truncate">{item?.name}</h6>
                  </Link>

                  {item?.brand && (
                    <p className="mb-1 text-muted small">
                      Brand: <strong>{item.brand}</strong>
                    </p>
                  )}

                  <div className="mb-2">
                    <del className="text-muted small mr-2">
                      Rs {item?.oldPrice}
                    </del>
                    <span className="text-danger font-weight-bold">
                      Rs {item?.price}
                    </span>
                  </div>

                  <div className="d-flex align-items-center mb-3">
                    <Rating
                      name="read-only"
                      defaultValue={item?.rating}
                      precision={0.5}
                      size="small"
                      readOnly
                    />
                    {item?.rating ? (
                      <span className="ml-2 small text-muted">
                        {item.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-auto d-flex justify-content-between">
                    <Link to={`/product/details/${item._id}`}>
                      <Button size="small" className="secondary mr-1">
                        <FaEye />
                      </Button>
                    </Link>
                    <Link to={`/product/edit/${item._id}`}>
                      <Button size="small" className="success mr-1">
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
          ))}
        </div>

        {/* Pagination */}
        {productList.length > 0 && (
          <div className="d-flex justify-content-center mt-3">
            <Pagination
              color="primary"
              page={page}
              count={totalPages}
              onChange={(_e, value) => setPage(value)}
              shape="rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
