export const TOKEN_KEY = "vastra_token";
export const USER_KEY = "vastra_user";
export const CART_KEY = "vastra_cart";
export const WISHLIST_KEY = "vastra_wishlist";

export function getJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

export function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
