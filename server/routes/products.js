// routes/products.js
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

const NODE_ENV = process.env.NODE_ENV || "development";

// ===== Auth helpers (req.auth comes from authJwt in index.js) =====
function requireAuth(req, res) {
  if (!req.auth) {
    res.status(401).json({ error: true, msg: "Unauthorized" });
    return false;
  }
  return true;
}

function requireAdmin(req, res) {
  if (!req.auth) {
    res.status(401).json({ error: true, msg: "Unauthorized" });
    return false;
  }
  if (!req.auth.isAdmin) {
    res.status(403).json({ error: true, msg: "Admin only" });
    return false;
  }
  return true;
}

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

// -------- Helpers --------
const toImageUrls = (filenames = []) =>
  filenames.map((name) =>
    String(name).startsWith("http")
      ? name
      : `${BASE_URL}/uploads/products/${name}`
  );

const parseIntOr = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const normalizeLocationFilter = (location) => {
  if (!location || location === "All") return {};
  // Your schema stores either string or [{value,label}] — handle both
  return {
    $or: [
      { location: location }, // string
      { "location.value": location }, // array of objects
    ],
  };
};

const buildBaseQuery = ({ catId, subCatId, location }) => {
  const q = { isActive: { $ne: false } };
  if (catId) q.catId = catId;
  if (subCatId) q.subCatId = subCatId;
  Object.assign(q, normalizeLocationFilter(location));
  return q;
};

const envelope = ({ products, total, page, perPage }) => ({
  products: products.map((p) => ({
    ...p,
    images: toImageUrls(p.images || []),
  })),
  total,
  page,
  perPage,
});

// =====================================================
// ================== UPLOAD (ADMIN) ===================
// =====================================================

