import { getJson, setJson, WISHLIST_KEY } from "../utils/storage.js";

export function getWishlist() {
  return getJson(WISHLIST_KEY, []);
}

export function toggleWishlist(product) {
  const wishlist = getWishlist();
  const exists = wishlist.find((item) => item.id === product.id);
  const updated = exists ? wishlist.filter((item) => item.id !== product.id) : [product, ...wishlist].slice(0, 50);
  setJson(WISHLIST_KEY, updated);
  return { updated, added: !exists };
}

export function isWishlisted(productId) {
  return getWishlist().some((item) => item.id === productId);
}
