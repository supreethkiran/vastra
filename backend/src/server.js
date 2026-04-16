const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const productRoutes = require("./routes/products");
const secureCheckoutRoutes = require("./routes/secureCheckout");
const analyticsRoutes = require("./routes/analytics");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
      : true
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "vastra-backend" });
});

app.use("/api/products", productRoutes);
app.use("/api/secure-checkout", secureCheckoutRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);

// Legacy JWT/file-db endpoints are intentionally disabled to avoid duplicate sources of truth.
app.use(["/api/auth", "/api/cart", "/api/orders", "/api/payments"], (req, res) => {
  return res.status(410).json({
    message: "Legacy API disabled. Use Firebase Auth + Firestore + /api/secure-checkout."
  });
});
app.get("/admin.html", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../admin.html"));
});
app.get("/admin-upload.html", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../admin-upload.html"));
});
app.get("/1.html", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../1.html"));
});
app.get("/2.html", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../2.html"));
});
app.get("/cart.html", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../cart.html"));
});
app.get("/checkout.html", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../checkout.html"));
});
app.get("/success.html", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../success.html"));
});
app.get("/firebase-config.js", (req, res) => {
  // Single source of truth: serve the committed firebase-config.js file.
  res.set("Cache-Control", "no-store, max-age=0");
  res.type("application/javascript");
  return res.sendFile(path.join(__dirname, "../../firebase-config.js"));
});
app.get("/firebase-config.mjs", (req, res) => {
  res.set("Cache-Control", "no-store, max-age=0");
  res.type("application/javascript");
  return res.sendFile(path.join(__dirname, "../../firebase-config.mjs"));
});
app.get("/firebase-init.js", (req, res) => {
  res.set("Cache-Control", "no-store, max-age=0");
  return res.sendFile(path.join(__dirname, "../../firebase-init.js"));
});
app.use("/", express.static(path.join(__dirname, "../../frontend")));

app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  // eslint-disable-next-line no-console
  console.error("[api-error]", {
    path: req.originalUrl,
    method: req.method,
    status,
    message: error.message || "Internal server error"
  });
  res.status(status).json({ message: error.message || "Internal server error" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`VASTRA running at http://localhost:${PORT}`);
});
