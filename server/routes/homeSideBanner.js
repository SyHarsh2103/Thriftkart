const { HomeSideBanners } = require("../models/homeSideBanner");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ===== Auth helpers (req.auth is set by authJwt in index.js) =====
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

// ----------- Local Upload Directory -----------
const UPLOAD_DIR =
  process.env.HOME_SIDE_BANNER_PATH ||
  path.join(__dirname, "..", "uploads", "homeSideBanners");

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

// Ensure folder exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ----------- Multer Config -----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG/PNG/WEBP images allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ----------- Helper to build URLs -----------
const toImageUrls = (filenames = []) =>
  filenames.map((name) => `${BASE_URL}/uploads/homeSideBanners/${name}`);

// =====================================================
// =========== UPLOAD (ADMIN – returns filenames) ======
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
    res.status(200).json(filenames); // return just filenames
  });
});

// =====================================================
// ================== CREATE (ADMIN) ===================
// =====================================================

router.post("/create", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { images = [], catId, catName, subCatId, subCatName } = req.body;

    let banner = new HomeSideBanners({
      images: Array.isArray(images) ? images : [],
      catId,
      catName,
      subCatId,
      subCatName,
    });

    const saved = await banner.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Create HomeSideBanner error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ================== GET ALL (PUBLIC) =================
// =====================================================

router.get("/", async (req, res) => {
  try {
    const list = await HomeSideBanners.find();
    const withUrls = list.map((b) => ({
      ...b.toObject(),
      images: toImageUrls(b.images),
    }));
    res.status(200).json(withUrls);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ================= GET BY ID (PUBLIC) ================
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const banner = await HomeSideBanners.findById(req.params.id);
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "HomeSideBanner not found" });

    res.json({ ...banner.toObject(), images: toImageUrls(banner.images) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ===== DELETE SINGLE IMAGE (ADMIN, by filename) ======
// =====================================================

router.delete("/deleteImage", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    let img = req.query.img; // can be filename or URL
    if (!img)
      return res
        .status(400)
        .json({ success: false, message: "img query required" });

    // If full URL passed, strip filename
    if (img.includes("/")) {
      img = img.split("/").pop();
    }

    const filePath = path.join(UPLOAD_DIR, img);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.status(200).json({ success: true, message: "Image deleted" });
    }
    return res.status(404).json({ success: false, message: "Image not found" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ============= DELETE BANNER (ADMIN) =================
// =====================================================

router.delete("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const banner = await HomeSideBanners.findById(req.params.id);
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "HomeSideBanner not found" });

    for (const imgRaw of banner.images) {
      let img = imgRaw;
      if (img && img.includes("/")) img = img.split("/").pop();
      const filePath = path.join(UPLOAD_DIR, img);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await HomeSideBanners.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ================== UPDATE (ADMIN) ===================
// =====================================================

router.put("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { images, catId, catName, subCatId, subCatName } = req.body;

    const updated = await HomeSideBanners.findByIdAndUpdate(
      req.params.id,
      {
        ...(Array.isArray(images) ? { images } : {}),
        ...(catId ? { catId } : {}),
        ...(catName ? { catName } : {}),
        ...(subCatId ? { subCatId } : {}),
        ...(subCatName ? { subCatName } : {}),
      },
      { new: true }
    );

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "HomeSideBanner not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
