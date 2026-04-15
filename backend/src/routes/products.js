const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb } = require("../utils/fileDb");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  const { search = "", category = "" } = req.query;
  const db = readDb();
  const normalizedSearch = String(search).toLowerCase();
  const normalizedCategory = String(category).toLowerCase();

  const products = db.products.filter((p) => {
    const matchesSearch =
      !normalizedSearch ||
      p.name.toLowerCase().includes(normalizedSearch) ||
      p.description.toLowerCase().includes(normalizedSearch);
    const matchesCategory = !normalizedCategory || p.category.toLowerCase() === normalizedCategory;
    return matchesSearch && matchesCategory;
  });

  res.json({ products });
});

router.get("/:id", (req, res) => {
  const db = readDb();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  return res.json({ product });
});

router.post("/", requireAuth, requireAdmin, (req, res) => {
  const { name, category, price, image, description, stock } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ message: "name, category and price are required" });
  }

  const db = readDb();
  const product = {
    id: uuidv4(),
    name,
    category,
    price: Number(price),
    image: image || "",
    description: description || "",
    stock: Number(stock || 0)
  };
  db.products.push(product);
  writeDb(db);
  return res.status(201).json({ product });
});

router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  const index = db.products.findIndex((p) => p.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: "Product not found" });

  db.products[index] = { ...db.products[index], ...req.body };
  writeDb(db);
  return res.json({ product: db.products[index] });
});

router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  const before = db.products.length;
  db.products = db.products.filter((p) => p.id !== req.params.id);
  if (db.products.length === before) return res.status(404).json({ message: "Product not found" });
  writeDb(db);
  return res.json({ message: "Product deleted" });
});

module.exports = router;
