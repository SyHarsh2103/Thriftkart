const express = require("express");
const { Cart } = require("../models/cart");

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
// ================ GET CART ITEMS =====================
// =====================================================

// GET /api/cart
// - Normal user: sees ONLY their own cart items
// - Admin: can see all carts (optionally filter with query)
router.get(`/`, async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    let filter = {};

    if (req.auth.isAdmin) {
      // allow admin to filter with query (eg. ?userId=...)
      filter = { ...req.query };
    } else {
      // normal user -> only own cart
      filter = { userId: req.auth.id };
    }

    const cartList = await Cart.find(filter);

    return res.status(200).json(cartList);
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({ success: false });
  }
});

// =====================================================
// ================ ADD TO CART ========================
// =====================================================

// POST /api/cart/add
router.post("/add", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const {
      productTitle,
      image,
      rating,
      price,
      quantity,
      subTotal,
      productId,
      countInStock,
    } = req.body;

    if (!productId || !quantity || !price) {
      return res
        .status(400)
        .json({ status: false, msg: "productId, quantity, price are required" });
    }

    // Always use userId from token, ignore body userId
    const userId = req.auth.id;

    const existing = await Cart.findOne({ productId, userId });

    if (existing) {
      return res
        .status(409)
        .json({ status: false, msg: "Product already added in the cart" });
    }

    let cartItem = new Cart({
      productTitle,
      image,
      rating,
      price,
      quantity,
      subTotal,
      productId,
      userId,
      countInStock,
    });

    cartItem = await cartItem.save();

    return res.status(201).json(cartItem);
  } catch (err) {
    console.error("Add to cart error:", err);
    return res
      .status(500)
      .json({ status: false, msg: "Failed to add to cart" });
  }
});

// =====================================================
// ================ DELETE CART ITEM ===================
// =====================================================

// DELETE /api/cart/:id
router.delete("/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
      return res
        .status(404)
        .json({ msg: "The cart item with the given id is not found!" });
    }

    // Only owner or admin can delete it
    if (
      !req.auth.isAdmin &&
      String(cartItem.userId) !== String(req.auth.id)
    ) {
      return res.status(403).json({ error: true, msg: "Forbidden" });
    }

    const deletedItem = await Cart.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({
        message: "Cart item not found!",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart Item Deleted!",
    });
  } catch (error) {
    console.error("Delete cart item error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// =====================================================
// ================ GET SINGLE CART ITEM ==============
// =====================================================

// GET /api/cart/:id
router.get("/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
      return res
        .status(404)
        .json({ message: "The cart item with the given ID was not found." });
    }

    // Only owner or admin can view it
    if (
      !req.auth.isAdmin &&
      String(cartItem.userId) !== String(req.auth.id)
    ) {
      return res.status(403).json({ error: true, msg: "Forbidden" });
    }

    return res.status(200).send(cartItem);
  } catch (error) {
    console.error("Get cart item error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// =====================================================
// ================ UPDATE CART ITEM ===================
// =====================================================

// PUT /api/cart/:id
router.put("/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
      return res
        .status(404)
        .json({ message: "Cart item not found", success: false });
    }

    // Only owner or admin can update
    if (
      !req.auth.isAdmin &&
      String(cartItem.userId) !== String(req.auth.id)
    ) {
      return res.status(403).json({ error: true, msg: "Forbidden" });
    }

    const {
      productTitle,
      image,
      rating,
      price,
      quantity,
      subTotal,
      productId,
      countInStock,
    } = req.body;

    const updated = await Cart.findByIdAndUpdate(
      req.params.id,
      {
        productTitle: productTitle ?? cartItem.productTitle,
        image: image ?? cartItem.image,
        rating: rating ?? cartItem.rating,
        price: price ?? cartItem.price,
        quantity: quantity ?? cartItem.quantity,
        subTotal: subTotal ?? cartItem.subTotal,
        productId: productId ?? cartItem.productId,
        userId: cartItem.userId, // never allow changing userId
        countInStock: countInStock ?? cartItem.countInStock,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(500).json({
        message: "Cart item cannot be updated!",
        success: false,
      });
    }

    return res.send(updated);
  } catch (error) {
    console.error("Update cart item error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

module.exports = router;
