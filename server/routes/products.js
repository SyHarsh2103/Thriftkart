const { Category } = require("../models/category.js");
const { Product } = require("../models/products.js");
const { MyList } = require("../models/myList");
const { Cart } = require("../models/cart");
const { RecentlyViewd } = require("../models/recentlyViewd.js");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// -------- ENV paths --------
const UPLOAD_DIR =
  process.env.PRODUCT_IMAGE_PATH ||
  path.join(__dirname, "..", "uploads", "products");

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// -------- Multer config --------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only JPG/PNG/WEBP images allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// -------- Helper --------
const toImageUrls = (filenames = []) =>
  filenames.map((name) => `${BASE_URL}/uploads/products/${name}`);

// ---------------- UPLOAD ----------------
router.post("/upload", (req, res) => {
  upload.array("images", 10)(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ success: false, message: "Each file must be ≤ 5 MB" });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    const filenames = (req.files || []).map((f) => f.filename);
    return res.status(200).json(filenames);
  });
});

// ---------------- CREATE PRODUCT ----------------
router.post("/create", async (req, res) => {
  try {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).send("Invalid Category!");
    }

    const product = new Product({
      ...req.body,
      images: req.body.images || [], // store filenames
      location: req.body.location && req.body.location !== "" ? req.body.location : "All",
    });

    const saved = await product.save();
    return res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- GET ALL PRODUCTS ----------------
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const totalPosts = await Product.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);

    let query = {};
    if (req.query.catId) query.catId = req.query.catId;
    if (req.query.subCatId) query.subCatId = req.query.subCatId;

    const products = await Product.find(query)
      .populate("category")
      .skip((page - 1) * perPage)
      .limit(perPage);

    const withUrls = products.map((p) => ({
      ...p.toObject(),
      images: toImageUrls(p.images),
    }));

    res.status(200).json({
      products: withUrls,
      totalPages,
      page,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- CATEGORY FILTERS ----------------
router.get("/catName", async (req, res) => {
  try {
    const products = await Product.find({ catName: req.query.catName }).populate("category");
    res.json({
      products: products.map((p) => ({ ...p.toObject(), images: toImageUrls(p.images) })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/catId", async (req, res) => {
  try {
    const products = await Product.find({ catId: req.query.catId }).populate("category");
    res.json({
      products: products.map((p) => ({ ...p.toObject(), images: toImageUrls(p.images) })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/subCatId", async (req, res) => {
  try {
    const products = await Product.find({ subCatId: req.query.subCatId }).populate("category");
    res.json({
      products: products.map((p) => ({ ...p.toObject(), images: toImageUrls(p.images) })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- FILTER BY PRICE ----------------
router.get("/fiterByPrice", async (req, res) => {
  try {
    const { minPrice, maxPrice, catId, subCatId } = req.query;
    let query = {};
    if (catId) query.catId = catId;
    if (subCatId) query.subCatId = subCatId;

    let products = await Product.find(query).populate("category");

    products = products.filter((p) => {
      if (minPrice && p.price < parseInt(minPrice)) return false;
      if (maxPrice && p.price > parseInt(maxPrice)) return false;
      return true;
    });

    res.json(products.map((p) => ({ ...p.toObject(), images: toImageUrls(p.images) })));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- FILTER BY RATING ----------------
router.get("/rating", async (req, res) => {
  try {
    const { rating, catId, subCatId } = req.query;
    let query = { rating };
    if (catId) query.catId = catId;
    if (subCatId) query.subCatId = subCatId;

    const products = await Product.find(query).populate("category");

    res.json(products.map((p) => ({ ...p.toObject(), images: toImageUrls(p.images) })));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- COUNT ----------------
router.get("/get/count", async (req, res) => {
  try {
    const count = await Product.countDocuments();
    res.json({ productsCount: count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- FEATURED ----------------
router.get("/featured", async (req, res) => {
  try {
    const { location } = req.query;
    let products = await Product.find({ isFeatured: true }).populate("category");

    if (location && location !== "All") {
      products = products.filter((p) =>
        Array.isArray(p.location) ? p.location.some((l) => l.value === location) : p.location === location
      );
    }

    res.json(products.map((p) => ({ ...p.toObject(), images: toImageUrls(p.images) })));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- RECENTLY VIEWED ----------------
router.get("/recentlyViewd", async (req, res) => {
  try {
    const items = await RecentlyViewd.find(req.query).populate("category");
    res.json(items);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/recentlyViewd", async (req, res) => {
  try {
    let findProduct = await RecentlyViewd.find({ prodId: req.body.id });
    if (findProduct.length === 0) {
      let product = new RecentlyViewd({ ...req.body });
      product = await product.save();
      res.status(201).json(product);
    } else {
      res.json(findProduct[0]);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- GET PRODUCT BY ID ----------------
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "The product with given ID not found",
      });
    }

    const productObj = product.toObject();

    // convert filenames → URLs if stored locally
    const imageUrls = Array.isArray(productObj.images)
      ? productObj.images.map((img) =>
          img.startsWith("http")
            ? img // already cloudinary URL
            : `${process.env.BASE_URL || "http://localhost:8000"}/uploads/products/${img}`
        )
      : [];

    res.status(200).json({
      id: productObj._id,
      name: productObj.name,
      description: productObj.description,
      images: imageUrls,
      brand: productObj.brand,
      price: productObj.price,
      oldPrice: productObj.oldPrice,
      catId: productObj.catId,
      catName: productObj.catName,
      subCatId: productObj.subCatId,
      subCat: productObj.subCat,
      subCatName: productObj.subCatName,
      category: productObj.category,
      countInStock: productObj.countInStock,
      rating: productObj.rating,
      isFeatured: productObj.isFeatured,
      discount: productObj.discount,
      productRam: productObj.productRam || [],
      size: productObj.size || [],
      productWeight: productObj.productWeight || [],
      location: productObj.location || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- DELETE IMAGE ----------------
router.delete("/deleteImage", async (req, res) => {
  try {
    const img = req.query.img; // filename
    if (!img) return res.status(400).json({ success: false, message: "img query required" });

    const filePath = path.join(UPLOAD_DIR, img);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: "Image deleted" });
    }
    res.status(404).json({ success: false, message: "Image not found" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- DELETE PRODUCT ----------------
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    // delete local images
    for (const img of product.images) {
      const filePath = path.join(UPLOAD_DIR, img);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Product.findByIdAndDelete(req.params.id);
    await MyList.deleteMany({ productId: req.params.id });
    await Cart.deleteMany({ productId: req.params.id });

    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- UPDATE PRODUCT ----------------
router.put("/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        ...(Array.isArray(req.body.images) ? { images: req.body.images } : {}),
      },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
