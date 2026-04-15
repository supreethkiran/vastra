import { api } from "./api.js";
import { TOKEN_KEY, USER_KEY, getJson, setJson, removeJson } from "../utils/storage.js";

export async function signup(payload) {
  const data = await api("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setJson(TOKEN_KEY, data.token);
  setJson(USER_KEY, data.user);
  return data.user;
}

export async function login(payload) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setJson(TOKEN_KEY, data.token);
  setJson(USER_KEY, data.user);
  return data.user;
}

export function logout() {
  removeJson(TOKEN_KEY);
  removeJson(USER_KEY);
}

export function getCurrentUser() {
  return getJson(USER_KEY, null);
}
