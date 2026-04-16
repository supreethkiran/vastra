import { removeCartItem, setCartItemQty, subscribeCart } from "../services/cartService.js";
import { showToast } from "../components/toast.js";

const FREE_SHIPPING_THRESHOLD = 999;

function total(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
}

export async function cartPage(app) {
  const cart = [];

  function render(cartItems) {
    if (!cartItems.length) {
      app.innerHTML = `
        <h1 class="section-title">Cart</h1>
        <div class="card empty-state fade-in">
          <p class="muted">Your cart is empty.</p>
          <a href="#/" class="btn" style="display:inline-block;margin-top:8px;">Continue Shopping</a>
        </div>
      `;
      return;
    }
    const cartTotal = total(cartItems);
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
    app.innerHTML = `
      <h1 class="section-title">Cart</h1>
      <div class="stack fade-in">
      <div class="card" style="padding:12px;">
        <div class="row">
          <span class="muted">${remaining > 0 ? `You're ₹${remaining.toLocaleString("en-IN")} away from free shipping` : "You unlocked free shipping"}</span>
          <span class="pill">Free shipping at ₹${FREE_SHIPPING_THRESHOLD.toLocaleString("en-IN")}</span>
        </div>
        <div class="progress" aria-hidden="true" style="margin-top:10px;">
          <span style="width:${Math.min(100, Math.round((cartTotal / FREE_SHIPPING_THRESHOLD) * 100))}%;"></span>
        </div>
      </div>
      ${cartItems
        .map(
          (item) => `
          <article class="card row" data-row="${item.id}" style="padding:12px;align-items:flex-start;">
            <div class="row" style="justify-content:flex-start;gap:12px;">
              <img src="${item.image}" alt="${item.name}" loading="lazy" decoding="async" style="width:74px;height:74px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,.08);">
              <div class="stack" style="gap:6px;">
                <div style="font-weight:800;line-height:1.2;">${item.name}</div>
                ${item.selectedSize ? `<div class="muted" style="font-size:12px;">Size: ${item.selectedSize}</div>` : ""}
                <div class="row" style="justify-content:flex-start;gap:10px;">
                  <span class="price">₹${Number(item.price).toLocaleString("en-IN")}</span>
                  <span class="pill">x ${item.qty}</span>
                </div>
              </div>
            </div>
            <div class="stack" style="justify-items:end;gap:10px;">
              <span class="qty">
                <button class="btn ghost" data-dec="${item.id}" type="button" aria-label="Decrease quantity">-</button>
                <strong>${item.qty}</strong>
                <button class="btn ghost" data-inc="${item.id}" type="button" aria-label="Increase quantity">+</button>
              </span>
              <button class="btn ghost" data-remove="${item.id}" type="button">Remove</button>
            </div>
          </article>
        `
        )
        .join("")}
      <div class="card row" style="padding:12px;">
        <strong>Total</strong>
        <strong class="price">₹${total(cartItems).toLocaleString("en-IN")}</strong>
      </div>
      <button id="checkoutBtn" class="btn primary">Proceed to Checkout</button>
    </div>
  `;

    cartItems.forEach((item) => {
      app.querySelector(`[data-inc="${item.id}"]`)?.addEventListener("click", () => {
        setCartItemQty(item.id, Number(item.qty || 0) + 1).catch((error) => showToast(error.message || "Unable to update cart"));
      });
      app.querySelector(`[data-dec="${item.id}"]`)?.addEventListener("click", () => {
        setCartItemQty(item.id, Number(item.qty || 0) - 1).catch((error) => showToast(error.message || "Unable to update cart"));
      });
      app.querySelector(`[data-remove="${item.id}"]`)?.addEventListener("click", () => {
        const row = app.querySelector(`[data-row="${CSS.escape(String(item.id))}"]`);
        row?.classList.add("removing");
        setTimeout(() => {
          removeCartItem(item.id).catch((error) => showToast(error.message || "Unable to remove item"));
        }, 160);
      });
    });

    document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
      location.hash = "#/checkout";
    });
  }

  render(cart);
  subscribeCart(render);
}
