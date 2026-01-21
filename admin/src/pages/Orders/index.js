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
import TablePagination from "@mui/material/TablePagination";

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

        {/* Cards list */}
        <div className="card shadow border-0 p-3 mt-4">
          {paginatedOrders?.length > 0 ? (
            paginatedOrders.map((order) => {
              const shiprocket = order.shiprocket || {};

              return (
                <div
                  className="card shadow-sm border mb-3 p-3"
                  key={order._id}
                >
                  {/* Top row: Id, date, amount, status, products btn */}
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
                    <div className="mb-2">
                      <div className="text-muted small">Order Id</div>
                      <div className="font-weight-bold text-primary">
                        {order?.orderId || "—"}
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="text-muted small">Date</div>
                      <div>
                        <MdOutlineDateRange />{" "}
                        {order?.date
                          ? String(order.date).split("T")[0]
                          : "—"}
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="text-muted small">Total Amount</div>
                      <div>
                        <MdOutlineCurrencyRupee /> {order?.amount}
                      </div>
                    </div>

                    <div className="mb-2" style={{ minWidth: 180 }}>
                      <div className="text-muted small">Order Status</div>
                      <Select
                        disabled={isLoading}
                        value={
                          typeof order?.status === "string"
                            ? order.status
                            : ""
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
                        <MenuItem value="processing">Processing</MenuItem>
                        <MenuItem value="shipped">Shipped</MenuItem>
                        <MenuItem value="delivered">Delivered</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </Select>
                    </div>

                    <div className="mb-2">
                      <div className="text-muted small">Products</div>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => showProducts(order?._id)}
                      >
                        View Products
                      </Button>
                    </div>
                  </div>

                  <hr className="my-2" />

                  {/* Customer + meta */}
                  <div className="row small">
                    <div className="col-md-6 mb-2">
                      <div>
                        <strong>Customer:</strong> {order?.name || "—"}
                      </div>
                      <div>
                        <FaPhoneAlt /> {order?.phoneNumber || "—"}
                      </div>
                      <div>
                        <MdOutlineEmail /> {order?.email || "—"}
                      </div>
                      <div>
                        <strong>Address:</strong>{" "}
                        {order?.address || "—"}
                      </div>
                      <div>
                        <strong>Pincode:</strong> {order?.pincode || "—"}
                      </div>
                    </div>

                    <div className="col-md-6 mb-2">
                      <div>
                        <strong>Payment Id:</strong>{" "}
                        {order?.paymentId || "—"}
                      </div>
                      <div>
                        <strong>User Id:</strong> {order?.userid || "—"}
                      </div>
                      <div>
                        <strong>Mongo Id:</strong>{" "}
                        <span className="text-muted small">
                          {order?._id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="my-2" />

                  {/* Shiprocket block */}
                  <div className="row small">
                    <div className="col-md-3 mb-2">
                      <div className="text-muted">SR Order Id</div>
                      <div className="font-weight-bold">
                        {typeof shiprocket?.sr_order_id !== "undefined" &&
                        shiprocket?.sr_order_id !== null
                          ? shiprocket.sr_order_id
                          : "Not synced"}
                      </div>
                    </div>

                    <div className="col-md-3 mb-2">
                      <div className="text-muted">SR Shipment Id</div>
                      <div>
                        {typeof shiprocket?.shipment_id !== "undefined" &&
                        shiprocket?.shipment_id !== null
                          ? shiprocket.shipment_id
                          : "—"}
                      </div>
                    </div>

                    <div className="col-md-3 mb-2">
                      <div className="text-muted">AWB Code</div>
                      <div>{shiprocket?.awb_code || "—"}</div>
                    </div>

                    <div className="col-md-3 mb-2">
                      <div className="text-muted">SR Status</div>
                      <div>
                        {shiprocket?.status
                          ? shiprocket.status
                          : shiprocket?.enabled
                          ? "Created (no status)"
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex flex-wrap justify-content-between align-items-center mt-2 small">
                    <div className="mb-2">
                      <span className="text-muted">Tracking: </span>
                      {shiprocket?.tracking_url ? (
                        <a
                          href={shiprocket.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary ml-2"
                        >
                          Track
                        </a>
                      ) : (
                        <span className="text-muted">No tracking</span>
                      )}
                    </div>

                    <div className="mb-2">
                      {shiprocket?.enabled ? (
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={isLoading}
                          onClick={() => handleRefreshShiprocket(order._id)}
                        >
                          Refresh Shiprocket
                        </Button>
                      ) : (
                        <span className="text-muted">
                          Shiprocket not enabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted py-4">
              No orders found.
            </div>
          )}

          {/* Pagination at bottom */}
          <div className="d-flex justify-content-end mt-2">
            <TablePagination
              rowsPerPageOptions={[10, 25, 100]}
              component="div"
              count={Array.isArray(orders) ? orders.length : 0}
              rowsPerPage={rowsPerPage}
              page={page1}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </div>
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
