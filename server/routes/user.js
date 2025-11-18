const express = require("express");
const router = express.Router();

const { User } = require("../models/user");
const { ImageUpload } = require("../models/imageUpload");
const { sendEmail } = require("../utils/emailService");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const {
  buildAccountVerificationEmail,
  buildPasswordResetOtpEmail,
} = require("../utils/emailTemplates");

const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JSON_WEB_TOKEN_SECRET_KEY;

// ===== Critical env checks =====
if (!JWT_SECRET) {
  console.error("❌ JSON_WEB_TOKEN_SECRET_KEY is missing");
  process.exit(1);
}

// ---------- Basic guards ----------
function requireAuth(req, res) {
  if (!req.auth) {
    res.status(401).json({ error: true, msg: "Unauthorized" });
    return false;
  }
  return true;
}

function requireSelfOrAdmin(req, res) {
  if (!req.auth) {
    res.status(401).json({ error: true, msg: "Unauthorized" });
    return false;
  }
  if (req.auth.isAdmin) return true;
  if (String(req.auth.id) !== String(req.params.id)) {
    res.status(403).json({ error: true, msg: "Forbidden" });
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

function normEmail(e = "") {
  return String(e).trim().toLowerCase();
}

function generateJwt(user) {
  return jwt.sign(
    {
      email: user.email,
      id: user._id,
      isAdmin: !!user.isAdmin,
      isVerified: !!user.isVerified,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function sendEmailFun(to, subject, text, html) {
  const result = await sendEmail(to, subject, text, html);
  return !!result.success;
}

function makeResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ---------- Cloudinary ----------
cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
  secure: true,
});

// ---------- Multer ----------
let imagesArr = [];

// ensure local temp upload dir exists
const LOCAL_UPLOAD_DIR = "uploads";
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, LOCAL_UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const name = `${Date.now()}_${file.originalname}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image uploads are allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
});

// ---------- Rate limiters ----------
const forgotLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min window
  max: 5, // 5 reqs / 10 min per IP
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================================================
// ===============   MEDIA UPLOAD ROUTES  ==============
// =====================================================

// Require login for uploads (authJwt should be mounted globally)
router.post(`/upload`, upload.array("images"), async (req, res) => {
  if (!requireAuth(req, res)) return;

  imagesArr = [];
  try {
    for (let i = 0; i < (req?.files?.length || 0); i++) {
      const options = {
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      };
      const localPath = req.files[i].path;
      const uploaded = await cloudinary.uploader.upload(localPath, options);
      if (uploaded?.secure_url) {
        imagesArr.push(uploaded.secure_url);
      }
      // clean up local file
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }

    const imagesUploaded = new ImageUpload({ images: imagesArr });
    await imagesUploaded.save();
    return res.status(200).json(imagesArr);
  } catch (error) {
    console.error("Upload error:", error);
    return res
      .status(500)
      .json({ success: false, msg: "Upload failed", error: error.message });
  }
});

// =====================================================
// ===============   AUTH / ACCOUNT FLOW  ==============
// =====================================================

router.post(`/signup`, signupLimiter, async (req, res) => {
  const { name, phone, password } = req.body;
  const email = normEmail(req.body.email);

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ status: "FAILED", msg: "Name, email and password are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({
        status: "FAILED",
        msg: "User already exist with this email!",
      });
    }

    if (phone) {
      const existingUserByPh = await User.findOne({ phone });
      if (existingUserByPh) {
        return res.json({
          status: "FAILED",
          msg: "User already exist with this phone number!",
        });
      }
    }

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone,
      password: hashPassword,
      isAdmin: false, // never from client
      isVerified: false,
      otp: verifyCode,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    await user.save();

    const { subject, text, html } = buildAccountVerificationEmail({
      userName: name,
      otp: verifyCode,
      expiresInMinutes: 10,
    });
    await sendEmailFun(email, subject, text, html);

    const token = generateJwt(user);

    return res.status(200).json({
      success: true,
      message: "User registered successfully! Please verify your email.",
      token,
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res
      .status(500)
      .json({ status: "FAILED", msg: "something went wrong" });
  }
});

// resend OTP for account verification
router.post(`/verifyAccount/resendOtp`, async (req, res) => {
  const email = normEmail(req.body.email);
  try {
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    existingUser.otp = verifyCode;
    existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
    await existingUser.save();

    const { subject, text, html } = buildAccountVerificationEmail({
      userName: existingUser.name || "there",
      otp: verifyCode,
      expiresInMinutes: 10,
    });
    await sendEmailFun(email, subject, text, html);

    return res.status(200).json({
      success: true,
      message: "Verification OTP sent to your email",
    });
  } catch (error) {
    console.error("resendOtp error:", error);
    return res
      .status(500)
      .json({ status: "FAILED", msg: "something went wrong" });
  }
});

// sets OTP & sends email for account verification (if used by UI flow)
router.put(`/verifyAccount/emailVerify/:id`, async (req, res) => {
  const email = normEmail(req.body.email);
  const { otp } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // only allow for the same user id
    if (String(existingUser._id) !== String(req.params.id)) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden for this user" });
    }

    existingUser.otp = otp;
    existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
    await existingUser.save();

    const { subject, text, html } = buildAccountVerificationEmail({
      userName: existingUser.name || "there",
      otp,
      expiresInMinutes: 10,
    });
    await sendEmailFun(email, subject, text, html);

    const token = generateJwt(existingUser);

    return res.status(200).json({
      success: true,
      message: "OTP sent",
      token,
    });
  } catch (error) {
    console.error("emailVerify error:", error);
    return res
      .status(500)
      .json({ status: "FAILED", msg: "something went wrong" });
  }
});

// verify email for account
router.post("/verifyemail", async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ success: false, message: "User not found" });

    const isCodeValid = user.otp === otp;
    const isNotExpired = user.otpExpires && user.otpExpires > Date.now();

    if (isCodeValid && isNotExpired) {
      user.isVerified = true;
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res
        .status(200)
        .json({ success: true, message: "OTP verified successfully" });
    } else if (!isCodeValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired" });
    }
  } catch (err) {
    console.log("Error in verifyEmail", err);
    return res
      .status(500)
      .json({ success: false, message: "Error in verifying email" });
  }
});

router.post(`/signin`, signinLimiter, async (req, res) => {
  const email = normEmail(req.body.email);
  const { password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: true, msg: "Email and password are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser)
      return res.status(404).json({ error: true, msg: "User not found!" });

    if (existingUser.isVerified === false) {
      return res.json({
        error: true,
        isVerify: false,
        msg: "Your account is not active yet please verify your account first or Sign Up with a new user",
      });
    }

    if (!existingUser.password) {
      return res.status(400).json({
        error: true,
        msg: "This account uses social login. Please sign in with Google.",
      });
    }

    const matchPassword = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!matchPassword)
      return res
        .status(400)
        .json({ error: true, msg: "Invalid credentials" });

    const token = generateJwt(existingUser);

    return res.status(200).send({
      user: existingUser,
      token,
      msg: "User Authenticated",
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res
      .status(500)
      .json({ error: true, msg: "something went wrong" });
  }
});

// change password (logged-in user)
router.put(`/changePassword/:id`, async (req, res) => {
  if (!requireSelfOrAdmin(req, res)) return;

  try {
    const email = normEmail(req.body.email);
    const { name, phone, password, newPass, images } = req.body;

    const existingUser = await User.findOne({ email });
    if (!existingUser)
      return res.status(404).json({ error: true, msg: "User not found!" });

    // must match current password
    const matchPassword = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!matchPassword)
      return res
        .status(400)
        .json({ error: true, msg: "Current password is wrong" });

    const newPassword = newPass
      ? await bcrypt.hash(newPass, 10)
      : existingUser.password;

    const user = await User.findByIdAndUpdate(
      existingUser._id, // ensure we update the same user
      { name, phone, email, password: newPassword, images },
      { new: true }
    );

    if (!user)
      return res
        .status(400)
        .json({ error: true, msg: "The user cannot be updated!" });

    return res.send(user);
  } catch (err) {
    console.error("changePassword error:", err);
    return res
      .status(500)
      .json({ error: true, msg: "Internal Server Error" });
  }
});

// =====================================================
// ============  USERS CRUD / STATS  ===================
// =====================================================

// Admin: list all users
router.get(`/`, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const userList = await User.find();
    return res.send(userList);
  } catch (e) {
    return res.status(500).json({ success: false });
  }
});

// Self or admin: get user by id
router.get("/:id", async (req, res) => {
  if (!requireSelfOrAdmin(req, res)) return;

  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ message: "The user with the given ID was not found." });
    return res.status(200).send(user);
  } catch (e) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Self or admin: delete user
router.delete("/:id", async (req, res) => {
  if (!requireSelfOrAdmin(req, res)) return;

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (user) {
      return res
        .status(200)
        .json({ success: true, message: "The user is deleted!" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err });
  }
});

// Admin: count users
router.get(`/get/count`, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const userCount = await User.countDocuments();
    return res.send({ userCount });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Social login
router.post(`/authWithGoogle`, signinLimiter, async (req, res) => {
  const email = normEmail(req.body.email);
  const { name, phone, password, images } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ error: true, msg: "Email is required for Google auth" });
  }

  try {
    let existingUser = await User.findOne({ email });

    if (!existingUser) {
      const result = await User.create({
        name,
        phone,
        email,
        // Optional: you can store a hashed pseudo-password if needed
        password: password || null,
        images,
        isAdmin: false,
        isVerified: true,
      });

      const token = generateJwt(result);

      return res.status(200).send({
        user: result,
        token,
        msg: "User Login Successfully!",
      });
    } else {
      const token = generateJwt(existingUser);

      return res.status(200).send({
        user: existingUser,
        token,
        msg: "User Login Successfully!",
      });
    }
  } catch (error) {
    console.error("authWithGoogle error:", error);
    return res
      .status(500)
      .json({ error: true, msg: "Internal Server Error" });
  }
});

// Self or admin: update profile
router.put("/:id", async (req, res) => {
  if (!requireSelfOrAdmin(req, res)) return;

  try {
    const { name, phone, password, images } = req.body;
    const email = normEmail(req.body.email);

    const userExist = await User.findById(req.params.id);
    if (!userExist) return res.status(404).send("User not found");

    const newPassword = password
      ? await bcrypt.hash(password, 10)
      : userExist.password;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        phone,
        email,
        password: newPassword,
        images: images || imagesArr, // fall back to last uploaded set
      },
      { new: true }
    );

    if (!updated) return res.status(400).send("The user cannot be updated!");
    return res.send(updated);
  } catch (e) {
    console.error("PUT /:id error:", e);
    return res
      .status(500)
      .json({ error: true, msg: "Internal Server Error" });
  }
});

// Admin: delete image from Cloudinary
router.delete("/deleteImage", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const imgUrl = req.query.img;
    if (!imgUrl)
      return res
        .status(400)
        .json({ success: false, msg: "img query required" });

    const urlArr = imgUrl.split("/");
    const image = urlArr[urlArr.length - 1];
    const imageName = image.split(".")[0];

    const response = await cloudinary.uploader.destroy(imageName);
    return res.status(200).send(response);
  } catch (e) {
    console.error("deleteImage error:", e);
    return res.status(500).json({ success: false, error: e });
  }
});

// =====================================================
// ========  FORGOT PASSWORD (SECURE FLOW)  ============
// =====================================================

// (1) Send OTP
router.post(`/forgotPassword`, forgotLimiter, async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    if (!email)
      return res
        .status(400)
        .json({ success: false, msg: "Email required" });

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, msg: "User not exist with this email!" });
    }

    existingUser.otp = verifyCode;
    existingUser.otpExpires = Date.now() + 600000; // 10 min
    existingUser.resetToken = null;
    existingUser.resetTokenExpires = null;
    await existingUser.save();

    const { subject, text, html } = buildPasswordResetOtpEmail({
      userName: existingUser?.name || "there",
      otp: verifyCode,
      expiresInMinutes: 10,
    });
    await sendEmailFun(email, subject, text, html);
    return res
      .status(200)
      .json({ success: true, status: "SUCCESS", message: "OTP sent" });
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res
      .status(500)
      .json({ status: "FAILED", msg: "something went wrong" });
  }
});

// alias: send-otp
router.post(`/forgotPassword/send-otp`, forgotLimiter, async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    if (!email)
      return res
        .status(400)
        .json({ success: false, msg: "Email required" });

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, msg: "User not found" });
    }

    existingUser.otp = verifyCode;
    existingUser.otpExpires = Date.now() + 600000;
    existingUser.resetToken = null;
    existingUser.resetTokenExpires = null;
    await existingUser.save();

    const { subject, text, html } = buildPasswordResetOtpEmail({
      userName: existingUser?.name || "there",
      otp: verifyCode,
      expiresInMinutes: 10,
    });
    await sendEmailFun(email, subject, text, html);
    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error("send-otp error:", error);
    return res
      .status(500)
      .json({ success: false, msg: "Something went wrong" });
  }
});

// (2) Verify OTP → issue short-lived reset token
router.post(`/forgotPassword/verify-otp`, async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, msg: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    const otpValid = user.otp && user.otp === otp;
    const notExpired = user.otpExpires && user.otpExpires > Date.now();

    if (!otpValid)
      return res.status(400).json({ success: false, msg: "Invalid OTP" });
    if (!notExpired)
      return res.status(400).json({ success: false, msg: "OTP expired" });

    const resetToken = makeResetToken();
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 15 * 60 * 1000; // 15 min
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified",
      resetToken,
      expiresInSeconds: 15 * 60,
    });
  } catch (err) {
    console.error("verify-otp error", err);
    return res
      .status(500)
      .json({ success: false, msg: "Error verifying OTP" });
  }
});

// (3) Reset password using reset token (ATOMIC FIND)
router.post(`/forgotPassword/reset`, async (req, res) => {
  try {
    const email = normEmail(req.body.email);
    const resetToken = String(req.body.resetToken || "").trim();
    const newPass = String(req.body.newPass || "");

    if (!email || !resetToken || !newPass) {
      return res
        .status(400)
        .json({ success: false, msg: "Missing fields" });
    }

    const user = await User.findOne({
      email,
      resetToken,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid reset token" });
    }

    user.password = await bcrypt.hash(newPass, 10);
    user.resetToken = null;
    user.resetTokenExpires = null;

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("reset error", err);
    return res
      .status(500)
      .json({ success: false, msg: "Error resetting password" });
  }
});

// ❌ DEPRECATED: old changePassword by email route is removed

module.exports = router;
