import "/firebase-config.mjs";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const DEFAULT_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let db = null;
let auth = null;
let authUser = null;
let appInitialized = false;
let authObserverBound = false;
const authListeners = new Set();

let authReady = false;
let resolveAuthReady = () => {};
const authReadyPromise = new Promise((resolve) => {
  resolveAuthReady = resolve;
});

let resolveFirebaseReady = () => {};
window.firebaseReady = new Promise((resolve) => {
  resolveFirebaseReady = resolve;
});

let globalErrorLoggingBound = false;
window.__firebaseInitError = null;

function getRuntimeFirebaseConfig() {
  const runtimeConfig = window.VASTRA_FIREBASE_CONFIG;
  if (!runtimeConfig || typeof runtimeConfig !== "object") {
    throw new Error(
      "Firebase config not found. Ensure window.VASTRA_FIREBASE_CONFIG is loaded before firebase-init.js"
    );
  }
  return { ...DEFAULT_CONFIG, ...runtimeConfig };
}

function getMissingConfigFields(firebaseConfig) {
  const missing = [];
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  required.forEach((field) => {
    const value = String(firebaseConfig?.[field] || "").trim();
    const defaultValue = String(DEFAULT_CONFIG[field] || "").trim();
    if (!value || value === defaultValue) {
      missing.push(field);
    }
  });
  return missing;
}

function bindAuthObserverOnce() {
  if (!auth || authObserverBound) return;
  authObserverBound = true;
  onAuthStateChanged(auth, (user) => {
    authUser = user || null;
    authReady = true;
    resolveAuthReady(true);
    
    if (authUser) {
      console.log(`[VASTRA] Auth session active uid=${authUser.uid}`);
    } else {
      console.log("[VASTRA] Auth session cleared");
    }
    
    authListeners.forEach((listener) => {
      try {
        listener(authUser);
      } catch {
        // ignore
      }
    });
  });
}

function initializeFirebaseRuntime(options = {}) {
  if (appInitialized && db && auth) {
    resolveFirebaseReady(true);
    return true;
  }
  try {
    const firebaseConfig = getRuntimeFirebaseConfig();
    const missingFields = getMissingConfigFields(firebaseConfig);
    if (missingFields.length) {
      throw new Error(`Firebase config invalid. Missing fields: ${missingFields.join(", ")}`);
    }

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    window.db = db;
    window.auth = auth;
    appInitialized = true;
    bindAuthObserverOnce();
    console.log("[VASTRA] Firebase app initialized successfully");
    resolveFirebaseReady(true);
    return true;
  } catch (error) {
    console.error("[VASTRA] Firebase init failed:", error);
    window.__firebaseInitError = error;
    resolveFirebaseReady(false);
    return false;
  }
}

function ensureAuthInitialized() {
  if (!auth) {
    throw new Error("Firebase Auth not initialized");
  }
  return auth;
}

async function signInWithGoogle() {
  await ensureFirebaseReady();
  const authInstance = ensureAuthInitialized();
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(authInstance, provider);
    return result.user;
  } catch (error) {
    console.error("Google sign-in failed:", error);
    throw error;
  }
}

function setupRecaptcha(containerId = "recaptcha-container") {
  const authInstance = ensureAuthInitialized();
  const el = document.getElementById(containerId);
  if (!el) throw new Error("reCAPTCHA container missing");
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(
      containerId,
      { size: "invisible" },
      authInstance
    );
  }
  return window.recaptchaVerifier;
}

async function sendOTP(phoneNumber, options = {}) {
  await ensureFirebaseReady();
  const authInstance = ensureAuthInitialized();
  const normalized = String(phoneNumber || "").trim();
  if (!normalized) throw new Error("Phone number is required.");
  const appVerifier = setupRecaptcha(options.containerId || "recaptcha-container");
  const confirmationResult = await signInWithPhoneNumber(authInstance, normalized, appVerifier);
  window.confirmationResult = confirmationResult;
  return true;
}

async function verifyOTP(code) {
  await ensureFirebaseReady();
  const value = String(code || "").trim();
  if (!value) throw new Error("OTP code is required.");
  if (!window.confirmationResult) throw new Error("OTP not requested. Please send OTP first.");
  const result = await window.confirmationResult.confirm(value);
  return result.user;
}

