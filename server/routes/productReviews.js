const { ProductReviews } = require("../models/productReviews");
const express = require("express");
const router = express.Router();

// ===== Auth helper (req.auth is set by authJwt in index.js) =====
function requireAuth(req, res) {
  if (!req.auth) {
    res.status(401).json({ error: true, msg: "Unauthorized" });
    return false;
  }
  return true;
}

// =====================================================
// =================== GET ALL (PUBLIC) =================
// =====================================================
// Optional: ?productId=...
router.get(`/`, async (req, res) => {
  try {
    let reviews = [];

    if (
      req.query.productId !== undefined &&
      req.query.productId !== null &&
      req.query.productId !== ""
    ) {
      reviews = await ProductReviews.find({ productId: req.query.productId });
    } else {
      reviews = await ProductReviews.find();
    }

    if (!reviews) {
      return res.status(500).json({ success: false });
    }

    return res.status(200).json(reviews);
  } catch (error) {
    console.error("GET /productReviews error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// =================== COUNT (PUBLIC) ===================
// =====================================================
router.get(`/get/count`, async (req, res) => {
  try {
    const productsReviews = await ProductReviews.countDocuments();
    // countDocuments returns 0 if none, which is valid
    return res.send({
      productsReviews,
    });
  } catch (error) {
    console.error("GET /productReviews/get/count error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// =================== GET ONE (PUBLIC) =================
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const review = await ProductReviews.findById(req.params.id);

    if (!review) {
      return res
        .status(404)
        .json({ message: "The review with the given ID was not found." });
    }
    return res.status(200).send(review);
  } catch (error) {
    console.error("GET /productReviews/:id error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// ==================== CREATE (AUTH) ===================
// =====================================================
// Only a logged-in user can add a review.
// Also: prevent duplicate review by same user for same product.
router.post("/add", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const userId = req.auth.id; // from JWT payload
    const {
      productId,
      review: reviewText,
      customerRating,
      customerName, // optional – just for display
    } = req.body;

    if (!productId || !reviewText || customerRating == null) {
      return res.status(400).json({
        success: false,
        msg: "productId, review and customerRating are required",
      });
    }

    const ratingNum = Number(customerRating);
    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        msg: "customerRating must be a number between 1 and 5",
      });
    }

    // Prevent duplicate review from same user for the same product
    const existing = await ProductReviews.findOne({
      productId,
      customerId: userId,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        msg: "You have already reviewed this product",
      });
    }

    let review = new ProductReviews({
      customerId: userId, // trust token, not body
      customerName: customerName || "Customer",
      review: reviewText,
      customerRating: ratingNum,
      productId,
    });

    review = await review.save();

    res.status(201).json(review);
  } catch (error) {
    console.error("POST /productReviews/add error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

module.exports = router;
