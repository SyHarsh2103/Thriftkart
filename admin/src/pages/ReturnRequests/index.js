// admin/src/pages/ReturnRequests/index.js
import React, { useContext, useEffect, useState } from "react";
import { MyContext } from "../../App";
import { fetchDataFromApi, editData } from "../../utils/api";

import { emphasize, styled } from "@mui/material/styles";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Chip from "@mui/material/Chip";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

// ✅ Use react-icons for MdClose (your comment suggested this)
import { MdClose } from "react-icons/md";

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
  { id: "id", label: "Return ID", minWidth: 180 },
  { id: "orderNumber", label: "Order", minWidth: 160 },
  { id: "user", label: "User", minWidth: 200 },
  { id: "reason", label: "Reason", minWidth: 160 },
  { id: "resolution", label: "Resolution", minWidth: 140 },
  { id: "status", label: "Status", minWidth: 180 },
  // 🔹 New columns for reverse pickup
  { id: "reverseAwb", label: "Reverse AWB", minWidth: 150 },
  { id: "reverseTracking", label: "Pickup Tracking", minWidth: 160 },
  { id: "requestedAt", label: "Requested At", minWidth: 140 },
  { id: "items", label: "Items", minWidth: 120 },
];

// Small helper for dates
const formatDateOnly = (value) => {
  if (!value) return "-";
  try {
    if (value.includes("T")) return value.split("T")[0];
    return value;
  } catch {
    return value;
  }
};

