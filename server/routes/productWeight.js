const { ProductWeight } = require("../models/productWeight");
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
    const productWeightList = await ProductWeight.find();

    if (!productWeightList) {
      return res.status(500).json({ success: false });
    }

    return res.status(200).json(productWeightList);
  } catch (error) {
    console.error("GET /productWeight error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// =================== GET ONE (PUBLIC) =================
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const item = await ProductWeight.findById(req.params.id);

    if (!item) {
      return res
        .status(404)
        .json({ message: "The item with the given ID was not found." });
    }
    return res.status(200).send(item);
  } catch (error) {
    console.error("GET /productWeight/:id error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// ==================== CREATE (ADMIN) =================
// =====================================================
router.post("/create", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { productWeight } = req.body;
    if (!productWeight) {
      return res
        .status(400)
        .json({ success: false, msg: "productWeight is required" });
    }

    let item = new ProductWeight({ productWeight });

    item = await item.save();

    res.status(201).json(item);
  } catch (error) {
    console.error("POST /productWeight/create error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// =================== DELETE (ADMIN) ==================
// =====================================================
router.delete("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const deletedItem = await ProductWeight.findByIdAndDelete(req.params.id);

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
    console.error("DELETE /productWeight/:id error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// ==================== UPDATE (ADMIN) =================
// =====================================================
router.put("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { productWeight } = req.body;

    const item = await ProductWeight.findByIdAndUpdate(
      req.params.id,
      { ...(productWeight ? { productWeight } : {}) },
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
    console.error("PUT /productWeight/:id error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
