const ADMIN_EMAILS = ["admin@vastra.com"];

function requireAdminEmail(req, res, next) {
  const email = String(req.firebaseUser?.email || "").toLowerCase();
  const isAdmin = ADMIN_EMAILS.map((value) => value.toLowerCase()).includes(email);
  if (!isAdmin) {
    return res.status(403).json({ message: "Admin access required." });
  }
  return next();
}

module.exports = {
  ADMIN_EMAILS,
  requireAdminEmail
};
