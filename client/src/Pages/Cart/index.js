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

    const user = JSON.parse(localStorage.getItem("user"));
    fetchDataFromApi(`/api/cart?userId=${user?.userId}`).then((res) => {
      setCartData(res);
    });
  }, [context, history]);

  // Quantity callback from QuantityBox (no local usage now, but kept for compatibility)
  const quantity = () => {
    // You can keep this empty – QuantityBox manages its own internal state.
  };

  const selectedItem = (item, quantityVal) => {
    if (!quantityVal || quantityVal <= 0) return;

    setIsLoading(true);
    const user = JSON.parse(localStorage.getItem("user"));

    const payload = {
      productTitle: item?.productTitle,
      image: item?.image,
      rating: item?.rating,
      price: item?.price,
      quantity: quantityVal,
      subTotal: parseInt(item?.price * quantityVal, 10),
      productId: item?.id,
      userId: user?.userId,
    };

    editData(`/api/cart/${item?._id}`, payload).then(() => {
      const userRef = JSON.parse(localStorage.getItem("user"));
      fetchDataFromApi(`/api/cart?userId=${userRef?.userId}`).then((res) => {
        setCartData(res);
        setIsLoading(false);
      });

      context.getCartData?.();
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

      const user = JSON.parse(localStorage.getItem("user"));
      fetchDataFromApi(`/api/cart?userId=${user?.userId}`).then((res) => {
        setCartData(res);
        setIsLoading(false);
      });

      context.getCartData?.();
    });
  };

  // 🟢 Calculate total (all prices include taxes)
  const calculateTotal = () => {
    if (!cartData || cartData.length === 0) return 0;

    return cartData
      .map((item) => parseInt(item.price, 10) * item.quantity)
      .reduce((total, value) => total + value, 0);
  };

  return (
    <>
      <section className="section cartPage">
        <div className="container">
          <h2 className="hd mb-1">Your Cart</h2>
          <p>
            There are{" "}
            <b className="text-red">{cartData?.length || 0}</b> products in your
            cart
          </p>

          {cartData?.length !== 0 ? (
            <div className="row">
              <div className="col-md-9 pr-5">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th width="35%">Product</th>
                        <th width="15%">Unit Price</th>
                        <th width="25%">Quantity</th>
                        <th width="15%">Subtotal</th>
                        <th width="10%">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartData?.length !== 0 &&
                        cartData?.map((item) => (
                          <tr key={item?._id}>
                            <td width="35%">
                              <Link to={`/product/${item?.productId}`}>
                                <div className="d-flex align-items-center cartItemimgWrapper">
                                  <div className="imgWrapper">
                                    <img
                                      src={item?.image}
                                      className="w-100"
                                      alt={item?.productTitle}
                                    />
                                  </div>

                                  <div className="info px-3">
                                    <h6>
                                      {item?.productTitle
                                        ? item.productTitle.substr(0, 30) +
                                          "..."
                                        : ""}
                                    </h6>
                                    <Rating
                                      name="read-only"
                                      value={item?.rating}
                                      readOnly
                                      size="small"
                                    />
                                  </div>
                                </div>
                              </Link>
                            </td>
                            <td width="15%">Rs {item?.price}</td>
                            <td width="25%">
                              <QuantityBox
                                quantity={quantity}
                                item={item}
                                selectedItem={selectedItem}
                                value={item?.quantity}
                              />
                            </td>
                            <td width="15%">Rs. {item?.subTotal}</td>
                            <td width="10%">
                              <span
                                className="remove"
                                onClick={() => removeItem(item?._id)}
                              >
                                <IoIosClose />
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card border p-3 cartDetails">
                  <h4>CART TOTALS</h4>

                  <div className="d-flex align-items-center mb-3">
                    <span>Total (including all taxes)</span>
                    <span className="ml-auto text-red font-weight-bold">
                      {calculateTotal().toLocaleString("en-US", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </span>
                  </div>

                  <div className="d-flex align-items-center mb-3">
                    <span>Shipping</span>
                    <span className="ml-auto">
                      <b>Free</b>
                    </span>
                  </div>

                  <p className="mt-2 text-muted small">
                    All prices are inclusive of GST and applicable taxes.
                  </p>

                  <br />
                  <Link to="/checkout">
                    <Button className="btn-blue bg-red btn-lg btn-big">
                      <IoBagCheckOutline /> &nbsp; Checkout
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty d-flex align-items-center justify-content-center flex-column">
              <img src={emprtCart} width="150" alt="empty cart" />
              <h3>Your Cart is currently empty</h3>
              <br />
              <Link to="/">
                <Button className="btn-blue bg-red btn-lg btn-big btn-round">
                  <FaHome /> &nbsp; Continue Shopping
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {isLoading === true && <div className="loadingOverlay"></div>}
    </>
  );
};

export default Cart;
