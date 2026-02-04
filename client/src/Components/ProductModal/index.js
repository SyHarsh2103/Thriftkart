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

/** 🔹 Helper: parse common YouTube URLs into an embed URL */
const getYoutubeEmbedUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();

  try {
    // Handle ?v= style
    if (url.includes("youtube.com/watch")) {
      const u = new URL(url);
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }

    // Handle youtu.be short links
    if (url.includes("youtu.be/")) {
      const parts = url.split("youtu.be/");
      const idPart = parts[1]?.split(/[?&#]/)[0];
      if (idPart) return `https://www.youtube.com/embed/${idPart}`;
    }

    // Already embed style
    if (url.includes("youtube.com/embed/")) {
      return url;
    }

    // Fallback: very simple last segment
    const cleaned = url.replace(/\/+$/, "");
    const lastSegment = cleaned.split("/").pop();
    if (lastSegment && lastSegment.length >= 8) {
      return `https://www.youtube.com/embed/${lastSegment}`;
    }

    return null;
  } catch {
    return null;
  }
};

const ProductModal = (props) => {
  const [productQuantity, setProductQuantity] = useState(1);
  const [cartFields] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeSize, setActiveSize] = useState(null);
  const [tabError, setTabError] = useState(false);
  const [isAddedToMyList, setSsAddedToMyList] = useState(false);

  const context = useContext(MyContext);

  // Safer user getter
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  // Support both id and _id
  const productId = props?.data?.id || props?.data?._id || null;

  // 🔹 Detect possible video link fields from product data
  const rawVideoUrl =
    props?.data?.youtubeUrl ||
    props?.data?.videoUrl ||
    props?.data?.youtubeLink ||
    props?.data?.videoLink ||
    null;

  const youtubeEmbedUrl = getYoutubeEmbedUrl(rawVideoUrl);

  useEffect(() => {
    const ram = props?.data?.productRam || [];
    const weight = props?.data?.productWeight || [];
    const sizeArr = props?.data?.size || [];

    // If product has no RAM / Weight / Size → auto-allow addToCart (no size selection needed)
    if (ram.length === 0 && weight.length === 0 && sizeArr.length === 0) {
      setActiveSize(1);
    } else {
      setActiveSize(null);
    }

    // Check if already in My List
    const user = getCurrentUser();
    if (!user?.userId || !productId) return;

    fetchDataFromApi(
      `/api/my-list?productId=${productId}&userId=${user.userId}`
    )
      .then((res) => {
        if (Array.isArray(res) && res.length !== 0) {
          setSsAddedToMyList(true);
        }
      })
      .catch((err) => {
        console.error("my-list fetch error:", err);
      });
  }, [props?.data]); // re-run when a new product is opened

  const quantity = (val) => {
    setProductQuantity(val);
  };

  const isActive = (index) => {
    setActiveSize(index);
    setTabError(false);
  };

  const addtoCart = () => {
    if (activeSize === null) {
      setTabError(true);
      return;
    }

    if (!productQuantity || productQuantity <= 0) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please select a valid quantity",
      });
      return;
    }

    const user = getCurrentUser();
    if (!user?.userId) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please Login to continue",
      });
      return;
    }

    setIsLoading(true);

    cartFields.productTitle = props?.data?.name;
    cartFields.image = props?.data?.images?.[0];
    cartFields.rating = props?.data?.rating;
    cartFields.price = props?.data?.price;
    cartFields.quantity = productQuantity;
    cartFields.subTotal = parseInt(
      (props?.data?.price || 0) * productQuantity,
      10
    );
    cartFields.productId = productId;
    cartFields.countInStock = props?.data?.countInStock;
    cartFields.userId = user.userId;

    context.addToCart(cartFields);

    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const addToMyList = () => {
    const user = getCurrentUser();
    if (!user?.userId) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please Login to continue",
      });
      return;
    }

    if (!productId) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Invalid product id",
      });
      return;
    }

    const data = {
      productTitle: props?.data?.name,
      image: props?.data?.images?.[0],
      rating: props?.data?.rating,
      price: props?.data?.price,
      productId: productId,
      userId: user.userId,
    };

    postData(`/api/my-list/add/`, data).then((res) => {
      if (res.status !== false) {
        setSsAddedToMyList(true);
        context.setAlertBox({
          open: true,
          error: false,
          msg: "The product added to My List",
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

        <h4 className="mb-1 font-weight-bold pr-5">
          {props?.data?.name}
        </h4>

        <div className="d-flex align-items-center">
          <div className="d-flex align-items-center mr-4">
            <span>Brands:</span>
            <span className="ml-2">
              <b>{props?.data?.brand}</b>
            </span>
          </div>

          <Rating
            name="read-only"
            value={parseInt(props?.data?.rating || 0, 10)}
            size="small"
            precision={0.5}
            readOnly
          />
        </div>

        <hr />

        <div className="row mt-2 productDetaileModal">
          {/* LEFT: Images + Video */}
          <div className="col-md-5">
            <ProductZoom
              images={props?.data?.images}
              discount={props?.data?.discount}
            />

            {/* 🔹 Product YouTube Video (if link provided) */}
            {youtubeEmbedUrl && (
              <div className="mt-3">
                <h6 className="mb-2">Product Video</h6>
                <div className="embed-responsive embed-responsive-16by9 productVideoWrapper">
                  <iframe
                    className="embed-responsive-item"
                    src={youtubeEmbedUrl}
                    title={props?.data?.name || "Product video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Info / actions */}
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

            {/* RAM options */}
            {Array.isArray(props?.data?.productRam) &&
              props.data.productRam.length !== 0 && (
                <div className="productSize d-flex align-items-center">
                  <span>RAM:</span>
                  <ul
                    className={`list list-inline mb-0 pl-4 ${
                      tabError ? "error" : ""
                    }`}
                  >
                    {props.data.productRam.map((item, index) => (
                      <li key={index} className="list-inline-item">
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

            {/* Size options */}
            {Array.isArray(props?.data?.size) &&
              props.data.size.length !== 0 && (
                <div className="productSize d-flex align-items-center">
                  <span>Size:</span>
                  <ul
                    className={`list list-inline mb-0 pl-4 ${
                      tabError ? "error" : ""
                    }`}
                  >
                    {props.data.size.map((item, index) => (
                      <li key={index} className="list-inline-item">
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

            {/* Weight options */}
            {Array.isArray(props?.data?.productWeight) &&
              props.data.productWeight.length !== 0 && (
                <div className="productSize d-flex align-items-center">
                  <span>Weight:</span>
                  <ul
                    className={`list list-inline mb-0 pl-4 ${
                      tabError ? "error" : ""
                    }`}
                  >
                    {props.data.productWeight.map((item, index) => (
                      <li key={index} className="list-inline-item">
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

            <div className="d-flex align-items-center actions_">
              <QuantityBox quantity={quantity} item={props?.data} />

              <Button
                className="btn-blue bg-red btn-lg btn-big btn-round ml-3"
                onClick={addtoCart}
                disabled={isLoading || context.addingInCart}
              >
                <IoCartSharp />
                {isLoading || context.addingInCart
                  ? " Adding..."
                  : " Add to cart"}
              </Button>
            </div>

            <div className="d-flex align-items-center mt-5 actions">
              <Button
                className="btn-round btn-sml"
                variant="outlined"
                onClick={addToMyList}
              >
                {isAddedToMyList ? (
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
