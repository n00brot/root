// ============================================================
//  API — File Manager
//  Files are sandboxed inside ./storage/files/
//  Users can never escape that root via path traversal
// ============================================================

const express  = require("express");
const router   = express.Router();
const path     = require("path");
const fs       = require("fs");
const multer   = require("multer");
const { requireAuth } = require("../middleware/auth");

// Storage root — all files live here
const FILES_ROOT = path.resolve("./storage/files");
if (!fs.existsSync(FILES_ROOT)) fs.mkdirSync(FILES_ROOT, { recursive: true });

// ── Safely resolve a user-supplied path ──────────────────────
function safePath(userPath) {
  const resolved = path.resolve(FILES_ROOT, "." + (userPath || "/"));
  // Block traversal outside FILES_ROOT
  if (!resolved.startsWith(FILES_ROOT)) return null;
  return resolved;
}

// ── Multer — store uploads in a temp dir, then move ──────────
const upload = multer({
  dest: path.resolve("./storage/tmp"),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB per file
});

// ── List directory ───────────────────────────────────────────
router.get("/list", requireAuth, (req, res) => {
  const dir = safePath(req.query.path || "/");
  if (!dir) return res.status(400).json({ error: "Invalid path" });
  if (!fs.existsSync(dir)) return res.json({ items: [] });

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const items = entries
      .filter(e => !e.name.startsWith(".")) // hide dotfiles
      .map(e => {
        const fullPath = path.join(dir, e.name);
        const isDir = e.isDirectory();
        const stat = isDir ? null : fs.statSync(fullPath);
        const relPath = "/" + path.relative(FILES_ROOT, fullPath).replace(/\\/g, "/");
        return {
          name:  e.name,
          path:  relPath,
          isDir,
          size:  stat ? stat.size : null,
          mtime: stat ? stat.mtimeMs : null,
        };
      })
      .sort((a, b) => {
        // Folders first, then alphabetical
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    res.json({ items, path: req.query.path || "/" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Upload files ─────────────────────────────────────────────
router.post("/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const destDir = safePath(req.body.path || "/");
  if (!destDir) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: "Invalid path" }); }

  const destFile = path.join(destDir, req.file.originalname);
  try {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(req.file.path, destFile);
    res.json({ ok: true, name: req.file.originalname });
  } catch (e) {
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: e.message });
  }
});

// ── Download file ────────────────────────────────────────────
router.get("/download", requireAuth, (req, res) => {
  const file = safePath(req.query.path);
  if (!file) return res.status(400).json({ error: "Invalid path" });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
    return res.status(404).json({ error: "File not found" });
  res.download(file);
});

// ── Delete file or folder ────────────────────────────────────
router.post("/delete", requireAuth, (req, res) => {
  const target = safePath(req.body.path);
  if (!target) return res.status(400).json({ error: "Invalid path" });
  if (!fs.existsSync(target)) return res.status(404).json({ error: "Not found" });

  try {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) fs.rmSync(target, { recursive: true, force: true });
    else fs.unlinkSync(target);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Rename ───────────────────────────────────────────────────
router.post("/rename", requireAuth, (req, res) => {
  const { path: srcPath, newName } = req.body;
  if (!srcPath || !newName) return res.status(400).json({ error: "Missing params" });
  if (newName.includes("/") || newName.includes("\\"))
    return res.status(400).json({ error: "Invalid name" });

  const src  = safePath(srcPath);
  const dest = path.join(path.dirname(src), newName);
  if (!src) return res.status(400).json({ error: "Invalid path" });
  if (!dest.startsWith(FILES_ROOT)) return res.status(400).json({ error: "Invalid name" });

  try {
    fs.renameSync(src, dest);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Create folder ────────────────────────────────────────────
router.post("/mkdir", requireAuth, (req, res) => {
  const { path: parentPath, name } = req.body;
  if (!name || name.includes("/") || name.includes("\\"))
    return res.status(400).json({ error: "Invalid name" });

  const dir = safePath((parentPath || "/") + "/" + name);
  if (!dir) return res.status(400).json({ error: "Invalid path" });

  try {
    fs.mkdirSync(dir, { recursive: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
