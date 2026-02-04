// server/utils/shiprocket.js
// Helper for Shiprocket API integration (login + create order)
//
// V3 (enhanced with product shipping dimensions):
//  - Forward shipment: creates a Shiprocket order from your Orders model (COD + Online)
//  - Reverse pickup: creates a Shiprocket return shipment (reverse pickup)
//  - Tracking refresh: fetch latest status for an existing shipment
//  - Returns normalized "shippingInfo" objects that fit Orders.shiprocket
//
// Now uses Product.shippingWeight / shippingLength / shippingBreadth / shippingHeight
// to build package dimensions for Shiprocket.

const axios = require("axios");
const { Product } = require("../models/products"); // 👈 NEW: use product shipping fields

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

const SHIPROCKET_EMAIL =
  process.env.SHIPROCKET_EMAIL || "thriftkart.info@gmail.com";
const SHIPROCKET_PASSWORD =
  process.env.SHIPROCKET_PASSWORD ||
  "lH0v#khD1Lp@4%Fg#LZ7f8*Qd%8fL@j@";

const SHIPROCKET_PICKUP_LOCATION =
  process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";

const DEFAULT_CITY = process.env.SHIPROCKET_DEFAULT_CITY || "Ahmedabad";
const DEFAULT_STATE = process.env.SHIPROCKET_DEFAULT_STATE || "Gujarat";
const DEFAULT_COUNTRY = process.env.SHIPROCKET_DEFAULT_COUNTRY || "India";
const DEFAULT_PHONE = process.env.SHIPROCKET_DEFAULT_PHONE || "9999999999";

// 📦 Fallback package dimensions (cm + kg) if product fields missing
const FALLBACK_DIMENSIONS = {
  length: 10,
  breadth: 10,
  height: 10,
  weight: 0.5, // kg
};

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

// 🔹 NEW: compute dimensions & weight from order.products + Product model
async function computeDimensionsFromProducts(orderDoc) {
  if (!orderDoc || !Array.isArray(orderDoc.products) || !orderDoc.products.length) {
    return { ...FALLBACK_DIMENSIONS };
  }

  let totalWeight = 0;
  let maxLen = 0;
  let maxBrd = 0;
  let maxHgt = 0;

  for (const line of orderDoc.products) {
    const qtyRaw =
      line.quantity || line.units || line.qty || line.count || 1;
    const qty = Number(qtyRaw) > 0 ? Number(qtyRaw) : 1;

    const prodId =
      line.productId || line.prodId || line._id || line.id || null;

    let productDoc = null;
    if (prodId) {
      try {
        productDoc = await Product.findById(prodId).lean();
      } catch (err) {
        console.warn(
          "Shiprocket: Product not found for id in order.products:",
          prodId
        );
      }
    }

    const weight =
      Number(productDoc?.shippingWeight) > 0
        ? Number(productDoc.shippingWeight)
        : FALLBACK_DIMENSIONS.weight;

    const len =
      Number(productDoc?.shippingLength) > 0
        ? Number(productDoc.shippingLength)
        : FALLBACK_DIMENSIONS.length;

    const brd =
      Number(productDoc?.shippingBreadth) > 0
        ? Number(productDoc.shippingBreadth)
        : FALLBACK_DIMENSIONS.breadth;

    const hgt =
      Number(productDoc?.shippingHeight) > 0
        ? Number(productDoc.shippingHeight)
        : FALLBACK_DIMENSIONS.height;

    // Aggregate:
    totalWeight += weight * qty;
    maxLen = Math.max(maxLen, len);
    maxBrd = Math.max(maxBrd, brd);
    maxHgt = Math.max(maxHgt, hgt);
  }

  return {
    length: maxLen || FALLBACK_DIMENSIONS.length,
    breadth: maxBrd || FALLBACK_DIMENSIONS.breadth,
    height: maxHgt || FALLBACK_DIMENSIONS.height,
    weight: totalWeight || FALLBACK_DIMENSIONS.weight,
  };
}

