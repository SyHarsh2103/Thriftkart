const express = require("express");
const { MyList } = require("../models/myList");

const router = express.Router();

// ===== Helpers (req.auth is set by express-jwt via authJwt) =====
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
// ================ GET MY LIST ========================
// =====================================================

// GET /api/my-list
// - Normal user: sees ONLY their own wishlist items
// - Admin: can see all, optionally filtered with query (?userId=...)
router.get(`/`, async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    let filter = {};

    if (req.auth.isAdmin) {
      filter = { ...req.query };
    } else {
      filter = { userId: req.auth.id };
    }

    const myList = await MyList.find(filter);

    return res.status(200).json(myList);
  } catch (error) {
    console.error("Get MyList error:", error);
    res.status(500).json({ success: false });
  }
});

// =====================================================
// ================ ADD TO MY LIST =====================
// =====================================================

// POST /api/my-list/add
router.post("/add", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const {
      productTitle,
      image,
      rating,
      price,
      productId,
    } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ status: false, msg: "productId is required" });
    }

    const userId = req.auth.id; // always from token

    const existing = await MyList.findOne({ productId, userId });

    if (existing) {
      return res.status(409).json({
        status: false,
        msg: "Product already added in the My List",
      });
    }

    let list = new MyList({
      productTitle,
      image,
      rating,
      price,
      productId,
      userId,
    });

    list = await list.save();

    return res.status(201).json(list);
  } catch (err) {
    console.error("Add to MyList error:", err);
    return res
      .status(500)
      .json({ status: false, msg: "Failed to add to My List" });
  }
});

// =====================================================
// ================ DELETE MY LIST ITEM ================
// =====================================================

// DELETE /api/my-list/:id
router.delete("/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const item = await MyList.findById(req.params.id);

    if (!item) {
      return res
        .status(404)
        .json({ msg: "The item with the given id is not found!" });
    }

    // Only owner or admin can delete
    if (
      !req.auth.isAdmin &&
      String(item.userId) !== String(req.auth.id)
    ) {
      return res.status(403).json({ error: true, msg: "Forbidden" });
    }

    const deletedItem = await MyList.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({
        message: "Item not found!",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item Deleted!",
    });
  } catch (error) {
    console.error("Delete MyList item error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

// =====================================================
// ================ GET SINGLE ITEM ====================
// =====================================================

// GET /api/my-list/:id
router.get("/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const item = await MyList.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "The item with the given ID was not found.",
      });
    }

    // Only owner or admin can view
    if (
      !req.auth.isAdmin &&
      String(item.userId) !== String(req.auth.id)
    ) {
      return res.status(403).json({ error: true, msg: "Forbidden" });
    }

    return res.status(200).send(item);
  } catch (error) {
    console.error("Get MyList item error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
