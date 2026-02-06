import { Link, useNavigate } from "react-router-dom";
import Rating from "@mui/material/Rating";
import QuantityBox from "../../Components/QuantityBox";
import { IoIosClose } from "react-icons/io";
import Button from "@mui/material/Button";

import emprtCart from "../../assets/images/emptyCart.png";
import { MyContext } from "../../App";
import { useContext, useEffect, useState } from "react";
import { deleteData, editData, fetchDataFromApi } from "../../utils/api";
import { IoBagCheckOutline } from "react-icons/io5";
import { FaHome } from "react-icons/fa";

// Small helper to safely read user
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

const Cart = () => {
  const [cartData, setCartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const context = useContext(MyContext);
  const history = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    context.setEnableFilterTab(false);

    const token = localStorage.getItem("token");
    if (!token) {
      history("/signIn");
      return;
    }

    const user = getCurrentUser();
    if (!user?.userId) {
      history("/signIn");
      return;
    }

    fetchDataFromApi(`/api/cart?userId=${user.userId}`).then((res) => {
      setCartData(Array.isArray(res) ? res : []);
    });
  }, [context, history]);

  // Quantity callback (kept for compatibility with QuantityBox)
  const quantity = () => {
    // QuantityBox manages its own internal state – no need to use this.
  };

  const refreshCart = () => {
    const user = getCurrentUser();
    if (!user?.userId) return;
    fetchDataFromApi(`/api/cart?userId=${user.userId}`).then((res) => {
      setCartData(Array.isArray(res) ? res : []);
      setIsLoading(false);
    });
    context.getCartData?.();
  };

  const selectedItem = (item, quantityVal) => {
    if (!quantityVal || quantityVal <= 0) return;

    setIsLoading(true);
    const user = getCurrentUser();
    if (!user?.userId) {
      setIsLoading(false);
      return;
    }

    const payload = {
      productTitle: item?.productTitle,
      image: item?.image,
      rating: item?.rating,
      price: item?.price,
      quantity: quantityVal,
      subTotal: parseInt(item?.price * quantityVal, 10),
      productId: item?.id,
      userId: user.userId,
    };

    editData(`/api/cart/${item?._id}`, payload).then(() => {
      refreshCart();
    });
  };

  const removeItem = (id) => {
    setIsLoading(true);
    deleteData(`/api/cart/${id}`).then(() => {
      context.setAlertBox({
        open: true,
        error: false,
        msg: "Item removed from cart!",
      });
      refreshCart();
    });
  };

  const calculateTotal = () => {
    if (!cartData || cartData.length === 0) return 0;

    return cartData
      .map((item) => parseInt(item.price || 0, 10) * (item.quantity || 0))
      .reduce((total, value) => total + value, 0);
  };

  const totalAmount = calculateTotal();
  const totalItems = cartData?.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

  return (
    <>
      <section className="section cartPage">
        <div className="container">
          <div className="d-flex align-items-center mb-2">
            <div>
              <h2 className="hd mb-1">Your Cart</h2>
              <p className="mb-0 text-muted">
                You have{" "}
                <b className="text-red">{cartData?.length || 0}</b> product
                {cartData?.length === 1 ? "" : "s"} in your cart
              </p>
            </div>

            {cartData?.length > 0 && (
              <div className="ml-auto">
                <Link to="/">
                  <Button className="btn-blue btn-round">
                    <FaHome /> &nbsp; Continue Shopping
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {cartData?.length > 0 ? (
            <div className="row mt-3">
              {/* LEFT: Cart Items */}
              <div className="col-lg-8 col-md-7 mb-4">
                <div className="card border-0 shadow-sm cartItemsCard">
                  <div className="card-body p-3 p-md-4">
                    {cartData.map((item) => {
                      const subtotal =
                        parseInt(item.price || 0, 10) *
                        (item.quantity || 0);

                      return (
                        <div
                          key={item?._id}
                          className="cartItemRow d-flex align-items-center mb-3 pb-3 border-bottom"
                        >
                          {/* Thumbnail */}
                          <Link
                            to={`/product/${item?.productId}`}
                            className="cartItemThumb"
                          >
                            <div className="imgWrapper rounded">
                              <img
                                src={item?.image}
                                className="w-100"
                                alt={item?.productTitle}
                              />
                            </div>
                          </Link>

                          {/* Info */}
                          <div className="cartItemInfo flex-grow-1 px-3">
                            <Link to={`/product/${item?.productId}`}>
                              <h5 className="mb-1">
                                {item?.productTitle
                                  ? item.productTitle.length > 60
                                    ? item.productTitle.substring(0, 57) +
                                      "..."
                                    : item.productTitle
                                  : ""}
                              </h5>
                            </Link>
                            <div className="d-flex align-items-center">
                              <Rating
                                name="read-only"
                                value={item?.rating || 0}
                                readOnly
                                size="small"
                              />
                              {item?.rating ? (
                                <span className="ml-2 text-muted small">
                                  {item.rating.toFixed
                                    ? item.rating.toFixed(1)
                                    : item.rating}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Price / Qty / Subtotal */}
                          <div className="cartItemMeta text-right">
                            <div className="unitPrice mb-1">
                              <span className="text-muted small">
                                Unit Price
                              </span>
                              <div className="font-weight-bold">
                                ₹ {item?.price}
                              </div>
                            </div>

                            <div className="cartItemQty mb-1">
                              <QuantityBox
                                quantity={quantity}
                                item={item}
                                selectedItem={selectedItem}
                                value={item?.quantity}
                              />
                            </div>

                            <div className="subTotal mb-0">
                              <span className="text-muted small">
                                Subtotal
                              </span>
                              <div className="font-weight-bold text-red">
                                ₹ {subtotal}
                              </div>
                            </div>
                          </div>

                          {/* SINGLE Remove button */}
                          <button
                            type="button"
                            className="cartItemRemoveBtn d-flex align-items-center"
                            onClick={() => removeItem(item?._id)}
                            aria-label="Remove item"
                          >
                            <IoIosClose style={{ fontSize: 22 }} />
                            <span
                              style={{
                                fontSize: 12,
                                marginLeft: 2,
                              }}
                            >
                              Remove
                            </span>
                          </button>
                        </div>
                      );
                    })}

                    {/* Small note */}
                    <p className="mb-0 text-muted small">
                      You can update quantities or remove items directly from
                      here. All prices are inclusive of applicable taxes.
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT: Summary */}
              <div className="col-lg-4 col-md-5">
                <div className="card border-0 shadow-sm cartDetailsCard">
                  <div className="card-body p-3 p-md-4">
                    <h4 className="mb-3">Order Summary</h4>

                    <div className="d-flex align-items-center mb-2">
                      <span className="text-muted">Items</span>
                      <span className="ml-auto font-weight-medium">
                        {totalItems} item{totalItems === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="d-flex align-items-center mb-2">
                      <span className="text-muted">Subtotal</span>
                      <span className="ml-auto font-weight-medium">
                        ₹ {totalAmount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="d-flex align-items-center mb-2">
                      <span className="text-muted">Shipping</span>
                      <span className="ml-auto text-success">
                        <b>Free</b>
                      </span>
                    </div>

                    <hr />

                    <div className="d-flex align-items-center mb-3">
                      <span className="font-weight-bold">Total</span>
                      <span className="ml-auto h5 mb-0 text-red">
                        ₹ {totalAmount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <p className="mt-1 text-muted small">
                      All prices are inclusive of GST and applicable taxes.
                    </p>

                    <Link to="/checkout">
                      <Button className="btn-blue bg-red btn-lg btn-big w-100 mt-2">
                        <IoBagCheckOutline /> &nbsp; Proceed to Checkout
                      </Button>
                    </Link>

                    <Button
                      className="btn-round mt-3 w-100"
                      variant="outlined"
                      onClick={() => history("/")}
                    >
                      <FaHome /> &nbsp; Continue Shopping
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Empty state
            <div className="empty d-flex align-items-center justify-content-center flex-column text-center py-5">
              <img src={emprtCart} width="150" alt="empty cart" />
              <h3 className="mt-3 mb-2">Your Cart is currently empty</h3>
              <p className="text-muted mb-3">
                Looks like you haven&apos;t added anything to your cart yet.
              </p>
              <Link to="/">
                <Button className="btn-blue bg-red btn-lg btn-big btn-round">
                  <FaHome /> &nbsp; Start Shopping
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {isLoading && (
        <div className="loadingOverlay d-flex align-items-center justify-content-center">
          <div className="loadingTextBox">Updating your cart...</div>
        </div>
      )}
    </>
  );
};

export default Cart;
