const express = require("express");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { readDb, writeDb } = require("../utils/fileDb");

const router = express.Router();

router.get("/my", requireAuth, (req, res) => {
  const db = readDb();
  const orders = db.orders.filter((o) => o.userId === req.user.id);
  res.json({ orders });
});

router.get("/", requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  res.json({ orders: db.orders });
});

router.post("/", requireAuth, (req, res) => {
  const { products, totalAmount, paymentId, address, razorpay_order_id, razorpay_signature } = req.body;
  if (!Array.isArray(products) || !products.length) {
    return res.status(400).json({ message: "products are required" });
  }

  let paymentVerified = false;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (secret && razorpay_order_id && paymentId && razorpay_signature) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${paymentId}`)
      .digest("hex");
    paymentVerified = expected === razorpay_signature;
    if (!paymentVerified) {
      return res.status(400).json({ message: "Payment verification failed" });
    }
  } else if (process.env.NODE_ENV === "production") {
    return res.status(500).json({ message: "Payment verification is not configured" });
  }

  const db = readDb();
  const order = {
    id: uuidv4(),
    userId: req.user.id,
    userEmail: req.user.email,
    userName: req.user.name,
    products,
    totalAmount: Number(totalAmount || 0),
    paymentId: paymentId || "",
    status: paymentVerified ? "paid" : "paid_unverified_dev",
    paymentVerified,
    address: address || {},
    createdAt: new Date().toISOString()
  };
  db.orders.push(order);
  db.carts[req.user.id] = [];
  writeDb(db);
  return res.status(201).json({ order });
});

module.exports = router;