async function ensureFirebaseReady() {
  if (window.firebaseReady) {
    const ready = await window.firebaseReady;
    if (!ready) {
      throw new Error("Firebase initialization failed. Check Firebase config and authorized domains.");
    }
  }
}

initializeFirebaseRuntime();

function toProduct(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: data.id || docSnap.id,
    name: data.name || "Product",
    price: Number(data.price || 0),
    image: data.image || "",
    description: data.description || "",
    category: data.category || "Essentials",
    hoverImage: data.hoverImage || data.image || "",
    badge: data.badge || "",
    badgeType: data.badgeType || ""
  };
}

async function getProducts() {
  if (!db) throw new Error("Firestore not initialized");
  console.log("Fetching products from Firestore...");
  const snapshot = await getDocs(collection(db, "products"));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() || {})
  }));
}

function cartItemsRef() {
  if (!authUser) throw new Error("Please sign in to access your cart.");
  return collection(db, "users", authUser.uid, "cart");
}

function cartItemDoc(itemId) {
  if (!authUser) throw new Error("Please sign in to access your cart.");
  return doc(db, "users", authUser.uid, "cart", String(itemId));
}

function subscribeCart(callback) {
  if (!db) {
    callback([]);
    return () => {};
  }
  let unsubscribeSnapshot = () => {};
  const unsubscribeAuth = subscribeAuth((user) => {
    unsubscribeSnapshot();
    if (!user) {
      callback([]);
      return;
    }
    unsubscribeSnapshot = onSnapshot(
      cartItemsRef(),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: data.id || docSnap.id,
            productId: data.productId || data.id || docSnap.id,
            name: data.name || "Product",
            price: Number(data.price || 0),
            image: data.image || "",
            qty: Math.max(1, Number(data.qty || 1))
          };
        });
        callback(items);
      },
      (error) => {
        // Critical: permission/network errors otherwise look like "empty cart"
        window.__cartSnapshotError = error;
        console.error("[VASTRA][cart] snapshot error:", error);
        callback([]);
      }
    );
  });
  return () => {
    unsubscribeSnapshot();
    unsubscribeAuth();
  };
}

