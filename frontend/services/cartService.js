import { getCurrentUser } from "./authService.js";

let cartState = [];
const listeners = new Set();

function showToastSafe(message) {
  try {
    window.dispatchEvent(new CustomEvent("vastra-toast", { detail: message }));
  } catch {
    // ignore
  }
}

function setCartState(items) {
  cartState = Array.isArray(items) ? items : [];
  listeners.forEach((listener) => {
    try {
      listener(cartState);
    } catch {
      // ignore listener errors
    }
  });
}

export function addToCart(product) {
  if (!getCurrentUser() && !window.firebaseApi?.getCurrentUser?.()) {
    showToastSafe("Please sign in to use cart");
    throw new Error("Please sign in to use cart");
  }
  const stock = Number.isFinite(Number(product?.stock)) ? Number(product.stock) : null;
  if (stock !== null && stock <= 0) {
    showToastSafe("Out of stock");
    throw new Error("Out of stock");
  }
  const payload = {
    id: String(product?.id || ""),
    name: String(product?.name || "Product"),
    price: Number(product?.price || 0),
    image: String(product?.image || "")
  };
  if (!payload.id || !payload.name || !Number.isFinite(payload.price) || payload.price <= 0 || !payload.image) {
    throw new Error("Invalid product payload.");
  }
  window.firebaseApi?.upsertCartItem?.(payload, 1).catch((error) => console.error("[cart] upsert failed", error));
  return cartState;
}

export function subscribeCart(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  listener(cartState);

  let unsubRemote = null;
  const bindRemote = async () => {
    if (window.firebaseReady) await window.firebaseReady;
    if (!window.firebaseApi?.subscribeAuth || !window.firebaseApi?.subscribeCart) return;
    window.firebaseApi.subscribeAuth((user) => {
      unsubRemote?.();
      unsubRemote = null;
      if (!user) {
        setCartState([]);
        return;
      }
      unsubRemote = window.firebaseApi.subscribeCart((items) => setCartState(items));
    });
  };
  bindRemote().catch(() => {});

  return () => {
    listeners.delete(listener);
    try {
      unsubRemote?.();
    } catch {
      // ignore
    }
  };
}

export async function setCartItemQty(id, qty) {
  if (!getCurrentUser() && !window.firebaseApi?.getCurrentUser?.()) throw new Error("Please sign in to use cart");
  await window.firebaseApi.setCartItemQty(String(id), Number(qty));
}

export async function removeCartItem(id) {
  if (!getCurrentUser() && !window.firebaseApi?.getCurrentUser?.()) throw new Error("Please sign in to use cart");
  await window.firebaseApi.removeCartItem(String(id));
}
