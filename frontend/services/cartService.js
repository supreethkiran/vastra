import { getCurrentUser } from "./authService.js";

let cartState = [];
const listeners = new Set();
let remoteBound = false;
let unsubAuth = null;
let unsubCart = null;

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

function notifyCartListeners() {
  listeners.forEach((listener) => {
    try {
      listener(cartState);
    } catch {
      // ignore
    }
  });
}

function bindRemoteCartOnce() {
  if (remoteBound) return;
  remoteBound = true;

  const start = async () => {
    try {
      if (window.firebaseReady) await window.firebaseReady;
      if (!window.firebaseApi?.subscribeAuth || !window.firebaseApi?.subscribeCart) return;

      unsubAuth?.();
      unsubAuth = window.firebaseApi.subscribeAuth((user) => {
        // reset cart listener on auth changes
        try {
          unsubCart?.();
        } catch {
          // ignore
        }
        unsubCart = null;

        if (!user) {
          setCartState([]);
          return;
        }
        unsubCart = window.firebaseApi.subscribeCart((items) => setCartState(items));
      });
    } catch (e) {
      console.error("[cart] remote bind failed", e);
    }
  };

  start();
}

export function addToCart(product) {
  bindRemoteCartOnce();
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
  // Optimistic UI update (Firestore snapshot will reconcile)
  const existing = cartState.find((item) => String(item.id) === payload.id);
  if (existing) existing.qty = Math.max(1, Number(existing.qty || 0) + 1);
  else cartState = [...cartState, { ...payload, qty: 1 }];
  notifyCartListeners();

  window.firebaseApi?.upsertCartItem?.(payload, 1).catch((error) => {
    console.error("[cart] upsert failed", error);
    showToastSafe(error?.message || "Unable to add to cart");
  });
  return cartState;
}

export function subscribeCart(listener) {
  bindRemoteCartOnce();
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  listener(cartState);

  return () => {
    listeners.delete(listener);
  };
}

export async function setCartItemQty(id, qty) {
  bindRemoteCartOnce();
  if (!getCurrentUser() && !window.firebaseApi?.getCurrentUser?.()) throw new Error("Please sign in to use cart");
  await window.firebaseApi.setCartItemQty(String(id), Number(qty));
}

export async function removeCartItem(id) {
  bindRemoteCartOnce();
  if (!getCurrentUser() && !window.firebaseApi?.getCurrentUser?.()) throw new Error("Please sign in to use cart");
  await window.firebaseApi.removeCartItem(String(id));
}