const AdminReturnRequests = () => {
  const [rows, setRows] = useState([]);
  const [page1, setPage1] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogItems, setDialogItems] = useState([]);
  const [dialogRequest, setDialogRequest] = useState(null); // full return request

  const context = useContext(MyContext);

  const loadData = () => {
    setIsLoading(true);
    fetchDataFromApi("/api/returns")
      .then((res) => {
        // Expecting { success, data } from backend
        if (Array.isArray(res)) {
          setRows(res);
        } else if (res?.data && Array.isArray(res.data)) {
          setRows(res.data);
        } else {
          setRows([]);
        }
      })
      .catch((err) => {
        console.error("returns admin error:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: err?.message || "Failed to load return requests",
        });
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadData();
    // eslint-disable-next-line
  }, []);

  const handleChangePage = (_event, newPage) => {
    setPage1(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage1(0);
  };

  const handleChangeStatus = (e, id) => {
    const value = e.target.value;
    setIsLoading(true);
    context.setProgress(40);

    editData(`/api/returns/${id}/status`, { status: value })
      .then(() => {
        context.setProgress(80);
        loadData();
      })
      .catch((err) => {
        console.error("update status error:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: err?.message || "Failed to update status",
        });
      })
      .finally(() => {
        context.setProgress(100);
        setIsLoading(false);
      });
  };

  const openItemsDialog = (rr) => {
    // Prefer rr.items, fallback to full order products if needed
    const items =
      (rr.items && rr.items.length && rr.items) ||
      rr.orderId?.products ||
      [];

    setDialogRequest(rr);
    setDialogItems(items);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setDialogItems([]);
    setDialogRequest(null);
  };

  return (
    <>
      <div className="right-content w-100">
        <div className="card shadow border-0 w-100 flex-row p-4 align-items-center">
          <h5 className="mb-0">Return Requests</h5>

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
                label="Return Requests"
                deleteIcon={<ExpandMoreIcon />}
              />
            </Breadcrumbs>
          </div>
        </div>

        <div className="card shadow border-0 p-3 mt-4">
          {isLoading && (
            <div className="text-center mb-3">
              <CircularProgress size={24} />
            </div>
          )}

          <Paper sx={{ width: "100%", overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table stickyHeader aria-label="returns table">
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
                  {rows
                    .slice(
                      page1 * rowsPerPage,
                      page1 * rowsPerPage + rowsPerPage
                    )
                    .map((rr) => {
                      const order = rr.orderId || {};
                      const user = rr.userId || {};
                      const reverse = rr.reversePickup || {};

                      const orderNumber =
                        order.orderId ||
                        order._id ||
                        rr.orderNumber ||
                        rr._id;

                      const requestedDate =
                        formatDateOnly(rr.requestedAt) ||
                        formatDateOnly(rr.createdAt);

                      return (
                        <TableRow hover key={rr._id}>
                          {/* Return ID */}
                          <TableCell>{rr._id}</TableCell>

                          {/* Order */}
                          <TableCell>
                            <strong>{orderNumber}</strong>
                            <br />
                            <small>
                              Amount: ₹{order.amount ?? "-"} | Status:{" "}
                              {order.status ?? "-"}
                            </small>
                          </TableCell>

                          {/* User */}
                          <TableCell>
                            {user.name || "-"}
                            <br />
                            <small>{user.email || "-"}</small>
                            {user.phoneNumber && (
                              <>
                                <br />
                                <small>📞 {user.phoneNumber}</small>
                              </>
                            )}
                          </TableCell>

                          {/* Reason */}
                          <TableCell>{rr.reason || "-"}</TableCell>

                          {/* Resolution */}
                          <TableCell>{rr.resolution || "-"}</TableCell>

                          {/* Status */}
                          <TableCell>
                            <Select
                              value={rr.status || "pending"}
                              size="small"
                              onChange={(e) => handleChangeStatus(e, rr._id)}
                              disabled={isLoading}
                              className="w-100"
                            >
                              <MenuItem value="pending">Pending</MenuItem>
                              <MenuItem value="approved">Approved</MenuItem>
                              <MenuItem value="rejected">Rejected</MenuItem>
                              <MenuItem value="pickup_scheduled">
                                Pickup Scheduled
                              </MenuItem>
                              <MenuItem value="picked">Picked</MenuItem>
                              <MenuItem value="refund_initiated">
                                Refund Initiated
                              </MenuItem>
                              <MenuItem value="refund_completed">
                                Refund Completed
                              </MenuItem>
                              <MenuItem value="closed">Closed</MenuItem>
                            </Select>
                          </TableCell>

                          {/* 🔹 Reverse AWB */}
                          <TableCell>
                            {reverse.enabled && reverse.awb_code
                              ? reverse.awb_code
                              : "—"}
                          </TableCell>

                          {/* 🔹 Pickup Tracking link */}
                          <TableCell>
                            {reverse.enabled && reverse.tracking_url ? (
                              <a
                                href={reverse.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue"
                              >
                                Track Pickup
                              </a>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </TableCell>

                          {/* Requested At */}
                          <TableCell>{requestedDate || "-"}</TableCell>

                          {/* Items */}
                          <TableCell>
                            <span
                              className="text-blue cursor"
                              onClick={() => openItemsDialog(rr)}
                            >
                              View items
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 100]}
              component="div"
              count={rows.length}
              rowsPerPage={rowsPerPage}
              page={page1}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </div>
      </div>

      {/* Dialog with full Order + User + Products details */}
      <Dialog
        open={isDialogOpen}
        className="productModal"
        maxWidth="md"
        fullWidth
      >
        <Button className="close_" onClick={closeDialog}>
          <MdClose />
        </Button>

        <h4 className="mb-1 font-weight-bold pr-5 mb-3">
          Return Details &amp; Products
        </h4>

        {dialogRequest && (
          <>
            <div className="px-3 pb-3">
              <Typography variant="subtitle1" gutterBottom>
                <strong>Return ID:</strong> {dialogRequest._id}
              </Typography>

              <div className="row">
                {/* Order details */}
                <div className="col-md-6">
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Order Details</strong>
                  </Typography>
                  <p className="mb-1">
                    <b>Order #:</b>{" "}
                    {dialogRequest.orderId?.orderId ||
                      dialogRequest.orderId?._id ||
                      "-"}
                  </p>
                  <p className="mb-1">
                    <b>Amount:</b> ₹{dialogRequest.orderId?.amount ?? "-"}
                  </p>
                  <p className="mb-1">
                    <b>Payment:</b>{" "}
                    {dialogRequest.orderId?.paymentType || "-"}{" "}
                    {dialogRequest.orderId?.paymentId &&
                      `(${dialogRequest.orderId.paymentId})`}
                  </p>
                  <p className="mb-1">
                    <b>Status:</b> {dialogRequest.orderId?.status || "-"}
                  </p>
                  <p className="mb-1">
                    <b>Placed On:</b>{" "}
                    {dialogRequest.orderId?.date
                      ? formatDateOnly(dialogRequest.orderId.date)
                      : formatDateOnly(
                          dialogRequest.orderId?.createdAt || ""
                        ) || "-"}
                  </p>
                  {/* 🔹 Shiprocket info (forward shipment) */}
                  {dialogRequest.orderId?.shiprocket &&
                    dialogRequest.orderId.shiprocket.enabled && (
                      <div className="mt-2">
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>Shipment (Shiprocket)</strong>
                        </Typography>
                        <p className="mb-1">
                          <b>Status:</b>{" "}
                          {dialogRequest.orderId.shiprocket.status ||
                            "Created"}
                        </p>
                        {dialogRequest.orderId.shiprocket.awb_code && (
                          <p className="mb-1">
                            <b>AWB:</b>{" "}
                            {dialogRequest.orderId.shiprocket.awb_code}
                          </p>
                        )}
                        {dialogRequest.orderId.shiprocket.tracking_url && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            component="a"
                            href={
                              dialogRequest.orderId.shiprocket.tracking_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            style={{ marginTop: 4 }}
                          >
                            Track Shipment
                          </Button>
                        )}
                      </div>
                    )}
                </div>

                {/* User + address */}
                <div className="col-md-6">
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Customer Details</strong>
                  </Typography>
                  <p className="mb-1">
                    <b>Name:</b>{" "}
                    {dialogRequest.orderId?.name ||
                      dialogRequest.userId?.name ||
                      "-"}
                  </p>
                  <p className="mb-1">
                    <b>Email:</b>{" "}
                    {dialogRequest.userId?.email ||
                      dialogRequest.orderId?.email ||
                      "-"}
                  </p>
                  <p className="mb-1">
                    <b>Phone:</b>{" "}
                    {dialogRequest.orderId?.phoneNumber ||
                      dialogRequest.userId?.phoneNumber ||
                      "-"}
                  </p>
                  <p className="mb-1">
                    <b>Address:</b>{" "}
                    {dialogRequest.orderId?.address &&
                    dialogRequest.orderId?.pincode
                      ? `${dialogRequest.orderId.address}, ${dialogRequest.orderId.pincode}`
                      : "-"}
                  </p>
                </div>
              </div>

              <Divider className="my-3" />

              <Typography variant="subtitle2" gutterBottom>
                <strong>Return Info</strong>
              </Typography>
              <p className="mb-1">
                <b>Reason:</b> {dialogRequest.reason || "-"}
              </p>
              <p className="mb-1">
                <b>Resolution:</b> {dialogRequest.resolution || "-"}
              </p>
              <p className="mb-1">
                <b>Status:</b> {dialogRequest.status || "pending"}
              </p>

              {/* 🔹 Reverse Pickup (Shiprocket) */}
              {dialogRequest.reversePickup &&
                dialogRequest.reversePickup.enabled && (
                  <>
                    <Divider className="my-3" />
                    <Typography variant="subtitle2" gutterBottom>
                      <strong>Reverse Pickup (Shiprocket)</strong>
                    </Typography>
                    <p className="mb-1">
                      <b>Status:</b>{" "}
                      {dialogRequest.reversePickup.status || "Created"}
                    </p>
                    {dialogRequest.reversePickup.awb_code && (
                      <p className="mb-1">
                        <b>AWB:</b> {dialogRequest.reversePickup.awb_code}
                      </p>
                    )}
                    {dialogRequest.reversePickup.tracking_url && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        component="a"
                        href={dialogRequest.reversePickup.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginTop: 4 }}
                      >
                        Track Pickup
                      </Button>
                    )}
                  </>
                )}
            </div>
          </>
        )}

        <Divider className="mb-3" />

        <div className="table-responsive orderTable px-3 pb-3">
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
              {dialogItems?.map((item, index) => {
                const productId =
                  (item.productId && item.productId._id) || item.productId || "-";
                const productTitle =
                  item.productTitle ||
                  (item.productId && item.productId.title) ||
                  "-";
                const image =
                  item.image ||
                  (item.productId && item.productId.image) ||
                  null;
                const quantity = item.quantity ?? item.qty ?? 1;
                const price = item.price ?? 0;
                const subTotal = item.subTotal ?? price * quantity;

                return (
                  <tr key={index}>
                    <td>{productId}</td>
                    <td style={{ whiteSpace: "inherit" }}>{productTitle}</td>
                    <td>
                      <div className="img">
                        {image && (
                          <img
                            src={image}
                            alt={productTitle}
                            style={{ maxWidth: "60px" }}
                          />
                        )}
                      </div>
                    </td>
                    <td>{quantity}</td>
                    <td>{price}</td>
                    <td>{subTotal}</td>
                  </tr>
                );
              })}
              {(!dialogItems || dialogItems.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center">
                    No items found for this return.
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

export default AdminReturnRequests;
