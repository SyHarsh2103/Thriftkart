import React, { useContext, useEffect, useState } from "react";
import { fetchDataFromApi } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { MyContext } from "../../App";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Collapse,
  Divider,
} from "@mui/material";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const context = useContext(MyContext);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    context.setEnableFilterTab(false);

    const token = localStorage.getItem("token");
    if (!token) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please sign in to view your orders",
      });
      navigate("/signIn");
      return;
    }

    const loadOrders = async () => {
      try {
        // ✅ Backend now uses req.auth.id to filter orders safely
        const res = await fetchDataFromApi("/api/orders");
        setOrders(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Orders fetch error:", err);

        // If backend denies access, force re-login
        if (err?.status === 401 || err?.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          context.setIsLogin(false);
          context.setAlertBox({
            open: true,
            error: true,
            msg: "Your session has expired. Please sign in again.",
          });
          navigate("/signIn");
        } else {
          context.setAlertBox({
            open: true,
            error: true,
            msg: err?.message || "Failed to load orders",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [context, navigate]);

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  return (
    <section className="section">
      <div className="container">
        <h2 className="hd">My Orders</h2>

        {loading && <p>Loading your orders...</p>}

        {!loading && orders?.length === 0 && <p>No orders found.</p>}

        {!loading &&
          orders?.map((order) => (
            <Card
              key={order.id}
              variant="outlined"
              className="mb-3 shadow-sm rounded"
            >
              <CardContent>
                <Typography variant="h6" className="text-blue">
                  Order #{order?.orderId || order?.id}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Placed on{" "}
                  {order?.date
                    ? order.date.split("T")[0]
                    : new Date(order?.createdAt || "").toLocaleDateString()}
                </Typography>
                <Divider className="my-2" />

                <div className="row">
                  {/* Customer Info */}
                  <div className="col-md-4">
                    <p>
                      <b>Name:</b> {order?.name}
                    </p>
                    <p>
                      <b>Phone:</b> {order?.phoneNumber}
                    </p>
                  </div>

                  {/* Address + Email */}
                  <div className="col-md-4">
                    <p>
                      <b>Address:</b> {order?.address}, {order?.pincode}
                    </p>
                    <p>
                      <b>Email:</b> {order?.email}
                    </p>
                  </div>

                  {/* Payment Info */}
                  <div className="col-md-4">
                    <p>
                      <b>Amount:</b> ₹{order?.amount}
                    </p>
                    <p>
                      <b>Payment:</b>{" "}
                      {order?.paymentType === "COD" ? (
                        <span className="badge badge-secondary">
                          Cash on Delivery
                        </span>
                      ) : (
                        <span className="badge badge-info">Online</span>
                      )}
                    </p>
                    <p>
                      <b>Status:</b>{" "}
                      <span
                        className={`badge ${
                          order?.status === "pending"
                            ? "badge-danger"
                            : "badge-success"
                        }`}
                      >
                        {order?.status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Expand Products */}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => toggleExpand(order._id)}
                >
                  {expandedOrder === order._id
                    ? "Hide Products"
                    : "View Products"}
                </Button>

                <Collapse in={expandedOrder === order._id}>
                  <Divider className="my-2" />
                  <Typography variant="subtitle1">Products</Typography>
                  {order?.products?.map((item, idx) => (
                    <div
                      key={idx}
                      className="d-flex align-items-center border-bottom py-2"
                    >
                      <img
                        src={item?.image}
                        alt={item?.productTitle}
                        style={{
                          width: "50px",
                          height: "50px",
                          objectFit: "cover",
                          marginRight: "10px",
                        }}
                      />
                      <div>
                        <p className="mb-0">
                          {item?.productTitle} × {item?.quantity}
                        </p>
                        <small>₹{item?.subTotal}</small>
                      </div>
                    </div>
                  ))}
                </Collapse>
              </CardContent>
            </Card>
          ))}
      </div>
    </section>
  );
};

export default Orders;
