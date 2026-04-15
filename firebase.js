/* Firebase order persistence with safe fallback */
(function initVastraFirebase(global) {
  const ORDERS_FALLBACK_KEY = "vastra_orders_fallback";

  // Replace placeholders with your own Firebase project values.
  const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  let firestore = null;

  function canUseFirebase() {
    return (
      global.firebase &&
      global.firebase.apps &&
      typeof global.firebase.initializeApp === "function" &&
      firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY"
    );
  }

  function initFirebaseIfAvailable() {
    if (!canUseFirebase()) return null;

    if (!global.firebase.apps.length) {
      global.firebase.initializeApp(firebaseConfig);
    }
    firestore = global.firebase.firestore();
    return firestore;
  }

  async function saveOrderToFirestore(order) {
    const db = initFirebaseIfAvailable();
    if (db) {
      const docRef = await db.collection("orders").add({
        ...order,
        createdAt: global.firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    }

    // Fallback for demo/test mode until Firebase config is filled.
    const fallbackOrders = JSON.parse(localStorage.getItem(ORDERS_FALLBACK_KEY) || "[]");
    const fallbackId = "demo_" + Date.now();
    fallbackOrders.push({
      id: fallbackId,
      ...order,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(ORDERS_FALLBACK_KEY, JSON.stringify(fallbackOrders));
    return fallbackId;
  }

  global.VastraFirebase = {
    saveOrderToFirestore
  };
})(window);
