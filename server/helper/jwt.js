// helper/jwt.js
var { expressjwt: jwt } = require("express-jwt");

function authJwt() {
  const secret = process.env.JSON_WEB_TOKEN_SECRET_KEY;
  const NODE_ENV = process.env.NODE_ENV || "development";

  if (!secret) {
    console.error("❌ JSON_WEB_TOKEN_SECRET_KEY is missing");
    process.exit(1);
  }

  // Routes that do NOT require JWT
  const publicPaths = [
    // ---------- Auth + account lifecycle ----------
    { url: /\/api\/user\/signup/, methods: ["POST"] },
    { url: /\/api\/user\/signin/, methods: ["POST"] },
    { url: /\/api\/user\/verifyAccount\/resendOtp/, methods: ["POST"] },
    { url: /\/api\/user\/verifyAccount\/emailVerify\/.*/, methods: ["PUT"] },
    { url: /\/api\/user\/verifyemail/, methods: ["POST"] },
    { url: /\/api\/user\/forgotPassword.*/, methods: ["POST"] },
    { url: /\/api\/user\/authWithGoogle/, methods: ["POST"] },

    // ---------- Public product + catalog browsing (CLIENT FRONTEND) ----------
    { url: /\/api\/products.*/, methods: ["GET"] },
    { url: /\/api\/category.*/, methods: ["GET"] },
    { url: /\/api\/subCat.*/, methods: ["GET"] },
    { url: /\/api\/search.*/, methods: ["GET"] },

    // ---------- PUBLIC BANNERS (HOME PAGE) ----------
    { url: /\/api\/homeBanner.*/, methods: ["GET"] },
    { url: /\/api\/homeSideBanners.*/, methods: ["GET"] },
    { url: /\/api\/homeBottomBanners.*/, methods: ["GET"] },
    { url: /\/api\/banners.*/, methods: ["GET"] },

    // ---------- Static files ----------
    { url: /\/uploads\/.*/, methods: ["GET"] },

    // ---------- Health check (still guarded in index.js) ----------
    { url: /\/check-apis/, methods: ["GET"] },

    // ---------- CORS preflight – allow all OPTIONS without token ----------
    { url: /.*/, methods: ["OPTIONS"] },
  ];

  return jwt({
    secret,
    algorithms: ["HS256"],
    requestProperty: "auth", // token data → req.auth
  }).unless({ path: publicPaths });
}

module.exports = authJwt;
