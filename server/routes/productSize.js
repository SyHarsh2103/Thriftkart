const { ProductSize } = require("../models/productSize");
const express = require("express");
const router = express.Router();

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

// =====================================================
// =================== GET ALL (PUBLIC) =================
// =====================================================
router.get(`/`, async (req, res) => {
  try {
    const productSizeList = await ProductSize.find();

    if (!productSizeList) {
      return res.status(500).json({ success: false });
    }

    return res.status(200).json(productSizeList);
  } catch (error) {
    console.error("GET /productSize error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// =================== GET ONE (PUBLIC) =================
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const item = await ProductSize.findById(req.params.id);

    if (!item) {
      return res
        .status(404)
        .json({ message: "The item with the given ID was not found." });
    }
    return res.status(200).send(item);
  } catch (error) {
    console.error("GET /productSize/:id error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// ==================== CREATE (ADMIN) =================
// =====================================================
router.post("/create", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { size } = req.body;
    if (!size) {
      return res
        .status(400)
        .json({ success: false, msg: "size is required" });
    }

    let productSize = new ProductSize({ size });

    productSize = await productSize.save();

    res.status(201).json(productSize);
  } catch (error) {
    console.error("POST /productSize/create error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// =================== DELETE (ADMIN) ==================
// =====================================================
router.delete("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const deletedItem = await ProductSize.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res
        .status(404)
        .json({ message: "Item not found!", success: false });
    }

    res.status(200).json({
      success: true,
      message: "Item Deleted!",
    });
  } catch (error) {
    console.error("DELETE /productSize/:id error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// ==================== UPDATE (ADMIN) =================
// =====================================================
router.put("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { size } = req.body;

    const item = await ProductSize.findByIdAndUpdate(
      req.params.id,
      { ...(size ? { size } : {}) },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        message: "Item not found!",
        success: false,
      });
    }

    res.send(item);
  } catch (error) {
    console.error("PUT /productSize/:id error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
