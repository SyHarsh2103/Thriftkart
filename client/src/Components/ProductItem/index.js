import Rating from "@mui/material/Rating";
import { TfiFullscreen } from "react-icons/tfi";
import Button from "@mui/material/Button";
import { IoMdHeartEmpty } from "react-icons/io";
import { useContext, useEffect, useRef, useState } from "react";
import { MyContext } from "../../App";
import { Link } from "react-router-dom";

import Skeleton from "@mui/material/Skeleton";
import { IoIosImages } from "react-icons/io";
import { fetchDataFromApi, postData } from "../../utils/api";
import { FaHeart } from "react-icons/fa";

const ProductItem = (props) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddedToMyList, setSsAddedToMyList] = useState(false);

  const context = useContext(MyContext);
  const sliderRef = useRef();

  // Helper to safely parse user and avoid JSON.parse(null) error
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  const viewProductDetails = (id) => {
    context.openProductDetailsModal(id, true);
  };

  const handleMouseEnter = (id) => {
    if (!isLoading) {
      setIsHovered(true);
      setTimeout(() => {
        if (sliderRef.current) {
          sliderRef.current.slickPlay?.();
        }
      }, 20);
    }

    const user = getCurrentUser();
    if (!user?.userId) return; // only check My List if logged in

    fetchDataFromApi(`/api/my-list?productId=${id}&userId=${user.userId}`).then(
      (res) => {
        if (Array.isArray(res) && res.length !== 0) {
          setSsAddedToMyList(true);
        }
      }
    );
  };

  const handleMouseLeave = () => {
    if (!isLoading) {
      setIsHovered(false);
      setTimeout(() => {
        if (sliderRef.current) {
          sliderRef.current.slickPause?.();
        }
      }, 20);
    }
  };

  useEffect(() => {
    // small skeleton delay so cards don’t flash too fast
    const t = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const addToMyList = (id) => {
    const user = getCurrentUser();
    if (!user?.userId) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please Login to continue",
      });
      return;
    }

    const data = {
      productTitle: props?.item?.name,
      image: props.item?.images?.[0],
      rating: props?.item?.rating,
      price: props?.item?.price,
      productId: id,
      userId: user.userId,
    };

    postData(`/api/my-list/add/`, data).then((res) => {
      if (res.status !== false) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: "The product added to My List",
        });

        fetchDataFromApi(
          `/api/my-list?productId=${id}&userId=${user.userId}`
        ).then((res2) => {
          if (Array.isArray(res2) && res2.length !== 0) {
            setSsAddedToMyList(true);
          }
        });
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res.msg,
        });
      }
    });
  };

  // ✅ Always use plural `/products/:id` and Mongo _id
  const productId =
    props?.itemView === "recentlyView" ? props.item?.prodId : props.item?._id;

  // ------- UI helpers for layout -------
  const name = props?.item?.name || "";
  const displayName =
    name.length > 60 ? `${name.substring(0, 60).trim()}…` : name;

  const countInStock = props?.item?.countInStock ?? 0;
  const inStock = countInStock > 0;
  const isLowStock = inStock && countInStock <= 5;

  const parseNumber = (val) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  };

  const price = parseNumber(props?.item?.price);
  const oldPrice = parseNumber(props?.item?.oldPrice);
  const hasOldPrice = oldPrice !== null && price !== null && oldPrice > price;

  const saving =
    hasOldPrice && oldPrice !== null && price !== null
      ? oldPrice - price
      : null;

  const explicitDiscount = parseNumber(props?.item?.discount);
  const computedDiscount =
    hasOldPrice && oldPrice
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : null;

  const discount = explicitDiscount || computedDiscount;

  const ratingValue = parseNumber(props?.item?.rating) || 0;
  const ratingCount =
    props?.item?.numReviews ?? props?.item?.reviewsCount ?? null;

  const formatCurrency = (val) => {
    const num = parseNumber(val);
    if (num === null) return "-";
    return num.toLocaleString("en-IN");
  };

  return (
    <div
      className={`productItem ${props.itemView || ""}`}
      onMouseEnter={() => handleMouseEnter(productId)}
      onMouseLeave={handleMouseLeave}
    >
      <div className="productCard-inner">
        {/* Image / Media */}
        <div className="img_rapper">
          <Link to={`/products/${productId}`}>
            <div className="productItemSliderWrapper">
              {isLoading ? (
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={230}
                  className="product-skeleton"
                >
                  <IoIosImages />
                </Skeleton>
              ) : (
                <>
                  <img
                    src={props.item?.images?.[0]}
                    className="w-100 img1"
                    alt={name}
                  />
                  {props.item?.images?.length > 1 && (
                    <img
                      src={props.item?.images?.[1]}
                      className="w-100 img2"
                      alt={name}
                    />
                  )}
                </>
              )}
            </div>
          </Link>

          {/* Badge top-left */}
          {discount ? (
            <span className="badge badge-primary product-discount-badge">
              {discount}% OFF
            </span>
          ) : inStock ? (
            <span className="badge bg-success product-discount-badge">
              In Stock
            </span>
          ) : null}

          {/* Hover actions top-right */}
          <div className="actions product-card-actions">
            <Button onClick={() => viewProductDetails(productId)}>
              <TfiFullscreen />
            </Button>

            <Button
              className={isAddedToMyList ? "active" : ""}
              onClick={() => addToMyList(productId)}
            >
              {isAddedToMyList ? (
                <FaHeart style={{ fontSize: "20px" }} />
              ) : (
                <IoMdHeartEmpty style={{ fontSize: "20px" }} />
              )}
            </Button>
          </div>
        </div>

        {/* Info / Text block */}
        <div className="info productCard-info" title={name}>
          <Link to={`/products/${productId}`}>
            <h4 className="productTitle clamp-2">{displayName}</h4>
          </Link>

          <div className="productMetaRow">
            {inStock ? (
              <span
                className={`stock-pill ${
                  isLowStock ? "stock-low" : "stock-in"
                }`}
              >
                {isLowStock ? `Only ${countInStock} left` : "In Stock"}
              </span>
            ) : (
              <span className="stock-pill stock-out">Out of Stock</span>
            )}

            {props?.item?.brand && (
              <span className="brandName">{props.item.brand}</span>
            )}
          </div>

          <div className="ratingRow">
            <Rating
              name="read-only"
              value={ratingValue}
              readOnly
              size="small"
              precision={0.5}
            />
            {ratingCount ? (
              <span className="ratingCount">({ratingCount})</span>
            ) : null}
          </div>

          <div className="priceRow">
            <div className="priceMain">
              {price !== null && (
                <span className="netPrice">
                  ₹ {formatCurrency(price)}
                </span>
              )}

              {hasOldPrice && (
                <span className="oldPrice ml-2">
                  ₹ {formatCurrency(oldPrice)}
                </span>
              )}
            </div>

            {discount ? (
              <span className="discountTag">-{discount}%</span>
            ) : null}
          </div>

          {saving !== null && saving > 0 && (
            <div className="saveText">
              You save{" "}
              <strong>₹ {formatCurrency(saving)}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
