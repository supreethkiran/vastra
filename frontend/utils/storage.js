export const TOKEN_KEY = "vastra_token";
export const USER_KEY = "vastra_user";
export const CART_KEY = "vastra_cart";
export const WISHLIST_KEY = "vastra_wishlist";
export const LAST_ORDER_KEY = "vastra_last_order";

const memoryStore = new Map();

function canUseLocalStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const k = "__vastra_ls_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function getJson(key, fallback) {
  try {
    const raw = canUseLocalStorage()
      ? window.localStorage.getItem(key)
      : memoryStore.has(key)
        ? memoryStore.get(key)
        : null;
    if (raw === null || raw === undefined || raw === "") return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export function setJson(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (canUseLocalStorage()) {
      window.localStorage.setItem(key, raw);
      return;
    }
  } catch {
    // fall back to memory
  }
  memoryStore.set(key, raw);
}

export function removeJson(key) {
  try {
    if (canUseLocalStorage()) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch {
    // fall back to memory
  }
  memoryStore.delete(key);
}
