import HomeBanner from "../../Components/HomeBanner";
import Button from "@mui/material/Button";
import { IoIosArrowRoundForward } from "react-icons/io";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import ProductItem from "../../Components/ProductItem";
import HomeCat from "../../Components/HomeCat";

import { MyContext } from "../../App";
import { fetchDataFromApi } from "../../utils/api";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import CircularProgress from "@mui/material/CircularProgress";

import homeBannerPlaceholder from "../../assets/images/homeBannerPlaceholder.jpg";
import Banners from "../../Components/banners";
import { Link } from "react-router-dom";

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]); // array
  const [productsData, setProductsData] = useState(null); // null until loaded
  const [selectedCat, setselectedCat] = useState();
  const [filterData, setFilterData] = useState([]); // array
  const [homeSlides, setHomeSlides] = useState([]);

  const [value, setValue] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [bannerList, setBannerList] = useState([]);
  const [randomCatProducts, setRandomCatProducts] = useState(null); // { catName, catId, products: [] }
  const [homeSideBanners, setHomeSideBanners] = useState([]);
  const [homeBottomBanners, setHomeBottomBanners] = useState([]);

  const context = useContext(MyContext);
  const filterSlider = useRef(null);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const selectCat = (cat) => {
    setselectedCat(cat);
  };

  // -------- Initial load: banners + products (no location dependency) --------
  useEffect(() => {
    window.scrollTo(0, 0);
    context.setisHeaderFooterShow(true);
    context.setEnableFilterTab(false);
    context.setIsBottomShow(true);

    // Home banner
    fetchDataFromApi("/api/homeBanner").then((res) => {
      if (res && res.success === false) {
        setHomeSlides([]);
        return;
      }
      const list = Array.isArray(res) ? res : res?.data || [];
      setHomeSlides(list);
    });

    // Generic banners
    fetchDataFromApi("/api/banners").then((res) => {
      if (res && res.success === false) {
        setBannerList([]);
        return;
      }
      const list = Array.isArray(res) ? res : res?.data || [];
      setBannerList(list);
    });

    // Side banners
    fetchDataFromApi("/api/homeSideBanners").then((res) => {
      if (res && res.success === false) {
        setHomeSideBanners([]);
        return;
      }
      const list = Array.isArray(res) ? res : res?.data || [];
      setHomeSideBanners(list);
    });

    // Bottom banners
    fetchDataFromApi("/api/homeBottomBanners").then((res) => {
      if (res && res.success === false) {
        setHomeBottomBanners([]);
        return;
      }
      const list = Array.isArray(res) ? res : res?.data || [];
      setHomeBottomBanners(list);
    });

    // New Products (no location)
    setIsLoading(true);
    fetchDataFromApi(`/api/products?page=1&perPage=16`)
      .then((res) => {
        if (res && res.success === false) {
          setProductsData({ products: [] });
          return;
        }
        // backend was earlier returning { products: [...] }
        const products = Array.isArray(res?.products)
          ? res.products
          : Array.isArray(res)
          ? res
          : [];
        setProductsData({ products });
      })
      .finally(() => setIsLoading(false));

    // Featured products (no location)
    fetchDataFromApi(`/api/products/featured`).then((res) => {
      if (res && res.success === false) {
        setFeaturedProducts([]);
        return;
      }
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.products)
        ? res.products
        : [];
      setFeaturedProducts(list);
    });
  }, [context]);

  // -------- Set default category + random category products --------
  useEffect(() => {
    const cats = Array.isArray(context.categoryData)
      ? context.categoryData
      : [];

    if (cats[0]) {
      setselectedCat(cats[0].name);
    }

    if (cats.length > 0) {
      const randomIndex = Math.floor(Math.random() * cats.length);
      const randomCat = cats[randomIndex];

      if (randomCat?._id) {
        fetchDataFromApi(`/api/products/catId?catId=${randomCat._id}`).then(
          (res) => {
            if (res && res.success === false) {
              setRandomCatProducts({
                catName: randomCat.name,
                catId: randomCat._id,
                products: [],
              });
              return;
            }

            const products = Array.isArray(res?.products)
              ? res.products
              : Array.isArray(res)
              ? res
              : [];
            setRandomCatProducts({
              catName: randomCat.name,
              catId: randomCat._id,
              products,
            });
          }
        );
      }
    }
  }, [context.categoryData]);

  // -------- Filtered products (Popular Products tabs) – no location --------
  useEffect(() => {
    if (!selectedCat) return;

    setIsLoading(true);
    fetchDataFromApi(`/api/products/catName?catName=${selectedCat}`)
      .then((res) => {
        if (res && res.success === false) {
          setFilterData([]);
          return;
        }

        const list = Array.isArray(res?.products)
          ? res.products
          : Array.isArray(res)
          ? res
          : [];
        setFilterData(list);

        // Safely reset swiper to first slide
        if (filterSlider.current && filterSlider.current.swiper) {
          try {
            filterSlider.current.swiper.slideTo(0);
          } catch (e) {
            console.warn("Swiper slideTo error:", e);
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, [selectedCat]);

  const safeHomeSlides = Array.isArray(homeSlides) ? homeSlides : [];
  const safeSideBanners = Array.isArray(homeSideBanners)
    ? homeSideBanners
    : [];
  const safeBottomBanners = Array.isArray(homeBottomBanners)
    ? homeBottomBanners
    : [];
  const safeBannerList = Array.isArray(bannerList) ? bannerList : [];
  const safeFeatured = Array.isArray(featuredProducts) ? featuredProducts : [];
  const safeFilterData = Array.isArray(filterData) ? filterData : [];
  const safeRandomProducts = Array.isArray(randomCatProducts?.products)
    ? randomCatProducts.products
    : [];
  const safeNewProducts = Array.isArray(productsData?.products)
    ? productsData.products
    : [];

  return (
    <>
      {safeHomeSlides.length !== 0 ? (
        <HomeBanner data={safeHomeSlides} />
      ) : (
        <div className="container mt-3">
          <div className="homeBannerSection">
            <img src={homeBannerPlaceholder} className="w-100" alt="banner" />
          </div>
        </div>
      )}

      {Array.isArray(context.categoryData) &&
        context.categoryData.length > 0 && (
          <HomeCat catData={context.categoryData} />
        )}

      <section className="homeProducts pb-0">
        <div className="container">
          <div className="row homeProductsRow">
            {/* ---- Side Banners ---- */}
            <div className="col-md-3">
              <div className="sticky">
                {safeSideBanners.map((item, index) => (
                  <div className="banner mb-3" key={index}>
                    {item?.subCatId ? (
                      <Link
                        to={`/products/subCat/${item?.subCatId}`}
                        className="box"
                      >
                        <img
                          src={item?.images?.[0]}
                          className="w-100 transition"
                          alt="banner img"
                        />
                      </Link>
                    ) : (
                      <Link
                        to={`/products/category/${item?.catId}`}
                        className="box"
                      >
                        <img
                          src={item?.images?.[0]}
                          className="cursor w-100 transition"
                          alt="banner img"
                        />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ---- Products ---- */}
            <div className="col-md-9 productRow">
              {/* Popular Products */}
              <div className="d-flex align-items-center res-flex-column">
                <div className="info" style={{ width: "35%" }}>
                  <h3 className="mb-0 hd">Popular Products</h3>
                  <p className="text-light text-sml mb-0">
                    Do not miss the current offers until the end of March.
                  </p>
                </div>

                <div
                  className="ml-auto d-flex align-items-center justify-content-end res-full"
                  style={{ width: "65%" }}
                >
                  <Tabs
                    value={value}
                    onChange={handleChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    className="filterTabs"
                  >
                    {Array.isArray(context.categoryData) &&
                      context.categoryData.map((item, index) => (
                        <Tab
                          key={index}
                          className="item"
                          label={item.name}
                          onClick={() => selectCat(item.name)}
                        />
                      ))}
                  </Tabs>
                </div>
              </div>

              {/* Filtered Products */}
              <div
                className="product_row w-100 mt-2"
                style={{ opacity: isLoading ? "0.5" : "1" }}
              >
                {context.windowWidth > 992 ? (
                  <Swiper
                    ref={filterSlider}
                    slidesPerView={4}
                    spaceBetween={0}
                    navigation={true}
                    slidesPerGroup={3}
                    modules={[Navigation]}
                    className="mySwiper"
                  >
                    {safeFilterData.map((item, index) => (
                      <SwiperSlide key={index}>
                        <ProductItem item={item} />
                      </SwiperSlide>
                    ))}
                    <SwiperSlide style={{ opacity: 0 }}>
                      <div className="productItem"></div>
                    </SwiperSlide>
                  </Swiper>
                ) : (
                  <div className="productScroller">
                    {safeFilterData.map((item, index) => (
                      <ProductItem item={item} key={index} />
                    ))}
                  </div>
                )}
              </div>

              {/* New Products */}
              <div className="d-flex align-items-center mt-2">
                <div className="info w-75">
                  <h3 className="mb-0 hd">NEW PRODUCTS</h3>
                  <p className="text-light text-sml mb-0">
                    New products with updated stocks.
                  </p>
                </div>
              </div>

              {!productsData ? (
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{ minHeight: "300px" }}
                >
                  <CircularProgress />
                </div>
              ) : (
                <div className="product_row productRow2 w-100 mt-4 d-flex productScroller ml-0 mr-0">
                  {safeNewProducts.map((item, index) => (
                    <ProductItem key={index} item={item} />
                  ))}
                </div>
              )}

              {safeBannerList.length > 0 && (
                <Banners data={safeBannerList} col={3} />
              )}
            </div>
          </div>

          {/* Featured Products */}
          <div className="d-flex align-items-center mt-4">
            <div className="info">
              <h3 className="mb-0 hd">featured products</h3>
              <p className="text-light text-sml mb-0">
                Do not miss the current offers until the end of March.
              </p>
            </div>
          </div>

          {safeFeatured.length > 0 && (
            <div className="product_row w-100 mt-2">
              {context.windowWidth > 992 ? (
                <Swiper
                  slidesPerView={4}
                  spaceBetween={0}
                  navigation={true}
                  slidesPerGroup={3}
                  modules={[Navigation]}
                  className="mySwiper"
                >
                  {safeFeatured.map((item, index) => (
                    <SwiperSlide key={index}>
                      <ProductItem item={item} />
                    </SwiperSlide>
                  ))}
                  <SwiperSlide style={{ opacity: 0 }}>
                    <div className="productItem"></div>
                  </SwiperSlide>
                </Swiper>
              ) : (
                <div className="productScroller">
                  {safeFeatured.map((item, index) => (
                    <ProductItem item={item} key={index} />
                  ))}
                </div>
              )}
            </div>
          )}

          {safeBottomBanners.length > 0 && (
            <Banners data={safeBottomBanners} col={3} />
          )}
        </div>
      </section>

      {/* Random Category Products */}
      <div className="container">
        {safeRandomProducts.length > 0 && (
          <>
            <div className="d-flex align-items-center mt-1 pr-3">
              <div className="info">
                <h3 className="mb-0 hd">{randomCatProducts?.catName}</h3>
                <p className="text-light text-sml mb-0">
                  Do not miss the current offers until the end of March.
                </p>
              </div>

              <Link
                to={`/products/category/${randomCatProducts?.catId}`}
                className="ml-auto"
              >
                <Button className="viewAllBtn">
                  View All <IoIosArrowRoundForward />
                </Button>
              </Link>
            </div>

            <div className="product_row w-100 mt-2">
              {context.windowWidth > 992 ? (
                <Swiper
                  slidesPerView={5}
                  spaceBetween={0}
                  navigation={true}
                  slidesPerGroup={3}
                  modules={[Navigation]}
                  className="mySwiper"
                >
                  {safeRandomProducts.map((item, index) => (
                    <SwiperSlide key={index}>
                      <ProductItem item={item} />
                    </SwiperSlide>
                  ))}
                  <SwiperSlide style={{ opacity: 0 }}>
                    <div className="productItem"></div>
                  </SwiperSlide>
                </Swiper>
              ) : (
                <div className="productScroller">
                  {safeRandomProducts.map((item, index) => (
                    <ProductItem item={item} key={index} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Home;
