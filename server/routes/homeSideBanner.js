const { HomeSideBanners } = require("../models/homeSideBanner");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
    res.status(200).json(filenames); // return just filenames
  });
});

// ---------------- CREATE ----------------
router.post("/create", async (req, res) => {
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
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- GET ALL ----------------
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

// ---------------- GET BY ID ----------------
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

// ---------------- DELETE SINGLE IMAGE ----------------
router.delete("/deleteImage", async (req, res) => {
  try {
    const img = req.query.img; // filename only
    if (!img)
      return res
        .status(400)
        .json({ success: false, message: "img query required" });

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

// ---------------- DELETE WHOLE BANNER ----------------
router.delete("/:id", async (req, res) => {
  try {
    const banner = await HomeSideBanners.findById(req.params.id);
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "HomeSideBanner not found" });

    for (const img of banner.images) {
      const filePath = path.join(UPLOAD_DIR, img);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await HomeSideBanners.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------- UPDATE ----------------
router.put("/:id", async (req, res) => {
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
