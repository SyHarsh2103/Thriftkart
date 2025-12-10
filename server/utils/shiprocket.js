// server/utils/shiprocket.js
// Helper for Shiprocket API integration (login + create order)
//
// V3:
//  - Forward shipment: creates a Shiprocket order from your Orders model (COD + Online)
//  - Reverse pickup: creates a Shiprocket return shipment (reverse pickup)
//  - Returns normalized "shippingInfo" objects that fit Orders.shiprocket
//
// NOTE: Reverse pickup payload (create/return) MUST be verified against
// Shiprocket's official docs / Postman collection. Field names like
// `reference_order_id`, `is_return` etc. may need tweaks.

const axios = require("axios");

// ========== ENV CONFIG ==========
//
// Required (from your Shiprocket dashboard):
//   SHIPROCKET_EMAIL
//   SHIPROCKET_PASSWORD
//
// Recommended (fallbacks below):
//   SHIPROCKET_BASE_URL           default: https://apiv2.shiprocket.in/v1
//   SHIPROCKET_PICKUP_LOCATION    default: "Primary"
//   SHIPROCKET_DEFAULT_CITY       default: "Ahmedabad"
//   SHIPROCKET_DEFAULT_STATE      default: "Gujarat"
//   SHIPROCKET_DEFAULT_COUNTRY    default: "India"
//   SHIPROCKET_DEFAULT_PHONE      default: "9999999999"
//
const SHIPROCKET_BASE_URL =
  process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1";

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL || "thriftkart.info@gmail.com";
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD || "lH0v#khD1Lp@4%Fg#LZ7f8*Qd%8fL@j@";

const SHIPROCKET_PICKUP_LOCATION =
  process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";

const DEFAULT_CITY = process.env.SHIPROCKET_DEFAULT_CITY || "Ahmedabad";
const DEFAULT_STATE = process.env.SHIPROCKET_DEFAULT_STATE || "Gujarat";
const DEFAULT_COUNTRY = process.env.SHIPROCKET_DEFAULT_COUNTRY || "India";
const DEFAULT_PHONE = process.env.SHIPROCKET_DEFAULT_PHONE || "9999999999";

// Very simple in-memory token cache
let cachedToken = null;
let cachedTokenTime = null;
const TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

// ========== Internal helpers ==========

// Get a valid token (login if needed)
async function getShiprocketToken() {
  // If we already logged in recently, reuse token
  if (cachedToken && cachedTokenTime) {
    const age = Date.now() - cachedTokenTime;
    if (age < TOKEN_TTL_MS) {
      return cachedToken;
    }
  }

  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    console.error(
      "❌ Shiprocket credentials missing. Please set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in .env"
    );
    throw new Error("Shiprocket credentials not configured");
  }

  try {
    const res = await axios.post(
      `${SHIPROCKET_BASE_URL}/external/auth/login`,
      {
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD,
      }
    );

    if (!res.data || !res.data.token) {
      throw new Error("No token returned from Shiprocket");
    }

    cachedToken = res.data.token;
    cachedTokenTime = Date.now();

    console.log("✅ Shiprocket login successful");
    return cachedToken;
  } catch (err) {
    console.error("❌ Shiprocket login error:", err?.response?.data || err);
    throw new Error("Failed to login to Shiprocket");
  }
}

