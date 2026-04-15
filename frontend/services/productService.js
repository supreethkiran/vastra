import { api } from "./api.js";

export function fetchProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(`/products${query ? `?${query}` : ""}`);
}

export function fetchProduct(id) {
  return api(`/products/${id}`);
}

export function createProduct(payload) {
  return api("/products", { method: "POST", body: JSON.stringify(payload) });
}

export function updateProduct(id, payload) {
  return api(`/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteProduct(id) {
  return api(`/products/${id}`, { method: "DELETE" });
}
