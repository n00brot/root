// ============================================================
//  Middleware — Auth Guards
// ============================================================

const config = require("../config/site");

// Require login
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect("/login");
}

// Require admin role
function requireAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "admin") return next();
  res.status(403).render("error", {
    title: "Access Denied",
    message: "You need admin privileges to access this page.",
    config,
  });
}

// Inject site config + user into all views
function injectLocals(req, res, next) {
  const theme = req.user?.settings?.theme || "system";
  res.locals.config = config;
  res.locals.user = req.user || null;
  res.locals.settings = req.user?.settings || {};
  res.locals.themeClass = theme === "light" ? "theme-light" : theme === "dark" ? "theme-dark" : "";
  res.locals.isAdmin = req.user?.role === "admin";
  res.locals.currentPath = req.path;
  next();
}

module.exports = { requireAuth, requireAdmin, injectLocals };
