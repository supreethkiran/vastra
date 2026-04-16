import { api } from "./api.js";
import { CART_KEY, getJson, setJson } from "../utils/storage.js";
import { getCurrentUser } from "./authService.js";

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

export function addToCart(product) {
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
  return cart;
}

export async function syncCartToBackend() {
  if (!getCurrentUser()) return;
  const cart = getLocalCart();
  await api("/cart", { method: "PUT", body: JSON.stringify({ cart }) });
}

export async function fetchBackendCart() {
  if (!getCurrentUser()) return getLocalCart();
  const data = await api("/cart");
  setLocalCart(data.cart || []);
  return data.cart || [];
}
