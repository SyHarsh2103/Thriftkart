import React, { useContext, useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { IoBagCheckOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { MyContext } from "../../App";
import { fetchDataFromApi, postData, deleteData } from "../../utils/api";

const Checkout = () => {
  const context = useContext(MyContext);
  const navigate = useNavigate();

  const [formFields, setFormFields] = useState({
    fullName: "",
    country: "",
    streetAddressLine1: "",
    streetAddressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    phoneNumber: "",
  });

  const [cartData, setCartData] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0); // ✅ total = subtotal (inclusive)

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // ✅ Payment mode: "ONLINE" or "COD"
  const [paymentMode, setPaymentMode] = useState("ONLINE");

  // ✅ Email from login session (localStorage user)
  const [sessionEmail, setSessionEmail] = useState("");

  // ✅ On mount: require login + load cart
  useEffect(() => {
    window.scrollTo(0, 0);
    context.setEnableFilterTab(false);

    const token = localStorage.getItem("token");
    if (!token) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please sign in to place an order",
      });
      navigate("/signIn");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.userId) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "User session invalid. Please sign in again.",
      });
      navigate("/signIn");
      return;
    }

    // 🔹 Get email internally from session (NO fallback to 'NA')
    const emailFromUser =
      user?.email || user?.userEmail || user?.username || "";
    setSessionEmail(emailFromUser || "");

    fetchDataFromApi(`/api/cart?userId=${user.userId}`)
      .then((res) => setCartData(res || []))
      .catch(() => {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Failed to load cart",
        });
      });
  }, [context, navigate]);

  // ✅ Recalculate totals whenever cartData changes
  useEffect(() => {
    if (cartData.length !== 0) {
      const sub = cartData
        .map((item) => parseInt(item.price, 10) * item.quantity)
        .reduce((total, value) => total + value, 0);

      setSubtotal(sub);
      setTotalAmount(sub); // ✅ inclusive: total == subtotal
    } else {
      setSubtotal(0);
      setTotalAmount(0);
    }
  }, [cartData]);

  // ✅ Input handler
  const onChangeInput = (e) => {
    setFormFields((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateAddress = () => {
    for (const [key, value] of Object.entries(formFields)) {
      // streetAddressLine2 is OPTIONAL
      if (!value && key !== "streetAddressLine2") {
        context.setAlertBox({
          open: true,
          error: true,
          msg: `Please fill ${key}`,
        });
        return false;
      }
    }
    if (!cartData.length) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Your cart is empty",
      });
      return false;
    }
    return true;
  };

  // ✅ Ensure Shiprocket-required email is present
  const ensureEmailPresent = () => {
    if (!sessionEmail || !sessionEmail.trim()) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Email address is missing in your account. Please update your profile or re-login before placing the order (required for shipping).",
      });
      return false;
    }
    return true;
  };

  // ✅ Build full address info (used by both Online & COD)
  const buildAddressInfo = () => ({
    name: formFields.fullName,
    phoneNumber: formFields.phoneNumber,
    address:
      formFields.streetAddressLine1 +
      (formFields.streetAddressLine2 ? ` ${formFields.streetAddressLine2}` : ""),
    pincode: formFields.zipCode,
    city: formFields.city,
    state: formFields.state,
    country: formFields.country,
    date: new Date(),
  });

  const clearCartAndGoToOrders = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.userId) return;

    try {
      const res = await fetchDataFromApi(`/api/cart?userId=${user.userId}`);
      if (Array.isArray(res) && res.length) {
        await Promise.all(
          res.map((item) => deleteData(`/api/cart/${item?.id}`))
        );
      }
      setTimeout(() => {
        context.getCartData?.();
      }, 500);
      navigate("/orders");
    } catch (err) {
      console.error("Error clearing cart:", err);
      navigate("/orders");
    }
  };

  // ---------------- Razorpay Checkout (ONLINE) ----------------
  const checkoutOnline = async () => {
    if (!validateAddress()) return;
    if (!ensureEmailPresent()) return; // 🚫 block if no email

    if (!window.Razorpay) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Payment system not loaded. Please refresh and try again.",
      });
      return;
    }

    setIsPlacingOrder(true);

    try {
      const addressInfo = buildAddressInfo();
      const emailToUse = sessionEmail.trim();

      // Step 1: Ask backend to create Razorpay order
      const orderData = await postData("/api/orders/create-razorpay-order", {
        amount: totalAmount,
        currency: "INR",
      });

      if (!orderData || !orderData.id) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Failed to create payment order. Please try again.",
        });
        setIsPlacingOrder(false);
        return;
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        order_id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Thriftkart",
        description: "Secure payment for your Thriftkart order",
        image: "/logo.png",
        prefill: {
          name: formFields.fullName,
          email: emailToUse, // ✅ real email only
          contact: formFields.phoneNumber,
        },
        handler: async (response) => {
          try {
            // Step 2: Verify signature
            const verifyRes = await postData(
              "/api/orders/verify-payment",
              response
            );

            if (!verifyRes?.success) {
              context.setAlertBox({
                open: true,
                error: true,
                msg: "Payment verification failed",
              });
              setIsPlacingOrder(false);
              return;
            }

            // Step 3: Save order in DB (backend will set userid from token)
            const payLoad = {
              name: addressInfo.name,
              phoneNumber: addressInfo.phoneNumber,
              address: addressInfo.address,
              pincode: addressInfo.pincode,
              city: addressInfo.city,
              state: addressInfo.state,
              country: addressInfo.country,
              amount: parseInt(totalAmount, 10),
              subtotal: parseInt(subtotal, 10),
              tax: 0, // ✅ inclusive pricing
              paymentId: response.razorpay_payment_id,
              paymentType: "ONLINE",
              email: emailToUse, // ✅ real email only
              products: cartData,
              date: addressInfo.date,
            };

            await postData("/api/orders/create", payLoad);

            context.setAlertBox({
              open: true,
              error: false,
              msg: "Order placed successfully!",
            });

            await clearCartAndGoToOrders();
          } catch (err) {
            console.error("Order creation after payment error:", err);
            context.setAlertBox({
              open: true,
              error: true,
              msg: "Order creation failed after payment",
            });
          } finally {
            setIsPlacingOrder(false);
          }
        },
        theme: { color: "#3399cc" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Checkout error:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: error.message || "Payment failed. Please try again.",
      });
      setIsPlacingOrder(false);
    }
  };

  // ---------------- Cash On Delivery (COD) ----------------
  const cashOnDelivery = async () => {
    if (!validateAddress()) return;
    if (!ensureEmailPresent()) return; // 🚫 block if no email (Shiprocket)

    setIsPlacingOrder(true);

    try {
      const addressInfo = buildAddressInfo();
      const emailToUse = sessionEmail.trim();

      const payLoad = {
        name: addressInfo.name,
        phoneNumber: addressInfo.phoneNumber,
        address: addressInfo.address,
        pincode: addressInfo.pincode,
        city: addressInfo.city,
        state: addressInfo.state,
        country: addressInfo.country,
        amount: parseInt(totalAmount, 10),
        subtotal: parseInt(subtotal, 10),
        tax: 0, // ✅ inclusive pricing
        paymentId: null,
        paymentType: "COD",
        email: emailToUse, // ✅ real email only
        products: cartData,
        date: addressInfo.date,
      };

      await postData("/api/orders/cod/create", payLoad);

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Order placed with Cash on Delivery!",
      });

      await clearCartAndGoToOrders();
    } catch (error) {
      console.error("COD error:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: error.message || "COD order failed. Please try again.",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // ---------------- Single Place Order Button ----------------
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!paymentMode) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please select a payment method",
      });
      return;
    }

    if (paymentMode === "ONLINE") {
      await checkoutOnline();
    } else if (paymentMode === "COD") {
      await cashOnDelivery();
    }
  };

  return (
    <section className="section">
      <div className="container">
        <form className="checkoutForm">
          <div className="row">
            <div className="col-md-8">
              <h2 className="hd">BILLING DETAILS</h2>

              <div className="row mt-3">
                <div className="col-md-6">
                  <TextField
                    label="Full Name *"
                    variant="outlined"
                    className="w-100"
                    size="small"
                    name="fullName"
                    onChange={onChangeInput}
                  />
                </div>
                <div className="col-md-6">
                  <TextField
                    label="Country *"
                    variant="outlined"
                    className="w-100"
                    size="small"
                    name="country"
                    onChange={onChangeInput}
                  />
                </div>
              </div>

              <h6>Street address *</h6>
              <TextField
                label="House number and street name"
                variant="outlined"
                className="w-100 mb-3"
                size="small"
                name="streetAddressLine1"
                onChange={onChangeInput}
              />
              <TextField
                label="Apartment, suite, unit, etc. (optional)"
                variant="outlined"
                className="w-100 mb-3"
                size="small"
                name="streetAddressLine2"
                onChange={onChangeInput}
              />

              <h6>Town / City *</h6>
              <TextField
                label="City"
                variant="outlined"
                className="w-100 mb-3"
                size="small"
                name="city"
                onChange={onChangeInput}
              />

              <h6>State / County *</h6>
              <TextField
                label="State"
                variant="outlined"
                className="w-100 mb-3"
                size="small"
                name="state"
                onChange={onChangeInput}
              />

              <h6>Postcode / ZIP *</h6>
              <TextField
                label="ZIP Code"
                variant="outlined"
                className="w-100 mb-3"
                size="small"
                name="zipCode"
                onChange={onChangeInput}
              />

              <div className="row">
                <div className="col-md-6">
                  <TextField
                    label="Phone Number"
                    variant="outlined"
                    className="w-100"
                    size="small"
                    name="phoneNumber"
                    onChange={onChangeInput}
                  />
                </div>
                {/* Email is now fully internal – nothing here */}
              </div>
            </div>

            {/* Order Summary */}
            <div className="col-md-4">
              <div className="card orderInfo">
                <h4 className="hd">YOUR ORDER</h4>
                <div className="table-responsive mt-3">
                  <table className="table table-borderless">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartData?.length !== 0 &&
                        cartData?.map((item, index) => (
                          <tr key={index}>
                            <td>
                              {(item?.productTitle || "").substr(0, 20) +
                                "..."}{" "}
                              <b>× {item?.quantity}</b>
                            </td>
                            <td>
                              {(
                                parseInt(item.price, 10) * item.quantity
                              )?.toLocaleString("en-US", {
                                style: "currency",
                                currency: "INR",
                              })}
                            </td>
                          </tr>
                        ))}

                      <tr>
                        <td>
                          <b>Total</b>
                        </td>
                        <td>
                          {totalAmount?.toLocaleString("en-US", {
                            style: "currency",
                            currency: "INR",
                          })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 🔹 Note: total is inclusive of taxes */}
                <p
                  className="mt-1 mb-3 text-muted"
                  style={{ fontSize: "0.85rem" }}
                >
                  Including taxes
                </p>

                {/* 🔹 Payment Method Selection (Checkbox style, but mutually exclusive) */}
                <div className="mt-2 mb-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="paymentOnline"
                      checked={paymentMode === "ONLINE"}
                      onChange={() => setPaymentMode("ONLINE")}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="paymentOnline"
                    >
                      Pay Online
                    </label>
                  </div>

                  <div className="form-check mt-1">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="paymentCOD"
                      checked={paymentMode === "COD"}
                      onChange={() => setPaymentMode("COD")}
                    />
                    <label className="form-check-label" htmlFor="paymentCOD">
                      Cash On Delivery
                    </label>
                  </div>
                </div>

                {/* 🔹 Single button for both payment options */}
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder || !cartData.length}
                  className="btn-blue bg-red btn-lg btn-big"
                >
                  <IoBagCheckOutline /> &nbsp;
                  {isPlacingOrder
                    ? "Processing..."
                    : paymentMode === "ONLINE"
                    ? "Pay Online"
                    : "Place Order (COD)"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Checkout;
