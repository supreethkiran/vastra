import { LAST_ORDER_KEY, getJson } from "../utils/storage.js";

export function successPage(app) {
  const order = getJson(LAST_ORDER_KEY, null);
  app.innerHTML = `
    <div class="card stack fade-in center-card" style="padding:20px;max-width:700px;">
      <h1>Payment Successful</h1>
      <p class="ok">Your order is confirmed.</p>
      <p>Order ID: <strong>${order?.id || "N/A"}</strong></p>
      <p>Total Paid: <strong class="price">₹${Number(order?.totalAmount || 0).toLocaleString("en-IN")}</strong></p>
      <a class="btn primary" href="#/">Continue Shopping</a>
    </div>
  `;
}
