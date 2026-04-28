const express = require("express");
const { execFileSync } = require("child_process");
const router  = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { queries } = require("../db/database");
const config = require("../config/site");

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

router.get("/", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/dashboard");
  res.render("index", { title: config.SITE_NAME });
});

router.get("/dashboard", requireAuth, (req, res) => {
  const tools    = queries.getToolsByRole(req.user.role);
  const activity = req.user.role === "admin" ? queries.getRecentActivity() : [];
  const stats    = req.user.role === "admin" ? { users: queries.getUserCount().count } : null;
  res.render("dashboard", {
    title: `Dashboard — ${config.SITE_NAME}`,
    tools, toolCount: tools.length, activity, stats, greeting: getGreeting(),
  });
});

// ── Tools ────────────────────────────────────────────────────
router.get("/tools/files", requireAuth, (req, res) => {
  res.render("tools/files", { title: `Files — ${config.SITE_NAME}`, layout: "main" });
});

router.get("/tools/notes", requireAuth, (req, res) => {
  res.render("tools/notes", { title: `Notes — ${config.SITE_NAME}`, layout: "main" });
});

router.get("/tools/commit-review", requireAdmin, (req, res) => {
  const requests = queries.getCommitRequests();
  res.render("tools/commit-review", {
    title: `Commit Review — ${config.SITE_NAME}`,
    requests,
    message: req.query.message || null,
    error: req.query.error || null,
  });
});

router.post("/tools/commit-review", requireAdmin, (req, res) => {
  const title = req.body.title?.trim();
  const description = req.body.description?.trim() || "";
  const patch = req.body.patch?.trim();
  if (!title || !patch) {
    return res.redirect("/tools/commit-review?error=Title%20and%20patch%20are%20required");
  }
  queries.createCommitRequest({ title, description, patch, created_by: req.user.id });
  res.redirect("/tools/commit-review?message=Request%20created");
});

router.post("/tools/commit-review/:id/accept", requireAdmin, (req, res) => {
  const request = queries.getCommitRequestById(req.params.id);
  if (!request || request.status !== "pending") {
    return res.redirect("/tools/commit-review?error=Request%20not%20found%20or%20already%20processed");
  }

  const patchPath = require("path").resolve("./storage/tmp/commit-request-" + request.id + ".patch");
  const patchDir = require("path").dirname(patchPath);
  const fs = require("fs");
  if (!fs.existsSync(patchDir)) fs.mkdirSync(patchDir, { recursive: true });
  fs.writeFileSync(patchPath, request.patch, "utf8");

  try {
    execFileSync("git", ["apply", "--check", patchPath], { cwd: process.cwd(), stdio: "pipe" });
    execFileSync("git", ["apply", patchPath], { cwd: process.cwd(), stdio: "pipe" });
    execFileSync("git", ["add", "-A"], { cwd: process.cwd(), stdio: "pipe" });
    execFileSync("git", ["commit", "-m", `Apply web commit request #${request.id}: ${request.title}`], { cwd: process.cwd(), stdio: "pipe" });
    queries.updateCommitRequestStatus(request.id, "accepted", req.user.id, "Applied to repository");
    fs.unlinkSync(patchPath);
    return res.redirect("/tools/commit-review?message=Request%20accepted");
  } catch (err) {
    queries.updateCommitRequestStatus(request.id, "failed", req.user.id, String(err));
    try { fs.unlinkSync(patchPath); } catch (ignore) {}
    return res.redirect("/tools/commit-review?error=" + encodeURIComponent(err.message || "Patch apply failed"));
  }
});

router.post("/tools/commit-review/:id/reject", requireAdmin, (req, res) => {
  const request = queries.getCommitRequestById(req.params.id);
  if (!request || request.status !== "pending") {
    return res.redirect("/tools/commit-review?error=Request%20not%20found%20or%20already%20processed");
  }
  queries.updateCommitRequestStatus(request.id, "rejected", req.user.id, "Rejected by admin");
  res.redirect("/tools/commit-review?message=Request%20rejected");
});

// ── Settings ─────────────────────────────────────────────────
router.get("/settings", requireAuth, (req, res) => {
  const settings = Object.assign({
    theme: "system",
    autoLock: "15",
    showEmail: true,
  }, req.user.settings || {});
  res.render("settings", {
    title: `Settings — ${config.SITE_NAME}`,
    settings,
    saved: req.query.saved === "1",
  });
});

router.post("/settings", requireAuth, (req, res) => {
  const theme = ["system", "dark", "light"].includes(req.body.theme) ? req.body.theme : "system";
  const autoLock = ["never", "5", "15", "30"].includes(req.body.autoLock) ? req.body.autoLock : "15";
  const showEmail = req.body.showEmail === "on";

  const newSettings = Object.assign({}, req.user.settings || {}, {
    theme,
    autoLock,
    showEmail,
  });

  queries.updateUserSettings(req.user.id, newSettings);
  res.redirect("/settings?saved=1");
});

// ── Admin ────────────────────────────────────────────────────
router.get("/admin", requireAdmin, (req, res) => {
  const users = queries.getAllUsers();
  res.render("admin", { title: `Admin — ${config.SITE_NAME}`, users });
});

// ── Catch-all tool placeholder ────────────────────────────────
router.get("/tools/:slug", requireAuth, (req, res) => {
  res.render("tool-placeholder", { title: req.params.slug, slug: req.params.slug });
});

module.exports = router;
