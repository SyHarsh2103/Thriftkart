// server/routes/returnRequests.js
const express = require("express");
const router = express.Router();

const ReturnRequest = require("../models/ReturnRequest");
const { Orders } = require("../models/orders");

// 🔹 Shiprocket helpers for reverse pickup
const {
  createShiprocketReversePickup,
} = require("../utils/shiprocket");

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

    const { orderId, reason, description, resolution } = req.body;

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
      resolution, // may be undefined, that's fine
      status: "pending",
      items: itemsSnapshot,
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
    const data = requests.map((rr) => {
      const order = rr.order || null;
      const user = rr.user || null;

      return {
        ...rr,
        // For admin UI: human-friendly order number
        orderNumber: order?.orderId || order?._id || rr._id,

        // For admin UI: expects rr.orderId & rr.userId objects
        orderId: order,
        userId: user,

        // What to display in "Resolution" column
        resolution: rr.resolution || rr.description || "",

        // Prefer stored items snapshot; fallback to order products
        items:
          Array.isArray(rr.items) && rr.items.length
            ? rr.items
            : order?.products || [],
      };
    });

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
        select: "orderId amount status date products",
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = requests.map((rr) => {
      const order = rr.order || null;

      return {
        ...rr,
        orderNumber: order?.orderId || order?._id || rr._id,
        orderId: order,
        resolution: rr.resolution || rr.description || "",
        items:
          Array.isArray(rr.items) && rr.items.length
            ? rr.items
            : order?.products || [],
      };
    });

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
 *
 * 🔹 When status becomes "pickup_scheduled", we auto-create a
 * Shiprocket reverse pickup shipment and store it in rr.reversePickup.
 */
async function updateReturnStatus(req, res) {
  try {
    const isAdmin = req.auth?.isAdmin;
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const { status, adminComment, resolution, refundAmount } = req.body;
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

    const previousStatus = rr.status;

    // Basic field updates
    rr.status = status;
    if (adminComment !== undefined) rr.adminComment = adminComment;
    if (resolution !== undefined) rr.resolution = resolution;
    if (refundAmount !== undefined) rr.refundAmount = refundAmount;

    // 🔹 Auto-create Shiprocket reverse pickup when moving to pickup_scheduled
    if (
      status === "pickup_scheduled" &&
      previousStatus !== "pickup_scheduled"
    ) {
      try {
        // Avoid double-creating reverse pickup
        if (rr.reversePickup && rr.reversePickup.enabled) {
          console.log(
            `ℹ️ Reverse pickup already exists for return ${rr._id}, skipping`
          );
        } else {
          const order = await Orders.findById(rr.order);
          if (!order) {
            console.error(
              `❌ Cannot create reverse pickup: order ${rr.order} not found`
            );
          } else {
            const reverseInfo = await createShiprocketReversePickup(order, {
              reason: rr.reason,
              comment: rr.description,
            });

            rr.reversePickup = reverseInfo;
            console.log(
              `✅ Shiprocket reverse pickup created for return ${rr._id}`,
              reverseInfo
            );
          }
        }
      } catch (shipErr) {
        console.error(
          `❌ Failed to create Shiprocket reverse pickup for return ${rr._id}:`,
          shipErr.message || shipErr
        );
        // Do NOT fail the whole API call – admin status change still succeeds
        // Optionally append a note:
        if (!rr.adminComment) {
          rr.adminComment =
            "Reverse pickup creation failed – see server logs for details.";
        } else if (
          !rr.adminComment.includes("Reverse pickup creation failed")
        ) {
          rr.adminComment +=
            " | Reverse pickup creation failed – see server logs.";
        }
      }
    }

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
