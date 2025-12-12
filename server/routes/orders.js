const express = require("express");
const { Orders } = require("../models/orders");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

// ✅ Shiprocket helper (from server/utils/shiprocket.js)
const {
  createShiprocketOrderFromOrder,
} = require("../utils/shiprocket");

const router = express.Router();

const NODE_ENV = process.env.NODE_ENV || "development";

// ===== Helpers for auth/roles (req.auth is set by express-jwt) =====
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

// 🔹 Safely extract user id from JWT payload (req.auth)
function getUserIdFromToken(auth) {
  if (!auth) return null;

  if (auth.id) return auth.id;       // most likely in your app
  if (auth.userId) return auth.userId;
  if (auth._id) return auth._id;
  if (auth.sub) return auth.sub;

  return null;
}

// ===== Razorpay init =====
const HAS_RAZORPAY_CONFIG =
  !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;

if (!HAS_RAZORPAY_CONFIG) {
  console.warn(
    "⚠️ RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set. Razorpay features may not work."
  );
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// ===== Rate limiters for payment endpoints =====
const razorpayLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 requests per IP per 5 min
  standardHeaders: true,
  legacyHeaders: false,
});

// Allowlist for admin filtering on GET /orders
const ADMIN_FILTER_FIELDS = [
  "status",
  "userid",
  "email",
  "paymentType",
  "paymentId",
  "orderId",
];

// =====================================================
// ================ SALES ANALYTICS (ADMIN) ============
// =====================================================

