import React, { useContext, useEffect, useState } from "react";
import {
  editData,
  fetchDataFromApi,
} from "../../utils/api";

import { emphasize, styled } from "@mui/material/styles";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Chip from "@mui/material/Chip";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Pagination from "@mui/material/Pagination";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";

import { MdClose } from "react-icons/md";
import { MdOutlineEmail } from "react-icons/md";
import { FaPhoneAlt } from "react-icons/fa";
import { MdOutlineCurrencyRupee } from "react-icons/md";
import { MdOutlineDateRange } from "react-icons/md";

import { MyContext } from "../../App";

// ---------- Breadcrumb ----------
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
    "&:hover, &:focus": {
      backgroundColor: emphasize(backgroundColor, 0.06),
    },
    "&:active": {
      boxShadow: theme.shadows[1],
      backgroundColor: emphasize(backgroundColor, 0.12),
    },
  };
});

const columns = [
  { id: "orderId", label: "Order Id", minWidth: 150 },
  { id: "paymantId", label: "Payment Id", minWidth: 120 }, // label typo fixed only for display
  { id: "products", label: "Products", minWidth: 150 },
  { id: "name", label: "Name", minWidth: 130 },
  { id: "phoneNumber", label: "Phone Number", minWidth: 150 },
  { id: "address", label: "Address", minWidth: 200 },
  { id: "pincode", label: "Pincode", minWidth: 120 },
  { id: "totalAmount", label: "Total Amount", minWidth: 120 },
  { id: "email", label: "Email", minWidth: 180 },
  { id: "userId", label: "User Id", minWidth: 120 },
  { id: "orderStatus", label: "Order Status", minWidth: 140 },
  { id: "dateCreated", label: "Date Created", minWidth: 150 },
];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [isOpenModal, setIsOpenModal] = useState(false);

  const [statusVal, setStatusVal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [page1, setPage1] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const context = useContext(MyContext);

  const handleChangePage = (_event, newPage) => {
    setPage1(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value || 10);
    setPage1(0);
  };

  // ---------- Fetch orders list ----------
  useEffect(() => {
    window.scrollTo(0, 0);

    const loadOrders = async () => {
      try {
        context.setProgress?.(30);
        const res = await fetchDataFromApi(`/api/orders`);

        if (!Array.isArray(res)) {
          // api.js returns {success:false, msg:'Request failed'} on error
          context.setAlertBox({
            open: true,
            error: true,
            msg: res?.msg || "Failed to fetch orders.",
          });
          setOrders([]);
        } else {
          setOrders(res);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Something went wrong while fetching orders.",
        });
        setOrders([]);
      } finally {
        context.setProgress?.(100);
      }
    };

    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Show products of a specific order ----------
  const showProducts = async (id) => {
    try {
      context.setProgress?.(30);
      const res = await fetchDataFromApi(`/api/orders/${id}`);
      if (!res || !Array.isArray(res.products)) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Unable to load products for this order.",
        });
        return;
      }

      setProducts(res.products);
      setIsOpenModal(true);
    } catch (err) {
      console.error("Error fetching order products:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Something went wrong while loading products.",
      });
    } finally {
      context.setProgress?.(100);
    }
  };

  // ---------- Change status of an order (Pending → Confirm → Delivered) ----------
  const handleChangeStatus = async (e, orderId) => {
    const newStatus = e.target.value;
    setStatusVal(newStatus);
    setIsLoading(true);
    context.setProgress?.(40);

    try {
      const res = await fetchDataFromApi(`/api/orders/${orderId}`);
      if (!res) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Order not found.",
        });
        return;
      }

      const orderPayload = {
        name: res.name,
        phoneNumber: res.phoneNumber,
        address: res.address,
        pincode: res.pincode,
        amount: parseInt(res.amount, 10),
        paymentId: res.paymentId,
        email: res.email,
        userid: res.userId,
        products: res.products,
        status: newStatus,
        date: res.date, // keep original date if backend expects it
      };

      const updateRes = await editData(`/api/orders/${orderId}`, orderPayload);
      if (updateRes?.success === false || updateRes?.error) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: updateRes?.msg || "Failed to update order status.",
        });
      }

      // Refresh orders
      const refreshed = await fetchDataFromApi(`/api/orders`);
      if (Array.isArray(refreshed)) {
        setOrders(refreshed);
      }

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Order status updated successfully.",
      });
    } catch (err) {
      console.error("Error updating order status:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Something went wrong while updating status.",
      });
    } finally {
      context.setProgress?.(100);
      setIsLoading(false);
    }
  };

  // Helpers
  const paginatedOrders = Array.isArray(orders)
    ? [...orders]
        .slice(page1 * rowsPerPage, page1 * rowsPerPage + rowsPerPage)
        .reverse()
    : [];

  return (
    <>
      <div className="right-content w-100">
        {/* Header */}
        <div className="card shadow border-0 w-100 flex-row p-4 align-items-center">
          <h5 className="mb-0">Orders List</h5>

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
                label="Orders"
                deleteIcon={<ExpandMoreIcon />}
              />
            </Breadcrumbs>
          </div>
        </div>

        {/* Table */}
        <div className="card shadow border-0 p-3 mt-4">
          <Paper sx={{ width: "100%", overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table stickyHeader aria-label="orders table">
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        style={{ minWidth: column.minWidth }}
                      >
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedOrders?.length > 0 ? (
                    paginatedOrders.map((order) => (
                      <TableRow hover key={order._id}>
                        <TableCell>
                          <span className="text-blue font-weight-bold">
                            {order?._id}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-blue font-weight-bold">
                            {order?.paymentId || "—"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span
                            className="text-blue font-weight-bold cursor"
                            onClick={() => showProducts(order?._id)}
                          >
                            Click here to view
                          </span>
                        </TableCell>

                        <TableCell>{order?.name}</TableCell>

                        <TableCell>
                          <FaPhoneAlt /> {order?.phoneNumber || "—"}
                        </TableCell>

                        <TableCell>{order?.address}</TableCell>

                        <TableCell>{order?.pincode}</TableCell>

                        <TableCell>
                          <MdOutlineCurrencyRupee /> {order?.amount}
                        </TableCell>

                        <TableCell>
                          <MdOutlineEmail /> {order?.email}
                        </TableCell>

                        <TableCell>{order?.userid}</TableCell>

                        <TableCell>
                          <Select
                            disabled={isLoading}
                            value={
                              typeof order?.status === "string"
                                ? order.status
                                : statusVal || ""
                            }
                            onChange={(e) => handleChangeStatus(e, order?._id)}
                            displayEmpty
                            inputProps={{ "aria-label": "Order status" }}
                            size="small"
                            className="w-100"
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="confirm">Confirm</MenuItem>
                            <MenuItem value="delivered">Delivered</MenuItem>
                          </Select>
                        </TableCell>

                        <TableCell>
                          <MdOutlineDateRange />{" "}
                          {order?.date
                            ? String(order.date).split("T")[0]
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center">
                        No orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 100]}
              component="div"
              count={Array.isArray(orders) ? orders.length : 0}
              rowsPerPage={rowsPerPage}
              page={page1}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </div>
      </div>

      {/* Products Modal */}
      <Dialog open={isOpenModal} className="productModal" onClose={() => setIsOpenModal(false)}>
        <Button className="close_" onClick={() => setIsOpenModal(false)}>
          <MdClose />
        </Button>
        <h4 className="mb-1 font-weight-bold pr-5 mb-4">Products</h4>

        <div className="table-responsive orderTable">
          <table className="table table-striped table-bordered">
            <thead className="thead-dark">
              <tr>
                <th>Product Id</th>
                <th>Product Title</th>
                <th>Image</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>SubTotal</th>
              </tr>
            </thead>

            <tbody>
              {products?.length > 0 ? (
                products.map((item) => (
                  <tr key={item?.productId}>
                    <td>{item?.productId}</td>
                    <td style={{ whiteSpace: "inherit" }}>
                      <span>
                        {item?.productTitle
                          ? item.productTitle.substr(0, 30) + "..."
                          : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="img">
                        {item?.image && <img src={item.image} alt={item?.productTitle} />}
                      </div>
                    </td>
                    <td>{item?.quantity}</td>
                    <td>{item?.price}</td>
                    <td>{item?.subTotal}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center">
                    No products found for this order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Dialog>
    </>
  );
};

export default Orders;
