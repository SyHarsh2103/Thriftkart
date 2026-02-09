import Button from "@mui/material/Button";
import { IoIosSearch } from "react-icons/io";
import { fetchDataFromApi } from "../../../utils/api";
import { useContext, useState } from "react";
import { MyContext } from "../../../App";

import { Link, useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import { ClickAwayListener } from "@mui/base";

const SearchBox = (props) => {
  const [searchFields, setSearchFields] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchData, setSearchData] = useState([]);

  const context = useContext(MyContext);
  const history = useNavigate();

  const normalizeResults = (res) => {
    // 🔹 If API returns { products: [...] }
    if (Array.isArray(res?.products)) return res.products;
    // 🔹 If API returns array directly
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
      const normalized = normalizeResults(res);
      setSearchData(normalized);
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
      const normalized = normalizeResults(res);

      context.setSearchData?.(normalized);
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
          onChange={onChangeValue}
        />

        <Button onClick={searchProducts}>
          {isLoading ? <CircularProgress /> : <IoIosSearch />}
        </Button>

        {searchData?.length > 0 && (
          <div className="searchResults res-hide">
            {searchData.map((item, index) => {
              // 🔹 Robust image handling:
              const imageSrc =
                item?.images?.[0] || item?.image || item?.thumbnail || "";

              // 🔹 Robust id for link:
              const productId = item?.id || item?._id;

              return (
                <div
                  className="d-flex align-items-center result"
                  key={productId || index}
                >
                  <div className="img">
                    {imageSrc ? (
                      <Link to={`/product/${productId}`}>
                        <img
                          src={imageSrc}
                          className="w-100"
                          alt={item?.name || "Product"}
                        />
                      </Link>
                    ) : (
                      // optional tiny placeholder if no image
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "#f3f3f3",
                          borderRadius: "10px",
                        }}
                      />
                    )}
                  </div>

                  <div className="info ml-3">
                    <Link to={`/product/${productId}`}>
                      <h4 className="mb-1">
                        {item?.name
                          ? item.name.length > 50
                            ? item.name.substring(0, 47) + "..."
                            : item.name
                          : "Untitled product"}
                      </h4>
                    </Link>
                    <span>Rs. {item?.price ?? "-"}</span>
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
