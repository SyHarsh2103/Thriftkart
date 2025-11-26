import React, { useContext } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import "./style.css";
import { MyContext } from "../../App";
import { Link } from "react-router-dom";

const Banners = (props) => {
  const context = useContext(MyContext);

  const banners = Array.isArray(props?.data) ? props.data : [];
  const col = props?.col || 3;

  // Only enable loop if we have enough slides
  const enableLoop = banners.length > col * 2;

  if (!banners.length) return null;

  const renderBannerItem = (item, index) => {
    const key =
      item?._id ||
      item?.id ||
      `${item?.catId || item?.subCatId || "banner"}-${index}`;

    const hasSubCat = !!item?.subCatId;
    const linkTo = hasSubCat
      ? `/products/subCat/${item.subCatId}`
      : `/products/category/${item?.catId}`;

    return (
      <div className="col_" key={key}>
        <Link to={linkTo} className="box">
          <img
            src={item?.images?.[0]}
            className="w-100 transition"
            alt="banner img"
          />
        </Link>
      </div>
    );
  };

  return (
    <div className="bannerAds pt-3 pb-3">
      {context?.windowWidth > 992 ? (
        <Swiper
          slidesPerView={col}
          spaceBetween={0}
          loop={enableLoop}
          navigation={true}
          slidesPerGroup={1}
          modules={[Navigation]}
          className="bannerSection pt-3"
          breakpoints={{
            300: {
              slidesPerView: 1,
              spaceBetween: 10,
            },
            400: {
              slidesPerView: 2,
              spaceBetween: 10,
            },
            600: {
              slidesPerView: 3,
              spaceBetween: 10,
            },
            750: {
              slidesPerView: col,
              spaceBetween: 10,
            },
          }}
        >
          {banners.map((item, index) => {
            const key =
              item?._id ||
              item?.id ||
              `${item?.catId || item?.subCatId || "banner"}-${index}`;

            const hasSubCat = !!item?.subCatId;
            const linkTo = hasSubCat
              ? `/products/subCat/${item.subCatId}`
              : `/products/category/${item?.catId}`;

            return (
              <SwiperSlide key={key}>
                <div className="col_">
                  <Link to={linkTo} className="box">
                    <img
                      src={item?.images?.[0]}
                      className="w-100 transition"
                      alt="banner img"
                    />
                  </Link>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      ) : (
        <div
          className="bannerSection pt-3"
          style={{ gridTemplateColumns: `repeat(${col}, 1fr)` }}
        >
          {banners.map(renderBannerItem)}
        </div>
      )}
    </div>
  );
};

export default Banners;
