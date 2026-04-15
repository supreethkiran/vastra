import { api } from "./api.js";
import { TOKEN_KEY, USER_KEY } from "../utils/storage.js";

export async function signup(payload) {
  const data = await api("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function login(payload) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch (error) {
    return null;
  }
}
