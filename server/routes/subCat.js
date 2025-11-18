const express = require("express");
const { SubCategory } = require("../models/subCat");

const router = express.Router();

// ===== Auth helpers (req.auth is set by express-jwt via authJwt) =====
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

// =====================================================
// =============== GET ALL (PUBLIC) ====================
// =====================================================

router.get(`/`, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const perPage = req.query.perPage ? parseInt(req.query.perPage, 10) : null;

    const totalPosts = await SubCategory.countDocuments();

    let subCategoryList = [];
    let totalPages = 1;

    if (perPage && perPage > 0) {
      totalPages = Math.ceil(totalPosts / perPage);

      if (totalPages > 0 && page > totalPages) {
        return res.status(404).json({ message: "No data found!" });
      }

      subCategoryList = await SubCategory.find()
        .populate("category")
        .skip((page - 1) * perPage)
        .limit(perPage)
        .exec();
    } else {
      // no pagination params -> return all
      subCategoryList = await SubCategory.find().populate("category");
    }

    return res.status(200).json({
      subCategoryList,
      totalPages,
      page,
    });
  } catch (error) {
    console.error("Get SubCategory error:", error);
    res.status(500).json({ success: false });
  }
});

// =====================================================
// ================= COUNT (PUBLIC) ====================
// =====================================================

router.get(`/get/count`, async (req, res) => {
  try {
    const subCatCount = await SubCategory.countDocuments();
    res.send({ subCatCount });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// =====================================================
// =============== GET ONE (PUBLIC) ====================
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const subCat = await SubCategory.findById(req.params.id).populate(
      "category"
    );

    if (!subCat) {
      return res.status(404).json({
        message: "The sub category with the given ID was not found.",
      });
    }
    return res.status(200).send(subCat);
  } catch (err) {
    console.error("Get SubCategory by id error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// =====================================================
// =============== CREATE (ADMIN) ======================
// =====================================================

router.post("/create", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    let subCat = new SubCategory({
      category: req.body.category,
      subCat: req.body.subCat,
    });

    subCat = await subCat.save();
    res.status(201).json(subCat);
  } catch (err) {
    console.error("Create SubCategory error:", err);
    res.status(500).json({
      success: false,
      msg: "Failed to create sub category",
    });
  }
});

// =====================================================
// =============== DELETE (ADMIN) ======================
// =====================================================

router.delete("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const deletedSubCat = await SubCategory.findByIdAndDelete(req.params.id);

    if (!deletedSubCat) {
      return res.status(404).json({
        message: "Sub Category not found!",
        success: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "Sub Category Deleted!",
    });
  } catch (err) {
    console.error("Delete SubCategory error:", err);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// =====================================================
// ================ UPDATE (ADMIN) =====================
// =====================================================

router.put("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const subCat = await SubCategory.findByIdAndUpdate(
      req.params.id,
      {
        category: req.body.category,
        subCat: req.body.subCat,
      },
      { new: true }
    );

    if (!subCat) {
      return res.status(404).json({
        message: "Sub Category cannot be updated! (not found)",
        success: false,
      });
    }

    res.send(subCat);
  } catch (err) {
    console.error("Update SubCategory error:", err);
    return res.status(500).json({
      message: "Sub Category cannot be updated!",
      success: false,
    });
  }
});

module.exports = router;
