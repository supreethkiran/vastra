const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { FieldValue } = require("firebase-admin/firestore");
const { requireFirebaseAuth } = require("../middleware/firebaseAuth");
const { getAdminDb } = require("../utils/firebaseAdmin");

const router = express.Router();

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function resolveProductByFlexibleId(db, candidateId) {
  if (!candidateId) return null;
  const byDocId = await db.collection("products").doc(String(candidateId)).get();
  if (byDocId.exists) return { id: byDocId.id, ...(byDocId.data() || {}) };

  const byField = await db.collection("products").where("id", "==", String(candidateId)).limit(1).get();
  if (!byField.empty) {
    const doc = byField.docs[0];
    return { id: doc.id, ...(doc.data() || {}) };
  }
  return null;
}

async function getServerPricedCart(uid) {
  const db = getAdminDb();
  const cartSnapshot = await db.collection("users").doc(uid).collection("cart").get();
  if (cartSnapshot.empty) return { items: [], total: 0, invalidCount: 0 };

  const pricedItems = [];
  let invalidCount = 0;
  for (const docSnap of cartSnapshot.docs) {
    const cartItem = docSnap.data() || {};
    const qty = Math.max(1, Number(cartItem.qty || 1));
    const productLookupId = cartItem.productId || cartItem.id || docSnap.id;
    const product = await resolveProductByFlexibleId(db, productLookupId);
    if (!product) {
      invalidCount += 1;
      continue;
    }
    const unitPrice = Number(product.price || 0);
    if (!unitPrice || unitPrice <= 0) {
      invalidCount += 1;
      continue;
    }
    pricedItems.push({
      id: cartItem.id || docSnap.id,
      productId: product.id,
      name: product.name || cartItem.name || "Product",
      image: product.image || cartItem.image || "",
      qty,
      price: unitPrice
    });
  }
  const total = pricedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { items: pricedItems, total, invalidCount };
}

function getCartFingerprint(items) {
  const normalized = (items || [])
    .map((item) => ({
      productId: String(item.productId || ""),
      qty: Number(item.qty || 0),
      price: Number(item.price || 0)
    }))
    .sort((a, b) => `${a.productId}`.localeCompare(`${b.productId}`));
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

router.post("/create-payment-order", requireFirebaseAuth, async (req, res, next) => {
  try {
    const uid = req.firebaseUser.uid;
    const { total, items, invalidCount } = await getServerPricedCart(uid);
    if (!items.length || total <= 0) {
      return res.status(400).json({ message: "Cart is empty or invalid." });
    }
    if (invalidCount > 0) {
      return res.status(409).json({ message: "Cart contains unavailable items. Please refresh cart." });
    }
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({ message: "Payment gateway is not configured." });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt: `vastra_${uid}_${Date.now()}`
    });

    // Persist a server-side payment attempt to enforce idempotent finalization.
    const db = getAdminDb();
    const paymentAttemptRef = db.collection("users").doc(uid).collection("paymentAttempts").doc(order.id);
    await paymentAttemptRef.set({
      orderId: order.id,
      expectedAmountPaise: Number(order.amount || 0),
      expectedAmountInr: total,
      currency: order.currency || "INR",
      cartFingerprint: getCartFingerprint(items),
      status: "created",
      createdAt: FieldValue.serverTimestamp()
    });

    // eslint-disable-next-line no-console
    console.log(`[secure-checkout] payment order created uid=${uid} orderId=${order.id} amount=${order.amount}`);

    return res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      order,
      cartPreview: {
        total,
        count: items.reduce((sum, item) => sum + item.qty, 0)
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/finalize-order", requireFirebaseAuth, async (req, res, next) => {
  try {
    const uid = req.firebaseUser.uid;
    const { userInfo, payment } = req.body;
    const razorpayOrderId = payment?.orderId || "";
    const paymentId = payment?.paymentId || "";
    const signature = payment?.signature || "";

    if (!razorpayOrderId || !paymentId || !signature) {
      return res.status(400).json({ message: "Missing payment verification fields." });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "Payment verification is not configured." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpayOrderId}|${paymentId}`)
      .digest("hex");
    if (expectedSignature !== signature) {
      // eslint-disable-next-line no-console
      console.warn(`[secure-checkout] signature mismatch uid=${uid} orderId=${razorpayOrderId}`);
      return res.status(400).json({ message: "Payment signature mismatch." });
    }

    const { items, total, invalidCount } = await getServerPricedCart(uid);
    if (!items.length || total <= 0) {
      return res.status(400).json({ message: "Cart is empty or invalid." });
    }
    if (invalidCount > 0) {
      return res.status(409).json({ message: "Cart contains unavailable items. Please refresh cart." });
    }

    const db = getAdminDb();
    const attemptRef = db.collection("users").doc(uid).collection("paymentAttempts").doc(razorpayOrderId);
    const existingOrderRef = db.collection("users").doc(uid).collection("orders").doc(paymentId);
    const cartFingerprint = getCartFingerprint(items);
    const cartSnapshot = await db.collection("users").doc(uid).collection("cart").get();

    let responsePayload = null;
    await db.runTransaction(async (tx) => {
      const [attemptSnap, existingOrderSnap] = await Promise.all([tx.get(attemptRef), tx.get(existingOrderRef)]);
      if (!attemptSnap.exists) {
        throw Object.assign(new Error("Unknown payment order. Please restart checkout."), { status: 409 });
      }
      const attemptData = attemptSnap.data() || {};
      if (Number(attemptData.expectedAmountPaise || 0) !== Math.round(total * 100)) {
        throw Object.assign(new Error("Amount mismatch during verification."), { status: 409 });
      }
      if ((attemptData.currency || "INR") !== "INR") {
        throw Object.assign(new Error("Unsupported currency in payment verification."), { status: 409 });
      }
      if ((attemptData.cartFingerprint || "") !== cartFingerprint) {
        throw Object.assign(new Error("Cart changed during payment. Please retry checkout."), { status: 409 });
      }
      if (existingOrderSnap.exists) {
        const existingOrder = existingOrderSnap.data() || {};
        responsePayload = {
          orderId: existingOrderSnap.id,
          total: Number(existingOrder.total || 0),
          itemCount: Array.isArray(existingOrder.items)
            ? existingOrder.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
            : 0
        };
        tx.set(
          attemptRef,
          { status: "completed", paymentId, completedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
        return;
      }

      const orderPayload = {
        userId: uid,
        items,
        total,
        status: "paid",
        userInfo: userInfo || {},
        payment: {
          orderId: razorpayOrderId,
          id: paymentId,
          signature
        },
        createdAt: FieldValue.serverTimestamp()
      };
      tx.set(existingOrderRef, orderPayload);
      tx.set(
        attemptRef,
        { status: "completed", paymentId, completedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      responsePayload = {
        orderId: existingOrderRef.id,
        total,
        itemCount: items.reduce((sum, item) => sum + item.qty, 0)
      };
    });

    if (!cartSnapshot.empty) {
      const batch = db.batch();
      cartSnapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
    }

    // eslint-disable-next-line no-console
    console.log(`[secure-checkout] order finalized uid=${uid} orderId=${responsePayload.orderId} paymentId=${paymentId}`);
    return res.status(201).json(responsePayload);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
