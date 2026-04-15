const { getAdminAuth } = require("../utils/firebaseAdmin");

async function requireFirebaseAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const decoded = await getAdminAuth().verifyIdToken(token, true);
    req.firebaseUser = decoded;
    // eslint-disable-next-line no-console
    console.log(`[auth] verified firebase token uid=${decoded.uid}`);
    return next();
  } catch (error) {
    if (/credentials missing|service account/i.test(String(error && error.message))) {
      // eslint-disable-next-line no-console
      console.error("[auth] firebase admin is not configured");
      return res.status(500).json({ message: "Server auth is not configured." });
    }
    // eslint-disable-next-line no-console
    console.warn("[auth] firebase token verification failed");
    return res.status(401).json({ message: "Invalid Firebase token" });
  }
}

module.exports = {
  requireFirebaseAuth
};
