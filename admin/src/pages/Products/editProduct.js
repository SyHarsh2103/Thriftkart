// src/Pages/Products/EditUpload.jsx
import Breadcrumbs from "@mui/material/Breadcrumbs";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { emphasize, styled } from "@mui/material/styles";
import Chip from "@mui/material/Chip";

import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useContext, useEffect, useRef, useState } from "react";
import Rating from "@mui/material/Rating";
import { FaCloudUploadAlt } from "react-icons/fa";
import Button from "@mui/material/Button";
import {
  deleteData,
  deleteImages,
  editData,
  fetchDataFromApi,
  uploadImage,
} from "../../utils/api";
import { MyContext } from "../../App";
import CircularProgress from "@mui/material/CircularProgress";
import { FaRegImages } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { IoCloseSharp } from "react-icons/io5";

import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

import Select2 from "react-select";

//breadcrumb code
const StyledBreadcrumb = styled(Chip)(({ theme }) => {
  const backgroundColor =
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800];
  return {
    backgroundColor,
    height: theme.spacing(3),
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeightRegular,
    "&:hover, &:focus": {
      backgroundColor: emphasize(backgroundColor, 0.06),
    },
    "&:active": {
      boxShadow: theme.shadows[1],
      backgroundColor: emphasize(backgroundColor, 0.12),
    },
  };
});

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const EditUpload = () => {
  const [categoryVal, setcategoryVal] = useState("");
  const [subCatVal, setSubCatVal] = useState("");

  const [productRams, setProductRAMS] = useState([]);
  const [productWeight, setProductWeight] = useState([]);
  const [productSize, setProductSize] = useState([]);

  const [productRAMSData, setProductRAMSData] = useState([]);
  const [productWEIGHTData, setProductWEIGHTData] = useState([]);
  const [productSIZEData, setProductSIZEData] = useState([]);

  const [ratingsValue, setRatingValue] = useState(1);
  const [isFeaturedValue, setisFeaturedValue] = useState("");

  const [subCatData, setSubCatData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [previews, setPreviews] = useState([]);      // full URLs for preview
  const [imageFiles, setImageFiles] = useState([]);  // filenames only for backend

  const [selectedLocation, setSelectedLocation] = useState([]);
  const [countryList, setCountryList] = useState([]);

  const { id } = useParams();
  const history = useNavigate();
  const context = useContext(MyContext);

  // We derive base URL for product images from existing ones
  const imageBaseRef = useRef("");

  const [formFields, setFormFields] = useState({
    name: "",
    subCat: "",
    subCatName: "",
    description: "",
    brand: "",
    price: null,
    oldPrice: null,
    catName: "",
    catId: "",
    subCatId: "",
    category: "",
    countInStock: null,
    rating: 0,
    isFeatured: null,
    discount: 0,
    productRam: [],
    size: [],
    productWeight: [],
    location: [],
  });

  const contextCountries = context?.countryList || [];

  // Country list (prepend "All")
  useEffect(() => {
    const newData = {
      value: "All",
      label: "All",
    };
    const updatedArray = [...contextCountries];
    updatedArray.unshift(newData);
    setCountryList(updatedArray);
  }, [contextCountries]);

  // SubCategory list
  useEffect(() => {
    fetchDataFromApi("/api/subCat").then((res) => {
      setSubCatData(res?.subCategoryList || []);
    });
  }, []);

  // Load product + setup initial form + images
  useEffect(() => {
    window.scrollTo(0, 0);
    context.setselectedCountry("");

    // Clean temporary imageUpload (optional – keeping your existing cleanup)
    fetchDataFromApi("/api/imageUpload").then((res) => {
      res?.forEach((item) => {
        item?.images?.forEach((img) => {
          deleteImages(`/api/products/deleteImage?img=${img}`).then(() => {
            deleteData("/api/imageUpload/deleteAllImages");
          });
        });
      });
    });

    fetchDataFromApi(`/api/products/${id}`).then((res) => {
      if (!res) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Product not found",
        });
        return;
      }

      setFormFields({
        name: res.name,
        description: res.description,
        brand: res.brand,
        price: res.price,
        oldPrice: res.oldPrice,
        catName: res.catName,
        category: res.category?._id || res.catId || "",
        catId: res.catId,
        subCat: res.subCat,
        countInStock: res.countInStock,
        rating: res.rating,
        isFeatured: res.isFeatured,
        discount: res.discount,
        productRam: res.productRam || [],
        size: res.size || [],
        productWeight: res.productWeight || [],
        location: res.location || [],
        subCatId: res.subCatId,
        subCatName: res.subCatName,
      });

      setSelectedLocation(res.location || []);
      setRatingValue(res.rating || 0);
      setcategoryVal(res.category?._id || res.catId || "");
      setSubCatVal(res.subCatId || "");
      setisFeaturedValue(res.isFeatured);
      setProductRAMS(res.productRam || []);
      setProductSize(res.size || []);
      setProductWeight(res.productWeight || []);

      // images from backend are full URLs
      const urls = Array.isArray(res.images) ? res.images : [];
      setPreviews(urls);

      // derive filenames from URLs for backend
      const filenames = urls
        .map((u) => {
          if (!u) return null;
          const parts = String(u).split("/");
          return parts[parts.length - 1] || null;
        })
        .filter(Boolean);
      setImageFiles(filenames);

      // derive base URL for building URLs for newly uploaded images
      if (urls.length > 0) {
        const sample = String(urls[0]);
        const idx = sample.indexOf("/uploads/");
        if (idx !== -1) {
          imageBaseRef.current = sample.substring(0, idx);
        }
      }

      context.setProgress(100);
    });

    // RAM / WEIGHT / SIZE data
    fetchDataFromApi("/api/productWeight").then((res) => {
      setProductWEIGHTData(res || []);
    });
    fetchDataFromApi("/api/productRAMS").then((res) => {
      setProductRAMSData(res || []);
    });
    fetchDataFromApi("/api/productSIZE").then((res) => {
      setProductSIZEData(res || []);
    });
  }, [id, context]);

  const handleChangeCategory = (event) => {
    const categoryId = event.target.value;
    setcategoryVal(categoryId);

    // reset sub category when category changes
    setSubCatVal("");

    setFormFields((prev) => ({
      ...prev,
      category: categoryId,
      catId: categoryId,
      subCatId: "",
      subCat: "",
      subCatName: "",
    }));
  };

  const handleChangeSubCategory = (event) => {
    const subCatId = event.target.value;
    setSubCatVal(subCatId);

    const selectedSubCat = subCatData.find((sc) => sc._id === subCatId);

    setFormFields((prev) => ({
      ...prev,
      subCatId: subCatId,
      subCat: selectedSubCat?.subCat || "",
      subCatName: selectedSubCat?.subCat || "",
    }));
  };

  const handleChangeisFeaturedValue = (event) => {
    setisFeaturedValue(event.target.value);
    setFormFields((prev) => ({
      ...prev,
      isFeatured: event.target.value,
    }));
  };

  const handleChangeProductRams = (event) => {
    const {
      target: { value },
    } = event;
    const val = typeof value === "string" ? value.split(",") : value;
    setProductRAMS(val);
    setFormFields((prev) => ({
      ...prev,
      productRam: val,
    }));
  };

  const handleChangeProductWeight = (event) => {
    const {
      target: { value },
    } = event;
    const val = typeof value === "string" ? value.split(",") : value;
    setProductWeight(val);
    setFormFields((prev) => ({
      ...prev,
      productWeight: val,
    }));
  };

  const handleChangeProductSize = (event) => {
    const {
      target: { value },
    } = event;
    const val = typeof value === "string" ? value.split(",") : value;
    setProductSize(val);
    setFormFields((prev) => ({
      ...prev,
      size: val,
    }));
  };

  const inputChange = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const selectCat = (cat, id) => {
    setFormFields((prev) => ({
      ...prev,
      catName: cat,
      catId: id,
    }));
  };

  // -------- NEW IMAGE UPLOAD (products API, no imageUpload dependency) --------
  const onChangeFile = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formdata = new FormData();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (
        !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
          file.type
        )
      ) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Please select a valid JPG / PNG / WEBP image file.",
        });
        e.target.value = "";
        return;
      }

      formdata.append("images", file);
    }

    try {
      setUploading(true);

      // POST /api/products/upload -> returns [filename, ...]
      const res = await uploadImage("/api/products/upload", formdata);

      if (Array.isArray(res) && res.length > 0) {
        // filenames for backend
        setImageFiles((prev) => [...prev, ...res]);

        // build preview URLs
        const base = imageBaseRef.current || "";
        const newUrls = res.map((fn) =>
          base ? `${base}/uploads/products/${fn}` : `/uploads/products/${fn}`
        );

        setPreviews((prev) => [...prev, ...newUrls]);

        context.setAlertBox({
          open: true,
          error: false,
          msg: "Images Uploaded!",
        });
      } else {
        console.error("Unexpected upload response:", res);
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Upload failed",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Upload failed",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // -------- DELETE SINGLE IMAGE (products deleteImage + state) --------
  const removeImg = async (index, imgUrl) => {
    try {
      // If we have filenames array, use that; otherwise derive from URL
      const filenameFromState = imageFiles[index];
      const filename =
        filenameFromState ||
        (imgUrl ? String(imgUrl).split("/").pop() : null);

      if (!filename) {
        // just update state
        setPreviews((prev) => prev.filter((_, i) => i !== index));
        setImageFiles((prev) => prev.filter((_, i) => i !== index));
        return;
      }

      await deleteImages(`/api/products/deleteImage?img=${filename}`);

      setPreviews((prev) => prev.filter((_, i) => i !== index));
      setImageFiles((prev) => prev.filter((_, i) => i !== index));

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Image Deleted!",
      });
    } catch (err) {
      console.error("Delete image error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Image delete failed",
      });
    }
  };

  useEffect(() => {
    setFormFields((prev) => ({
      ...prev,
      location: context.selectedCountry,
    }));
  }, [context.selectedCountry]);

  const handleChangeLocation = (selectedOptions) => {
    setSelectedLocation(selectedOptions);
  };

  // -------- SUBMIT EDITED PRODUCT --------
  const edit_Product = (e) => {
    e.preventDefault();

    const payload = {
      ...formFields,
      location: selectedLocation,
      images: imageFiles, // IMPORTANT: filenames only
    };

    // ---- VALIDATIONS (same as your current code, just using payload) ----
    if (!payload.name) {
      context.setAlertBox({
        open: true,
        msg: "please add product name",
        error: true,
      });
      return;
    }
    if (!payload.description) {
      context.setAlertBox({
        open: true,
        msg: "please add product description",
        error: true,
      });
      return;
    }
    if (!payload.brand) {
      context.setAlertBox({
        open: true,
        msg: "please add product brand",
        error: true,
      });
      return;
    }
    if (payload.price == null) {
      context.setAlertBox({
        open: true,
        msg: "please add product price",
        error: true,
      });
      return;
    }
    if (payload.oldPrice == null) {
      context.setAlertBox({
        open: true,
        msg: "please add product oldPrice",
        error: true,
      });
      return;
    }
    if (!payload.category) {
      context.setAlertBox({
        open: true,
        msg: "please select a category",
        error: true,
      });
      return;
    }
    if (payload.countInStock == null) {
      context.setAlertBox({
        open: true,
        msg: "please add product count in stock",
        error: true,
      });
      return;
    }
    if (!payload.rating) {
      context.setAlertBox({
        open: true,
        msg: "please select product rating",
        error: true,
      });
      return;
    }
    if (payload.isFeatured == null) {
      context.setAlertBox({
        open: true,
        msg: "please select the product is a featured or not",
        error: true,
      });
      return;
    }
    if (payload.discount == null) {
      context.setAlertBox({
        open: true,
        msg: "please select the product discount",
        error: true,
      });
      return;
    }
    if (!Array.isArray(payload.images) || payload.images.length === 0) {
      context.setAlertBox({
        open: true,
        msg: "please select images",
        error: true,
      });
      return;
    }

    setIsLoading(true);

    editData(`/api/products/${id}`, payload)
      .then((res) => {
        context.setAlertBox({
          open: true,
          msg: "The product is updated!",
          error: false,
        });

        setIsLoading(false);
        deleteData("/api/imageUpload/deleteAllImages");
        history("/products");
      })
      .catch((err) => {
        console.error("Update product error:", err);
        setIsLoading(false);
        context.setAlertBox({
          open: true,
          msg: "Update failed",
          error: true,
        });
      });
  };

  return (
    <>
      <div className="right-content w-100">
        <div className="card shadow border-0 w-100 flex-row p-4">
          <h5 className="mb-0">Product Edit</h5>
          <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
            <StyledBreadcrumb
              component="a"
              href="#"
              label="Dashboard"
              icon={<HomeIcon fontSize="small" />}
            />

            <StyledBreadcrumb
              component="a"
              label="Products"
              href="#"
              deleteIcon={<ExpandMoreIcon />}
            />
            <StyledBreadcrumb
              label="Product Edit"
              deleteIcon={<ExpandMoreIcon />}
            />
          </Breadcrumbs>
        </div>

        <form className="form" onSubmit={edit_Product}>
          <div className="row">
            <div className="col-md-12">
              <div className="card p-4 mt-0">
                <h5 className="mb-4">Basic Information</h5>

                <div className="form-group">
                  <h6>PRODUCT NAME</h6>
                  <input
                    type="text"
                    name="name"
                    value={formFields.name}
                    onChange={inputChange}
                  />
                </div>

                <div className="form-group">
                  <h6>DESCRIPTION</h6>
                  <textarea
                    rows={5}
                    cols={10}
                    value={formFields.description}
                    name="description"
                    onChange={inputChange}
                  />
                </div>

                <div className="row">
                  <div className="col">
                    <div className="form-group">
                      <h6>CATEGORY</h6>

                      <Select
                        value={categoryVal}
                        onChange={handleChangeCategory}
                        displayEmpty
                        inputProps={{ "aria-label": "Without label" }}
                        className="w-100"
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {context.catData?.categoryList?.map((cat, index) => (
                          <MenuItem
                            className="text-capitalize"
                            value={cat._id}
                            key={index}
                            onClick={() => selectCat(cat.name, cat._id)}
                          >
                            {cat.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="col">
                    <div className="form-group">
                      <h6>SUB CATEGORY</h6>

                      <Select
                        value={subCatVal}
                        onChange={handleChangeSubCategory}
                        displayEmpty
                        inputProps={{ "aria-label": "Without label" }}
                        className="w-100"
                      >
                        <MenuItem value="">
                          <em value={null}>None</em>
                        </MenuItem>
                        {subCatData
                          ?.filter((sc) => sc.category?._id === categoryVal)
                          .map((subCat, index) => (
                            <MenuItem
                              className="text-capitalize"
                              value={subCat._id}
                              key={index}
                            >
                              {subCat.subCat}
                            </MenuItem>
                          ))}
                      </Select>
                    </div>
                  </div>

                  <div className="col">
                    <div className="form-group">
                      <h6>PRICE</h6>
                      <input
                        type="number"
                        name="price"
                        value={formFields.price}
                        onChange={inputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col">
                    <div className="form-group">
                      <h6>OLD PRICE </h6>
                      <input
                        type="number"
                        name="oldPrice"
                        value={formFields.oldPrice}
                        onChange={inputChange}
                      />
                    </div>
                  </div>

                  <div className="col">
                    <div className="form-group">
                      <h6 className="text-uppercase">is Featured </h6>
                      <Select
                        value={isFeaturedValue}
                        onChange={handleChangeisFeaturedValue}
                        displayEmpty
                        inputProps={{ "aria-label": "Without label" }}
                        className="w-100"
                      >
                        <MenuItem value="">
                          <em value={null}>None</em>
                        </MenuItem>
                        <MenuItem value={true}>True</MenuItem>
                        <MenuItem value={false}>False</MenuItem>
                      </Select>
                    </div>
                  </div>

                  <div className="col">
                    <div className="form-group">
                      <h6>PRODUCT STOCK </h6>
                      <input
                        type="number"
                        name="countInStock"
                        value={formFields.countInStock}
                        onChange={inputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4">
                    <div className="form-group">
                      <h6>BRAND</h6>
                      <input
                        type="text"
                        name="brand"
                        value={formFields.brand}
                        onChange={inputChange}
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <h6>DISCOUNT</h6>
                      <input
                        type="number"
                        name="discount"
                        value={formFields.discount}
                        onChange={inputChange}
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <h6>PRODUCT RAMS</h6>
                      <Select
                        multiple
                        value={productRams}
                        onChange={handleChangeProductRams}
                        displayEmpty
                        className="w-100"
                        MenuProps={MenuProps}
                      >
                        {productRAMSData?.map((item, index) => (
                          <MenuItem value={item.productRam} key={index}>
                            {item.productRam}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4">
                    <div className="form-group">
                      <h6>PRODUCT WEIGHT</h6>
                      <Select
                        multiple
                        value={productWeight}
                        onChange={handleChangeProductWeight}
                        displayEmpty
                        MenuProps={MenuProps}
                        className="w-100"
                      >
                        {productWEIGHTData?.map((item, index) => (
                          <MenuItem value={item.productWeight} key={index}>
                            {item.productWeight}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <h6>PRODUCT SIZE</h6>
                      <Select
                        multiple
                        value={productSize}
                        onChange={handleChangeProductSize}
                        displayEmpty
                        MenuProps={MenuProps}
                        className="w-100"
                      >
                        {productSIZEData?.map((item, index) => (
                          <MenuItem value={item.size} key={index}>
                            {item.size}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <h6>RATINGS</h6>
                      <Rating
                        name="simple-controlled"
                        value={ratingsValue}
                        onChange={(event, newValue) => {
                          setRatingValue(newValue);
                          setFormFields((prev) => ({
                            ...prev,
                            rating: newValue,
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  {selectedLocation?.length !== 0 && (
                    <div className="col-md-12">
                      <div className="form-group">
                        <h6>LOCATION</h6>

                        <Select2
                          defaultValue={selectedLocation}
                          isMulti
                          name="location"
                          options={countryList}
                          className="basic-multi-select"
                          classNamePrefix="select"
                          onChange={handleChangeLocation}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Media & Published */}
          <div className="card p-4 mt-0">
            <div className="imagesUploadSec">
              <h5 className="mb-4">Media And Published</h5>

              <div className="imgUploadBox d-flex align-items-center">
                {previews?.length > 0 &&
                  previews.map((img, index) => (
                    <div className="uploadBox" key={index}>
                      <span
                        className="remove"
                        onClick={() => removeImg(index, img)}
                      >
                        <IoCloseSharp />
                      </span>
                      <div className="box">
                        <LazyLoadImage
                          alt={"image"}
                          effect="blur"
                          className="w-100"
                          src={img}
                        />
                      </div>
                    </div>
                  ))}

                <div className="uploadBox">
                  {uploading ? (
                    <div className="progressBar text-center d-flex align-items-center justify-content-center flex-column">
                      <CircularProgress />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        multiple
                        onChange={onChangeFile}
                        name="images"
                      />
                      <div className="info">
                        <FaRegImages />
                        <h5>image upload</h5>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <br />

              <Button
                type="submit"
                className="btn-blue btn-lg btn-big w-100"
                disabled={isLoading}
              >
                <FaCloudUploadAlt /> &nbsp;
                {isLoading ? (
                  <CircularProgress color="inherit" className="loader" />
                ) : (
                  "PUBLISH AND VIEW"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default EditUpload;
