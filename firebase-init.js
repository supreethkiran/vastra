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
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const DEFAULT_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const runtimeConfig = window.VASTRA_FIREBASE_CONFIG || {};
const firebaseConfig = { ...DEFAULT_CONFIG, ...runtimeConfig };

let db = null;
let auth = null;
let authUser = null;
const authListeners = new Set();

function isConfigValid() {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== DEFAULT_CONFIG.apiKey &&
    firebaseConfig.projectId !== DEFAULT_CONFIG.projectId
  );
}

try {
  if (!isConfigValid()) {
    throw new Error("Firebase config missing. Set window.VASTRA_FIREBASE_CONFIG before loading firebase-init.js");
  }
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  window.db = db;
  window.auth = auth;
  console.log("[VASTRA] Firebase connected successfully");
} catch (error) {
  console.error("[VASTRA] Firebase initialization failed:", error.message);
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    authUser = user || null;
    if (authUser) {
      console.log(`[VASTRA] Auth session active uid=${authUser.uid}`);
    } else {
      console.log("[VASTRA] Auth session cleared");
    }
    authListeners.forEach((listener) => {
      try {
        listener(authUser);
      } catch {
        // ignore listener errors
      }
    });
  });
}

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
  const snapshot = await getDocs(collection(db, "products"));
  return snapshot.docs.map(toProduct);
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
    unsubscribeSnapshot = onSnapshot(cartItemsRef(), (snapshot) => {
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
    });
  });
  return () => {
    unsubscribeSnapshot();
    unsubscribeAuth();
  };
}

async function upsertCartItem(product, qtyDelta = 1) {
  if (!db) throw new Error("Firestore not initialized");
  if (!authUser) throw new Error("Please sign in to add items to cart.");
  const itemRef = cartItemDoc(product.id);
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
      id: String(product.id),
      productId: String(product.productId || product.id),
      name: product.name || "Product",
      price: Number(product.price || 0),
      image: product.image || "",
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

async function signUpWithEmail(email, password) {
  if (!auth) throw new Error("Authentication unavailable");
  const credential = await createUserWithEmailAndPassword(auth, String(email || "").trim(), String(password || ""));
  return credential.user;
}

async function signInWithEmail(email, password) {
  if (!auth) throw new Error("Authentication unavailable");
  const credential = await signInWithEmailAndPassword(auth, String(email || "").trim(), String(password || ""));
  return credential.user;
}

async function signOutUser() {
  if (!auth) throw new Error("Authentication unavailable");
  await signOut(auth);
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
  getCurrentUser,
  subscribeAuth,
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  trackEvent,
  isAdminUser,
  getAdminDashboard
};

window.firebaseReady = Promise.resolve(Boolean(db && auth));

if (typeof window !== "undefined") {
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
