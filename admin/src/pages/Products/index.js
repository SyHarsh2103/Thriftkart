import { MdShoppingBag, MdCategory, MdDelete } from "react-icons/md";
import { IoShieldCheckmarkSharp } from "react-icons/io5";
import { FaEye, FaPencilAlt } from "react-icons/fa";
import { useContext, useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
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
    "&:active": { boxShadow: theme.shadows[1], backgroundColor: emphasize(backgroundColor, 0.12) },
  };
});

// --- Table columns ---
const columns = [
  { id: "product", label: "PRODUCT", minWidth: 200 },
  { id: "category", label: "CATEGORY", minWidth: 120 },
  { id: "subcategory", label: "SUB CATEGORY", minWidth: 120 },
  { id: "brand", label: "BRAND", minWidth: 120 },
  { id: "price", label: "PRICE", minWidth: 100 },
  { id: "rating", label: "RATING", minWidth: 100 },
  { id: "action", label: "ACTION", minWidth: 150 },
];

const Products = () => {
  const context = useContext(MyContext);

  const [categoryVal, setCategoryVal] = useState("all");
  const [productList, setProductList] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalCategory, setTotalCategory] = useState(0);
  const [totalSubCategory, setTotalSubCategory] = useState(0);

  const [page, setPage] = useState(0); // TablePagination page
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    window.scrollTo(0, 0);
    context.setProgress(40);

    fetchDataFromApi(`/api/products?page=1&perPage=1000`).then((res) => {
      setProductList(res.products || []);
      context.setProgress(100);
    });

    fetchDataFromApi("/api/products/get/count").then((res) => {
      setTotalProducts(res.productsCount);
    });
    fetchDataFromApi("/api/category/get/count").then((res) => {
      setTotalCategory(res.categoryCount);
    });
    fetchDataFromApi("/api/category/subCat/get/count").then((res) => {
      setTotalSubCategory(res.categoryCount);
    });
  }, []);

  // --- Delete a product ---
  const deleteProduct = async (id) => {
    context.setProgress(40);
    await deleteData(`/api/products/${id}`);
    context.setProgress(100);
    context.setAlertBox({ open: true, error: false, msg: "Product Deleted!" });

    fetchDataFromApi(`/api/products?page=1&perPage=1000`).then((res) => {
      setProductList(res.products || []);
    });
    context.fetchCategory();
  };

  // --- Category filter ---
  const handleChangeCategory = (event) => {
    const catId = event.target.value;
    setCategoryVal(catId);

    if (catId === "all") {
      fetchDataFromApi(`/api/products?page=1&perPage=1000`).then((res) => {
        setProductList(res.products || []);
      });
    } else {
      fetchDataFromApi(`/api/products/catId?catId=${catId}&page=1&perPage=1000`).then((res) => {
        setProductList(res.products || []);
      });
    }
  };

  // --- Search ---
  const searchProducts = (keyword) => {
    if (keyword !== "") {
      fetchDataFromApi(`/api/search?q=${keyword}&page=1&perPage=10000`).then((res) => {
        setProductList(res.products || []);
      });
    } else {
      fetchDataFromApi(`/api/products?page=1&perPage=1000`).then((res) => {
        setProductList(res.products || []);
      });
    }
  };

  return (
    <div className="right-content w-100">
      {/* Header */}
      <div className="card shadow border-0 w-100 flex-row p-4 align-items-center">
        <h5 className="mb-0">Product List</h5>

        <div className="ml-auto d-flex align-items-center">
          <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
            <StyledBreadcrumb component="a" href="#" label="Dashboard" icon={<HomeIcon fontSize="small" />} />
            <StyledBreadcrumb label="Products" deleteIcon={<ExpandMoreIcon />} />
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
            <DashboardBox color={["#1da256", "#48d483"]} icon={<MdShoppingBag />} title="Total Products" count={totalProducts} grow />
            <DashboardBox color={["#c012e2", "#eb64fe"]} icon={<MdCategory />} title="Total Categories" count={totalCategory} />
            <DashboardBox color={["#2c78e5", "#60aff5"]} icon={<IoShieldCheckmarkSharp />} title="Total Sub Category" count={totalSubCategory} />
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
              <Select value={categoryVal} onChange={handleChangeCategory} className="w-100">
                <MenuItem value="all">
                  <em>All</em>
                </MenuItem>
                {context.catData?.categoryList?.map((cat, index) => (
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

        {/* Product Table */}
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.id} style={{ minWidth: column.minWidth }}>
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {productList?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="d-flex align-items-center productBox">
                        <div className="imgWrapper">
                          <div className="img card shadow m-0">
                            <LazyLoadImage alt="product" effect="blur" className="w-100" src={item.images[0]} />
                          </div>
                        </div>
                        <div className="info pl-3">
                          <Link to={`/product/details/${item._id}`}>
                            <h6>{item?.name}</h6>
                          </Link>
                          <p>{item?.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item?.catName}</TableCell>
                    <TableCell>{item?.subCatName}</TableCell>
                    <TableCell><span className="badge badge-secondary">{item?.brand}</span></TableCell>
                    <TableCell>
                      <div style={{ width: "80px" }}>
                        <del className="old">Rs {item?.oldPrice}</del>
                        <span className="new text-danger d-block">Rs {item?.price}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Rating name="read-only" defaultValue={item?.rating} precision={0.5} size="small" readOnly />
                    </TableCell>
                    <TableCell>
                      <div className="actions d-flex align-items-center">
                        <Link to={`/product/details/${item._id}`}>
                          <Button className="secondary"><FaEye /></Button>
                        </Link>
                        <Link to={`/product/edit/${item._id}`}>
                          <Button className="success"><FaPencilAlt /></Button>
                        </Link>
                        <Button className="error" onClick={() => deleteProduct(item._id)}>
                          <MdDelete />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={productList.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(+e.target.value);
              setPage(0);
            }}
          />
        </Paper>
      </div>
    </div>
  );
};

export default Products;
