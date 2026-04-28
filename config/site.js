// ============================================================
//  SITE CONFIGURATION — Change SITE_NAME to rename the project
//  Run: node scripts/rename.js "NewName" to update all files
// ============================================================

module.exports = {
  SITE_NAME: "ROOT",
  SITE_TAGLINE: "Your Private Command Center",
  SITE_DESCRIPTION: "A private platform for tools, systems, and workflows.",
  VERSION: "0.1.0",

  // Server
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || "localhost",
  BASE_URL: process.env.BASE_URL || "http://localhost:3000",

  // Sessions
  SESSION_SECRET: process.env.SESSION_SECRET || "change-this-secret-in-production",
  SESSION_MAX_AGE: 1000 * 60 * 60 * 24 * 7, // 7 days

  // Database
  DB_PATH: process.env.DB_PATH || "./db/root.sqlite",

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback",

  // Access control — only these emails can log in (leave empty [] for open access)
  ALLOWED_EMAILS: process.env.ALLOWED_EMAILS
    ? process.env.ALLOWED_EMAILS.split(",").map(e => e.trim())
    : [],
};
