const path = require("path");
const fs   = require("fs");
const config = require("../config/site");

const dbPath = path.resolve(config.DB_PATH);
const dbDir  = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db;

async function initDB() {
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  createSchema();
  seedTools();
  console.log("Database ready: " + dbPath);
  return db;
}

function save() {
  if (!db) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function parseRow(row) {
  if (!row) return row;
  if (typeof row.settings === "string") {
    try { row.settings = JSON.parse(row.settings); } catch (err) { row.settings = {}; }
  }
  return row;
}

function rowsFromResult(results) {
  if (!results || results.length === 0) return [];
  const { columns, values } = results[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return parseRow(obj);
  });
}

function queryAll(sql, params) {
  try { return rowsFromResult(db.exec(sql, params || [])); }
  catch(e) { console.error("DB error:", e.message); return []; }
}

function queryOne(sql, params) { return queryAll(sql, params)[0] || null; }

function run(sql, params) {
  try {
    db.run(sql, params || []);
    save();
    const r = db.exec("SELECT last_insert_rowid() as id");
    return { lastInsertRowid: r[0]?.values[0][0] || null };
  } catch(e) { console.error("DB run error:", e.message); return { lastInsertRowid: null }; }
}

function ensureUserSettingsColumn() {
  const result = db.exec("PRAGMA table_info(users)");
  if (result && result[0] && Array.isArray(result[0].values)) {
    const hasSettings = result[0].values.some(cols => cols[1] === "settings");
    if (!hasSettings) {
      db.run("ALTER TABLE users ADD COLUMN settings TEXT DEFAULT '{}'");
    }
  }
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      settings TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      url TEXT,
      category TEXT DEFAULT 'general',
      is_active INTEGER DEFAULT 1,
      requires_role TEXT DEFAULT 'user',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      body TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS commit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      patch TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_by INTEGER,
      accepted_by INTEGER,
      action_detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      acted_at DATETIME
    );
  `);
  ensureUserSettingsColumn();
  save();
}

function seedTools() {
  const tools = [
    ["dashboard", "Dashboard",    "Overview and quick access",       "⬡", "/dashboard",    "core",        1],
    ["files",     "File Manager", "Browse, upload and manage files", "◫", "/tools/files",  "system",      2],
    ["notes",     "Notes",        "Private notes and documents",     "◻", "/tools/notes",  "productivity",3],
    ["commit-review", "Commit Review", "Review and accept incoming code commits", "🛠", "/tools/commit-review", "admin", 4],
    ["settings",  "Settings",     "Configure your workspace",        "◈", "/settings",     "core",       99],
  ];

  tools.forEach(([slug,name,desc,icon,url,cat,ord]) => {
    db.run("INSERT OR IGNORE INTO tools (slug,name,description,icon,url,category,sort_order) VALUES (?,?,?,?,?,?,?)",
      [slug,name,desc,icon,url,cat,ord]);
  });
  save();
}

const queries = {
  findUserByGoogleId: (id)    => queryOne("SELECT * FROM users WHERE google_id=?", [id]),
  findUserById:       (id)    => queryOne("SELECT * FROM users WHERE id=?", [id]),
  findUserByEmail:    (email) => queryOne("SELECT * FROM users WHERE email=?", [email]),
  createUser: ({google_id, email, name, avatar, role}) =>
    run("INSERT INTO users (google_id,email,name,avatar,role) VALUES (?,?,?,?,?)", [google_id,email,name,avatar||null,role]),
  updateUserLogin: ({id, name, avatar}) =>
    run("UPDATE users SET last_login=CURRENT_TIMESTAMP, name=?, avatar=? WHERE id=?", [name,avatar||null,id]),
  updateUserSettings: (id, settings) =>
    run("UPDATE users SET settings=? WHERE id=?", [JSON.stringify(settings || {}), id]),
  getToolsByRole: (role) =>
    queryAll("SELECT * FROM tools WHERE is_active=1 AND (requires_role='user' OR requires_role=?) ORDER BY sort_order", [role]),
  getCommitRequests: () =>
    queryAll(`SELECT cr.*, u.name as creator_name, a.name as actor_name
      FROM commit_requests cr
      LEFT JOIN users u ON cr.created_by=u.id
      LEFT JOIN users a ON cr.accepted_by=a.id
      ORDER BY cr.created_at DESC`),
  getCommitRequestById: (id) =>
    queryOne(`SELECT cr.*, u.name as creator_name, a.name as actor_name
      FROM commit_requests cr
      LEFT JOIN users u ON cr.created_by=u.id
      LEFT JOIN users a ON cr.accepted_by=a.id
      WHERE cr.id=?`, [id]),
  createCommitRequest: ({title, description, patch, created_by}) =>
    run("INSERT INTO commit_requests (title,description,patch,created_by) VALUES (?,?,?,?)", [title,description,patch,created_by]),
  updateCommitRequestStatus: (id, status, accepted_by, action_detail) =>
    run("UPDATE commit_requests SET status=?, accepted_by=?, action_detail=?, acted_at=CURRENT_TIMESTAMP WHERE id=?", [status, accepted_by||null, action_detail||null, id]),
  logActivity: (userId, action, detail, ip) =>
    run("INSERT INTO activity_log (user_id,action,detail,ip) VALUES (?,?,?,?)", [userId,action,detail||null,ip||null]),
  getRecentActivity: () =>
    queryAll("SELECT al.*, u.name as user_name FROM activity_log al LEFT JOIN users u ON u.id=al.user_id ORDER BY al.created_at DESC LIMIT 50"),
  getUserCount: () => queryOne("SELECT COUNT(*) as count FROM users"),
  getAllUsers:  () => queryAll("SELECT * FROM users ORDER BY created_at DESC"),
};

module.exports = { initDB, queries, queryAll, queryOne, run };
