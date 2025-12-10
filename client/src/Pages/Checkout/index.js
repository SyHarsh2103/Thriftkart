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
    email: "",
  });

  const [cartData, setCartData] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const TAX_PERCENTAGE = 0.18; // 18% GST

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

      const tax = sub * TAX_PERCENTAGE;

      setSubtotal(sub);
      setTaxAmount(tax);
      setTotalAmount(sub + tax);
    } else {
      setSubtotal(0);
      setTaxAmount(0);
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
    // Use a real Date object – Mongoose will handle this nicely
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
  const checkout = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;

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
          email: formFields.email,
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
              tax: parseInt(taxAmount, 10),
              paymentId: response.razorpay_payment_id,
              // UPPERCASE to play nicely with Shiprocket mapping
              paymentType: "ONLINE",
              email: formFields.email,
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
  const cashOnDelivery = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;

    setIsPlacingOrder(true);

    try {
      const addressInfo = buildAddressInfo();

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
        tax: parseInt(taxAmount, 10),
        paymentId: null,
        // UPPERCASE so backend + Shiprocket see it as COD
        paymentType: "COD",
        email: formFields.email,
        products: cartData,
        date: addressInfo.date,
      };

      // 🔐 Use dedicated COD route (backend sets userid from token)
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
                <div className="col-md-6">
                  <TextField
                    label="Email Address"
                    variant="outlined"
                    className="w-100"
                    size="small"
                    name="email"
                    onChange={onChangeInput}
                  />
                </div>
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
                          <b>Subtotal</b>
                        </td>
                        <td>
                          {subtotal?.toLocaleString("en-US", {
                            style: "currency",
                            currency: "INR",
                          })}
                        </td>
                      </tr>

                      <tr>
                        <td>
                          <b>Tax (18%)</b>
                        </td>
                        <td>
                          {taxAmount?.toLocaleString("en-US", {
                            style: "currency",
                            currency: "INR",
                          })}
                        </td>
                      </tr>

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

                <Button
                  onClick={checkout}
                  disabled={isPlacingOrder || !cartData.length}
                  className="btn-blue bg-red btn-lg btn-big"
                >
                  <IoBagCheckOutline /> &nbsp;
                  {isPlacingOrder ? "Processing..." : "Pay Online"}
                </Button>
                <Button
                  onClick={cashOnDelivery}
                  disabled={isPlacingOrder || !cartData.length}
                  className="btn-blue bg-red btn-lg btn-big mt-3"
                >
                  <IoBagCheckOutline /> &nbsp;
                  {isPlacingOrder ? "Processing..." : "Cash On Delivery"}
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
