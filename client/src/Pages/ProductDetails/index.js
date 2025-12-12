import ProductZoom from "../../Components/ProductZoom";
import Rating from "@mui/material/Rating";
import QuantityBox from "../../Components/QuantityBox";
import Button from "@mui/material/Button";
import { BsCartFill } from "react-icons/bs";
import { useContext, useEffect, useState } from "react";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { MdOutlineCompareArrows } from "react-icons/md";
import Tooltip from "@mui/material/Tooltip";
import RelatedProducts from "./RelatedProducts";
import { useParams } from "react-router-dom";
import { fetchDataFromApi, postData } from "../../utils/api";
import CircularProgress from "@mui/material/CircularProgress";
import { MyContext } from "../../App";

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

  const { id } = useParams();
  const context = useContext(MyContext);

  const isActive = (index) => {
    setActiveSize(index);
    setTabError(false);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveSize(null);

    // fetch product
    fetchDataFromApi(`/api/products/${id}`).then((res) => {
      if (!res) return;
      setProductData({ ...res, id: res.id || res._id }); // normalize id

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
        }&location=${localStorage.getItem("location")}`
      ).then((r) => {
        const filteredData =
          r?.products
            ?.map((p) => ({ ...p, id: p.id || p._id })) // normalize
            ?.filter((item) => item.id !== (res.id || res._id)) || [];
        setRelatedProductData(filteredData);
      });
    });

    // reviews
    fetchDataFromApi(`/api/productReviews?productId=${id}`).then((res) => {
      setreviewsData(res);
    });

    // wishlist check
    const user = JSON.parse(localStorage.getItem("user"));
    fetchDataFromApi(
      `/api/my-list?productId=${id}&userId=${user?.userId}`
    ).then((res) => {
      if (res?.length !== 0) {
        setSsAddedToMyList(true);
      }
    });

    context.setEnableFilterTab(false);
  }, [id, context]);

  const [rating, setRating] = useState(1);
  const [reviews, setReviews] = useState({
    productId: "",
    customerName: "",
    customerId: "",
    review: "",
    customerRating: 1,
  });

  const onChangeInput = (e) => {
    setReviews(() => ({
      ...reviews,
      [e.target.name]: e.target.value,
    }));
  };

  const changeRating = (e) => {
    setRating(e.target.value);
    setReviews((prev) => ({ ...prev, customerRating: e.target.value }));
  };

  const addReview = (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));

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
      const user = JSON.parse(localStorage.getItem("user"));
      const data = {
        productTitle: productData?.name,
        image: productData?.images?.[0],
        rating: productData?.rating,
        price: productData?.price,
        quantity: productQuantity,
        subTotal: parseInt(productData?.price * productQuantity, 10),
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
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
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
            if (r?.length !== 0) {
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
            <div className="col-md-4 pl-5 part1">
              <ProductZoom
                images={productData?.images}
                discount={productData?.discount}
              />
            </div>

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
                  <span className="text-light cursor ml-2" onClick={gotoReviews}>
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
                        onChange={changeRating}
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