router.post("/upload", (req, res) => {
  if (!requireAdmin(req, res)) return;

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

// =====================================================
// ================ CREATE PRODUCT (ADMIN) =============
// =====================================================

router.post("/create", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const category = await Category.findById(req.body.category);
    if (!category) return res.status(404).send("Invalid Category!");

    if (!req.body.images || req.body.images.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one image is required" });
    }

    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      images: req.body.images,
      brand: req.body.brand,
      price: req.body.price,
      oldPrice: req.body.oldPrice,
      catId: req.body.catId,
      catName: req.body.catName,
      subCat: req.body.subCat,
      subCatId: req.body.subCatId,
      subCatName: req.body.subCatName,
      category: req.body.category,
      countInStock: req.body.countInStock,
      rating: req.body.rating,
      isFeatured: req.body.isFeatured,
      discount: req.body.discount,
      productRam: req.body.productRam,
      size: req.body.size,
      productWeight: req.body.productWeight,
      location:
        req.body.location && req.body.location !== "" ? req.body.location : "All",
    });

    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Product create error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ======= GENERIC LIST (PUBLIC, PAGINATED) ============
// =====================================================

// Supports: ?catId= | ?subCatId= | ?location= | ?page= | ?perPage=
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseIntOr(req.query.page, 1));
    const perPage = Math.min(
      100,
      Math.max(1, parseIntOr(req.query.perPage, 10))
    );

    const query = buildBaseQuery({
      catId: req.query.catId,
      subCatId: req.query.subCatId,
      location: req.query.location,
    });

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate("category")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
    ]);

    return res.json(envelope({ products, total, page, perPage }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ============ CATEGORY FILTERS (PUBLIC) ==============
// =====================================================

router.get("/catName", async (req, res) => {
  try {
    const page = Math.max(1, parseIntOr(req.query.page, 1));
    const perPage = Math.min(
      100,
      Math.max(1, parseIntOr(req.query.perPage, 10))
    );
    const location = req.query.location;

    const query = {
      catName: req.query.catName,
      ...normalizeLocationFilter(location),
    };

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate("category")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
    ]);

    res.json(envelope({ products, total, page, perPage }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/catId?catId=...&location=...&page=...&perPage=...
router.get("/catId", async (req, res) => {
  try {
    const page = Math.max(1, parseIntOr(req.query.page, 1));
    const perPage = Math.min(
      100,
      Math.max(1, parseIntOr(req.query.perPage, 10))
    );
    const query = buildBaseQuery({
      catId: req.query.catId,
      location: req.query.location,
    });

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate("category")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
    ]);

    res.json(envelope({ products, total, page, perPage }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products/subCatId?subCatId=...&location=...&page=...&perPage=...
router.get("/subCatId", async (req, res) => {
  try {
    const page = Math.max(1, parseIntOr(req.query.page, 1));
    const perPage = Math.min(
      100,
      Math.max(1, parseIntOr(req.query.perPage, 10))
    );
    const query = buildBaseQuery({
      subCatId: req.query.subCatId,
      location: req.query.location,
    });

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .populate("category")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
    ]);

    res.json(envelope({ products, total, page, perPage }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ============= FILTER BY PRICE (PUBLIC) ==============
// =====================================================

router.get("/fiterByPrice", async (req, res) => {
  try {
    const page = Math.max(1, parseIntOr(req.query.page, 1));
    const perPage = Math.min(
      100,
      Math.max(1, parseIntOr(req.query.perPage, 10))
    );

    const min = Number(req.query.minPrice);
    const max = Number(req.query.maxPrice);

    const base = buildBaseQuery({
      catId: req.query.catId,
      subCatId: req.query.subCatId,
      location: req.query.location,
    });

    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      base.price = {};
      if (!Number.isNaN(min)) base.price.$gte = min;
      if (!Number.isNaN(max)) base.price.$lte = max;
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(base),
      Product.find(base)
        .populate("category")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
    ]);

    res.json(envelope({ products, total, page, perPage }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ============= FILTER BY RATING (PUBLIC) =============
// =====================================================

router.get("/rating", async (req, res) => {
  try {
    const page = Math.max(1, parseIntOr(req.query.page, 1));
    const perPage = Math.min(
      100,
      Math.max(1, parseIntOr(req.query.perPage, 10))
    );

    const rating = Number(req.query.rating);
    const base = buildBaseQuery({
      catId: req.query.catId,
      subCatId: req.query.subCatId,
      location: req.query.location,
    });

    if (!Number.isNaN(rating)) {
      base.rating = { $gte: rating };
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(base),
      Product.find(base)
        .populate("category")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
    ]);

    res.json(envelope({ products, total, page, perPage }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ================== COUNT (PUBLIC) ===================
// =====================================================

router.get("/get/count", async (req, res) => {
  try {
    const count = await Product.countDocuments();
    res.json({ productsCount: count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ================= FEATURED (PUBLIC) =================
// =====================================================

router.get("/featured", async (req, res) => {
  try {
    const { location } = req.query;
    const base = { isFeatured: true, ...normalizeLocationFilter(location) };

    const products = await Product.find(base)
      .populate("category")
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    res.json(
      products.map((p) => ({
        ...p,
        images: toImageUrls(p.images || []),
      }))
    );
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ============ RECENTLY VIEWED (PUBLIC) ===============
// =====================================================

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
    const found = await RecentlyViewd.find({ prodId: req.body.id });
    if (found.length === 0) {
      const product = await new RecentlyViewd({ ...req.body }).save();
      res.status(201).json(product);
    } else {
      res.json(found[0]);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ============= GET PRODUCT BY ID (PUBLIC) ============
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "The product with given ID not found",
      });
    }

    const p = product.toObject();
    const imageUrls = Array.isArray(p.images) ? toImageUrls(p.images) : [];

    res.status(200).json({
      id: p._id,
      name: p.name,
      description: p.description,
      images: imageUrls,
      brand: p.brand,
      price: p.price,
      oldPrice: p.oldPrice,
      catId: p.catId,
      catName: p.catName,
      subCatId: p.subCatId,
      subCat: p.subCat,
      subCatName: p.subCatName,
      category: p.category,
      countInStock: p.countInStock,
      rating: p.rating,
      isFeatured: p.isFeatured,
      discount: p.discount,
      productRam: p.productRam || [],
      size: p.size || [],
      productWeight: p.productWeight || [],
      location: p.location || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ============= DELETE IMAGE (ADMIN) ==================
// =====================================================

router.delete("/deleteImage", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const img = req.query.img;
    if (!img)
      return res
        .status(400)
        .json({ success: false, message: "img query required" });

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

// =====================================================
// ============= DELETE PRODUCT (ADMIN) ================
// =====================================================

router.delete("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    for (const img of product.images || []) {
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

// =====================================================
// ============= UPDATE PRODUCT (ADMIN) ================
// =====================================================

router.put("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const updateData = {
      ...req.body,
    };

    if (Array.isArray(req.body.images)) {
      updateData.images = req.body.images;
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
