const mongoose = require("mongoose");

// ---- Shiprocket sub-schema ----
const shiprocketSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },

    // IDs returned by Shiprocket
    sr_order_id: { type: Number },   // Shiprocket's order_id
    shipment_id: { type: Number },   // Shiprocket's shipment_id

    // High-level status from Shiprocket (e.g. "created", "processed", etc.)
    status: {
      type: String,
      trim: true,
    },

    // Optional fields for AWB / courier / docs
    awb_code: {
      type: String,
      trim: true,
    },
    courier: {
      type: String,
      trim: true,
    },
    label_url: {
      type: String,
      trim: true,
    },
    manifest_url: {
      type: String,
      trim: true,
    },
    tracking_url: {
      type: String,
      trim: true,
    },

    // Raw Shiprocket payload (for debugging / future use)
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const ordersSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔹 Extra address fields (optional but very useful for Shiprocket)
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    // Store as Number – all routes treat this as numeric
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Not required – COD orders will have this null
    paymentId: {
      type: String,
      default: null,
      trim: true,
    },

    paymentType: {
      type: String,
      required: true, // e.g. "ONLINE", "COD"
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // Link to User – always set from JWT in routes
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    products: [
      {
        productId: {
          type: String, // keep as String to match existing data
        },
        productTitle: {
          type: String,
          trim: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        price: {
          type: Number,
          default: 0,
          min: 0,
        },
        image: {
          type: String,
          trim: true,
        },
        subTotal: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    status: {
      type: String,
      default: "pending", // pending | confirm | shipped | delivered | cancelled etc.
      trim: true,
    },

    // 🔹 NEW: Shiprocket info
    shiprocket: {
      type: shiprocketSchema,
      default: null,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

ordersSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Function to generate unique-ish order ID (e.g., "TKOR1234")
function generateUniqueOrderId() {
  const letters = "TKOR";
  const randomNumbers = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  return letters + randomNumbers;
}

// Pre-save middleware to set orderId before saving (if missing)
ordersSchema.pre("save", function (next) {
  if (!this.orderId) {
    this.orderId = generateUniqueOrderId();
  }
  next();
});

ordersSchema.set("toJSON", {
  virtuals: true,
});

exports.Orders = mongoose.model("Orders", ordersSchema);
exports.ordersSchema = ordersSchema;
