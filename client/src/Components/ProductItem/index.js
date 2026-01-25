import Rating from "@mui/material/Rating";
import { TfiFullscreen } from "react-icons/tfi";
import Button from "@mui/material/Button";
import { IoMdHeartEmpty } from "react-icons/io";
import { useContext, useEffect, useState } from "react";
import { MyContext } from "../../App";
import { Link } from "react-router-dom";

import Skeleton from "@mui/material/Skeleton";
import { IoIosImages } from "react-icons/io";
import { fetchDataFromApi, postData } from "../../utils/api";
import { FaHeart } from "react-icons/fa";

const ProductItem = (props) => {
  const { item, itemView } = props;

  const [isLoading, setIsLoading] = useState(true);
  const [isAddedToMyList, setIsAddedToMyList] = useState(false);

  const context = useContext(MyContext);

  // ✅ Always use plural `/products/:id` and Mongo _id
  const productId =
    itemView === "recentlyView" ? item?.prodId : item?._id;

  const name = item?.name || "";
  const truncatedName =
    name.length > 45 ? name.substring(0, 45) + "..." : name;

  const primaryImage = item?.images?.[0];
  const secondaryImage = item?.images?.[1];

  const viewProductDetails = (id) => {
    context.openProductDetailsModal(id, true);
  };

  const handleMouseEnter = (id) => {
    if (!id) return;

    const userStr = localStorage.getItem("user");
    if (!userStr) return;

    let user;
    try {
      user = JSON.parse(userStr);
    } catch {
      user = null;
    }
    if (!user?.userId) return;

    fetchDataFromApi(`/api/my-list?productId=${id}&userId=${user.userId}`)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setIsAddedToMyList(true);
        }
      })
      .catch(() => {});
  };

  const handleMouseLeave = () => {
    // no-op for now; layout only
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const addToMyList = (id) => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please Login to continue",
      });
      return;
    }

    let user;
    try {
      user = JSON.parse(userStr);
    } catch {
      user = null;
    }
    if (!user?.userId) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please Login to continue",
      });
      return;
    }

    const data = {
      productTitle: item?.name,
      image: item?.images?.[0],
      rating: item?.rating,
      price: item?.price,
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
            setIsAddedToMyList(true);
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

  return (
    <div
      className={`productItem ${itemView}`}
      onMouseEnter={() => handleMouseEnter(productId)}
      onMouseLeave={handleMouseLeave}
    >
      <div className="productCard-inner">
        {/* IMAGE / MEDIA AREA */}
        <div className="product-media">
          {/* Top badges row: discount + wishlist */}
          <div className="product-badges">
            {item?.discount ? (
              <span className="badge badge-primary discount-badge">
                {item.discount}% OFF
              </span>
            ) : null}

            <button
              type="button"
              className={`wishlist-btn ${
                isAddedToMyList ? "active" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToMyList(productId);
              }}
            >
              {isAddedToMyList ? (
                <FaHeart style={{ fontSize: 18 }} />
              ) : (
                <IoMdHeartEmpty style={{ fontSize: 18 }} />
              )}
            </button>
          </div>

          <Link
            to={`/products/${productId}`}
            className="product-media-link"
          >
            {isLoading ? (
              <div className="product-skeleton">
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={260}
                >
                  <IoIosImages />
                </Skeleton>
              </div>
            ) : (
              <>
                {primaryImage && (
                  <img
                    src={primaryImage}
                    alt={name}
                    className="w-100 product-img primary"
                  />
                )}
                {secondaryImage && (
                  <img
                    src={secondaryImage}
                    alt={name}
                    className="w-100 product-img secondary"
                  />
                )}
              </>
            )}
          </Link>

          {/* Quick view overlay */}
          <div className="product-overlay-actions">
            <Button
              size="small"
              className="quick-view-btn"
              onClick={() => viewProductDetails(productId)}
            >
              <TfiFullscreen />
            </Button>
          </div>
        </div>

        {/* INFO AREA */}
        <div className="product-info" title={name}>
          <Link
            to={`/products/${productId}`}
            className="product-title-link"
          >
            <h4 className="product-title">{truncatedName}</h4>
          </Link>

          <div className="product-meta d-flex align-items-center justify-content-between">
            <span
              className={`stock-badge ${
                item?.countInStock >= 1 ? "in-stock" : "out-of-stock"
              }`}
            >
              {item?.countInStock >= 1 ? "In Stock" : "Out of Stock"}
            </span>

            <Rating
              className="product-rating"
              name="read-only"
              value={item?.rating || 0}
              readOnly
              size="small"
              precision={0.5}
            />
          </div>

          <div className="product-price-row d-flex align-items-baseline mt-2">
            <span className="netPrice text-danger">
              ₹{item?.price ?? 0}
            </span>
            {item?.oldPrice ? (
              <span className="oldPrice ml-2">
                ₹{item.oldPrice}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
