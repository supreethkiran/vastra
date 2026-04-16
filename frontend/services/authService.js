import { TOKEN_KEY, USER_KEY, getJson, setJson, removeJson } from "../utils/storage.js";

const ADMIN_EMAILS = ["admin@vastra.com", "admin@vastra.shop"];

async function ensureFirebaseAuthApi() {
  if (window.firebaseReady) {
    const ready = await window.firebaseReady;
    if (!ready) throw new Error("Firebase initialization failed.");
  }
  if (!window.firebaseApi || typeof window.firebaseApi.signInWithEmail !== "function") {
    throw new Error("Firebase auth service unavailable.");
  }
  return window.firebaseApi;
}

function toAppUser(firebaseUser, fallbackName = "") {
  if (!firebaseUser) return null;
  const email = String(firebaseUser.email || "").toLowerCase();
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || fallbackName || email.split("@")[0] || "User",
    email,
    role: ADMIN_EMAILS.includes(email) ? "admin" : "user"
  };
}

async function persistSession(firebaseUser, fallbackName = "") {
  const user = toAppUser(firebaseUser, fallbackName);
  if (!user) throw new Error("User session unavailable.");
  const token = typeof firebaseUser.getIdToken === "function" ? await firebaseUser.getIdToken() : "";
  if (token) setJson(TOKEN_KEY, token);
  setJson(USER_KEY, user);
  return user;
}

export async function signup(payload) {
  const api = await ensureFirebaseAuthApi();
  const firebaseUser = await api.signUpWithEmail(payload.email, payload.password);
  return persistSession(firebaseUser, payload.name);
}

export async function login(payload) {
  const api = await ensureFirebaseAuthApi();
  const firebaseUser = await api.signInWithEmail(payload.email, payload.password);
  return persistSession(firebaseUser);
}

export function logout() {
  window.firebaseApi?.signOutUser?.().catch(() => {});
  removeJson(TOKEN_KEY);
  removeJson(USER_KEY);
}

export function getCurrentUser() {
  const storedUser = getJson(USER_KEY, null);
  if (storedUser && storedUser.email) return storedUser;
  const firebaseUser = window.auth?.currentUser || window.firebaseApi?.getCurrentUser?.() || null;
  if (!firebaseUser) return null;
  const derived = toAppUser(firebaseUser);
  if (derived) setJson(USER_KEY, derived);
  return derived;
}

// Keep SPA session in sync with Firebase auth (persists across refresh)
(async function bindAuthPersistence() {
  try {
    if (window.firebaseReady) await window.firebaseReady;
    if (!window.firebaseApi?.subscribeAuth) return;
    window.firebaseApi.subscribeAuth(async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          removeJson(TOKEN_KEY);
          removeJson(USER_KEY);
          return;
        }
        await persistSession(firebaseUser);
      } catch (e) {
        console.warn("[auth] session persist failed", e);
      }
    });
  } catch {
    // ignore
  }
})();
