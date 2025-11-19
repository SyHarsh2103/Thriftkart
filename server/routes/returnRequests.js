// server/routes/returnRequests.js
const express = require("express");
const router = express.Router();

const ReturnRequest = require("../models/ReturnRequest");
const { Orders } = require("../models/orders");

// Helper: validate return window and status
function canCreateReturn(order) {
  if (!order) return { ok: false, msg: "Order not found" };

  // Only allow returns for delivered orders
  if (order.status !== "delivered") {
    return { ok: false, msg: "Return allowed only for delivered orders" };
  }

  // Example: 7-day return window based on createdAt or date
  const createdAt = new Date(order.createdAt || order.date);
  const now = new Date();
  const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
  if (diffDays > 7) {
    return { ok: false, msg: "Return window has expired" };
  }

  return { ok: true };
}

/**
 * POST /api/returns
 * Create a return request for a given order
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.auth?.id; // from JWT middleware

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized (no user in token)" });
    }

    const { orderId, reason, description } = req.body;

    if (!orderId || !reason) {
      return res
        .status(400)
        .json({ success: false, message: "orderId and reason are required" });
    }

    // Ensure the order belongs to this user (Orders schema uses `userid`)
    const order = await Orders.findOne({ _id: orderId, userid: userId });

    const check = canCreateReturn(order);
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.msg });
    }

    // Prevent duplicate pending request for same order
    const existing = await ReturnRequest.findOne({
      order: orderId,
      user: userId,
      status: "pending",
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A pending return request already exists for this order",
      });
    }

    // Snapshot of products being returned (for now: whole order)
    const itemsSnapshot = (order.products || []).map((p) => ({
      productId: p.productId,
      productTitle: p.productTitle,
      image: p.image,
      quantity: p.quantity,
      price: p.price,
      subTotal: p.subTotal,
    }));

    const rr = await ReturnRequest.create({
      order: orderId,
      user: userId,
      reason,
      description,
      status: "pending",
      items: itemsSnapshot,
      // requestedAt is not in schema; frontend will fall back to createdAt
      requestedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Return request submitted",
      data: rr,
    });
  } catch (err) {
    console.error("Create return request error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create return request",
    });
  }
});

/**
 * GET /api/returns
 * - Admin: get all return requests with order + user details
 * - Customer: get own return requests
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.auth?.id;
    const isAdmin = req.auth?.isAdmin;

    if (!userId && !isAdmin) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized (no user in token)" });
    }

    const query = isAdmin ? {} : { user: userId };

    const requests = await ReturnRequest.find(query)
      .populate({
        path: "order",
        select:
          "orderId amount status paymentId paymentType name phoneNumber email address pincode date products",
      })
      .populate({
        path: "user",
        select: "name email phoneNumber",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Shape data for frontend (admin + client)
    const data = requests.map((rr) => ({
      ...rr,
      // For admin UI: human-friendly order number
      orderNumber: rr.order?.orderId, // e.g. "TKOR1234"

      // For admin UI: expects rr.orderId & rr.userId objects
      orderId: rr.order || null, // populated order doc
      userId: rr.user || null,   // populated user doc

      // Prefer stored items snapshot; fallback to order products
      items:
        Array.isArray(rr.items) && rr.items.length
          ? rr.items
          : rr.order?.products || [],
    }));

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("List return requests error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch return requests",
    });
  }
});

/**
 * GET /api/returns/my
 * Customer-only: current user's return requests (for My Returns page)
 */
router.get("/my", async (req, res) => {
  try {
    const userId = req.auth?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized (no user in token)" });
    }

    const requests = await ReturnRequest.find({ user: userId })
      .populate({
        path: "order",
        select: "orderId amount status date",
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = requests.map((rr) => ({
      ...rr,
      orderNumber: rr.order?.orderId,
      // keep orderId as full order object if frontend needs more later
      orderId: rr.order || null,
      items:
        Array.isArray(rr.items) && rr.items.length
          ? rr.items
          : rr.order?.products || [],
    }));

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("List my returns error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch return requests",
    });
  }
});

/**
 * Shared handler to update return status (Admin only)
 * allowed:
 *   pending | approved | rejected |
 *   pickup_scheduled | picked |
 *   refund_initiated | refund_completed | closed
 */
async function updateReturnStatus(req, res) {
  try {
    const isAdmin = req.auth?.isAdmin;
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const { status, adminComment } = req.body;
    const allowed = [
      "pending",
      "approved",
      "rejected",
      "pickup_scheduled",
      "picked",
      "refund_initiated",
      "refund_completed",
      "closed",
    ];

    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const rr = await ReturnRequest.findById(req.params.id);
    if (!rr) {
      return res
        .status(404)
        .json({ success: false, message: "Return request not found" });
    }

    rr.status = status;
    if (adminComment) rr.adminComment = adminComment;
    await rr.save();

    return res.json({
      success: true,
      message: "Return status updated",
      data: rr,
    });
  } catch (err) {
    console.error("Update return status error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update return status",
    });
  }
}

/**
 * PATCH /api/returns/:id/status
 * PUT   /api/returns/:id/status  (to support editData on admin)
 */
router.patch("/:id/status", updateReturnStatus);
router.put("/:id/status", updateReturnStatus);

module.exports = router;
