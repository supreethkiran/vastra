import { fetchMyOrders } from "../services/orderService.js";

export async function ordersPage(app) {
  app.innerHTML = '<p class="muted">Loading orders...</p>';
  try {
    const { orders } = await fetchMyOrders();
    if (!orders.length) {
      app.innerHTML = `
        <div class="card empty-state fade-in">
          <p class="muted">No orders yet.</p>
          <a href="#/" class="btn" style="display:inline-block;margin-top:8px;">Start Shopping</a>
        </div>
      `;
      return;
    }

    app.innerHTML = `
      <h1 class="section-title">My Orders</h1>
      <div class="stack fade-in">
        ${orders
          .map(
            (order) => `
            <article class="card stack" style="padding:14px;">
              <div class="row">
                <strong>${order.id}</strong>
                <span class="pill">${new Date(order.createdAt).toLocaleString()}</span>
              </div>
              <p class="muted">${order.products.length} items</p>
              <p class="price">₹${Number(order.totalAmount).toLocaleString("en-IN")}</p>
            </article>
          `
          )
          .join("")}
      </div>
    `;
  } catch (error) {
    app.innerHTML = `<p class="danger">Unable to load orders: ${error.message}</p>`;
  }
}
