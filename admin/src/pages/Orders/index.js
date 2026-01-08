import React, { useContext, useEffect, useState } from "react";
import { editData, fetchDataFromApi, postData } from "../../utils/api";

import { emphasize, styled } from "@mui/material/styles";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Chip from "@mui/material/Chip";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
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

// ---------- Table columns ----------
const columns = [
  { id: "orderId", label: "Order Id", minWidth: 130 }, // TKORxxxx
  { id: "mongoId", label: "Mongo Id", minWidth: 150 }, // _id (for debugging)
  { id: "paymentId", label: "Payment Id", minWidth: 140 },
  { id: "products", label: "Products", minWidth: 150 },
  { id: "name", label: "Name", minWidth: 130 },
  { id: "phoneNumber", label: "Phone Number", minWidth: 150 },
  { id: "address", label: "Address", minWidth: 200 },
  { id: "pincode", label: "Pincode", minWidth: 120 },
  { id: "totalAmount", label: "Total Amount", minWidth: 120 },
  { id: "email", label: "Email", minWidth: 180 },
  { id: "userId", label: "User Id", minWidth: 150 },

  // 🔹 Shiprocket info
  { id: "srOrderId", label: "SR Order Id", minWidth: 130 },
  { id: "srShipmentId", label: "SR Shipment Id", minWidth: 130 },
  { id: "srAwbCode", label: "AWB Code", minWidth: 130 },
  { id: "srStatus", label: "SR Status", minWidth: 130 },
  { id: "srTrack", label: "Track", minWidth: 120 },
  { id: "srRefresh", label: "SR Refresh", minWidth: 140 }, // 👈 NEW COLUMN

  { id: "orderStatus", label: "Order Status", minWidth: 140 },
  { id: "dateCreated", label: "Date Created", minWidth: 150 },
];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [isOpenModal, setIsOpenModal] = useState(false);

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

        // Explicit param (even though backend ignores it for admin)
        const res = await fetchDataFromApi(`/api/orders?adminMode=1`);

        if (!Array.isArray(res)) {
          context.setAlertBox({
            open: true,
            error: true,
            msg: "Failed to fetch orders.",
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
          msg: err?.message || "Something went wrong while fetching orders.",
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
        msg: err?.message || "Something went wrong while loading products.",
      });
    } finally {
      context.setProgress?.(100);
    }
  };

  // ---------- Change status of an order ----------
  const handleChangeStatus = async (e, orderId) => {
    const newStatus = e.target.value;
    if (!newStatus) return;

    setIsLoading(true);
    context.setProgress?.(40);

    try {
      const updateRes = await editData(`/api/orders/${orderId}`, {
        status: newStatus,
      });

      if (updateRes?.success === false || updateRes?.error) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: updateRes?.msg || "Failed to update order status.",
        });
      } else {
        const refreshed = await fetchDataFromApi(`/api/orders?adminMode=1`);

        if (Array.isArray(refreshed)) {
          setOrders(refreshed);
        }

        context.setAlertBox({
          open: true,
          error: false,
          msg: "Order status updated successfully.",
        });
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Something went wrong while updating status.",
      });
    } finally {
      context.setProgress?.(100);
      setIsLoading(false);
    }
  };

  // ---------- Refresh Shiprocket status for one order ----------
  const handleRefreshShiprocket = async (orderId) => {
    setIsLoading(true);
    context.setProgress?.(40);

    try {
      const res = await postData(
        `/api/orders/${orderId}/shiprocket-refresh`,
        {}
      );

      if (!res || res.success === false) {
        context.setAlertBox({
          open: true,
          error: true,
          msg:
            res?.message ||
            "Failed to refresh Shiprocket status. Please try again.",
        });
      } else {
        // Update only that order in local state
        setOrders((prev) =>
          Array.isArray(prev)
            ? prev.map((o) =>
                o._id === orderId
                  ? {
                      ...o,
                      shiprocket: res.shiprocket || o.shiprocket || {},
                    }
                  : o
              )
            : prev
        );

        context.setAlertBox({
          open: true,
          error: false,
          msg: "Shiprocket status refreshed.",
        });
      }
    } catch (err) {
      console.error("Error refreshing Shiprocket status:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg:
          err?.message ||
          "Something went wrong while refreshing Shiprocket status.",
      });
    } finally {
      context.setProgress?.(100);
      setIsLoading(false);
    }
  };

  const sortedOrders = Array.isArray(orders) ? [...orders] : [];
  const paginatedOrders = sortedOrders.slice(
    page1 * rowsPerPage,
    page1 * rowsPerPage + rowsPerPage
  );

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
                    paginatedOrders.map((order) => {
                      const shiprocket = order.shiprocket || {};

                      return (
                        <TableRow hover key={order._id}>
                          {/* Thriftkart orderId (e.g., TKOR1234) */}
                          <TableCell>
                            <span className="text-blue font-weight-bold">
                              {order?.orderId || "—"}
                            </span>
                          </TableCell>

                          {/* Mongo _id */}
                          <TableCell>
                            <span className="text-muted small">
                              {order?._id}
                            </span>
                          </TableCell>

                          {/* Payment Id */}
                          <TableCell>
                            <span className="text-blue font-weight-bold">
                              {order?.paymentId || "—"}
                            </span>
                          </TableCell>

                          {/* Products */}
                          <TableCell>
                            <span
                              className="text-blue font-weight-bold cursor"
                              onClick={() => showProducts(order?._id)}
                            >
                              Click here to view
                            </span>
                          </TableCell>

                          {/* Customer name */}
                          <TableCell>{order?.name}</TableCell>

                          {/* Phone */}
                          <TableCell>
                            <FaPhoneAlt /> {order?.phoneNumber || "—"}
                          </TableCell>

                          {/* Address */}
                          <TableCell>{order?.address}</TableCell>

                          {/* Pincode */}
                          <TableCell>{order?.pincode}</TableCell>

                          {/* Amount */}
                          <TableCell>
                            <MdOutlineCurrencyRupee /> {order?.amount}
                          </TableCell>

                          {/* Email */}
                          <TableCell>
                            <MdOutlineEmail /> {order?.email}
                          </TableCell>

                          {/* UserId */}
                          <TableCell>{order?.userid}</TableCell>

                          {/* Shiprocket Order Id */}
                          <TableCell>
                            {typeof shiprocket?.sr_order_id !== "undefined" &&
                            shiprocket?.sr_order_id !== null ? (
                              <span className="text-blue font-weight-bold">
                                {shiprocket.sr_order_id}
                              </span>
                            ) : (
                              <span className="text-muted small">
                                Not synced
                              </span>
                            )}
                          </TableCell>

                          {/* Shiprocket Shipment Id */}
                          <TableCell>
                            {typeof shiprocket?.shipment_id !== "undefined" &&
                            shiprocket?.shipment_id !== null ? (
                              <span>{shiprocket.shipment_id}</span>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </TableCell>

                          {/* AWB Code */}
                          <TableCell>
                            {shiprocket?.awb_code ? (
                              <span>{shiprocket.awb_code}</span>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </TableCell>

                          {/* Shiprocket Status */}
                          <TableCell>
                            {shiprocket?.status ? (
                              <span>{shiprocket.status}</span>
                            ) : shiprocket?.enabled ? (
                              <span className="text-muted small">
                                Created (no status)
                              </span>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </TableCell>

                          {/* 🔗 Track Shipment */}
                          <TableCell>
                            {shiprocket?.tracking_url ? (
                              <a
                                href={shiprocket.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                Track
                              </a>
                            ) : (
                              <span className="text-muted small">
                                No tracking
                              </span>
                            )}
                          </TableCell>

                          {/* 🔄 Refresh Shiprocket status */}
                          <TableCell>
                            {shiprocket?.enabled ? (
                              <Button
                                variant="outlined"
                                size="small"
                                disabled={isLoading}
                                onClick={() =>
                                  handleRefreshShiprocket(order._id)
                                }
                              >
                                Refresh
                              </Button>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </TableCell>

                          {/* Order Status (local) */}
                          <TableCell>
                            <Select
                              disabled={isLoading}
                              value={
                                typeof order?.status === "string"
                                  ? order.status
                                  : ""
                              }
                              onChange={(e) =>
                                handleChangeStatus(e, order?._id)
                              }
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
                              <MenuItem value="processing">
                                Processing
                              </MenuItem>
                              <MenuItem value="shipped">Shipped</MenuItem>
                              <MenuItem value="delivered">Delivered</MenuItem>
                              <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                          </TableCell>

                          {/* Date */}
                          <TableCell>
                            <MdOutlineDateRange />{" "}
                            {order?.date
                              ? String(order.date).split("T")[0]
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
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
      <Dialog
        open={isOpenModal}
        className="productModal"
        onClose={() => setIsOpenModal(false)}
      >
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
                        {item?.image && (
                          <img src={item.image} alt={item?.productTitle} />
                        )}
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
