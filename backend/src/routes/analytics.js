const express = require("express");
const crypto = require("crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { getAdminDb, getAdminAuth } = require("../utils/firebaseAdmin");

const router = express.Router();

const EVENT_TYPES = new Set([
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "order_completed"
]);

const dedupeCache = new Map();
const DEDUPE_TTL_MS = 5000;

function shouldSkipAsDuplicate(userId, eventType, metadata) {
  const hash = crypto.createHash("sha1").update(JSON.stringify(metadata || {})).digest("hex");
  const key = `${userId || "guest"}|${eventType}|${hash}`;
  const now = Date.now();
  const previous = dedupeCache.get(key) || 0;
  dedupeCache.set(key, now);
  if (dedupeCache.size > 5000) {
    const threshold = now - DEDUPE_TTL_MS;
    for (const [cacheKey, timestamp] of dedupeCache.entries()) {
      if (timestamp < threshold) dedupeCache.delete(cacheKey);
    }
  }
  return now - previous < DEDUPE_TTL_MS;
}

async function resolveOptionalUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token, true);
    return decoded || null;
  } catch {
    return null;
  }
}

router.post("/track", async (req, res, next) => {
  try {
    const { eventType, metadata } = req.body || {};
    if (!EVENT_TYPES.has(String(eventType || ""))) {
      return res.status(400).json({ message: "Invalid event type." });
    }
    const user = await resolveOptionalUser(req);
    const userId = user?.uid || "";
    const safeMetadata = metadata && typeof metadata === "object" ? metadata : {};

    if (shouldSkipAsDuplicate(userId, String(eventType), safeMetadata)) {
      return res.status(202).json({ accepted: true, deduped: true });
    }

    await getAdminDb().collection("analytics_events").add({
      userId,
      eventType: String(eventType),
      metadata: safeMetadata,
      timestamp: FieldValue.serverTimestamp()
    });
    return res.status(202).json({ accepted: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
