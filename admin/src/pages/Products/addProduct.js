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

const ProductUpload = () => {
  const [categoryVal, setcategoryVal] = useState("");
  const [subCatVal, setSubCatVal] = useState("");
  const [ratingsValue, setRatingValue] = useState(1);
  const [isFeaturedValue, setisFeaturedValue] = useState("");
  const [catData, setCatData] = useState([]);
  const [subCatData, setSubCatData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]); // only filenames
  const [selectedLocation, setSelectedLocation] = useState([]);
  const [countryList, setCountryList] = useState([]);

  const history = useNavigate();
  const context = useContext(MyContext);

  const [formFields, setFormFields] = useState({
    name: "",
    description: "",
    brand: "",
    price: "",
    oldPrice: "",
    countInStock: "",
    discount: "",
    catId: "",
    catName: "",
    subCat: "",
    subCatId: "",
    subCatName: "",
    category: "",
    rating: 0,
    isFeatured: null,
    location: [],
    images: [],
  });

  useEffect(() => {
    setCatData(context.catData);

    // clean up temp uploads
    fetchDataFromApi("/api/imageUpload").then((res) => {
      res?.map((item) => {
        item?.images?.map((img) => {
          deleteImages(`/api/products/deleteImage?img=${img}`).then(() => {
            deleteData("/api/imageUpload/deleteAllImages");
          });
        });
      });
    });

    fetchDataFromApi("/api/subCat").then((res) => {
      setSubCatData(res.subCategoryList);
    });

    const newData = { value: "All", label: "All" };
    const updatedArray = [...context?.countryList];
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
      subCat: subCat,
      subCatName: subCat,
      subCatId: id,
    }));
  };

  const onChangeFile = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const formdata = new FormData();
    for (let f of selected) {
      if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(f.type)) {
        context.setAlertBox({ open: true, error: true, msg: "Only JPG/PNG/WEBP allowed." });
        return;
      }
      formdata.append("images", f);
    }

    try {
      setUploading(true);
      const res = await uploadImage("/api/products/upload", formdata);
      if (Array.isArray(res)) {
        setFiles((prev) => [...prev, ...res]);
        context.setAlertBox({ open: true, error: false, msg: "Images Uploaded!" });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = async (index, filename) => {
    await deleteImages(`/api/products/deleteImage?img=${filename}`);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      context.setAlertBox({ open: true, error: true, msg: "Upload at least one image" });
      return;
    }

    setIsLoading(true);
    await postData("/api/products/create", {
      ...formFields,
      images: files,
      catId: categoryVal,
      subCatId: subCatVal,
      rating: ratingsValue,
      isFeatured: isFeaturedValue,
      location: selectedLocation,
    });

    setIsLoading(false);
    history("/products");
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 w-100 flex-row p-4">
        <h5 className="mb-0">Product Upload</h5>
        <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
          <StyledBreadcrumb component="a" label="Dashboard" icon={<HomeIcon fontSize="small" />} />
          <StyledBreadcrumb component="a" label="Products" deleteIcon={<ExpandMoreIcon />} />
          <StyledBreadcrumb label="Product Upload" deleteIcon={<ExpandMoreIcon />} />
        </Breadcrumbs>
      </div>

      <form className="form" onSubmit={addProduct}>
        <div className="card p-4 mt-0">
          <h5 className="mb-4">Basic Information</h5>

          <div className="form-group">
            <h6>PRODUCT NAME</h6>
            <input type="text" name="name" value={formFields.name} onChange={inputChange} style={inputStyle} />
          </div>

          <div className="form-group">
            <h6>DESCRIPTION</h6>
            <textarea name="description" value={formFields.description} onChange={inputChange} style={{ ...inputStyle, minHeight: "80px" }} />
          </div>

          <div className="row">
            <div className="col-md-4 form-group">
              <h6>CATEGORY</h6>
              <Select value={categoryVal} onChange={handleChangeCategory} className="w-100">
                <MenuItem value=""><em>None</em></MenuItem>
                {context.catData?.categoryList?.map((cat, index) => (
                  <MenuItem key={index} value={cat._id} onClick={() => selectCat(cat.name, cat._id)}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </div>
            <div className="col-md-4 form-group">
              <h6>SUB CATEGORY</h6>
              <Select value={subCatVal} onChange={handleChangeSubCategory} className="w-100">
                <MenuItem value=""><em>None</em></MenuItem>
                {subCatData?.filter((sc) => sc.category?._id === categoryVal).map((subCat, index) => (
                  <MenuItem key={index} value={subCat._id} onClick={() => selectSubCat(subCat.subCat, subCat._id)}>
                    {subCat.subCat}
                  </MenuItem>
                ))}
              </Select>
            </div>
            <div className="col-md-4 form-group">
              <h6>PRICE</h6>
              <input type="number" name="price" value={formFields.price} onChange={inputChange} style={inputStyle} />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 form-group">
              <h6>OLD PRICE</h6>
              <input type="number" name="oldPrice" value={formFields.oldPrice} onChange={inputChange} style={inputStyle} />
            </div>
            <div className="col-md-4 form-group">
              <h6>PRODUCT STOCK</h6>
              <input type="number" name="countInStock" value={formFields.countInStock} onChange={inputChange} style={inputStyle} />
            </div>
            <div className="col-md-4 form-group">
              <h6>BRAND</h6>
              <input type="text" name="brand" value={formFields.brand} onChange={inputChange} style={inputStyle} />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 form-group">
              <h6>DISCOUNT</h6>
              <input type="number" name="discount" value={formFields.discount} onChange={inputChange} style={inputStyle} />
            </div>
            <div className="col-md-4 form-group">
              <h6>IS FEATURED</h6>
              <Select value={isFeaturedValue} onChange={(e) => setisFeaturedValue(e.target.value)} className="w-100">
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value={true}>True</MenuItem>
                <MenuItem value={false}>False</MenuItem>
              </Select>
            </div>
            <div className="col-md-4 form-group">
              <h6>RATINGS</h6>
              <Rating
                name="simple-controlled"
                value={ratingsValue}
                onChange={(event, newValue) => setRatingValue(newValue)}
              />
            </div>
          </div>

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

        <div className="card p-4 mt-3">
          <h5 className="mb-4">Media And Published</h5>
          {uploading ? (
            <div className="progressBar text-center d-flex align-items-center justify-content-center flex-column">
              <CircularProgress />
              <span>Uploading...</span>
            </div>
          ) : (
            <label htmlFor="file-upload">
              <input id="file-upload" type="file" multiple onChange={onChangeFile} style={{ display: "none" }} />
              <Button variant="contained" component="span" startIcon={<FaRegImages />} className="btn-blue">
                Choose Files
              </Button>
            </label>
          )}

          {files.length > 0 && (
            <ul className="list-unstyled mt-3">
              {files.map((fn, i) => (
                <li key={i} className="d-flex justify-content-between align-items-center border p-2 mb-2 rounded">
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
          <Button type="submit" disabled={uploading} className="btn-blue btn-lg btn-big w-100">
            <FaCloudUploadAlt /> &nbsp;
            {isLoading ? <CircularProgress color="inherit" className="loader" /> : "PUBLISH AND VIEW"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductUpload;
