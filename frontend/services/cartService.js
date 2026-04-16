import { CART_KEY, getJson, setJson } from "../utils/storage.js";
import { getCurrentUser } from "./authService.js";

let remoteBound = false;

export function getLocalCart() {
  return getJson(CART_KEY, []);
}

export function setLocalCart(cart) {
  setJson(CART_KEY, cart);
  try {
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: cart }));
  } catch {
    // ignore event dispatch failures
  }
}

function showToastSafe(message) {
  try {
    window.dispatchEvent(new CustomEvent("vastra-toast", { detail: message }));
  } catch {
    // ignore
  }
}

function ensureRemoteCartBound() {
  if (remoteBound) return;
  remoteBound = true;

  const bind = () => {
    if (!window.firebaseApi?.subscribeCart) return;
    window.firebaseApi.subscribeCart((items) => {
      setLocalCart(items || []);
    });
  };

  if (window.firebaseApi?.subscribeAuth) {
    window.firebaseApi.subscribeAuth((user) => {
      if (!user) {
        setLocalCart([]);
        return;
      }
      bind();
    });
  }

  // Best-effort initial bind once firebaseApi exists.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
}

export function addToCart(product) {
  ensureRemoteCartBound();
  if (!getCurrentUser()) {
    showToastSafe("Please sign in to use cart");
    throw new Error("Please sign in to use cart");
  }
  const cart = getLocalCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty += 1;
    if (product?.selectedSize && !existing.selectedSize) existing.selectedSize = product.selectedSize;
    if (product?.selectedSize && existing.selectedSize && existing.selectedSize !== product.selectedSize) {
      existing.selectedSize = product.selectedSize;
    }
  } else cart.push({ ...product, qty: 1 });
  setLocalCart(cart);
  window.firebaseApi?.upsertCartItem?.(product, 1).catch((error) => console.error("[cart] upsert failed", error));
  return cart;
}

export function subscribeCart(listener) {
  ensureRemoteCartBound();
  if (typeof listener !== "function") return () => {};
  const handler = (event) => listener(event.detail || []);
  window.addEventListener("cart-updated", handler);
  listener(getLocalCart());
  return () => window.removeEventListener("cart-updated", handler);
}

export async function setCartItemQty(id, qty) {
  ensureRemoteCartBound();
  if (!getCurrentUser()) throw new Error("Please sign in to use cart");
  await window.firebaseApi.setCartItemQty(String(id), Number(qty));
}

export async function removeCartItem(id) {
  ensureRemoteCartBound();
  if (!getCurrentUser()) throw new Error("Please sign in to use cart");
  await window.firebaseApi.removeCartItem(String(id));
}
