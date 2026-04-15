const admin = require("firebase-admin");

let appInstance = null;

function buildCredentialFromEnv() {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountRaw) return null;
  try {
    const parsed = JSON.parse(serviceAccountRaw);
    return admin.credential.cert(parsed);
  } catch (error) {
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON format");
  }
}

function getFirebaseAdminApp() {
  if (appInstance) return appInstance;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const credential = buildCredentialFromEnv();
  if (!credential) {
    throw new Error("Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON.");
  }
  appInstance = admin.initializeApp({
    credential,
    projectId: projectId || undefined
  });
  return appInstance;
}

function getAdminAuth() {
  return getFirebaseAdminApp().auth();
}

function getAdminDb() {
  return getFirebaseAdminApp().firestore();
}

module.exports = {
  getAdminAuth,
  getAdminDb
};
