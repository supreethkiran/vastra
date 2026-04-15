import { getLocalCart, setLocalCart, syncCartToBackend } from "../services/cartService.js";
import { showToast } from "../components/toast.js";

function total(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
}

export async function cartPage(app) {
  const cart = getLocalCart();
  if (!cart.length) {
    app.innerHTML = `
      <h1 class="section-title">Cart</h1>
      <div class="card empty-state fade-in">
        <p class="muted">Your cart is empty.</p>
        <a href="#/" class="btn" style="display:inline-block;margin-top:8px;">Continue Shopping</a>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <h1 class="section-title">Cart</h1>
    <div class="stack fade-in">
      ${cart
        .map(
          (item) => `
          <article class="card row" style="padding:12px;">
            <div class="row">
              <img src="${item.image}" alt="${item.name}" style="width:60px;height:60px;border-radius:8px;object-fit:cover;">
              <div>
                <p>${item.name}</p>
                <p class="price">₹${Number(item.price).toLocaleString("en-IN")}</p>
              </div>
            </div>
            <div class="row">
              <button class="btn" data-dec="${item.id}">-</button>
              <span>${item.qty}</span>
              <button class="btn" data-inc="${item.id}">+</button>
              <button class="btn" data-remove="${item.id}">Remove</button>
            </div>
          </article>
        `
        )
        .join("")}
      <div class="card row" style="padding:12px;">
        <strong>Total</strong>
        <strong class="price">₹${total(cart).toLocaleString("en-IN")}</strong>
      </div>
      <button id="checkoutBtn" class="btn primary">Proceed to Checkout</button>
    </div>
  `;

  function updateCart(nextCart) {
    setLocalCart(nextCart);
    cartPage(app);
  }

  cart.forEach((item) => {
    app.querySelector(`[data-inc="${item.id}"]`)?.addEventListener("click", () => {
      const next = getLocalCart().map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      updateCart(next);
    });
    app.querySelector(`[data-dec="${item.id}"]`)?.addEventListener("click", () => {
      const next = getLocalCart()
        .map((c) => (c.id === item.id ? { ...c, qty: c.qty - 1 } : c))
        .filter((c) => c.qty > 0);
      updateCart(next);
    });
    app.querySelector(`[data-remove="${item.id}"]`)?.addEventListener("click", () => {
      updateCart(getLocalCart().filter((c) => c.id !== item.id));
    });
  });

  document.getElementById("checkoutBtn").addEventListener("click", async () => {
    const btn = document.getElementById("checkoutBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    await syncCartToBackend().catch(() => {});
    showToast("Cart synced");
    location.hash = "#/checkout";
  });
}
