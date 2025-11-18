// server/helper/imageUpload.js
const express = require("express");
const { ImageUpload } = require("../models/imageUpload.js");

const router = express.Router();

// ===== Auth helpers (req.auth is set by authJwt / express-jwt) =====
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

// Small helper
function parseIntOr(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

// =====================================================
// =============== GET IMAGE UPLOADS (ADMIN) ===========
// =====================================================
//
// GET /api/imageUpload
// Optional: ?page=&perPage=
router.get("/", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const page = Math.max(1, parseIntOr(req.query.page, 1));
    const perPage = Math.min(100, Math.max(1, parseIntOr(req.query.perPage, 50)));

    const [total, imageUploadList] = await Promise.all([
      ImageUpload.countDocuments(),
      ImageUpload.find()
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
    ]);

    return res.status(200).json({
      data: imageUploadList,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    console.error("Get ImageUpload error:", error);
    res.status(500).json({ success: false });
  }
});

// =====================================================
// =========== DELETE ALL IMAGE RECORDS (ADMIN) ========
// =====================================================
//
// DELETE /api/imageUpload/deleteAllImages
router.delete("/deleteAllImages", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const images = await ImageUpload.find().lean();

    if (!images.length) {
      return res.status(200).json({
        success: true,
        message: "No images to delete",
      });
    }

    const result = await ImageUpload.deleteMany({});
    return res.status(200).json({
      success: true,
      message: "All image records deleted",
      deletedCount: result.deletedCount ?? images.length,
    });
  } catch (err) {
    console.error("deleteAllImages error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete images",
    });
  }
});

module.exports = router;
