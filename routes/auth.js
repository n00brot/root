const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const { queries } = require("../db/database");
const config = require("../config/site");

router.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/dashboard");
  const oauthReady = !!(config.GOOGLE_CLIENT_ID &&
    config.GOOGLE_CLIENT_ID !== "your-google-client-id.apps.googleusercontent.com");
  res.render("login", {
    title: `Sign In — ${config.SITE_NAME}`,
    error: req.query.error === "denied" ? "Access denied. Email not on whitelist." : null,
    oauthReady,
  });
});

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=denied" }),
  (req, res) => {
    queries.logActivity(req.user.id, "login", "Google OAuth", req.ip);
    const returnTo = req.session.returnTo || "/dashboard";
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

router.post("/logout", (req, res, next) => {
  if (req.user) queries.logActivity(req.user.id, "logout", null, req.ip);
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect("/"));
  });
});

module.exports = router;
