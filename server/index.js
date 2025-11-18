const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const authJwt = require("./helper/jwt"); // 👈 our JWT middleware

// Load env vars
dotenv.config();

// ===== Env validation =====
const requiredEnv = ["CONNECTION_STRING", "JSON_WEB_TOKEN_SECRET_KEY"];
requiredEnv.forEach((name) => {
  if (!process.env[name]) {
    console.error(`❌ Missing required env var: ${name}`);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Create app
const app = express();

// Disable X-Powered-By
app.disable("x-powered-by");

// ===== Security: Helmet =====
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // for images
  })
);

// ===== CORS (restrict origins) =====
const allowedOrigins = [
  "https://thriftkart.com",
  "https://www.thriftkart.com",
  "https://admin.thriftkart.com",
  "https://staging.thriftkart.com",
  "https://admin-staging.thriftkart.com",
];

if (NODE_ENV === "development") {
  allowedOrigins.push("http://localhost:3000", "http://localhost:3001");
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser tools (like curl, Postman with no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  })
);
app.options("*", cors());

// ===== Rate limiting (global) =====
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 1000, // tune as needed
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Optional: stricter limiter for signin
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});
app.use("/api/user/signin", authLimiter); // 👈 your signin route

// ===== Body parsers =====
app.use(
  express.json({
    limit: "1mb", // adjust as needed
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

// ===== JWT Auth middleware (must be AFTER body parsers, BEFORE routes) =====
app.use(authJwt());

// ===== Static uploads =====
const uploadsPath = process.env.UPLOADS_PATH || "/var/www/Thriftkart-uploads";
app.use("/uploads", express.static(uploadsPath));

// ===== Routes =====
app.use("/api/user", require("./routes/user.js"));
app.use("/api/category", require("./routes/categories"));
app.use("/api/subCat", require("./routes/subCat.js"));
app.use("/api/products", require("./routes/products"));
app.use("/api/imageUpload", require("./helper/imageUpload.js"));
app.use("/api/productWeight", require("./routes/productWeight.js"));
app.use("/api/productRAMS", require("./routes/productRAMS.js"));
app.use("/api/productSIZE", require("./routes/productSize.js"));
app.use("/api/productReviews", require("./routes/productReviews.js"));
app.use("/api/cart", require("./routes/cart.js"));
app.use("/api/my-list", require("./routes/myList.js"));
app.use("/api/orders", require("./routes/orders.js"));
app.use("/api/homeBanner", require("./routes/homeBanner.js"));
app.use("/api/search", require("./routes/search.js"));
app.use("/api/banners", require("./routes/banners.js"));
app.use("/api/homeSideBanners", require("./routes/homeSideBanner.js"));
app.use("/api/homeBottomBanners", require("./routes/homeBottomBanner.js"));

// ===== API Health Checker (protect or disable in prod) =====
const apiEndpoints = [
  "/api/user",
  "/api/category",
  "/api/subCat",
  "/api/products",
  "/api/imageUpload",
  "/api/productWeight",
  "/api/productRAMS",
  "/api/productSIZE",
  "/api/productReviews",
  "/api/cart",
  "/api/my-list",
  "/api/orders",
  "/api/homeBanner",
  "/api/search?q=test",
  "/api/banners",
  "/api/homeSideBanners",
  "/api/homeBottomBanners",
];

app.get("/check-apis", async (req, res) => {
  if (NODE_ENV === "production") {
    return res
      .status(403)
      .json({ message: "Health check disabled in production" });
  }

  const baseUrl = process.env.API_BASE_URL || `http://localhost:${PORT}`;
  const results = {};

  for (const endpoint of apiEndpoints) {
    try {
      const response = await axios.get(baseUrl + endpoint);
      results[endpoint] = { status: response.status, ok: true };
    } catch (err) {
      results[endpoint] = {
        status: err.response ? err.response.status : "down",
        ok: false,
      };
    }
  }

  res.json({
    checkedAt: new Date().toISOString(),
    results,
  });
});

// ===== 404 handler =====
app.use((req, res, next) => {
  res.status(404).json({ error: "Not found" });
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error(err);

  // Handle JWT auth errors from express-jwt
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Invalid or missing token" });
  }

  if (NODE_ENV === "production") {
    return res.status(500).json({ error: "Something went wrong" });
  }
  res.status(500).json({ error: err.message, stack: err.stack });
});

// ===== DB & Server =====
mongoose
  .connect(process.env.CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
