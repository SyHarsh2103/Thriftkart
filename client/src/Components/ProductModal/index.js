import Dialog from "@mui/material/Dialog";
import { MdClose } from "react-icons/md";
import Button from "@mui/material/Button";
import Rating from "@mui/material/Rating";
import { useContext, useEffect, useState } from "react";
import QuantityBox from "../QuantityBox";
import { IoIosHeartEmpty } from "react-icons/io";
import { MdOutlineCompareArrows } from "react-icons/md";
import { MyContext } from "../../App";
import ProductZoom from "../ProductZoom";
import { IoCartSharp } from "react-icons/io5";
import { fetchDataFromApi, postData } from "../../utils/api";
import { FaHeart } from "react-icons/fa";

const ProductModal = (props) => {
  const [productQuantity, setProductQuantity] = useState(1);
  const [activeSize, setActiveSize] = useState(null);
  const [tabError, setTabError] = useState(false);
  const [isAddedToMyList, setSsAddedToMyList] = useState(false);

  const context = useContext(MyContext);

  useEffect(() => {
    // ✅ Only treat RAM + Size as selectable variants
    const ramLen = props?.data?.productRam?.length || 0;
    const sizeLen = props?.data?.size?.length || 0;

    // If there are NO RAM or Size variants, we don't require selecting anything
    if (ramLen === 0 && sizeLen === 0) {
      setActiveSize(1); // mark as "ok" by default
    }

    // Wishlist state
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      if (user?.userId && props?.data?.id) {
        fetchDataFromApi(
          `/api/my-list?productId=${props?.data?.id}&userId=${user.userId}`
        ).then((res) => {
          if (Array.isArray(res) && res.length !== 0) {
            setSsAddedToMyList(true);
          }
        });
      }
    } catch {
      // ignore parsing errors
    }
  }, [props?.data]);

  const quantity = (val) => {
    setProductQuantity(val);
  };

  const isActive = (index) => {
    setActiveSize(index);
    setTabError(false);
  };

  const addtoCart = () => {
    const hasRam = (props?.data?.productRam?.length || 0) > 0;
    const hasSize = (props?.data?.size?.length || 0) > 0;

    // If variants exist (RAM/Size), user must pick one
    if ((hasRam || hasSize) && activeSize === null) {
      setTabError(true);
      return;
    }

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user?.userId) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please Login to continue",
      });
      return;
    }

    const qty = productQuantity && productQuantity > 0 ? productQuantity : 1;

    const cartFields = {
      productTitle: props?.data?.name,
      image: props?.data?.images?.[0],
      rating: props?.data?.rating,
      price: props?.data?.price,
      quantity: qty,
      subTotal: parseInt(props?.data?.price * qty),
      productId: props?.data?.id,
      countInStock: props?.data?.countInStock,
      userId: user?.userId,
    };

    context.addToCart(cartFields);
  };

  const addToMyList = (id) => {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (user !== undefined && user !== null && user !== "") {
      const data = {
        productTitle: props?.data?.name,
        image: props?.data?.images?.[0],
        rating: props?.data?.rating,
        price: props?.data?.price,
        productId: id,
        userId: user?.userId,
      };
      postData(`/api/my-list/add/`, data).then((res) => {
        if (res.status !== false) {
          context.setAlertBox({
            open: true,
            error: false,
            msg: "the product added in my list",
          });
        } else {
          context.setAlertBox({
            open: true,
            error: true,
            msg: res.msg,
          });
        }
      });
    } else {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please Login to continue",
      });
    }
  };

  return (
    <>
      <Dialog
        open={context.isOpenProductModal}
        className="productModal"
        onClose={() => context.setisOpenProductModal(false)}
      >
        <Button
          className="close_"
          onClick={() => context.setisOpenProductModal(false)}
        >
          <MdClose />
        </Button>
        <h4 className="mb-1 font-weight-bold pr-5">{props?.data?.name}</h4>
        <div className="d-flex align-items-center">
          <div className="d-flex align-items-center mr-4">
            <span>Brands:</span>
            <span className="ml-2">
              <b>{props?.data?.brand}</b>{" "}
            </span>
          </div>

          <Rating
            name="read-only"
            value={parseInt(props?.data?.rating)}
            size="small"
            precision={0.5}
            readOnly
          />
        </div>

        <hr />

        <div className="row mt-2 productDetaileModal">
          <div className="col-md-5">
            <ProductZoom
              images={props?.data?.images}
              discount={props?.data?.discount}
            />
          </div>

          <div className="col-md-7">
            <div className="d-flex info align-items-center mb-3">
              <span className="oldPrice lg mr-2">
                Rs: {props?.data?.oldPrice}
              </span>
              <span className="netPrice text-danger lg">
                Rs: {props?.data?.price}
              </span>
            </div>

            <span className="badge bg-success">IN STOCK</span>

            <p className="mt-3">{props?.data?.description}</p>

            {/* RAM – clickable options */}
            {props?.data?.productRam?.length > 0 && (
              <div className="productSize d-flex align-items-center">
                <span>RAM:</span>
                <ul
                  className={`list list-inline mb-0 pl-4 ${
                    tabError === true && "error"
                  }`}
                >
                  {props?.data?.productRam?.map((item, index) => (
                    <li className="list-inline-item" key={`ram-${index}`}>
                      <button
                        type="button"
                        className={`tag ${
                          activeSize === index ? "active" : ""
                        }`}
                        onClick={() => isActive(index)}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SIZE – clickable options */}
            {props?.data?.size?.length > 0 && (
              <div className="productSize d-flex align-items-center">
                <span>Size:</span>
                <ul
                  className={`list list-inline mb-0 pl-4 ${
                    tabError === true && "error"
                  }`}
                >
                  {props?.data?.size?.map((item, index) => (
                    <li className="list-inline-item" key={`size-${index}`}>
                      <button
                        type="button"
                        className={`tag ${
                          activeSize === index ? "active" : ""
                        }`}
                        onClick={() => isActive(index)}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* WEIGHT – label only (non-clickable) */}
            {props?.data?.productWeight?.length > 0 && (
              <div className="productSize d-flex align-items-center">
                <span>Weight:</span>
                <ul className="list list-inline mb-0 pl-4">
                  {props?.data?.productWeight?.map((item, index) => (
                    <li className="list-inline-item" key={`wt-${index}`}>
                      <span className="tag weight-label">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="d-flex align-items-center actions_">
              <QuantityBox quantity={quantity} item={props?.data} />

              <Button
                className="btn-blue bg-red btn-lg btn-big btn-round ml-3"
                onClick={addtoCart}
              >
                <IoCartSharp />
                {context.addingInCart === true ? "adding..." : " Add to cart"}
              </Button>
            </div>

            <div className="d-flex align-items-center mt-5 actions">
              <Button
                className="btn-round btn-sml"
                variant="outlined"
                onClick={() => addToMyList(props?.data?.id)}
              >
                {isAddedToMyList === true ? (
                  <>
                    <FaHeart className="text-danger" />
                    &nbsp; ADDED TO WISHLIST
                  </>
                ) : (
                  <>
                    <IoIosHeartEmpty />
                    &nbsp; ADD TO WISHLIST
                  </>
                )}
              </Button>
              <Button
                className="btn-round btn-sml ml-3"
                variant="outlined"
              >
                <MdOutlineCompareArrows /> &nbsp; COMPARE
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default ProductModal;