// Map your Orders document into Shiprocket's FORWARD order payload
function buildShiprocketOrderPayload(orderDoc, extraOptions = {}) {
  if (!orderDoc) {
    throw new Error("orderDoc is required to build Shiprocket payload");
  }

  const payType = (
    extraOptions.paymentType ||
    orderDoc.paymentType ||
    ""
  ).toUpperCase();

  // Shiprocket expects "COD" or "Prepaid"
  const paymentMethod = payType === "COD" ? "COD" : "Prepaid";

  // Address fields
  const billingAddress = orderDoc.address || "";
  const billingPincode = orderDoc.pincode || "";
  const orderId = orderDoc.orderId || String(orderDoc._id);

  const billingCity =
    orderDoc.city || extraOptions.billing_city || DEFAULT_CITY;
  const billingState =
    orderDoc.state || extraOptions.billing_state || DEFAULT_STATE;
  const billingCountry =
    orderDoc.country || extraOptions.billing_country || DEFAULT_COUNTRY;

  const items = Array.isArray(orderDoc.products)
    ? orderDoc.products.map((p, idx) => ({
        name: p.productTitle || `Item ${idx + 1}`,
        sku: p.productId || `SKU-${idx + 1}`,
        units: Number(p.quantity) || 1,
        selling_price: Number(p.price) || 0,
        discount: 0,
        tax: 0,
        hsn: "",
      }))
    : [];

  const subTotal = Number(orderDoc.amount) || 0;

  // Dimensions: ideally from your product model; for now, static safe defaults.
  // You can override via extraOptions.dimensions = { length, breadth, height, weight }
  const dims = extraOptions.dimensions || {
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5,
  };

  const payload = {
    order_id: orderId,
    order_date:
      orderDoc.createdAt?.toISOString?.() ||
      orderDoc.date?.toISOString?.() ||
      new Date().toISOString(),

    pickup_location:
      extraOptions.pickup_location || SHIPROCKET_PICKUP_LOCATION,

    billing_customer_name: orderDoc.name || "Customer",
    billing_last_name: "",
    billing_address: billingAddress,
    billing_city: billingCity,
    billing_pincode: billingPincode,
    billing_state: billingState,
    billing_country: billingCountry,
    billing_email: orderDoc.email || "",
    billing_phone: orderDoc.phoneNumber || DEFAULT_PHONE,

    shipping_is_billing: true,

    order_items: items,
    payment_method: paymentMethod,
    sub_total: subTotal,

    // You can pass shipping_charges / discount / etc. in extraOptions
    shipping_charges: extraOptions.shipping_charges || 0,
    discount: extraOptions.discount || 0,
    total_discount: extraOptions.total_discount || 0,

    // Dimensions
    length: dims.length,
    breadth: dims.breadth,
    height: dims.height,
    weight: dims.weight,
  };

  return payload;
}

// ---------- Reverse pickup payload ----------
//
// For reverse pickup, Shiprocket expects a payload *very similar* to forward
// orders, but via /external/shipments/create/return and usually with:
//   - a new "return order_id" (commonly original + "R")
//   - some reference to the original order/shipment (e.g. reference_order_id)
//   - marked as "return" / "reverse pickup" via specific fields
//
// ⚠️ You MUST verify exact field names against Shiprocket's official docs /
// Postman collection. Adjust keys like `reference_order_id`, `is_return`,
// etc., to match their spec for your account.
function buildShiprocketReversePickupPayload(orderDoc, extraOptions = {}) {
  const base = buildShiprocketOrderPayload(orderDoc, extraOptions);

  const originalOrderId = base.order_id;
  const returnOrderId =
    extraOptions.return_order_id || `${originalOrderId}-R`;

  const payload = {
    ...base,
    order_id: returnOrderId,

    // Common pattern in many integrations:
    //  - reference original order for dashboard mapping
    reference_order_id:
      extraOptions.reference_order_id || originalOrderId,

    // Some merchants mark explicit reverse pickup flags.
    // You MUST confirm exact keys in Shiprocket docs for your account.
    is_return: 1,

    // You could also pass reason / comment if your account supports it:
    reason: extraOptions.reason || "Customer return / reverse pickup",
    comment: extraOptions.comment || "",
  };

  return payload;
}

// ========== Public API (forward shipments) ==========

/**
 * Low-level: call Shiprocket "create adhoc order" endpoint.
 * Returns raw Shiprocket API response.
 */