router.get(`/sales`, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const currentYear =
      parseInt(req?.query?.year, 10) || new Date().getFullYear();

    const ordersList = await Orders.find();

    let totalSales = 0;
    const monthlySales = [
      { month: "JAN", sale: 0 },
      { month: "FEB", sale: 0 },
      { month: "MAR", sale: 0 },
      { month: "APRIL", sale: 0 },
      { month: "MAY", sale: 0 },
      { month: "JUNE", sale: 0 },
      { month: "JULY", sale: 0 },
      { month: "AUG", sale: 0 },
      { month: "SEP", sale: 0 },
      { month: "OCT", sale: 0 },
      { month: "NOV", sale: 0 },
      { month: "DEC", sale: 0 },
    ];

    for (const order of ordersList) {
      const amount = parseInt(order.amount, 10) || 0;
      totalSales += amount;

      const d = new Date(order.date || order.createdAt || Date.now());
      const year = d.getFullYear();
      const monthIndex = d.getMonth(); // 0-11

      if (year === currentYear && monthIndex >= 0 && monthIndex < 12) {
        monthlySales[monthIndex].sale =
          parseInt(monthlySales[monthIndex].sale, 10) + amount;
      }
    }

    return res.status(200).json({
      totalSales,
      monthlySales,
      year: currentYear,
    });
  } catch (error) {
    console.error("Sales error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// ================ ORDER LISTING ======================
// =====================================================

// GET orders
// - Default: ONLY current user's orders (even if isAdmin = true)
// - Admin listing: /api/orders?adminMode=1 → can see all, with filters
router.get(`/`, async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const userId = getUserIdFromToken(req.auth);

    // Is this an explicit "admin listing" request?
    const isAdminMode =
      req.auth.isAdmin &&
      (req.query.adminMode === "1" ||
        req.query.adminMode === "true" ||
        req.query.scope === "all");

    let filter = {};

    if (isAdminMode) {
      // 🔓 Admin mode: allow filtering via whitelisted fields
      for (const key of Object.keys(req.query || {})) {
        if (ADMIN_FILTER_FIELDS.includes(key)) {
          filter[key] = req.query[key];
        }
      }
    } else {
      // 🔐 Normal "My Orders" – ALWAYS filter by logged-in user
      if (!userId) {
        return res
          .status(400)
          .json({ error: true, msg: "Cannot determine user id from token" });
      }

      filter = {
        $or: [
          { userid: userId }, // your existing field
          { userId: userId }, // in case older docs used this
        ],
      };
    }

    const ordersList = await Orders.find(filter).sort({ date: -1 });

    return res.status(200).json(ordersList);
  } catch (error) {
    console.error("Get orders error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
});

// GET single order
// - Admin: can see any order
// - User: can only see if it belongs to them
router.get("/:id", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const order = await Orders.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ message: "The order with the given ID was not found." });
    }

    const userId = getUserIdFromToken(req.auth);

    if (!req.auth.isAdmin && String(order.userid) !== String(userId)) {
      return res.status(403).json({ error: true, msg: "Forbidden" });
    }

    return res.status(200).send(order);
  } catch (e) {
    console.error("Get single order error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// COUNT orders (Admin only)
router.get(`/get/count`, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const orderCount = await Orders.countDocuments();

    return res.send({
      orderCount,
    });
  } catch (error) {
    console.error("Order count error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
});

// =====================================================
// ================ SHIPROCKET SYNC HELPER =============
// =====================================================

// helper to safely sync with Shiprocket after saving the order
async function syncWithShiprocket(savedOrder) {
  try {
    // If already synced once, skip
    if (savedOrder.shiprocket && savedOrder.shiprocket.enabled) {
      console.log(
        `ℹ️ Shiprocket already synced for order ${savedOrder._id}, skipping`
      );
      return;
    }

    const sr = await createShiprocketOrderFromOrder(savedOrder);

    if (sr && typeof sr === "object") {
      savedOrder.shiprocket = {
        enabled: true,
        sr_order_id: sr.order_id ?? sr.orderId ?? null,
        shipment_id: Array.isArray(sr.shipment_id)
          ? sr.shipment_id[0]
          : sr.shipment_id ?? null,
        status: sr.status || sr.current_status || "created",
        awb_code: sr.awb_code || "",
        courier:
          (sr.courier_company && sr.courier_company.name) ||
          sr.courier_name ||
          "",
        label_url: sr.label_url || "",
        manifest_url: sr.manifest_url || "",
        tracking_url:
          sr.tracking_url ||
          (sr.awb_code ? `https://shiprocket.co/tracking/${sr.awb_code}` : ""),
        raw: sr,
      };

      await savedOrder.save();
    }

    console.log(
      `✅ Shiprocket sync success for order ${savedOrder._id}`,
      savedOrder.shiprocket
    );
  } catch (err) {
    console.error(
      `Shiprocket sync failed for order ${savedOrder._id}:`,
      err?.response?.data || err.message || err
    );
    // ❗ Do NOT throw here – we don't want to fail checkout
  }
}

// =====================================================
// ================ ORDER CREATE =======================
// =====================================================

// Create online-paid order
router.post("/create", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const userId = getUserIdFromToken(req.auth);
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, msg: "Cannot determine user id" });
    }

    const {
      name,
      phoneNumber,
      address,
      city,
      state,
      country,
      pincode,
      amount,
      paymentId,
      paymentType,
      email,
      products,
      date,
    } = req.body;

    if (
      !name ||
      !phoneNumber ||
      !address ||
      !pincode ||
      !amount ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, msg: "Missing required order fields" });
    }

    const order = new Orders({
      name,
      phoneNumber,
      address,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      pincode,
      amount,
      paymentId,
      paymentType: paymentType || "ONLINE",
      email,
      userid: userId, // 👈 from token, not body
      products,
      date: date || new Date(),
    });

    const saved = await order.save();

    if (NODE_ENV !== "production") {
      console.log("New order created:", {
        id: saved._id,
        userid: saved.userid,
        amount: saved.amount,
      });
    }

    // 🔹 Fire-and-forget Shiprocket sync (Prepaid)
    syncWithShiprocket(saved);

    return res.status(201).json(saved);
  } catch (error) {
    console.error("Create order error:", error);
    return res
      .status(500)
      .json({ success: false, msg: "Order creation failed" });
  }
});

