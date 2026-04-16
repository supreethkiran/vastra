import { getLocalCart, setLocalCart, syncCartToBackend } from "../services/cartService.js";
import { showToast } from "./toast.js";

const FREE_SHIPPING_THRESHOLD = 999;

function total(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
}

function cartCount(cart) {
  return cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

function formatINR(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function mountMiniCart() {
  if (window.__vastraMiniCartMounted) return window.__vastraMiniCart;
  window.__vastraMiniCartMounted = true;

  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";
  backdrop.id = "miniCartBackdrop";

  const drawer = document.createElement("aside");
  drawer.className = "drawer";
  drawer.id = "miniCartDrawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-label", "Mini cart");

  drawer.innerHTML = `
    <div class="drawer-header">
      <div class="drawer-title">Your Cart</div>
      <button id="miniCartCloseBtn" class="btn ghost" type="button">Close</button>
    </div>
    <div id="miniCartBody" class="drawer-body"></div>
    <div class="drawer-footer">
      <div class="stack" style="gap:6px;">
        <div class="row">
          <span class="muted" id="freeShipMsg"></span>
          <strong id="miniCartTotal" class="price"></strong>
        </div>
        <div class="progress" aria-hidden="true"><span id="freeShipBar"></span></div>
      </div>
      <div class="row" style="gap:10px;">
        <a class="btn ghost" href="#/cart" id="miniCartViewCartLink">View Cart</a>
        <a class="btn primary" href="#/checkout" id="miniCartCheckoutLink">Checkout</a>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  const close = () => {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    document.documentElement.style.overflow = "";
  };
  const open = () => {
    render(getLocalCart());
    drawer.classList.add("open");
    backdrop.classList.add("open");
    document.documentElement.style.overflow = "hidden";
  };

  function setQty(id, nextQty) {
    const current = getLocalCart();
    const next = current
      .map((item) => (String(item.id) === String(id) ? { ...item, qty: Math.max(0, Number(nextQty || 0)) } : item))
      .filter((item) => Number(item.qty || 0) > 0);
    setLocalCart(next);
    syncCartToBackend().catch(() => {});
  }

  function removeItem(rowEl, id) {
    if (rowEl) rowEl.classList.add("removing");
    window.setTimeout(() => {
      const next = getLocalCart().filter((item) => String(item.id) !== String(id));
      setLocalCart(next);
      syncCartToBackend().catch(() => {});
      showToast("Removed from cart");
    }, 160);
  }

  function render(cart) {
    const body = document.getElementById("miniCartBody");
    const totalEl = document.getElementById("miniCartTotal");
    const msgEl = document.getElementById("freeShipMsg");
    const bar = document.getElementById("freeShipBar");

    const t = total(cart);
    totalEl.textContent = formatINR(t);
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - t);
    msgEl.textContent = remaining > 0 ? `You're ${formatINR(remaining)} away from free shipping` : "You unlocked free shipping";
    const pct = Math.min(100, Math.round((t / FREE_SHIPPING_THRESHOLD) * 100));
    bar.style.width = `${pct}%`;

    if (!cart.length) {
      body.innerHTML = `
        <div class="card empty-state" style="padding:18px;">
          <p class="muted">Your cart is empty.</p>
          <a href="#/" class="btn" style="display:inline-block;margin-top:8px;">Shop now</a>
        </div>
      `;
      return;
    }

    body.innerHTML = cart
      .map(
        (item) => `
          <div class="mini-item" data-mini-row="${item.id}">
            <img src="${item.image}" alt="${item.name}" loading="lazy" decoding="async">
            <div class="stack" style="gap:6px;">
              <div style="display:flex;justify-content:space-between;gap:10px;align-items:start;">
                <div>
                  <div style="font-weight:700;line-height:1.2;">${item.name}</div>
                  ${
                    item.selectedSize
                      ? `<div class="muted" style="font-size:12px;margin-top:2px;">Size: ${item.selectedSize}</div>`
                      : ""
                  }
                </div>
                <button class="btn ghost" type="button" data-mini-remove="${item.id}" aria-label="Remove">Remove</button>
              </div>
              <div class="row" style="justify-content:space-between;">
                <span class="price">${formatINR(Number(item.price) * Number(item.qty))}</span>
                <span class="qty">
                  <button class="btn ghost" type="button" data-mini-dec="${item.id}">-</button>
                  <strong>${item.qty}</strong>
                  <button class="btn ghost" type="button" data-mini-inc="${item.id}">+</button>
                </span>
              </div>
            </div>
          </div>
        `
      )
      .join("");

    body.querySelectorAll("[data-mini-inc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.miniInc;
        const item = getLocalCart().find((c) => String(c.id) === String(id));
        if (!item) return;
        setQty(id, Number(item.qty || 0) + 1);
      });
    });
    body.querySelectorAll("[data-mini-dec]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.miniDec;
        const item = getLocalCart().find((c) => String(c.id) === String(id));
        if (!item) return;
        setQty(id, Number(item.qty || 0) - 1);
      });
    });
    body.querySelectorAll("[data-mini-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.miniRemove;
        const row = body.querySelector(`[data-mini-row="${CSS.escape(String(id))}"]`);
        removeItem(row, id);
      });
    });
  }

  function updateNavCount(nextCart) {
    const countEl = document.getElementById("navCartCount");
    if (!countEl) return;
    const count = cartCount(nextCart);
    countEl.textContent = String(count);
    countEl.style.display = count > 0 ? "inline-flex" : "none";
  }

  document.getElementById("miniCartCloseBtn")?.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  window.addEventListener("cart-updated", (event) => {
    const nextCart = event.detail || [];
    updateNavCount(nextCart);
    if (drawer.classList.contains("open")) render(nextCart);
  });

  // initial
  updateNavCount(getLocalCart());

  window.__vastraMiniCart = { open, close, render };
  return window.__vastraMiniCart;
}

