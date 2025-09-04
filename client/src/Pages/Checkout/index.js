import React, { useContext, useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { IoBagCheckOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { MyContext } from "../../App";
import { fetchDataFromApi, postData, deleteData } from "../../utils/api";

const Checkout = () => {
  const context = useContext(MyContext);   // ✅ Context
  const navigate = useNavigate();          // ✅ useNavigate hook

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
  const [totalAmount, setTotalAmount] = useState(0);

  // ✅ Fetch cart on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    context.setEnableFilterTab(false);

    const user = JSON.parse(localStorage.getItem("user"));
    fetchDataFromApi(`/api/cart?userId=${user?.userId}`).then((res) => {
      setCartData(res || []);
    });
  }, [context]);

  // ✅ Recalculate total whenever cartData changes
  useEffect(() => {
    if (cartData.length !== 0) {
      const total = cartData
        .map((item) => parseInt(item.price) * item.quantity)
        .reduce((total, value) => total + value, 0);

      setTotalAmount(total);
    } else {
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

  // ---------------- Razorpay Checkout ----------------
  const checkout = async (e) => {
    e.preventDefault();

    // Validation
    for (const [key, value] of Object.entries(formFields)) {
      if (!value && key !== "streetAddressLine2") {
        context.setAlertBox({
          open: true,
          error: true,
          msg: `Please fill ${key}`,
        });
        return;
      }
    }

    const addressInfo = {
      name: formFields.fullName,
      phoneNumber: formFields.phoneNumber,
      address: formFields.streetAddressLine1 + " " + formFields.streetAddressLine2,
      pincode: formFields.zipCode,
      date: new Date().toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    };

    // Step 1: Ask backend to create Razorpay order
    const orderData = await postData("/api/orders/create-razorpay-order", {
      amount: totalAmount,
      currency: "INR",
    });

    if (!orderData || !orderData.id) {
      alert("Failed to create Razorpay order. Please try again.");
      return;
    }

    // Step 2: Razorpay Checkout options
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
      handler: async function (response) {
        // Step 3: Verify signature
        const verifyRes = await postData("/api/orders/verify-payment", response);

        if (verifyRes.success) {
          // Step 4: Save order in DB
          const user = JSON.parse(localStorage.getItem("user"));
          const payLoad = {
            name: addressInfo.name,
            phoneNumber: formFields.phoneNumber,
            address: addressInfo.address,
            pincode: addressInfo.pincode,
            amount: parseInt(totalAmount),
            paymentId: response.razorpay_payment_id,
            paymentType: "Online",
            email: user.email,
            userid: user.userId,
            products: cartData,
            date: addressInfo.date,
          };

          await postData("/api/orders/create", payLoad);

          // Clear cart
          fetchDataFromApi(`/api/cart?userId=${user?.userId}`).then((res) => {
            res?.length !== 0 &&
              res?.map((item) => {
                deleteData(`/api/cart/${item?.id}`);
              });
            setTimeout(() => {
              context.getCartData();
            }, 1000);
            navigate("/orders");
          });
        } else {
          alert("Payment verification failed ❌");
        }
      },
      theme: { color: "#3399cc" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // ---------------- Cash On Delivery ----------------
  const cashOnDelivery = async (e) => {
    e.preventDefault();

    // Validation
    for (const [key, value] of Object.entries(formFields)) {
      if (!value && key !== "streetAddressLine2") {
        context.setAlertBox({
          open: true,
          error: true,
          msg: `Please fill ${key}`,
        });
        return;
      }
    }

    const addressInfo = {
      name: formFields.fullName,
      phoneNumber: formFields.phoneNumber,
      address: formFields.streetAddressLine1 + " " + formFields.streetAddressLine2,
      pincode: formFields.zipCode,
      date: new Date().toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    };

    const user = JSON.parse(localStorage.getItem("user"));
    const payLoad = {
      name: addressInfo.name,
      phoneNumber: formFields.phoneNumber,
      address: addressInfo.address,
      pincode: addressInfo.pincode,
      amount: parseInt(totalAmount),
      paymentId: "None",
      paymentType: "COD",
      email: user.email,
      userid: user.userId,
      products: cartData,
      date: addressInfo.date,
    };

    await postData("/api/orders/create", payLoad);

    // Clear cart
    fetchDataFromApi(`/api/cart?userId=${user?.userId}`).then((res) => {
      res?.length !== 0 &&
        res?.map((item) => {
          deleteData(`/api/cart/${item?.id}`);
        });
      setTimeout(() => {
        context.getCartData();
      }, 1000);
      navigate("/orders");
    });
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
                              {item?.productTitle?.substr(0, 20) + "..."}{" "}
                              <b>× {item?.quantity}</b>
                            </td>
                            <td>
                              {(parseInt(item.price) * item.quantity)?.toLocaleString("en-US", {
                                style: "currency",
                                currency: "INR",
                              })}
                            </td>
                          </tr>
                        ))}

                      <tr>
                        <td><b>Total</b></td>
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
                  className="btn-blue bg-red btn-lg btn-big"
                >
                  <IoBagCheckOutline /> &nbsp; Pay Online
                </Button>
                <Button
                  onClick={cashOnDelivery}
                  className="btn-blue bg-red btn-lg btn-big mt-3"
                >
                  <IoBagCheckOutline /> &nbsp; Cash On Delivery
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
