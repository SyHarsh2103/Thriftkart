const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: {
      type: String,
      required: true,
      lowercase: true,   // normalize email
      trim: true,
      index: true,
    },
    password: { type: String },

    images: [
      {
        type: String,
        required: true,   // if this causes signup issues, make it optional
      },
    ],

    isAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

    // OTP for email/forgot-password verification
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    // 🔑 Required for reset flow
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },

    date: { type: Date, default: Date.now },
  },
  { timestamps: true } // <- FIXED spelling (was timeStamps)
);

userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

userSchema.set("toJSON", { virtuals: true });

exports.User = mongoose.model("User", userSchema);
exports.userSchema = userSchema;
