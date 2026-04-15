import { TOKEN_KEY, getJson } from "../utils/storage.js";

const apiBaseFromMeta = document.querySelector('meta[name="api-base"]')?.getAttribute("content");
export const API_BASE = apiBaseFromMeta || `${window.location.origin}/api`;

export async function api(path, options = {}) {
  const token = getJson(TOKEN_KEY, "");
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 12000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed");
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
