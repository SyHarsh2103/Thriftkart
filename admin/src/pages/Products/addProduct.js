import Breadcrumbs from "@mui/material/Breadcrumbs";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { emphasize, styled } from "@mui/material/styles";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useContext, useEffect, useState } from "react";
import Rating from "@mui/material/Rating";
import { FaCloudUploadAlt, FaRegImages } from "react-icons/fa";
import Button from "@mui/material/Button";
import {
  deleteData,
  deleteImages,
  fetchDataFromApi,
  postData,
  uploadImage,
} from "../../utils/api";
import { MyContext } from "../../App";
import CircularProgress from "@mui/material/CircularProgress";
import { IoCloseSharp } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import Select2 from "react-select";

//breadcrumb code
const StyledBreadcrumb = styled(Chip)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800],
  height: theme.spacing(3),
  color: theme.palette.text.primary,
  fontWeight: theme.typography.fontWeightRegular,
}));

// custom CSS to unify input sizes
const inputStyle = {
  width: "100%",
  height: "40px",
  padding: "6px 10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  fontSize: "14px",
  boxSizing: "border-box",
};

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

const ProductUpload = () => {
  const [categoryVal, setcategoryVal] = useState("");
  const [subCatVal, setSubCatVal] = useState("");
  const [ratingsValue, setRatingValue] = useState(1);
  const [isFeaturedValue, setisFeaturedValue] = useState("");
  const [catData, setCatData] = useState([]);
  const [subCatData, setSubCatData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // image upload
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]); // uploaded filenames

  const [selectedLocation, setSelectedLocation] = useState([]);
  const [countryList, setCountryList] = useState([]);

  // Product attributes
  const [productRAMSData, setProductRAMSData] = useState([]);
  const [productWEIGHTData, setProductWEIGHTData] = useState([]);
  const [productSIZEData, setProductSIZEData] = useState([]);

  const [productRams, setProductRams] = useState([]);
  const [productWeight, setProductWeight] = useState([]);
  const [productSize, setProductSize] = useState([]);

  const history = useNavigate();
  const context = useContext(MyContext);

  // full formFields
  const [formFields, setFormFields] = useState({
    name: "",
    subCat: "",
    subCatName: "",
    description: "",
    brand: "",
    price: null,
    oldPrice: null,
    subCatId: "",
    catName: "",
    catId: "",
    category: "",
    countInStock: null,
    rating: 0,
    isFeatured: null,
    discount: null,
    productRam: [],
    size: [],
    productWeight: [],
    location: [],
  });

  useEffect(() => {
    // 🔹 Normalize category data from context
    const rawCat = context.catData;
    let catList = [];

    if (Array.isArray(rawCat?.categoryList)) {
      // case: { categoryList: [...] }
      catList = rawCat.categoryList;
    } else if (Array.isArray(rawCat)) {
      // case: [...] directly
      catList = rawCat;
    }

    setCatData(catList);

    // ✅ clean up temp uploads safely
    fetchDataFromApi("/api/imageUpload")
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        const allImages = [];

        list.forEach((item) => {
          (item?.images || []).forEach((img) => allImages.push(img));
        });

        if (allImages.length === 0) return;

        // delete all images, then clear temp collection once
        Promise.all(
          allImages.map((img) =>
            deleteImages(`/api/products/deleteImage?img=${img}`)
          )
        )
          .then(() => {
            return deleteData("/api/imageUpload/deleteAllImages");
          })
          .catch((err) => {
            console.error("Error cleaning up temp images", err);
          });
      })
      .catch((err) => {
        // if unauthorized, api.js will already redirect, so just log
        console.error("imageUpload cleanup error:", err);
      });

    // ✅ sub categories (handle both {subCategoryList: []} and [] directly)
    fetchDataFromApi("/api/subCat")
      .then((res) => {
        const list = Array.isArray(res?.subCategoryList)
          ? res.subCategoryList
          : Array.isArray(res)
          ? res
          : [];
        setSubCatData(list);
      })
      .catch((err) => {
        console.error("subCat fetch error:", err);
        setSubCatData([]);
      });

    // ✅ Product attributes
    fetchDataFromApi("/api/productWeight")
      .then((res) => setProductWEIGHTData(Array.isArray(res) ? res : []))
      .catch((err) => {
        console.error("productWeight fetch error:", err);
        setProductWEIGHTData([]);
      });

    fetchDataFromApi("/api/productRAMS")
      .then((res) => setProductRAMSData(Array.isArray(res) ? res : []))
      .catch((err) => {
        console.error("productRAMS fetch error:", err);
        setProductRAMSData([]);
      });

    fetchDataFromApi("/api/productSIZE")
      .then((res) => setProductSIZEData(Array.isArray(res) ? res : []))
      .catch((err) => {
        console.error("productSIZE fetch error:", err);
        setProductSIZEData([]);
      });

    // Location options
    const newData = { value: "All", label: "All" };
    const updatedArray = [...(context?.countryList || [])];
    updatedArray.unshift(newData);
    setCountryList(updatedArray);
  }, [context.catData, context?.countryList]);

  const inputChange = (e) => {
    setFormFields((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleChangeCategory = (event) => {
    const categoryId = event.target.value;
    setcategoryVal(categoryId);
    setFormFields((prev) => ({
      ...prev,
      category: categoryId,
      catId: categoryId,
    }));
  };

  const handleChangeSubCategory = (event) => {
    setSubCatVal(event.target.value);
  };

  const selectCat = (cat, id) => {
    setFormFields((prev) => ({
      ...prev,
      catName: cat,
      catId: id,
    }));
  };

  const selectSubCat = (subCat, id) => {
    setFormFields((prev) => ({
      ...prev,
      subCat,
      subCatName: subCat,
      subCatId: id,
    }));
  };

  // Product attributes multi-select
  const handleChangeProductRams = (event) => {
    const { value } = event.target;
    const arr = typeof value === "string" ? value.split(",") : value;
    setProductRams(arr);
    setFormFields((prev) => ({ ...prev, productRam: arr }));
  };

  const handleChangeProductWeight = (event) => {
    const { value } = event.target;
    const arr = typeof value === "string" ? value.split(",") : value;
    setProductWeight(arr);
    setFormFields((prev) => ({ ...prev, productWeight: arr }));
  };

  const handleChangeProductSize = (event) => {
    const { value } = event.target;
    const arr = typeof value === "string" ? value.split(",") : value;
    setProductSize(arr);
    setFormFields((prev) => ({ ...prev, size: arr }));
  };

  // ✅ Image upload with size validation
  const onChangeFile = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const validFiles = [];

    for (let f of selected) {
      if (
        !["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(
          f.type
        )
      ) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: "Only JPG/PNG/WEBP allowed.",
        });
        return;
      }

      // Dimension validation
      const isValid = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            if (img.width === 540 && img.height === 720) {
              resolve(true);
            } else {
              resolve(false);
            }
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(f);
      });

      if (!isValid) {
        context.setAlertBox({
          open: true,
          error: true,
          msg: `Image "${f.name}" must be 540px wide × 720px high.`,
        });
        continue; // skip this file
      }

      validFiles.push(f);
    }

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    const formdata = new FormData();
    validFiles.forEach((file) => formdata.append("images", file));

    try {
      setUploading(true);
      const res = await uploadImage("/api/products/upload", formdata); // backend saves locally
      if (Array.isArray(res)) {
        setFiles((prev) => [...prev, ...res]);
        context.setAlertBox({
          open: true,
          error: false,
          msg: "Images Uploaded!",
        });
      }
    } catch (err) {
      console.error("upload error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Image upload failed",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = async (index, filename) => {
    try {
      await deleteImages(`/api/products/deleteImage?img=${filename}`);
      setFiles((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error("delete image error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to delete image",
      });
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();

    // Validation
    if (!formFields.name)
      return context.setAlertBox({
        open: true,
        msg: "Please add product name",
        error: true,
      });
    if (!formFields.description)
      return context.setAlertBox({
        open: true,
        msg: "Please add product description",
        error: true,
      });
    if (!formFields.brand)
      return context.setAlertBox({
        open: true,
        msg: "Please add product brand",
        error: true,
      });
    if (!formFields.price)
      return context.setAlertBox({
        open: true,
        msg: "Please add product price",
        error: true,
      });
    if (!formFields.oldPrice)
      return context.setAlertBox({
        open: true,
        msg: "Please add product old price",
        error: true,
      });
    if (!categoryVal)
      return context.setAlertBox({
        open: true,
        msg: "Please select a category",
        error: true,
      });
    if (!formFields.countInStock)
      return context.setAlertBox({
        open: true,
        msg: "Please add product stock",
        error: true,
      });
    if (ratingsValue === 0)
      return context.setAlertBox({
        open: true,
        msg: "Please select product rating",
        error: true,
      });
    if (isFeaturedValue === null || isFeaturedValue === "")
      return context.setAlertBox({
        open: true,
        msg: "Please select featured status",
        error: true,
      });
    if (!formFields.discount)
      return context.setAlertBox({
        open: true,
        msg: "Please add product discount",
        error: true,
      });
    if (files.length === 0)
      return context.setAlertBox({
        open: true,
        msg: "Please upload at least one image",
        error: true,
      });

    setIsLoading(true);

    try {
      const payload = {
        name: formFields.name,
        description: formFields.description,
        brand: formFields.brand,
        price: formFields.price,
        oldPrice: formFields.oldPrice,
        catId: categoryVal,
        catName: formFields.catName,
        category: categoryVal,
        subCatId: subCatVal,
        subCat: formFields.subCat,
        subCatName: formFields.subCatName,
        countInStock: formFields.countInStock,
        rating: ratingsValue,
        isFeatured: isFeaturedValue,
        discount: formFields.discount,
        productRam: productRams,
        size: productSize,
        productWeight: productWeight,
        location: selectedLocation,
        images: files,
      };

      console.log("📦 Payload:", payload);

      await postData("/api/products/create", payload);

      context.setAlertBox({
        open: true,
        error: false,
        msg: "The product is created!",
      });
      history("/products");
    } catch (err) {
      console.error("❌ Product creation failed:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err?.message || "Failed to create product",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 w-100 flex-row p-4">
        <h5 className="mb-0">Product Upload</h5>
        <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
          <StyledBreadcrumb
            component="a"
            label="Dashboard"
            icon={<HomeIcon fontSize="small" />}
          />
          <StyledBreadcrumb
            component="a"
            label="Products"
            deleteIcon={<ExpandMoreIcon />}
          />
          <StyledBreadcrumb
            label="Product Upload"
            deleteIcon={<ExpandMoreIcon />}
          />
        </Breadcrumbs>
      </div>

      <form className="form" onSubmit={addProduct}>
        <div className="card p-4 mt-0">
          <h5 className="mb-4">Basic Information</h5>

          <div className="form-group">
            <h6>PRODUCT NAME</h6>
            <input
              type="text"
              name="name"
              value={formFields.name}
              onChange={inputChange}
              style={inputStyle}
            />
          </div>

          <div className="form-group">
            <h6>DESCRIPTION</h6>
            <textarea
              name="description"
              value={formFields.description}
              onChange={inputChange}
              style={{ ...inputStyle, minHeight: "80px" }}
            />
          </div>

          {/* Category, subCat, price */}
          <div className="row">
            <div className="col-md-4 form-group">
              <h6>CATEGORY</h6>
              <Select
                value={categoryVal}
                onChange={handleChangeCategory}
                className="w-100"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {catData?.map((cat, index) => (
                  <MenuItem
                    key={index}
                    value={cat._id}
                    onClick={() => selectCat(cat.name, cat._id)}
                  >
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </div>
            <div className="col-md-4 form-group">
              <h6>SUB CATEGORY</h6>
              <Select
                value={subCatVal}
                onChange={handleChangeSubCategory}
                className="w-100"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {subCatData
                  ?.filter((sc) => {
                    // Try multiple possibilities for the category foreign key
                    const catIdOfSub =
                      sc.category?._id ||
                      sc.categoryId ||
                      sc.catId ||
                      sc.cat_id ||
                      sc.category;

                    if (!catIdOfSub || !categoryVal) return false;
                    return String(catIdOfSub) === String(categoryVal);
                  })
                  .map((subCat, index) => (
                    <MenuItem
                      key={index}
                      value={subCat._id}
                      onClick={() =>
                        selectSubCat(subCat.subCat, subCat._id)
                      }
                    >
                      {subCat.subCat}
                    </MenuItem>
                  ))}
              </Select>
            </div>
            <div className="col-md-4 form-group">
              <h6>PRICE</h6>
              <input
                type="number"
                name="price"
                value={formFields.price || ""}
                onChange={inputChange}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Old Price, Stock, Brand */}
          <div className="row">
            <div className="col-md-4 form-group">
              <h6>OLD PRICE</h6>
              <input
                type="number"
                name="oldPrice"
                value={formFields.oldPrice || ""}
                onChange={inputChange}
                style={inputStyle}
              />
            </div>
            <div className="col-md-4 form-group">
              <h6>PRODUCT STOCK</h6>
              <input
                type="number"
                name="countInStock"
                value={formFields.countInStock || ""}
                onChange={inputChange}
                style={inputStyle}
              />
            </div>
            <div className="col-md-4 form-group">
              <h6>BRAND</h6>
              <input
                type="text"
                name="brand"
                value={formFields.brand}
                onChange={inputChange}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Discount, Featured, Rating */}
          <div className="row">
            <div className="col-md-4 form-group">
              <h6>DISCOUNT</h6>
              <input
                type="number"
                name="discount"
                value={formFields.discount || ""}
                onChange={inputChange}
                style={inputStyle}
              />
            </div>
            <div className="col-md-4 form-group">
              <h6>IS FEATURED</h6>
              <Select
                value={isFeaturedValue}
                onChange={(e) => setisFeaturedValue(e.target.value)}
                className="w-100"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value={true}>True</MenuItem>
                <MenuItem value={false}>False</MenuItem>
              </Select>
            </div>
            <div className="col-md-4 form-group">
              <h6>RATINGS</h6>
              <Rating
                value={ratingsValue}
                onChange={(_e, val) => setRatingValue(val)}
              />
            </div>
          </div>

          {/* Product Attributes */}
          <div className="row">
            <div className="col-md-4 form-group">
              <h6>PRODUCT RAMS</h6>
              <Select
                multiple
                value={productRams}
                onChange={handleChangeProductRams}
                MenuProps={MenuProps}
                className="w-100"
              >
                {productRAMSData?.map((item, idx) => (
                  <MenuItem key={idx} value={item.productRam}>
                    {item.productRam}
                  </MenuItem>
                ))}
              </Select>
            </div>
            <div className="col-md-4 form-group">
              <h6>PRODUCT WEIGHT</h6>
              <Select
                multiple
                value={productWeight}
                onChange={handleChangeProductWeight}
                MenuProps={MenuProps}
                className="w-100"
              >
                {productWEIGHTData?.map((item, idx) => (
                  <MenuItem key={idx} value={item.productWeight}>
                    {item.productWeight}
                  </MenuItem>
                ))}
              </Select>
            </div>
            <div className="col-md-4 form-group">
              <h6>PRODUCT SIZE</h6>
              <Select
                multiple
                value={productSize}
                onChange={handleChangeProductSize}
                MenuProps={MenuProps}
                className="w-100"
              >
                {productSIZEData?.map((item, idx) => (
                  <MenuItem key={idx} value={item.size}>
                    {item.size}
                  </MenuItem>
                ))}
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <h6>LOCATION</h6>
            <Select2
              isMulti
              name="location"
              options={countryList}
              className="basic-multi-select"
              classNamePrefix="select"
              onChange={setSelectedLocation}
            />
          </div>
        </div>

        {/* Media Upload */}
        <div className="card p-4 mt-3">
          <h5 className="mb-4">Media And Published</h5>

          <p
            style={{
              fontSize: "13px",
              color: "#777",
              marginBottom: "10px",
            }}
          >
            Image size must be <strong>720px height</strong> ×{" "}
            <strong>540px width</strong>
          </p>

          {uploading ? (
            <div className="progressBar text-center d-flex align-items-center justify-content-center flex-column">
              <CircularProgress />
              <span>Uploading...</span>
            </div>
          ) : (
            <label htmlFor="file-upload">
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={onChangeFile}
                style={{ display: "none" }}
              />
              <Button
                variant="contained"
                component="span"
                startIcon={<FaRegImages />}
                className="btn-blue"
              >
                Choose Files
              </Button>
            </label>
          )}

          {files.length > 0 && (
            <ul className="list-unstyled mt-3">
              {files.map((fn, i) => (
                <li
                  key={i}
                  className="d-flex justify-content-between align-items-center border p-2 mb-2 rounded"
                >
                  <span>{fn}</span>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => removeFile(i, fn)}
                    startIcon={<IoCloseSharp />}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <br />
          <Button
            type="submit"
            disabled={uploading}
            className="btn-blue btn-lg btn-big w-100"
          >
            <FaCloudUploadAlt /> &nbsp;
            {isLoading ? (
              <CircularProgress color="inherit" className="loader" />
            ) : (
              "PUBLISH AND VIEW"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductUpload;