// Create Cash-On-Delivery order
router.post("/cod/create", async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const userId = getUserIdFromToken(req.auth);
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, msg: "Cannot determine user id" });
    }

    const {
      name,
      phoneNumber,
      address,
      city,
      state,
      country,
      pincode,
      amount,
      paymentType,
      email,
      products,
      date,
    } = req.body;

    if (
      !name ||
      !phoneNumber ||
      !address ||
      !pincode ||
      !amount ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, msg: "Missing required order fields" });
    }

    const order = new Orders({
      name,
      phoneNumber,
      address,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      pincode,
      amount,
      paymentId: null,
      paymentType: paymentType || "COD",
      email,
      userid: userId, // 👈 from token
      products,
      date: date || new Date(),
    });

    const saved = await order.save();

    if (NODE_ENV !== "production") {
      console.log("New COD order created:", {
        id: saved._id,
        userid: saved.userid,
        amount: saved.amount,
      });
    }

    // 🔹 Fire-and-forget Shiprocket sync (COD)
    syncWithShiprocket(saved);

    return res.status(201).json(saved);
  } catch (error) {
    console.error("Create COD order error:", error);
    return res
      .status(500)
      .json({ success: false, msg: "COD order creation failed" });
  }
});

// =====================================================
// ================ ORDER UPDATE / DELETE (ADMIN) ======
// =====================================================

// Admin: delete order
router.delete("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const deletedOrder = await Orders.findByIdAndDelete(req.params.id);

    if (!deletedOrder) {
      return res.status(404).json({
        message: "Order not found!",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order Deleted!",
    });
  } catch (error) {
    console.error("Delete order error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

// Admin: update order (usually status)
router.put("/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const update = {
      status: req.body.status,
    };

    if (req.body.paymentId !== undefined) {
      update.paymentId = req.body.paymentId;
    }
    if (req.body.paymentType !== undefined) {
      update.paymentType = req.body.paymentType;
    }

    // get old order to decide if we need to sync with Shiprocket here
    const prev = await Orders.findById(req.params.id);
    if (!prev) {
      return res.status(404).json({
        message: "Order cannot be updated – not found",
        success: false,
      });
    }

    const order = await Orders.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    // OPTIONAL logic: if you only want Shiprocket order after confirm
    // but we already sync on create(), so here we just ensure not to double-create:
    if (
      prev.status !== "confirm" &&
      order.status === "confirm" &&
      !(order.shiprocket && order.shiprocket.enabled)
    ) {
      syncWithShiprocket(order);
    }

    return res.send(order);
  } catch (error) {
    console.error("Update order error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

// =====================================================
// ================ RAZORPAY INTEGRATION ===============
// =====================================================

// Step 1: Create Razorpay Order
router.post("/create-razorpay-order", razorpayLimiter, async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (!HAS_RAZORPAY_CONFIG) {
    return res.status(500).json({
      success: false,
      error: "Razorpay is not configured on server",
    });
  }

  try {
    const { amount, currency } = req.body;

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const options = {
      amount: Math.round(amt * 100), // paise
      currency: currency || "INR",
      receipt: "receipt_" + Date.now(),
      notes: {
        userId: getUserIdFromToken(req.auth),
      },
    };

    const order = await razorpay.orders.create(options);
    return res.json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({ success: false });
  }
});

// Step 2: Verify Payment Signature
router.post("/verify-payment", razorpayLimiter, async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (!HAS_RAZORPAY_CONFIG) {
    return res.status(500).json({
      success: false,
      error: "Razorpay is not configured on server",
    });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, error: "Missing Razorpay params" });
    }

    // If running in development/test mode → skip verification
    if (NODE_ENV !== "production") {
      console.log("⚠️ Skipping Razorpay signature verification in Test Mode");
      return res.json({ success: true, testMode: true });
    }

    // Production: verify signature properly
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      return res.json({ success: true });
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Invalid signature" });
    }
  } catch (err) {
    console.error("❌ Verification error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
