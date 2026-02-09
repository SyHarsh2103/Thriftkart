import Button from "@mui/material/Button";
import Rating from "@mui/material/Rating";
import CircularProgress from "@mui/material/CircularProgress";
import { IoIosSearch, IoIosImages } from "react-icons/io";
import { ClickAwayListener } from "@mui/base";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { fetchDataFromApi } from "../../../utils/api";
import { MyContext } from "../../../App";

const SearchBox = (props) => {
  const [searchFields, setSearchFields] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchData, setSearchData] = useState([]);

  const context = useContext(MyContext);
  const history = useNavigate();

  // Normalize API result to a flat array of products
  const normalizeResults = (res) => {
    if (Array.isArray(res?.products)) return res.products;
    if (Array.isArray(res)) return res;
    return [];
  };

  const onChangeValue = async (e) => {
    const value = e.target.value;
    setSearchFields(value);

    if (!value) {
      setSearchData([]);
      return;
    }

    try {
      const res = await fetchDataFromApi(
        `/api/search?q=${encodeURIComponent(value)}`
      );
      const list = normalizeResults(res);
      setSearchData(list);
    } catch (err) {
      console.error("Search error:", err);
      setSearchData([]);
    }
  };

  const searchProducts = async () => {
    if (!searchFields) return;

    try {
      setIsLoading(true);
      setSearchData([]);

      const res = await fetchDataFromApi(
        `/api/search?q=${encodeURIComponent(searchFields)}`
      );
      const list = normalizeResults(res);

      // Store full result in context for /search page
      context.setSearchData?.(list);

      setIsLoading(false);
      props.closeSearch?.();
      history("/search");
    } catch (err) {
      console.error("Full search error:", err);
      setIsLoading(false);
    }
  };

  const handleClickAway = () => {
    setSearchData([]);
  };

  const formatName = (name) => {
    if (!name) return "";
    return name.length > 50 ? `${name.substring(0, 47)}...` : name;
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <div className="headerSearch ml-3 mr-3">
        <input
          type="text"
          placeholder="Search for products..."
          value={searchFields}
          onChange={onChangeValue}
        />

        <Button onClick={searchProducts}>
          {isLoading ? <CircularProgress /> : <IoIosSearch />}
        </Button>

        {searchData?.length > 0 && (
          <div className="searchResults res-hide">
            {searchData.map((item, index) => {
              // 🔹 Same ID logic as ProductItem
              const productId = item?._id || item?.id;

              // 🔹 Same image logic pattern as ProductItem (images[0] first)
              const imageSrc =
                item?.images?.[0] || item?.image || item?.thumbnail || "";

              const name = item?.name || item?.productTitle || "";
              const price = item?.price;
              const rating = Number(item?.rating) || 0;

              return (
                <div
                  className="d-flex align-items-center result"
                  key={productId || index}
                >
                  <div className="img">
                    <Link to={`/products/${productId}`}>
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          className="w-100"
                          alt={name || "Product"}
                        />
                      ) : (
                        // Fallback if no image – keeps the box visible
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "#f3f3f3",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IoIosImages style={{ opacity: 0.35 }} />
                        </div>
                      )}
                    </Link>
                  </div>

                  <div className="info ml-3">
                    <Link to={`/products/${productId}`}>
                      <h4 className="mb-1">{formatName(name)}</h4>
                    </Link>

                    {/* Optional rating display in dropdown */}
                    {rating > 0 && (
                      <div className="d-flex align-items-center mb-1">
                        <Rating
                          name="read-only"
                          value={rating}
                          precision={0.5}
                          size="small"
                          readOnly
                        />
                      </div>
                    )}

                    <span>Rs. {price != null ? price : "-"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ClickAwayListener>
  );
};

export default SearchBox;
