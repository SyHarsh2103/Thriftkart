const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      index: true,
      // Optional: uncomment if you want phone unique per user
      // unique: true,
      // sparse: true, // allows multiple docs with no phone
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,    // hard guarantee: no duplicate emails
      index: true,
    },

    // Not required because:
    // - Normal signup: routes enforce password
    // - Google login: may not store password
    password: {
      type: String,
      default: null,
    },

    // User avatar / profile images (optional, safe default)
    images: [
      {
        type: String,
        // required: true, // ❌ keep optional to avoid breaking signup
      },
    ],

    isAdmin: {
      type: Boolean,
      default: false,
    },

    // Email account verified (via OTP)
    isVerified: {
      type: Boolean,
      default: false,
    },

    // OTP for email verification and forgot-password flows
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },

    // Token-based password reset
    resetToken: {
      type: String,
      default: null,
      index: true,
    },
    resetTokenExpires: {
      type: Date,
      default: null,
      index: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        // Remove sensitive/internal fields from API responses
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpires;
        delete ret.resetToken;
        delete ret.resetTokenExpires;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpires;
        delete ret.resetToken;
        delete ret.resetTokenExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual id to expose "id" instead of "_id"
userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Extra indexes for performance & security checks
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 });
userSchema.index({ resetToken: 1, resetTokenExpires: 1 });
userSchema.index({ isAdmin: 1 });

exports.User = mongoose.model("User", userSchema);
exports.userSchema = userSchema;
