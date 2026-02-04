import ProductZoom from "../../Components/ProductZoom";
import Rating from "@mui/material/Rating";
import QuantityBox from "../../Components/QuantityBox";
import Button from "@mui/material/Button";
import { BsCartFill } from "react-icons/bs";
import { useContext, useEffect, useState } from "react";
import { FaRegHeart, FaHeart, FaYoutube } from "react-icons/fa";
import { MdOutlineCompareArrows } from "react-icons/md";
import Tooltip from "@mui/material/Tooltip";
import RelatedProducts from "./RelatedProducts";
import { useParams } from "react-router-dom";
import { fetchDataFromApi, postData } from "../../utils/api";
import CircularProgress from "@mui/material/CircularProgress";
import { MyContext } from "../../App";

/** 🔹 Helper: parse common YouTube URLs into an embed URL */
const getYoutubeEmbedUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();

  try {
    // https://www.youtube.com/watch?v=XXXX
    if (url.includes("youtube.com/watch")) {
      const u = new URL(url);
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }

    // https://youtu.be/XXXX
    if (url.includes("youtu.be/")) {
      const parts = url.split("youtu.be/");
      const idPart = parts[1]?.split(/[?&#]/)[0];
      if (idPart) return `https://www.youtube.com/embed/${idPart}`;
    }

    // already embed
    if (url.includes("youtube.com/embed/")) {
      return url;
    }

    // fallback – last segment as ID
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

const ProductDetails = () => {
  const [activeSize, setActiveSize] = useState(null);
  const [activeTabs, setActiveTabs] = useState(0);
  const [productData, setProductData] = useState(null);
  const [relatedProductData, setRelatedProductData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewsData, setreviewsData] = useState([]);
  const [isAddedToMyList, setSsAddedToMyList] = useState(false);

  let [productQuantity, setProductQuantity] = useState();
  const [tabError, setTabError] = useState(false);

  const [rating, setRating] = useState(1);
  const [reviews, setReviews] = useState({
    productId: "",
    customerName: "",
    customerId: "",
    review: "",
    customerRating: 1,
  });

  const [showVideo, setShowVideo] = useState(false); // 🔹 toggle product video

  const { id } = useParams();
  const context = useContext(MyContext);

  // 🔹 Safer user fetch
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  const isActive = (index) => {
    setActiveSize(index);
    setTabError(false);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveSize(null);
    setShowVideo(false);

    // fetch product
    fetchDataFromApi(`/api/products/${id}`).then((res) => {
      if (!res) return;

      const normalized = { ...res, id: res.id || res._id };
      setProductData(normalized);

      // If no RAM / Weight / Size → auto-allow addToCart
      if (
        (res?.productRam?.length ?? 0) === 0 &&
        (res?.productWeight?.length ?? 0) === 0 &&
        (res?.size?.length ?? 0) === 0
      ) {
        setActiveSize(1);
      }

      // fetch related products
      fetchDataFromApi(
        `/api/products/subCatId?subCatId=${
          res?.subCatId
        }&location=${localStorage.getItem("location") || ""}`
      ).then((r) => {
        const filteredData =
          r?.products
            ?.map((p) => ({ ...p, id: p.id || p._id }))
            ?.filter((item) => item.id !== (res.id || res._id)) || [];
        setRelatedProductData(filteredData);
      });
    });

    // reviews
    fetchDataFromApi(`/api/productReviews?productId=${id}`).then((res) => {
      setreviewsData(res);
    });

    // wishlist check
    const user = getCurrentUser();
    if (user?.userId) {
      fetchDataFromApi(
        `/api/my-list?productId=${id}&userId=${user.userId}`
      ).then((res) => {
        if (Array.isArray(res) && res.length !== 0) {
          setSsAddedToMyList(true);
        } else {
          setSsAddedToMyList(false);
        }
      });
    }

    context.setEnableFilterTab(false);
  }, [id, context]);

  const onChangeInput = (e) => {
    setReviews((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const changeRating = (newValue) => {
    const val = newValue || 0;
    setRating(val);
    setReviews((prev) => ({ ...prev, customerRating: val }));
  };

  const addReview = (e) => {
    e.preventDefault();
    const user = getCurrentUser();

    if (user) {
      const payload = {
        ...reviews,
        customerName: user?.name,
        customerId: user?.userId,
        productId: id,
      };

      if (payload.review !== "") {
        setIsLoading(true);
        postData("/api/productReviews/add", payload).then(() => {
          setIsLoading(false);
          setReviews({ review: "", customerRating: 1 });
          setRating(1);
          fetchDataFromApi(`/api/productReviews?productId=${id}`).then((res) =>
            setreviewsData(res)
          );
        });
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Please add a Review",
        });
      }
    } else {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Please Login first",
      });
    }
  };

  const quantity = (val) => setProductQuantity(val);

  const addtoCart = () => {
    if (!productQuantity || productQuantity <= 0) {
      return context.setAlertBox({
        open: true,
        error: true,
        msg: "Please select a quantity",
      });
    }

    if (activeSize !== null) {
      const user = getCurrentUser();
      if (!user?.userId) {
        return context.setAlertBox({
          open: true,
          error: true,
          msg: "Please Login to continue",
        });
      }

      const data = {
        productTitle: productData?.name,
        image: productData?.images?.[0],
        rating: productData?.rating,
        price: productData?.price,
        quantity: productQuantity,
        subTotal: parseInt(
          (productData?.price || 0) * productQuantity,
          10
        ),
        productId: productData?.id,
        countInStock: productData?.countInStock,
        userId: user?.userId,
      };
      context.addToCart(data);
    } else {
      setTabError(true);
    }
  };

  const gotoReviews = () => {
    window.scrollTo({ top: 550, behavior: "smooth" });
    setActiveTabs(2);
  };

  const addToMyList = (idVal) => {
    const user = getCurrentUser();
    if (user?.userId) {
      const data = {
        productTitle: productData?.name,
        image: productData?.images?.[0],
        rating: productData?.rating,
        price: productData?.price,
        productId: idVal,
        userId: user?.userId,
      };
      postData(`/api/my-list/add/`, data).then((res) => {
        if (res.status !== false) {
          context.setAlertBox({
            open: true,
            error: false,
            msg: "The product was added to your wishlist",
          });
          fetchDataFromApi(
            `/api/my-list?productId=${idVal}&userId=${user?.userId}`
          ).then((r) => {
            if (Array.isArray(r) && r.length !== 0) {
              setSsAddedToMyList(true);
            }
          });
        } else {
          context.setAlertBox({ open: true, error: true, msg: res.msg });
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

  // 🔹 Derive video URL from product fields
  const rawVideoUrl =
    productData?.youtubeUrl ||
    productData?.videoUrl ||
    productData?.youtubeLink ||
    productData?.videoLink ||
    null;

  const youtubeEmbedUrl = getYoutubeEmbedUrl(rawVideoUrl);

  return (
    <section className="productDetails section">
      <div className="container">
        {!productData ? (
          <div
            className="d-flex align-items-center justify-content-center"
            style={{ minHeight: "300px" }}
          >
            <CircularProgress />
          </div>
        ) : (
          <div className="row">
            {/* LEFT: image + video button + video */}
            <div className="col-md-4 pl-5 part1">
              <ProductZoom
                images={productData?.images}
                discount={productData?.discount}
              />

              {/* 🔹 Video Button under image */}
              {youtubeEmbedUrl && (
                <div className="mt-3">
                  <Button
                    variant="outlined"
                    className="btn-round btn-sml"
                    onClick={() => setShowVideo((prev) => !prev)}
                  >
                    <FaYoutube style={{ fontSize: 18, marginRight: 6 }} />
                    {showVideo ? "Hide Video" : "Watch Video"}
                  </Button>
                </div>
              )}

              {/* 🔹 Collapsible Video Area */}
              {youtubeEmbedUrl && showVideo && (
                <div className="mt-3">
                  <div className="embed-responsive embed-responsive-16by9 productVideoWrapper">
                    <iframe
                      className="embed-responsive-item"
                      src={youtubeEmbedUrl}
                      title={productData?.name || "Product video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: product info */}
            <div className="col-md-7 pl-5 pr-5 part2">
              <h2 className="hd text-capitalize">{productData?.name}</h2>

              <ul className="list list-inline d-flex align-items-center">
                <li className="list-inline-item">
                  <span className="text-light mr-2">Brand:</span>
                  <span>{productData?.brand || "N/A"}</span>
                </li>
                <li className="list-inline-item">
                  <Rating
                    name="read-only"
                    value={parseInt(productData?.rating || 0, 10)}
                    precision={0.5}
                    readOnly
                    size="small"
                  />
                  <span
                    className="text-light cursor ml-2"
                    onClick={gotoReviews}
                  >
                    {reviewsData?.length} Review
                    {reviewsData?.length === 1 ? "" : "s"}
                  </span>
                </li>
              </ul>

              <div className="d-flex info mb-3">
                {productData?.oldPrice && (
                  <span className="oldPrice">Rs: {productData?.oldPrice}</span>
                )}
                <span className="netPrice text-danger ml-2">
                  Rs: {productData?.price}
                </span>
              </div>

              {productData?.countInStock >= 1 ? (
                <span className="badge badge-success">IN STOCK</span>
              ) : (
                <span className="badge badge-danger">OUT OF STOCK</span>
              )}

              {/* Options */}
              {productData?.productRam?.length > 0 && (
                <div className="productSize d-flex align-items-center mt-3">
                  <span>RAM:</span>
                  <ul
                    className={`list list-inline mb-0 pl-4 ${
                      tabError && "error"
                    }`}
                  >
                    {productData.productRam.map((item, index) => (
                      <li className="list-inline-item" key={index}>
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

              {productData?.size?.length > 0 && (
                <div className="productSize d-flex align-items-center mt-2">
                  <span>Size:</span>
                  <ul
                    className={`list list-inline mb-0 pl-4 ${
                      tabError && "error"
                    }`}
                  >
                    {productData.size.map((item, index) => (
                      <li className="list-inline-item" key={index}>
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

              {productData?.productWeight?.length > 0 && (
                <div className="productSize d-flex align-items-center mt-2">
                  <span>Weight:</span>
                  <ul
                    className={`list list-inline mb-0 pl-4 ${
                      tabError && "error"
                    }`}
                  >
                    {productData.productWeight.map((item, index) => (
                      <li className="list-inline-item" key={index}>
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

              <div className="d-flex align-items-center mt-3 actions_">
                <QuantityBox
                  quantity={quantity}
                  item={productData}
                  selectedItem={() => {}}
                />
                <div className="d-flex align-items-center btnActions">
                  <Button
                    className="btn-blue btn-lg btn-big btn-round bg-red"
                    onClick={addtoCart}
                  >
                    <BsCartFill /> &nbsp;
                    {context.addingInCart ? "adding..." : "Add to cart"}
                  </Button>
                  <Tooltip
                    title={
                      isAddedToMyList ? "Added to Wishlist" : "Add to Wishlist"
                    }
                  >
                    <Button
                      className="btn-blue btn-lg btn-big btn-circle ml-4"
                      onClick={() => addToMyList(productData?.id)}
                    >
                      {isAddedToMyList ? (
                        <FaHeart className="text-danger" />
                      ) : (
                        <FaRegHeart />
                      )}
                    </Button>
                  </Tooltip>
                  <Tooltip title="Add to Compare">
                    <Button className="btn-blue btn-lg btn-big btn-circle ml-2">
                      <MdOutlineCompareArrows />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        )}

        <br />

        {/* Tabs */}
        <div className="card mt-5 p-5 detailsPageTabs">
          <div className="customTabs">
            <ul className="list list-inline">
              <li className="list-inline-item">
                <Button
                  className={activeTabs === 0 ? "active" : ""}
                  onClick={() => setActiveTabs(0)}
                >
                  Description
                </Button>
              </li>
              <li className="list-inline-item">
                <Button
                  className={activeTabs === 1 ? "active" : ""}
                  onClick={() => setActiveTabs(1)}
                >
                  Additional info
                </Button>
              </li>
              <li className="list-inline-item">
                <Button
                  className={activeTabs === 2 ? "active" : ""}
                  onClick={() => setActiveTabs(2)}
                >
                  Reviews ({reviewsData?.length || 0})
                </Button>
              </li>
            </ul>

            <br />

            {activeTabs === 0 && (
              <div className="tabContent">
                {productData?.description ? (
                  <p>{productData.description}</p>
                ) : (
                  <p>No description available for this product.</p>
                )}
              </div>
            )}

            {activeTabs === 1 && (
              <div className="tabContent">
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <tbody>
                      {productData?.brand && (
                        <tr>
                          <th style={{ width: "30%" }}>Brand</th>
                          <td>{productData.brand}</td>
                        </tr>
                      )}

                      {productData?.productRam?.length > 0 && (
                        <tr>
                          <th>RAM</th>
                          <td>{productData.productRam.join(", ")}</td>
                        </tr>
                      )}

                      {productData?.size?.length > 0 && (
                        <tr>
                          <th>Size</th>
                          <td>{productData.size.join(", ")}</td>
                        </tr>
                      )}

                      {productData?.productWeight?.length > 0 && (
                        <tr>
                          <th>Weight</th>
                          <td>{productData.productWeight.join(", ")}</td>
                        </tr>
                      )}

                      {productData?.countInStock !== undefined && (
                        <tr>
                          <th>Stock</th>
                          <td>{productData.countInStock}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTabs === 2 && (
              <div className="tabContent">
                <div className="row">
                  <div className="col-md-8">
                    <h3>Customer questions & answers</h3>
                    <br />
                    {reviewsData?.length > 0 &&
                      [...reviewsData].reverse().map((item, index) => (
                        <div
                          className="reviewBox mb-4 border-bottom"
                          key={index}
                        >
                          <div className="info">
                            <div className="d-flex align-items-center w-100">
                              <h5>{item?.customerName}</h5>
                              <div className="ml-auto">
                                <Rating
                                  value={item?.customerRating}
                                  readOnly
                                  size="small"
                                />
                              </div>
                            </div>
                            <h6 className="text-light">
                              {item?.dateCreated
                                ? item.dateCreated.split("T")[0]
                                : ""}
                            </h6>
                            <p>{item?.review}</p>
                          </div>
                        </div>
                      ))}

                    <form className="reviewForm" onSubmit={addReview}>
                      <h4>Add a review</h4>
                      <div className="form-group">
                        <textarea
                          className="form-control shadow"
                          placeholder="Write a Review"
                          name="review"
                          value={reviews.review}
                          onChange={onChangeInput}
                        />
                      </div>
                      <Rating
                        name="rating"
                        value={rating}
                        precision={0.5}
                        onChange={(_e, newValue) => changeRating(newValue)}
                      />
                      <br />
                      <Button type="submit" className="btn-blue btn-lg btn-big">
                        {isLoading ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : (
                          "Submit Review"
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <br />
        {relatedProductData?.length > 0 && (
          <RelatedProducts title="RELATED PRODUCTS" data={relatedProductData} />
        )}
      </div>
    </section>
  );
};

export default ProductDetails;
