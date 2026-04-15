import { getJson, setJson } from "../utils/storage.js";

const RECENT_KEY = "vastra_recent_products";

export function getRecentlyViewed() {
  return getJson(RECENT_KEY, []);
}

export function addRecentlyViewed(product) {
  const current = getRecentlyViewed().filter((item) => item.id !== product.id);
  const updated = [product, ...current].slice(0, 8);
  setJson(RECENT_KEY, updated);
  return updated;
}
