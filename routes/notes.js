// ============================================================
//  API — Notes
//  Full CRUD — notes stored in the SQLite DB
// ============================================================

const express = require("express");
const router  = express.Router();
const { requireAuth } = require("../middleware/auth");
const { run, queryAll, queryOne } = require("../db/database");

// ── Ensure notes table exists ────────────────────────────────
function ensureTable() {
  run(`
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      title      TEXT NOT NULL DEFAULT 'Untitled',
      body       TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
ensureTable();

// ── GET all notes for user ───────────────────────────────────
router.get("/", requireAuth, (req, res) => {
  const notes = queryAll(
    "SELECT id, title, substr(body,1,120) as body, created_at, updated_at FROM notes WHERE user_id=? ORDER BY updated_at DESC",
    [req.user.id]
  );
  res.json({ notes });
});

// ── GET single note ───────────────────────────────────────────
router.get("/:id", requireAuth, (req, res) => {
  const note = queryOne(
    "SELECT * FROM notes WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );
  if (!note) return res.status(404).json({ error: "Not found" });
  res.json({ note });
});

// ── POST create note ──────────────────────────────────────────
router.post("/", requireAuth, (req, res) => {
  const { title = "Untitled", body = "" } = req.body;
  const result = run(
    "INSERT INTO notes (user_id, title, body) VALUES (?,?,?)",
    [req.user.id, title, body]
  );
  res.json({ id: result.lastInsertRowid });
});

// ── PUT update note ───────────────────────────────────────────
router.put("/:id", requireAuth, (req, res) => {
  const { title, body } = req.body;
  const note = queryOne("SELECT id FROM notes WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  if (!note) return res.status(404).json({ error: "Not found" });

  run(
    "UPDATE notes SET title=?, body=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
    [title ?? "Untitled", body ?? "", req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

// ── DELETE note ───────────────────────────────────────────────
router.delete("/:id", requireAuth, (req, res) => {
  const note = queryOne("SELECT id FROM notes WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  if (!note) return res.status(404).json({ error: "Not found" });
  run("DELETE FROM notes WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