// Map your Orders document into Shiprocket's FORWARD order payload
function buildShiprocketOrderPayload(orderDoc, extraOptions = {}) {
  if (!orderDoc) {
    throw new Error("orderDoc is required to build Shiprocket payload");
  }

  const payType =
    (extraOptions.paymentType || orderDoc.paymentType || "").toUpperCase();

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

  // 📦 Dimensions:
  // - if extraOptions.dimensions is passed, we use that
  // - otherwise caller (createShiprocketOrderRaw / createShiprocketReversePickupRaw)
  //   injects the result of computeDimensionsFromProducts(orderDoc)
  const dims = extraOptions.dimensions || { ...FALLBACK_DIMENSIONS };

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

    // Dimensions (cm + kg)
    length: dims.length,
    breadth: dims.breadth,
    height: dims.height,
    weight: dims.weight,
  };

  return payload;
}

// ---------- Reverse pickup payload ----------
function buildShiprocketReversePickupPayload(orderDoc, extraOptions = {}) {
  const base = buildShiprocketOrderPayload(orderDoc, extraOptions);

  const originalOrderId = base.order_id;
  const returnOrderId =
    extraOptions.return_order_id || `${originalOrderId}-R`;

  const payload = {
    ...base,
    order_id: returnOrderId,

    reference_order_id:
      extraOptions.reference_order_id || originalOrderId,

    is_return: 1,

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

  // 👇 NEW: compute dimensions from Product.shipping* and inject into extraOptions
  const dims = await computeDimensionsFromProducts(orderDoc);

  const payload = buildShiprocketOrderPayload(orderDoc, {
    ...extraOptions,
    dimensions: dims,
  });

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
 */
async function createShiprocketOrder(orderDoc, extraOptions = {}) {
  try {
    const raw = await createShiprocketOrderRaw(orderDoc, extraOptions);

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
        raw?.manifest_url || raw?.manifest || null,

      tracking_url:
        raw?.tracking_url || raw?.tracking_page_url || null,

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

// Backwards-compat alias
async function createShiprocketOrderFromOrder(orderDoc, extraOptions = {}) {
  return createShiprocketOrder(orderDoc, extraOptions);
}

// ========== Public API (reverse pickup / return shipments) ==========

async function createShiprocketReversePickupRaw(orderDoc, extraOptions = {}) {
  const token = await getShiprocketToken();

  // 👇 Use same dimensions logic for reverse pickup
  const dims = await computeDimensionsFromProducts(orderDoc);

  const payload = buildShiprocketReversePickupPayload(orderDoc, {
    ...extraOptions,
    dimensions: dims,
  });

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
        raw?.manifest_url || raw?.manifest || null,

      tracking_url:
        raw?.tracking_url || raw?.tracking_page_url || null,

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

// ========== Public API (tracking refresh) ==========

async function fetchShiprocketTrackingInfo({
  shipment_id,
  awb_code,
  sr_order_id,
} = {}) {
  if (!shipment_id && !awb_code && !sr_order_id) {
    throw new Error(
      "No identifiers provided to fetchShiprocketTrackingInfo (need awb_code, shipment_id, or sr_order_id)"
    );
  }

  const token = await getShiprocketToken();

  let url;
  if (awb_code) {
    url = `${SHIPROCKET_BASE_URL}/external/courier/track/awb/${encodeURIComponent(
      awb_code
    )}`;
  } else if (shipment_id) {
    url = `${SHIPROCKET_BASE_URL}/external/courier/track/shipment/${shipment_id}`;
  } else {
    url = `${SHIPROCKET_BASE_URL}/external/courier/track?order_id=${encodeURIComponent(
      sr_order_id
    )}`;
  }

  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = res.data;

  const status =
    data?.tracking_data?.shipment_status ||
    data?.tracking_data?.track_status ||
    data?.shipment_status ||
    data?.current_status ||
    data?.status ||
    null;

  const trackingUrl =
    data?.tracking_url ||
    data?.tracking_data?.track_url ||
    data?.track_url ||
    null;

  const courierName =
    data?.courier_name ||
    data?.tracking_data?.courier_name ||
    null;

  const awbCode =
    awb_code ||
    data?.awb_code ||
    data?.tracking_data?.awb_code ||
    null;

  return {
    status,
    awb_code: awbCode,
    courier: courierName,
    tracking_url: trackingUrl,
    raw: data,
  };
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
  fetchShiprocketTrackingInfo,
};
