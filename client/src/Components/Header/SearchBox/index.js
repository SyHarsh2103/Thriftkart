import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Rating from "@mui/material/Rating";
import { IoIosSearch, IoIosImages } from "react-icons/io";
import { ClickAwayListener } from "@mui/base";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { fetchDataFromApi } from "../../../utils/api";
import { MyContext } from "../../../App";

const DEBUG_SEARCH = true; // <- keep this true while debugging

const normalizeResults = (res) => {
  if (!res) return [];

  // common patterns:
  if (Array.isArray(res.products)) return res.products;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res)) return res;

  return [];
};

const resolveProductId = (item) => {
  return item?._id || item?.id || item?.prodId || item?.productId || "";
};

const resolveProductImage = (item) => {
  // 1) Same pattern as ProductItem: images[0] (string or object)
  if (Array.isArray(item?.images) && item.images.length > 0) {
    const first = item.images[0];
    if (typeof first === "string") return first;
    if (first?.url) return first.url;
    if (first?.secure_url) return first.secure_url;
    if (first?.imageUrl) return first.imageUrl;
  }

  // 2) Other likely fallbacks
  if (item?.imageUrl) return item.imageUrl;
  if (item?.image) return item.image;
  if (item?.thumbnail) return item.thumbnail;
  if (item?.coverImage) return item.coverImage;

  return null;
};

const formatName = (name) => {
  if (!name) return "";
  return name.length > 50 ? `${name.substring(0, 47)}...` : name;
};

const SearchBox = (props) => {
  const [searchFields, setSearchFields] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchData, setSearchData] = useState([]);

  const context = useContext(MyContext);
  const history = useNavigate();

  const handleChange = async (e) => {
    const value = e.target.value;
    setSearchFields(value);

    if (!value.trim()) {
      setSearchData([]);
      return;
    }

    try {
      const res = await fetchDataFromApi(
        `/api/search?q=${encodeURIComponent(value)}`
      );

      if (DEBUG_SEARCH) {
        console.log("🔍 /api/search raw response:", res);
      }

      const list = normalizeResults(res);

      if (DEBUG_SEARCH && list.length > 0) {
        console.log("🔍 First normalized item:", list[0]);
      }

      setSearchData(list);
    } catch (err) {
      console.error("Search error:", err);
      setSearchData([]);
    }
  };

  const searchProducts = async () => {
    if (!searchFields.trim()) return;

    try {
      setIsLoading(true);
      setSearchData([]);

      const res = await fetchDataFromApi(
        `/api/search?q=${encodeURIComponent(searchFields)}`
      );
      const list = normalizeResults(res);

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

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <div className="headerSearch ml-3 mr-3">
        <input
          type="text"
          placeholder="Search for products..."
          value={searchFields}
          onChange={handleChange}
        />
        <Button onClick={searchProducts}>
          {isLoading ? <CircularProgress /> : <IoIosSearch />}
        </Button>

        {searchData?.length > 0 && (
          <div className="searchResults res-hide">
            {searchData.map((item, index) => {
              const productId = resolveProductId(item);
              const imageSrc = resolveProductImage(item);

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
                        // clearly visible fallback so you know when image path is null
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "10px",
                            background: "#f3f3f3",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IoIosImages style={{ fontSize: 26, opacity: 0.4 }} />
                        </div>
                      )}
                    </Link>
                  </div>

                  <div className="info ml-3">
                    <Link to={`/products/${productId}`}>
                      <h4 className="mb-1">{formatName(name)}</h4>
                    </Link>

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
