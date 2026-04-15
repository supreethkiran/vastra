import { fetchMyOrders } from "../services/orderService.js";

function getOrderProgress(createdAt) {
  const ageHrs = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (ageHrs > 48) return "Delivered";
  if (ageHrs > 8) return "Shipped";
  return "Ordered";
}

export async function trackPage(app) {
  app.innerHTML = '<p class="muted">Loading tracking details...</p>';
  try {
    const { orders } = await fetchMyOrders();
    if (!orders.length) {
      app.innerHTML = `
        <div class="card empty-state">
          <p class="muted">No orders to track yet.</p>
          <a href="#/" class="btn" style="display:inline-block;margin-top:8px;">Shop now</a>
        </div>
      `;
      return;
    }
    app.innerHTML = `
      <h1 class="section-title">Order Tracking</h1>
      <div class="stack fade-in">
        ${orders
          .map((order) => {
            const status = getOrderProgress(order.createdAt);
            return `
              <article class="card stack" style="padding:14px;">
                <div class="row">
                  <strong>${order.id}</strong>
                  <span class="pill">${status}</span>
                </div>
                <p class="muted">${new Date(order.createdAt).toLocaleString()}</p>
                <div class="row">
                  <span>Ordered</span><span class="${status === "Ordered" ? "ok" : "muted"}">●</span>
                </div>
                <div class="row">
                  <span>Shipped</span><span class="${status === "Shipped" ? "ok" : status === "Delivered" ? "ok" : "muted"}">●</span>
                </div>
                <div class="row">
                  <span>Delivered</span><span class="${status === "Delivered" ? "ok" : "muted"}">●</span>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  } catch (error) {
    app.innerHTML = `<p class="danger">${error.message}</p>`;
  }
}
