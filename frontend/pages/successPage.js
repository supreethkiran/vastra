import { LAST_ORDER_KEY, getJson } from "../utils/storage.js";

export function successPage(app) {
  const order = getJson(LAST_ORDER_KEY, null);
  app.innerHTML = `
    <div class="card stack fade-in center-card" style="padding:20px;max-width:700px;">
      <div class="success-mark" aria-hidden="true">
        <svg viewBox="0 0 52 52" fill="none">
          <path d="M14 27.5 L22.5 36 L39 18.5" stroke="#57d39b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1>Payment Successful</h1>
      <p class="ok">Your order is confirmed.</p>
      <p>Order ID: <strong>${order?.id || "N/A"}</strong></p>
      <p>Total Paid: <strong class="price">₹${Number(order?.totalAmount || 0).toLocaleString("en-IN")}</strong></p>
      <a class="btn primary" href="#/">Continue Shopping</a>
    </div>
  `;
}
