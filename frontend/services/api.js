import { TOKEN_KEY, getJson } from "../utils/storage.js";

const apiBaseFromMeta = document.querySelector('meta[name="api-base"]')?.getAttribute("content");
export const API_BASE = apiBaseFromMeta || `${window.location.origin}/api`;

export async function api(path, options = {}) {
  const storedToken = getJson(TOKEN_KEY, "");
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 12000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (storedToken) headers.Authorization = `Bearer ${storedToken}`;
  try {
    if (window.auth?.currentUser && !headers.Authorization) {
      try {
        const idToken = await window.auth.currentUser.getIdToken();
        if (idToken) headers.Authorization = `Bearer ${idToken}`;
      } catch {
        // ignore token refresh errors and continue with request
      }
    }
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const statusText = String(response.statusText || "").trim();
      const apiHint = `${response.status}${statusText ? ` ${statusText}` : ""}`;
      const pathHint = `${API_BASE}${path}`;
      const fallbackMessage = `Request failed: ${apiHint} (${pathHint})`;
      throw new Error(String(data.message || "").trim() || fallbackMessage);
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your network and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
