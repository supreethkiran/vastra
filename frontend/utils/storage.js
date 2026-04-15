export const TOKEN_KEY = "vastra_token";
export const USER_KEY = "vastra_user";
export const CART_KEY = "vastra_cart";
export const WISHLIST_KEY = "vastra_wishlist";
export const LAST_ORDER_KEY = "vastra_last_order";

const memoryStore = new Map();

export function getJson(key, fallback) {
  try {
    const raw = memoryStore.has(key) ? memoryStore.get(key) : JSON.stringify(fallback);
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export function setJson(key, value) {
  memoryStore.set(key, JSON.stringify(value));
}

export function removeJson(key) {
  memoryStore.delete(key);
}
