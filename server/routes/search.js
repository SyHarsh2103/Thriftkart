// server/routes/search.js
const { Product } = require("../models/products.js");
const express = require("express");
const router = express.Router();

// Helper to safely parse integers
function parseIntOr(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

// Optional location filter (matches your product location behavior idea)
// If you don't use "location" in your Product schema, you can remove this.
function buildLocationFilter(location) {
  if (!location || location === "All") return {};
  return {
    $or: [
      { location: location },
      { "location.value": location }, // if stored as [{ value, label }]
    ],
  };
}

router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const location = req.query.location;

    if (!q) {
      return res.status(400).json({ msg: "Query is required" });
    }

    // Optional: avoid super-short queries that can be expensive
    if (q.length < 2) {
      return res
        .status(400)
        .json({ msg: "Query must be at least 2 characters" });
    }

    const page = Math.max(1, parseIntOr(req.query.page, 1));
    const perPage = Math.min(50, Math.max(1, parseIntOr(req.query.perPage, 10)));

    // Base search filter
    const baseFilter = {
      isActive: { $ne: false }, // only active products
      $or: [
        { name: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { catName: { $regex: q, $options: "i" } },
      ],
      ...buildLocationFilter(location),
    };

    // If perPage is not provided in query at all, return full list (with a hard cap)
    const paginate =
      typeof req.query.page !== "undefined" &&
      typeof req.query.perPage !== "undefined";

    if (paginate) {
      const [total, items] = await Promise.all([
        Product.countDocuments(baseFilter),
        Product.find(baseFilter)
          .populate("category")
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * perPage)
          .limit(perPage)
          .lean(),
      ]);

      const totalPages = Math.ceil(total / perPage);

      return res.status(200).json({
        products: items,
        totalPages,
        page,
        perPage,
        total,
      });
    } else {
      // Non-paginated – still add a safety limit
      const items = await Product.find(baseFilter)
        .populate("category")
        .sort({ createdAt: -1, _id: -1 })
        .limit(100)
        .lean();

      return res.json(items);
    }
  } catch (err) {
    console.error("GET /search error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
