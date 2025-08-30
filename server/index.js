const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');   // 👈 added

// Load environment variables based on NODE_ENV
dotenv.config();

// Create express app
const app = express();

// Enable CORS
app.use(cors());
app.options('*', cors());

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use("/uploads", express.static("/var/www/Thriftkart-uploads"));
//app.use("/uploads", express.static("uploads"));


// ====== Routes ======
app.use("/api/user", require('./routes/user.js'));
app.use("/api/category", require('./routes/categories'));
app.use("/api/subCat", require('./routes/subCat.js'));
app.use("/api/products", require('./routes/products'));
app.use("/api/imageUpload", require('./helper/imageUpload.js'));
app.use("/api/productWeight", require('./routes/productWeight.js'));
app.use("/api/productRAMS", require('./routes/productRAMS.js'));
app.use("/api/productSIZE", require('./routes/productSize.js'));
app.use("/api/productReviews", require('./routes/productReviews.js'));
app.use("/api/cart", require('./routes/cart.js'));
app.use("/api/my-list", require('./routes/myList.js'));
app.use("/api/orders", require('./routes/orders.js'));
app.use("/api/homeBanner", require('./routes/homeBanner.js'));
app.use("/api/search", require('./routes/search.js'));
app.use("/api/banners", require('./routes/banners.js'));
app.use("/api/homeSideBanners", require('./routes/homeSideBanner.js'));
app.use("/api/homeBottomBanners", require('./routes/homeBottomBanner.js'));

// ====== API Health Checker ======
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
  "/api/homeBottomBanners"
];

app.get("/check-apis", async (req, res) => {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 8000}`;
  const results = {};

  for (const endpoint of apiEndpoints) {
    try {
      const response = await axios.get(baseUrl + endpoint);
      results[endpoint] = { status: response.status, ok: true };
    } catch (err) {
      results[endpoint] = {
        status: err.response ? err.response.status : "down",
        ok: false
      };
    }
  }

  res.json({
    checkedAt: new Date().toISOString(),
    results
  });
});

// ====== Database Connection ======
mongoose.connect(process.env.CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected');
  // Start server after DB connection
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection failed:', err.message);
});

// ====== Global Error Handler (optional) ======
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
