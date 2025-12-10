import { useContext, useEffect, useState } from "react";
import { fetchDataFromApi } from "../../utils/api";
import { MyContext } from "../../App";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Divider,
  Button,
  Collapse,
} from "@mui/material";

const statusColor = (status) => {
  switch (status) {
    case "pending":
      return "default";
    case "approved":
    case "pickup_scheduled":
      return "primary";
    case "rejected":
      return "error";
    case "refund_completed":
    case "closed":
      return "success";
    default:
      return "default";
  }
};

const MyReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMap, setExpandedMap] = useState({});
  const context = useContext(MyContext);

  useEffect(() => {
    window.scrollTo(0, 0);
    context.setEnableFilterTab?.(false);

    const token = localStorage.getItem("token");
    if (!token) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please login to view your returns.",
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    // client + admin use the same endpoint, backend filters by JWT
    fetchDataFromApi("/api/returns")
      .then((res) => {
        let list = [];
        if (res?.success && Array.isArray(res.data)) {
          list = res.data;
        } else if (Array.isArray(res)) {
          list = res;
        }
        setReturns(list);
      })
      .catch((err) => {
        console.error("MyReturns error:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: err.message || "Failed to load return requests",
        });
      })
      .finally(() => setLoading(false));
  }, [context]);

  const toggleItems = (id) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <section className="section py-4">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 className="mb-1">My Return Requests</h3>
            <p className="mb-0 text-muted" style={{ fontSize: "13px" }}>
              Track the status and details of your return &amp; refund requests.
            </p>
          </div>
          <Link to="/orders" className="btn btn-link">
            View Orders
          </Link>
        </div>

        {returns.length === 0 ? (
          <div className="text-center py-5">
            <h5 className="mb-2">No return requests yet</h5>
            <p className="text-muted mb-3" style={{ fontSize: "14px" }}>
              You haven&apos;t placed any return request.  
              You can request a return from the Orders page for delivered items.
            </p>
            <Link to="/orders" className="btn btn-primary btn-sm">
              Go to My Orders
            </Link>
          </div>
        ) : (
          <div className="row">
            {returns.map((rr) => {
              const order = rr.order || rr.orderId || {};
              const reverse = rr.reversePickup || {}; // 🔹 reverse pickup info (Shiprocket)

              const orderNumber =
                order.orderId || order.id || order._id || "—";
              const orderDateRaw = order.date || order.createdAt;
              const orderDate = orderDateRaw
                ? new Date(orderDateRaw).toLocaleDateString()
                : "—";

              const requestedDate = rr.requestedAt || rr.createdAt;
              const requestedOn = requestedDate
                ? new Date(requestedDate).toLocaleDateString()
                : "—";

              // Items snapshot (from returns route)
              const items =
                Array.isArray(rr.items) && rr.items.length
                  ? rr.items
                  : order.products || [];

              const isExpanded = !!expandedMap[rr._id];

              return (
                <div className="col-md-6 mb-3" key={rr._id}>
                  <Card variant="outlined" className="h-100 shadow-sm">
                    <CardContent>
                      {/* Header row: Return ID + Status */}
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <Typography
                          variant="subtitle2"
                          className="text-uppercase text-muted"
                        >
                          Return ID
                        </Typography>
                        <Chip
                          label={rr.status}
                          color={statusColor(rr.status)}
                          size="small"
                        />
                      </div>
                      <Typography variant="body1" className="mb-2">
                        #{rr._id}
                      </Typography>

                      <Divider className="my-2" />

                      {/* Order info */}
                      <div className="mb-2">
                        <Typography
                          variant="subtitle2"
                          className="text-muted mb-1"
                        >
                          Order
                        </Typography>
                        <Typography variant="body2" className="mb-1">
                          Order #{orderNumber}
                        </Typography>
                        <Typography
                          variant="body2"
                          className="text-muted"
                          style={{ fontSize: "12px" }}
                        >
                          Order date: {orderDate}
                        </Typography>
                      </div>

                      <Divider className="my-2" />

                      {/* Reason + Description */}
                      <div className="mb-2">
                        <Typography
                          variant="subtitle2"
                          className="text-muted mb-1"
                        >
                          Reason
                        </Typography>
                        <Typography variant="body2" className="mb-1">
                          {rr.reason}
                        </Typography>
                        {rr.description && (
                          <Typography
                            variant="body2"
                            className="text-muted"
                            style={{ fontSize: "13px" }}
                          >
                            {rr.description}
                          </Typography>
                        )}
                      </div>

                      {/* 🔹 Reverse Pickup info (if available) */}
                      {reverse && reverse.enabled && (
                        <>
                          <Divider className="my-2" />
                          <div className="mb-2">
                            <Typography
                              variant="subtitle2"
                              className="text-muted mb-1"
                            >
                              Pickup Status (Shiprocket)
                            </Typography>
                            <Typography variant="body2" className="mb-1">
                              Status:{" "}
                              {reverse.status || "Pickup scheduled"}
                            </Typography>
                            {reverse.awb_code && (
                              <Typography
                                variant="body2"
                                className="text-muted"
                                style={{ fontSize: "13px" }}
                              >
                                AWB: {reverse.awb_code}
                              </Typography>
                            )}
                            {reverse.tracking_url && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                component="a"
                                href={reverse.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ marginTop: 6 }}
                              >
                                Track Pickup
                              </Button>
                            )}
                          </div>
                        </>
                      )}

                      <Divider className="my-2" />

                      {/* Requested on */}
                      <Typography
                        variant="caption"
                        className="text-muted d-block mb-2"
                        style={{ fontSize: "11px" }}
                      >
                        Requested on: {requestedOn}
                      </Typography>

                      {/* View items toggle */}
                      {items && items.length > 0 && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => toggleItems(rr._id)}
                          >
                            {isExpanded ? "Hide items" : "View items"}
                          </Button>

                          <Collapse in={isExpanded}>
                            <div className="mt-3">
                              {items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="d-flex align-items-center border-bottom py-2"
                                >
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt={item.productTitle}
                                      style={{
                                        width: 50,
                                        height: 50,
                                        objectFit: "cover",
                                        marginRight: 10,
                                      }}
                                    />
                                  )}
                                  <div>
                                    <p
                                      className="mb-1"
                                      style={{ fontSize: 13 }}
                                    >
                                      {item.productTitle} × {item.quantity}
                                    </p>
                                    <small className="text-muted">
                                      ₹{item.price} each • Subtotal: ₹
                                      {item.subTotal}
                                    </small>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Collapse>
                        </>
                      )}
                    </CardContent>

                    <CardActions className="d-flex justify-content-between px-3 pb-3">
                      <span
                        className="text-muted"
                        style={{ fontSize: "11px" }}
                      >
                        We&apos;ll keep you updated via email &amp; My Orders.
                      </span>
                      <Link
                        to="/orders"
                        className="btn btn-outline-primary btn-sm"
                      >
                        View Order
                      </Link>
                    </CardActions>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default MyReturns;