async function createShiprocketOrderRaw(orderDoc, extraOptions = {}) {
  const token = await getShiprocketToken();
  const payload = buildShiprocketOrderPayload(orderDoc, extraOptions);

  const res = await axios.post(
    `${SHIPROCKET_BASE_URL}/external/orders/create/adhoc`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log(
    "✅ Shiprocket order created for orderId:",
    payload.order_id,
    "→ response:",
    res.data
  );

  return res.data;
}

/**
 * High-level function used by routes/orders.js
 *
 *   const shippingInfo = await createShiprocketOrder(savedOrder, { paymentType });
 *
 * It returns a normalized object that fits Orders.shiprocket:
 *   {
 *     enabled: true,
 *     sr_order_id,
 *     shipment_id,
 *     status,
 *     awb_code,
 *     courier,
 *     label_url,
 *     manifest_url,
 *     tracking_url,
 *     raw
 *   }
 *
 * If anything fails, it throws an Error (caught by syncWithShiprocket).
 */
async function createShiprocketOrder(orderDoc, extraOptions = {}) {
  try {
    const raw = await createShiprocketOrderRaw(orderDoc, extraOptions);

    // Shiprocket responses can vary slightly, so we try multiple keys safely.
    const shippingInfo = {
      enabled: true,

      sr_order_id:
        raw?.order_id ||
        raw?.order_id?.toString?.() ||
        raw?.data?.order_id ||
        null,

      shipment_id:
        raw?.shipment_id ||
        raw?.data?.shipment_id ||
        (Array.isArray(raw?.shipment_id) ? raw.shipment_id[0] : null),

      status:
        raw?.status ||
        raw?.status_code ||
        raw?.current_status ||
        raw?.courier_status ||
        null,

      awb_code:
        raw?.awb_code ||
        raw?.data?.awb_code ||
        raw?.response?.awb_code ||
        null,

      courier:
        raw?.courier_company ||
        raw?.courier_name ||
        raw?.data?.courier_company ||
        null,

      label_url:
        raw?.label_url ||
        raw?.label ||
        raw?.documents_url ||
        null,

      manifest_url:
        raw?.manifest_url ||
        raw?.manifest ||
        null,

      tracking_url:
        raw?.tracking_url ||
        raw?.tracking_page_url ||
        null,

      raw,
    };

    return shippingInfo;
  } catch (err) {
    console.error(
      "❌ Shiprocket create order error:",
      err?.response?.data || err
    );
    throw new Error("Shiprocket order creation failed");
  }
}

// Backwards-compat alias (if you used old name somewhere)
async function createShiprocketOrderFromOrder(orderDoc, extraOptions = {}) {
  return createShiprocketOrder(orderDoc, extraOptions);
}

// ========== Public API (reverse pickup / return shipments) ==========

/**
 * Low-level: create a **reverse pickup** / return shipment in Shiprocket.
 *
 * NOTE: Endpoint & payload here use common conventions:
 *   POST /external/shipments/create/return
 * with a body similar to forward orders.
 *
 * You MUST open Shiprocket's docs / Postman and confirm the exact
 * endpoint and body fields for your account plan – some keys like
 * `reference_order_id`, `is_return` may differ.
 */
async function createShiprocketReversePickupRaw(orderDoc, extraOptions = {}) {
  const token = await getShiprocketToken();
  const payload = buildShiprocketReversePickupPayload(orderDoc, extraOptions);

  const res = await axios.post(
    `${SHIPROCKET_BASE_URL}/external/shipments/create/return`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log(
    "✅ Shiprocket reverse pickup created for orderId:",
    payload.order_id,
    "→ response:",
    res.data
  );

  return res.data;
}

/**
 * High-level helper to be used from Return Requests route when
 * admin sets status to "pickup_scheduled".
 *
 * Example usage in server/routes/returnRequests.js:
 *
 *   const { createShiprocketReversePickup } = require("../utils/shiprocket");
 *   ...
 *   if (status === "pickup_scheduled") {
 *     const order = await Orders.findById(rr.order);
 *     const reverseInfo = await createShiprocketReversePickup(order, {
 *       reason: rr.reason,
 *       comment: rr.description,
 *     });
 *     rr.reversePickup = reverseInfo;
 *     await rr.save();
 *   }
 */
async function createShiprocketReversePickup(orderDoc, extraOptions = {}) {
  try {
    const raw = await createShiprocketReversePickupRaw(
      orderDoc,
      extraOptions
    );

    const info = {
      enabled: true,

      sr_order_id:
        raw?.order_id ||
        raw?.order_id?.toString?.() ||
        raw?.data?.order_id ||
        null,

      shipment_id:
        raw?.shipment_id ||
        raw?.data?.shipment_id ||
        (Array.isArray(raw?.shipment_id) ? raw.shipment_id[0] : null),

      status:
        raw?.status ||
        raw?.status_code ||
        raw?.current_status ||
        raw?.courier_status ||
        null,

      awb_code:
        raw?.awb_code ||
        raw?.data?.awb_code ||
        raw?.response?.awb_code ||
        null,

      courier:
        raw?.courier_company ||
        raw?.courier_name ||
        raw?.data?.courier_company ||
        null,

      label_url:
        raw?.label_url ||
        raw?.label ||
        raw?.documents_url ||
        null,

      manifest_url:
        raw?.manifest_url ||
        raw?.manifest ||
        null,

      tracking_url:
        raw?.tracking_url ||
        raw?.tracking_page_url ||
        null,

      raw,
    };

    return info;
  } catch (err) {
    console.error(
      "❌ Shiprocket reverse pickup error:",
      err?.response?.data || err
    );
    throw new Error("Shiprocket reverse pickup creation failed");
  }
}

module.exports = {
  getShiprocketToken,
  buildShiprocketOrderPayload,
  buildShiprocketReversePickupPayload,
  createShiprocketOrderRaw,
  createShiprocketOrder,
  createShiprocketOrderFromOrder,
  createShiprocketReversePickupRaw,
  createShiprocketReversePickup,
};