async function upsertCartItem(product, qtyDelta = 1) {
  if (!db) throw new Error("Firestore not initialized");
  if (!authUser) throw new Error("Please sign in to add items to cart.");
  const payload = product && typeof product === "object" ? product : {};
  const clean = {
    id: String(payload.id || "").trim(),
    name: String(payload.name || "").trim(),
    price: Number(payload.price),
    image: String(payload.image || "").trim()
  };
  if (!clean.id || !clean.name || !Number.isFinite(clean.price) || clean.price <= 0 || !clean.image) {
    throw new Error("Invalid product payload.");
  }

  console.log("Writing to Firestore:", clean);
  const itemRef = cartItemDoc(clean.id);
  const current = await getDoc(itemRef);
  const existingQty = current.exists() ? Number((current.data() || {}).qty || 0) : 0;
  const nextQty = existingQty + Number(qtyDelta || 1);
  if (nextQty <= 0) {
    await deleteDoc(itemRef);
    return;
  }
  await setDoc(
    itemRef,
    {
      id: clean.id,
      productId: clean.id,
      name: clean.name,
      price: clean.price,
      image: clean.image,
      qty: nextQty,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

async function setCartItemQty(itemId, qty) {
  if (!db) throw new Error("Firestore not initialized");
  if (!authUser) throw new Error("Please sign in to update cart.");
  const itemRef = cartItemDoc(itemId);
  if (Number(qty) <= 0) {
    await deleteDoc(itemRef);
    return;
  }
  await setDoc(itemRef, { id: String(itemId), qty: Number(qty), updatedAt: serverTimestamp() }, { merge: true });
}

async function removeCartItem(itemId) {
  if (!db) throw new Error("Firestore not initialized");
  if (!authUser) throw new Error("Please sign in to update cart.");
  await deleteDoc(cartItemDoc(itemId));
}

async function clearCart() {
  if (!db) throw new Error("Firestore not initialized");
  if (!authUser) throw new Error("Please sign in to update cart.");
  const snapshot = await getDocs(cartItemsRef());
  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
}

async function getIdToken() {
  if (!authUser) throw new Error("Please sign in first.");
  return authUser.getIdToken();
}

async function postToServer(path, payload) {
  const idToken = await getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(payload || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Server request failed");
  }
  return data;
}

async function createPaymentOrder() {
  return postToServer("/api/secure-checkout/create-payment-order", {});
}

async function finalizePaidOrder(orderInput) {
  const payload = {
    userInfo: orderInput.userInfo || {},
    razorpay_order_id: orderInput.payment?.orderId || "",
    razorpay_payment_id: orderInput.payment?.paymentId || "",
    razorpay_signature: orderInput.payment?.signature || "",
    payment: {
      orderId: orderInput.payment?.orderId || "",
      paymentId: orderInput.payment?.paymentId || "",
      signature: orderInput.payment?.signature || ""
    }
  };
  const data = await postToServer("/api/secure-checkout/finalize-order", payload);
  return data.orderId;
}

async function getOrderById(orderId) {
  if (!db) throw new Error("Firestore not initialized");
  if (!authUser) throw new Error("Please sign in to view your order.");
  const snap = await getDoc(doc(db, "users", authUser.uid, "orders", String(orderId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() || {}) };
}

async function getMyOrders() {
  if (!db) throw new Error("Firestore not initialized");
  if (!authUser) throw new Error("Please sign in to view your orders.");
  const snapshot = await getDocs(collection(db, "users", authUser.uid, "orders"));
  const orders = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
  orders.sort((a, b) => {
    const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : Number(new Date(a.createdAt || 0));
    const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : Number(new Date(b.createdAt || 0));
    return bt - at;
  });
  return orders;
}

async function createProduct(productInput) {
  if (!db) throw new Error("Firestore not initialized");
  if (!authUser) throw new Error("Please sign in first.");
  if (!isAdminUser(authUser)) throw new Error("Admin access required.");

  const payload = productInput && typeof productInput === "object" ? productInput : {};
  const name = String(payload.name || "").trim();
  const image = String(payload.image || payload.imageUrl || "").trim();
  const description = String(payload.description || "").trim();
  const category = String(payload.category || "Essentials").trim() || "Essentials";
  const price = Number(payload.price || 0);
  const secondaryImage = String(payload.secondaryImage || payload.hoverImage || "").trim();
  const thirdImage = String(payload.thirdImage || "").trim();
  const badge = String(payload.badge || "").trim();
  const badgeType = String(payload.badgeType || "").trim();
  const stock = Number(payload.stock || 0);

  if (!name) throw new Error("Product name is required.");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Valid price is required.");
  if (!image) throw new Error("Image URL is required.");

  const ref = doc(collection(db, "products"));
  const data = {
    id: ref.id,
    name,
    price,
    image,
    description,
    category,
    secondaryImage,
    thirdImage,
    badge,
    badgeType,
    stock,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(ref, data, { merge: true });
  return { id: ref.id };
}

function getCurrentUser() {
  return authUser;
}

const analyticsDedup = new Map();
const ANALYTICS_TTL_MS = 4000;

function canSendAnalytics(eventType, metadata) {
  const key = `${String(eventType || "")}:${JSON.stringify(metadata || {})}`;
  const now = Date.now();
  const previous = analyticsDedup.get(key) || 0;
  analyticsDedup.set(key, now);
  if (analyticsDedup.size > 500) {
    const threshold = now - ANALYTICS_TTL_MS;
    analyticsDedup.forEach((timestamp, dedupeKey) => {
      if (timestamp < threshold) analyticsDedup.delete(dedupeKey);
    });
  }
  return now - previous > ANALYTICS_TTL_MS;
}

function trackEvent(eventType, metadata = {}) {
  try {
    if (!canSendAnalytics(eventType, metadata)) return;
    Promise.resolve()
      .then(async () => {
        const headers = { "Content-Type": "application/json" };
        if (authUser) {
          try {
            const token = await authUser.getIdToken();
            headers.Authorization = `Bearer ${token}`;
          } catch {
            // ignore token errors for analytics
          }
        }
        return fetch("/api/analytics/track", {
          method: "POST",
          headers,
          body: JSON.stringify({
            eventType: String(eventType || ""),
            metadata: metadata && typeof metadata === "object" ? metadata : {}
          })
        });
      })
      .catch(() => {});
  } catch {
    // never throw from analytics
  }
}

function isAdminUser(user) {
  const ADMIN_EMAILS = ["admin@vastra.com"];
  const email = String(user?.email || "").toLowerCase();
  return ADMIN_EMAILS.includes(email);
}

async function getAdminDashboard() {
  if (!authUser) throw new Error("Please sign in first.");
  if (!isAdminUser(authUser)) throw new Error("Admin access required.");
  const idToken = await authUser.getIdToken();
  const response = await fetch("/api/admin/dashboard", {
    method: "GET",
    headers: { Authorization: `Bearer ${idToken}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Unable to load admin dashboard.");
  return data;
}

function subscribeAuth(callback) {
  if (typeof callback !== "function") return () => {};
  authListeners.add(callback);
  callback(authUser);
  return () => authListeners.delete(callback);
}

function waitForAuth(options = {}) {
  const requireUser = Boolean(options.requireUser);
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 8000;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    authReadyPromise.then(() => {
      if (requireUser) {
        if (authUser) return finish(authUser);
        // If user is required but not present yet, we wait for a listener update
        const unsub = subscribeAuth((user) => {
          if (user) {
            unsub();
            finish(user);
          }
        });
        setTimeout(() => finish(authUser), timeoutMs);
      } else {
        finish(authUser);
      }
    });

    setTimeout(() => finish(authUser), timeoutMs);
  });
}

async function signUpWithEmail(email, password) {
  await ensureFirebaseReady();
  const authInstance = ensureAuthInitialized();
  console.log("[VASTRA AUTH] Attempting signup...", { email: String(email || "").trim() });
  try {
    const credential = await createUserWithEmailAndPassword(
      authInstance,
      String(email || "").trim(),
      String(password || "")
    );
    console.log("[VASTRA AUTH] Signup success:", credential?.user?.uid || "");
    return credential.user;
  } catch (error) {
    console.error("AUTH ERROR:", error);
    throw new Error(`${error?.code || "auth/unknown"} | ${error?.message || "Unknown auth error"}`);
  }
}

async function signInWithEmail(email, password) {
  await ensureFirebaseReady();
  const authInstance = ensureAuthInitialized();
  console.log("[VASTRA AUTH] Attempting signin...", { email: String(email || "").trim() });
  try {
    const credential = await signInWithEmailAndPassword(
      authInstance,
      String(email || "").trim(),
      String(password || "")
    );
    console.log("[VASTRA AUTH] Signin success:", credential?.user?.uid || "");
    return credential.user;
  } catch (error) {
    console.error("AUTH ERROR:", error);
    throw new Error(`${error?.code || "auth/unknown"} | ${error?.message || "Unknown auth error"}`);
  }
}

async function signOutUser() {
  await ensureFirebaseReady();
  const authInstance = ensureAuthInitialized();
  await signOut(authInstance);
}

window.firebaseApi = {
  getProducts,
  subscribeCart,
  upsertCartItem,
  setCartItemQty,
  removeCartItem,
  clearCart,
  createPaymentOrder,
  finalizePaidOrder,
  getOrderById,
  getMyOrders,
  createProduct,
  getCurrentUser,
  subscribeAuth,
  waitForAuth,
  signInWithGoogle,
  sendOTP,
  verifyOTP,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  trackEvent,
  isAdminUser,
  getAdminDashboard
};

if (typeof window !== "undefined") {
  if (!globalErrorLoggingBound) {
    globalErrorLoggingBound = true;
    window.addEventListener("error", (event) => {
      console.error("[VASTRA][global-error]", {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });
    window.addEventListener("unhandledrejection", (event) => {
      console.error("[VASTRA][unhandled-rejection]", event.reason || event);
    });
  }

  const firePageView = () => {
    trackEvent("page_view", {
      path: window.location.pathname || "",
      hash: window.location.hash || "",
      search: window.location.search || ""
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", firePageView, { once: true });
  } else {
    firePageView();
  }
}
