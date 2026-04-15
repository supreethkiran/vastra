const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

router.post("/create-order", requireAuth, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(200).json({
        mode: "demo",
        order: { id: `demo_order_${Date.now()}`, amount: Math.round(Number(amount) * 100), currency: "INR" }
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });
    return res.json({ mode: "live", order });
  } catch (error) {
    return next(error);
  }
});

router.post("/verify", requireAuth, (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment verification fields" });
  }

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return res.status(500).json({ message: "Payment verification is not configured on server" });
    }
    return res.json({ verified: false, mode: "demo-no-secret" });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const verified = expected === razorpay_signature;
  if (!verified) return res.status(400).json({ verified: false, message: "Payment signature mismatch" });
  return res.json({ verified: true });
});

module.exports = router;
