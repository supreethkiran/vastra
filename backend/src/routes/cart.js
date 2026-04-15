const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { readDb, writeDb } = require("../utils/fileDb");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const db = readDb();
  const cart = db.carts[req.user.id] || [];
  res.json({ cart });
});

router.put("/", requireAuth, (req, res) => {
  const { cart } = req.body;
  if (!Array.isArray(cart)) return res.status(400).json({ message: "cart must be an array" });

  const db = readDb();
  db.carts[req.user.id] = cart;
  writeDb(db);
  res.json({ cart });
});

module.exports = router;
