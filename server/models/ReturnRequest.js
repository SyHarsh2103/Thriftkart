// server/models/ReturnRequest.js
const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      trim: true,
    },
    productTitle: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    subTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false } // no separate _id for items
);

const returnRequestSchema = new mongoose.Schema(
  {
    // Which order is being returned
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Orders", // 👈 must match your Orders model name
      required: true,
      index: true,
    },

    // Which user requested the return
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Snapshot of products being returned
    // (we currently store the full order products in routes/returnRequests.js)
    items: [itemSchema],

    // Short reason (dropdown style): "damaged", "wrong item", etc.
    reason: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional longer explanation
    description: {
      type: String,
      trim: true,
    },

    // Return status
    // "pending"           – created by user, waiting for admin review
    // "approved"          – admin approved, return in progress
    // "rejected"          – admin rejected request
    // "pickup_scheduled"  – pickup slot confirmed
    // "picked"            – courier picked the item
    // "refund_initiated"  – refund started in payment gateway
    // "refund_completed"  – refund finished
    // "closed"            – request fully closed
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "pickup_scheduled",
        "picked",
        "refund_initiated",
        "refund_completed",
        "closed",
      ],
      default: "pending",
      index: true,
    },

    // Optional extra fields (you can use later)
    adminComment: {
      type: String,
      trim: true,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },

    // Explicit requested timestamp (in addition to createdAt)
    requestedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Virtual id for JSON responses
returnRequestSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

returnRequestSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("ReturnRequest", returnRequestSchema);
