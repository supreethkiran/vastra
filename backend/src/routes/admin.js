const express = require("express");
const { requireFirebaseAuth } = require("../middleware/firebaseAuth");
const { requireAdminEmail } = require("../middleware/admin");
const { getAdminAuth, getAdminDb } = require("../utils/firebaseAdmin");

const router = express.Router();

function toIso(value) {
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function getStartOfDay(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getStartOfWeek(date = new Date()) {
  const copy = getStartOfDay(date);
  const day = copy.getDay();
  const distanceToMonday = (day + 6) % 7;
  copy.setDate(copy.getDate() - distanceToMonday);
  return copy;
}

router.get("/dashboard", requireFirebaseAuth, requireAdminEmail, async (req, res, next) => {
  try {
    const auth = getAdminAuth();
    const db = getAdminDb();

    const users = [];
    let nextPageToken = undefined;
    do {
      const page = await auth.listUsers(1000, nextPageToken);
      page.users.forEach((user) => {
        users.push({
          uid: user.uid,
          email: user.email || "",
          createdAt: user.metadata?.creationTime || ""
        });
      });
      nextPageToken = page.pageToken;
    } while (nextPageToken);

    const ordersSnapshot = await db.collectionGroup("orders").get();
    const orders = [];
    const now = new Date();
    const startOfDay = getStartOfDay(now);
    const startOfWeek = getStartOfWeek(now);

    let totalRevenue = 0;
    let todayRevenue = 0;
    let weeklyRevenue = 0;
    const purchasedCount = new Map();

    ordersSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const createdAtIso = toIso(data.createdAt);
      const createdAtDate = createdAtIso ? new Date(createdAtIso) : null;
      const total = Number(data.total || 0);
      const parentUserRef = docSnap.ref.parent.parent;
      const userId = parentUserRef ? parentUserRef.id : data.userId || "";

      totalRevenue += total;
      if (createdAtDate && createdAtDate >= startOfDay) todayRevenue += total;
      if (createdAtDate && createdAtDate >= startOfWeek) weeklyRevenue += total;

      const items = Array.isArray(data.items) ? data.items : [];
      items.forEach((item) => {
        const productId = String(item.productId || item.id || "");
        if (!productId) return;
        const qty = Math.max(1, Number(item.qty || 1));
        purchasedCount.set(productId, (purchasedCount.get(productId) || 0) + qty);
      });

      orders.push({
        orderId: docSnap.id,
        userId,
        items,
        total,
        status: data.status || "",
        date: createdAtIso
      });
    });

    const analyticsSnapshot = await db.collection("analytics_events").get();
    const eventCounts = {};
    const productViewedCount = new Map();
    const productAddedCount = new Map();
    const userEventCount = new Map();
    let checkoutStartedCount = 0;
    let orderCompletedCount = 0;

    analyticsSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const eventType = String(data.eventType || "");
      const userId = String(data.userId || "");
      const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
      const productId = String(metadata.productId || metadata.id || "");

      eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
      if (userId) {
        userEventCount.set(userId, (userEventCount.get(userId) || 0) + 1);
      }
      if (eventType === "product_view" && productId) {
        productViewedCount.set(productId, (productViewedCount.get(productId) || 0) + 1);
      }
      if (eventType === "add_to_cart" && productId) {
        productAddedCount.set(productId, (productAddedCount.get(productId) || 0) + 1);
      }
      if (eventType === "checkout_started") checkoutStartedCount += 1;
      if (eventType === "order_completed") orderCompletedCount += 1;
    });

    const checkoutConversionRate =
      checkoutStartedCount > 0 ? Number(((orderCompletedCount / checkoutStartedCount) * 100).toFixed(2)) : 0;

    const toTopList = (map) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([productId, count]) => ({ productId, count }));

    return res.json({
      users,
      orders: orders.sort((a, b) => String(b.date).localeCompare(String(a.date))),
      revenue: {
        today: todayRevenue,
        weekly: weeklyRevenue,
        total: totalRevenue
      },
      analytics: {
        eventCounts,
        byUser: Array.from(userEventCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([userId, count]) => ({ userId, count })),
        mostViewedProducts: toTopList(productViewedCount),
        mostAddedToCartProducts: toTopList(productAddedCount),
        mostPurchasedProducts: toTopList(purchasedCount),
        checkoutConversionRate
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
