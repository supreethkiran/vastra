import { api } from "./api.js";

export function createOrder(payload) {
  return api("/orders", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchMyOrders() {
  return api("/orders/my");
}

export function fetchAllOrders() {
  return api("/orders");
}
