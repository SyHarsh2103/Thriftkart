const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const { HomeBanner } = require("../models/homeBanner");

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

// -------- ENV paths --------
const UPLOAD_DIR =
  process.env.HOME_BANNER_PATH ||
  path.join(__dirname, "..", "uploads", "homeBanner");
const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// -------- Multer config (5MB, images only) --------
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

// Helper: convert stored filenames to public URLs
const toImageUrls = (filenames = []) =>
  filenames.map((name) => `${BASE_URL}/uploads/homeBanner/${name}`);

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
      return res
        .status(400)
        .json({ success: false, message: err.message });
    }
    const filenames = (req.files || []).map((f) => f.filename);
    return res.status(200).json(filenames);
  });
});

// =====================================================
// ================== CREATE (ADMIN) ===================
// =====================================================

router.post("/create", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { images = [] } = req.body;

    const banner = new HomeBanner({
      images: Array.isArray(images) ? images : [],
    });

    const saved = await banner.save();
    res.status(201).json({ success: true, banner: saved });
  } catch (err) {
    console.error("Create HomeBanner error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// ================== GET ALL (PUBLIC) =================
// =====================================================

router.get("/", async (req, res) => {
  try {
    const list = await HomeBanner.find();
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
// ================== GET ONE (PUBLIC) =================
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const banner = await HomeBanner.findById(req.params.id);
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Not found" });

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
    const img = req.query.img;
    if (!img)
      return res
        .status(400)
        .json({ success: false, message: "img query required" });

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
// ============= DELETE BANNER (ADMIN) =================
// =====================================================

router.delete("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const banner = await HomeBanner.findById(req.params.id);
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Not found" });

    // delete files
    for (const img of banner.images) {
      const fp = path.join(UPLOAD_DIR, img);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await HomeBanner.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Banner deleted!" });
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
    const { images } = req.body;
    const updates = {
      ...(Array.isArray(images) ? { images } : {}),
    };

    const banner = await HomeBanner.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });

    res.json(banner);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
