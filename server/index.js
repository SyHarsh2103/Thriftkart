const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

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
app.use("/uploads", express.static("uploads"));

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
