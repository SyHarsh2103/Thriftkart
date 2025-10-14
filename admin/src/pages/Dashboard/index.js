import DashboardBox from "./components/dashboardBox";
import { FaUserCircle } from "react-icons/fa";
import { IoMdCart } from "react-icons/io";
import { MdShoppingBag } from "react-icons/md";
import { GiStarsStack } from "react-icons/gi";
import MenuItem from "@mui/material/MenuItem";
import { useContext, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import { MyContext } from "../../App";
import { deleteData, fetchDataFromApi } from "../../utils/api";
import { Link } from "react-router-dom";
import Pagination from "@mui/material/Pagination";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { LazyLoadImage } from "react-lazy-load-image-component";
import Rating from "@mui/material/Rating";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import SearchBox from "../../components/SearchBox";
import { FaEye, FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";

const columns = [
  { id: "product", label: "PRODUCT", minWidth: 150 },
  { id: "category", label: "CATEGORY", minWidth: 100 },
  { id: "subcategory", label: "SUB CATEGORY", minWidth: 150 },
  { id: "brand", label: "BRAND", minWidth: 130 },
  { id: "price", label: "PRICE", minWidth: 100 },
  { id: "rating", label: "RATING", minWidth: 80 },
  { id: "action", label: "ACTION", minWidth: 120 },
];

const Dashboard = () => {
  const [productList, setProductList] = useState([]);
  const [categoryVal, setcategoryVal] = useState("all");

  const [totalUsers, setTotalUsers] = useState(undefined);
  const [totalOrders, setTotalOrders] = useState(undefined);
  const [totalProducts, setTotalProducts] = useState(undefined);
  const [totalProductsReviews, setTotalProductsReviews] = useState(undefined);
  const [totalSales, setTotalSales] = useState(undefined);

  const [salesData, setSalesData] = useState([]);
  const [page1, setPage1] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [year, setYear] = useState(new Date().getFullYear());

  const context = useContext(MyContext);

  const handleChangeYear = (event) => {
    const selectedYear = event.target.value;
    setYear(selectedYear);
    loadSalesData(selectedYear);
  };

  const handleChangePage = (event, newPage) => {
    setPage1(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage1(0);
  };

  const handleChangeCategory = (event) => {
    const value = event.target.value;
    setcategoryVal(value);
    if (value === "all") {
      fetchDataFromApi(`/api/products`).then((res) => {
        setProductList(res);
      });
    } else {
      fetchDataFromApi(`/api/products/catId?catId=${value}`).then((res) => {
        setProductList(res);
      });
    }
  };

  const searchProducts = (keyword) => {
    if (keyword !== "") {
      fetchDataFromApi(`/api/search?q=${keyword}&page=1&perPage=10000`).then(
        (res) => {
          setProductList(res);
        }
      );
    } else {
      fetchDataFromApi(`/api/products`).then((res) => {
        setProductList(res);
      });
    }
  };

  const deleteProduct = (id) => {
    const userInfo = JSON.parse(localStorage.getItem("user"));
    if (userInfo?.email === "rinkuv37@gmail.com") {
      deleteData(`/api/products/${id}`).then(() => {
        context.setAlertBox({
          open: true,
          error: false,
          msg: "Product Deleted!",
        });
        fetchDataFromApi(`/api/products`).then((res) => {
          setProductList(res);
        });
      });
    } else {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Only Admin can delete Product",
      });
    }
  };

  const loadSalesData = (year) => {
    fetchDataFromApi(`/api/orders/sales?year=${year}`).then((res) => {
      const sales = [];
      res?.monthlySales?.forEach((item) => {
        sales.push({
          name: item?.month ?? "",
          sales: parseInt(item?.sale ?? 0),
        });
      });
      const uniqueArr = sales.filter(
        (obj, index, self) =>
          index === self.findIndex((t) => t.name === obj.name)
      );
      setSalesData(uniqueArr);
    });
  };

  useEffect(() => {
    context.setisHideSidebarAndHeader(false);
    window.scrollTo(0, 0);

    // Fetch products
    fetchDataFromApi(`/api/products`).then((res) => {
      setProductList(res);
    });

    // Fetch counts safely
    fetchDataFromApi("/api/user/get/count").then((res) => {
      setTotalUsers(res?.userCount ?? 0);
    });
    fetchDataFromApi("/api/orders/get/count").then((res) => {
      setTotalOrders(res?.orderCount ?? 0);
    });
    fetchDataFromApi("/api/products/get/count").then((res) => {
      setTotalProducts(res?.productsCount ?? 0);
    });
    fetchDataFromApi("/api/productReviews/get/count").then((res) => {
      setTotalProductsReviews(res?.productsReviews ?? 0);
    });

    // Sales (total)
    fetchDataFromApi("/api/orders/").then((res) => {
      let sales = 0;
      res?.forEach((item) => {
        sales += parseInt(item?.amount ?? 0);
      });
      setTotalSales(sales);
    });

    loadSalesData(year);
  }, [year]);

  return (
    <div className="right-content w-100">
      {/* Dashboard Top Stats */}
      <div className="row dashboardBoxWrapperRow dashboard_Box dashboardBoxWrapperRowV2">
        <div className="col-md-12">
          <div className="dashboardBoxWrapper d-flex">
            <DashboardBox
              color={["#1da256", "#48d483"]}
              icon={<FaUserCircle />}
              grow
              title="Total Users"
              count={totalUsers}
            />
            <DashboardBox
              color={["#c012e2", "#eb64fe"]}
              icon={<IoMdCart />}
              title="Total Orders"
              count={totalOrders}
            />
            <DashboardBox
              color={["#2c78e5", "#60aff5"]}
              icon={<MdShoppingBag />}
              title="Total Products"
              count={totalProducts}
            />
            <DashboardBox
              color={["#e1950e", "#f3cd29"]}
              icon={<GiStarsStack />}
              title="Total Reviews"
              count={totalProductsReviews}
            />
          </div>
        </div>
      </div>

      {/* Best Selling Products */}
      <div className="card shadow border-0 p-3 mt-4">
        <h3 className="hd">Best Selling Products</h3>

        <div className="row cardFilters mt-2 mb-3">
          <div className="col-md-3">
            <h4>CATEGORY BY</h4>
            <FormControl size="small" className="w-100">
              <Select
                value={categoryVal}
                onChange={handleChangeCategory}
                displayEmpty
                className="w-100"
              >
                <MenuItem value="all">
                  <em>All</em>
                </MenuItem>
                {context.catData?.categoryList?.map((cat, index) => (
                  <MenuItem
                    className="text-capitalize"
                    value={cat._id}
                    key={index}
                  >
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <div className="col-md-9 d-flex justify-content-end">
            <div className="searchWrap d-flex">
              <SearchBox searchProducts={searchProducts} />
            </div>
          </div>
        </div>

        {/* Products Table */}
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
                {productList?.products?.length > 0 &&
                  productList.products
                    .slice(page1 * rowsPerPage, page1 * rowsPerPage + rowsPerPage)
                    .reverse()
                    .map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="d-flex align-items-center productBox">
                            <div className="imgWrapper">
                              <div className="img card shadow m-0">
                                <LazyLoadImage
                                  alt="product"
                                  effect="blur"
                                  className="w-100"
                                  src={item.images[0]}
                                />
                              </div>
                            </div>
                            <div className="info pl-3">
                              <Link to={`/product/details/${item.id}`}>
                                <h6>{item?.name}</h6>
                              </Link>
                              <p>{item?.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item?.catName}</TableCell>
                        <TableCell>{item?.subCatName}</TableCell>
                        <TableCell>
                          <span className="badge badge-secondary">
                            {item?.brand}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div style={{ width: "70px" }}>
                            <del className="old">Rs {item?.oldPrice}</del>
                            <span className="new text-danger d-block">
                              Rs {item?.price}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Rating
                            name="read-only"
                            defaultValue={item?.rating}
                            precision={0.5}
                            size="small"
                            readOnly
                          />
                        </TableCell>
                        <TableCell>
                          <div className="actions d-flex align-items-center">
                            <Link to={`/product/details/${item.id}`}>
                              <Button color="secondary">
                                <FaEye />
                              </Button>
                            </Link>
                            <Link to={`/product/edit/${item.id}`}>
                              <Button color="success">
                                <FaPencilAlt />
                              </Button>
                            </Link>
                            <Button
                              color="error"
                              onClick={() => deleteProduct(item?.id)}
                            >
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
            count={productList?.products?.length ?? 0}
            rowsPerPage={rowsPerPage}
            page={page1}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </div>

      {/* Sales Chart */}
      <div className="card p-3 mt-4">
        <div className="d-flex align-items-center">
          <h3 className="hd">Total Sales</h3>
          <div className="ml-auto res-full" style={{ width: "100px" }}>
            <Select
              size="small"
              className="w-100"
              value={year}
              onChange={handleChangeYear}
            >
              {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </div>
        </div>
        <br />
        <div className="chartWrapper">
          {salesData.length > 0 && (
            <BarChart width={900} height={400} data={salesData} barSize={20}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <CartesianGrid strokeDasharray="3 3" />
              <Bar dataKey="sales" fill="#0858f7" />
            </BarChart>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
