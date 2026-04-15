const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payments");

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

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/", express.static(path.join(__dirname, "../../frontend")));

app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  res.status(status).json({ message: error.message || "Internal server error" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`VASTRA running at http://localhost:${PORT}`);
});
