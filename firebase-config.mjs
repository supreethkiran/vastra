// Single Firebase config source for module consumers (Vercel-safe).
// Also assigns to window for legacy scripts.
const VASTRA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBTsjYZ4zD5pG0yt8Cjt6mUTUuusJHB8b4",
  authDomain: "vastra-94b01.firebaseapp.com",
  projectId: "vastra-94b01",
  storageBucket: "vastra-94b01.appspot.com",
  messagingSenderId: "822065045989",
  appId: "1:822065045989:web:66088cc0078132ddb64f0c"
};

if (typeof window !== "undefined") {
  window.VASTRA_FIREBASE_CONFIG = window.VASTRA_FIREBASE_CONFIG || VASTRA_FIREBASE_CONFIG;
}

export default VASTRA_FIREBASE_CONFIG;

