const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const slugify = require("slugify");

const { Category } = require("../models/category");

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
  process.env.CATEGORY_IMAGE_PATH ||
  path.join(__dirname, "..", "uploads", "categories");
const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// -------- Multer config (1MB, images only) --------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`),
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/jpg",
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only image files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
});

// Helper: convert stored filenames to public URLs for responses
const toImageUrls = (filenames = []) =>
  filenames.map((name) => `${BASE_URL}/uploads/categories/${name}`);

// Helper: build category tree
const createCategories = (categories, parentId = null) => {
  const categoryList = [];

  const filtered =
    parentId == null
      ? categories.filter((c) => !c.parentId) // root categories
      : categories.filter((c) => String(c.parentId) === String(parentId));

  for (const cat of filtered) {
    categoryList.push({
      _id: cat._id,
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      color: cat.color,
      images: toImageUrls(cat.images), // return full URLs to frontend
      children: createCategories(categories, cat._id),
    });
  }
  return categoryList;
};

// =====================================================
// =========== UPLOAD (ADMIN – returns filenames) ======
// =====================================================

router.post("/upload", (req, res) => {
  if (!requireAdmin(req, res)) return;

  upload.array("images", 5)(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ success: false, message: "Each file must be ≤ 1 MB" });
      }
      return res
        .status(400)
        .json({ success: false, message: err.message });
    }
    const filenames = (req.files || []).map((f) => f.filename);
    return res.status(200).json(filenames);
  });
});

// =====================================================
// ================= CREATE (ADMIN) ====================
// =====================================================

router.post("/create", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { name, color, parentId, images = [] } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const category = new Category({
      name,
      slug,
      color: color || undefined,
      parentId: parentId || undefined,
      images: Array.isArray(images) ? images : [], // store only filenames
    });

    const saved = await category.save();
    res.status(201).json({ success: true, category: saved });
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ========== GET ALL (PUBLIC, HIERARCHY) ==============
// =====================================================

router.get("/", async (req, res) => {
  try {
    const all = await Category.find();
    const data = createCategories(all);
    res.status(200).json({ categoryList: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ================= COUNTS (PUBLIC) ===================
// =====================================================

router.get("/get/count", async (req, res) => {
  try {
    const count = await Category.countDocuments({ parentId: undefined });
    res.json({ categoryCount: count });
  } catch {
    res.status(500).json({ success: false });
  }
});

router.get("/subCat/get/count", async (req, res) => {
  try {
    const list = await Category.find();
    const sub = list.filter((c) => c.parentId !== undefined);
    res.json({ categoryCount: sub.length });
  } catch {
    res.status(500).json({ success: false });
  }
});

// =====================================================
// ============== GET ONE (PUBLIC) =====================
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const all = await Category.find();
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // for GET one, return node + its direct children
    const children = all.filter(
      (c) => String(c.parentId) === String(category._id)
    );
    const payload = [
      {
        _id: category._id,
        id: category._id,
        name: category.name,
        slug: category.slug,
        color: category.color,
        images: toImageUrls(category.images),
        children: children.map((s) => ({
          _id: s._id,
          id: s._id,
          name: s.name,
          slug: s.slug,
          color: s.color,
          images: toImageUrls(s.images),
        })),
      },
    ];

    res.status(200).json({ categoryData: payload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ====== DELETE A SINGLE IMAGE (ADMIN, by filename) ===
// =====================================================

router.delete("/deleteImage", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const img = req.query.img; // filename only
    if (!img) {
      return res
        .status(400)
        .json({ success: false, message: "img query required" });
    }

    const filePath = path.join(UPLOAD_DIR, img);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res
        .status(200)
        .json({ success: true, message: "Image deleted" });
    }
    return res
      .status(404)
      .json({ success: false, message: "Image not found" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ===== DELETE CATEGORY (ADMIN, removes its images) ===
// =====================================================

router.delete("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // delete local files
    for (const img of cat.images) {
      const fp = path.join(UPLOAD_DIR, img);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Category deleted!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// =============== UPDATE (ADMIN) ======================
// =====================================================

router.put("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { name, color, images } = req.body;
    const updates = {
      ...(name
        ? { name, slug: slugify(name, { lower: true, strict: true }) }
        : {}),
      ...(typeof color !== "undefined" ? { color } : {}),
      ...(Array.isArray(images) ? { images } : {}),
    };

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.json(category);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
