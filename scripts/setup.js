#!/usr/bin/env node
// ============================================================
//  scripts/setup.js — First-time setup helper
// ============================================================

const fs = require("fs");
const path = require("path");

console.log("\n🌊  ROOT — Setup\n");

// Copy .env.example → .env if not present
const envExample = path.join(__dirname, "../.env.example");
const envFile = path.join(__dirname, "../.env");
if (!fs.existsSync(envFile)) {
  fs.copyFileSync(envExample, envFile);
  console.log("✅  Created .env from .env.example");
  console.log("   → Edit .env and add your Google OAuth credentials\n");
} else {
  console.log("ℹ️   .env already exists — skipping\n");
}

// Ensure directories
["db", "public/assets"].forEach(dir => {
  const fullPath = path.join(__dirname, "..", dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅  Created directory: ${dir}`);
  }
});

console.log("\n📋  Next steps:");
console.log("   1. Edit .env — add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EMAILS");
console.log("   2. Get Google credentials from: https://console.cloud.google.com/apis/credentials");
console.log("   3. Set Authorized redirect URI to: http://localhost:3000/auth/google/callback");
console.log("   4. Run: npm run dev");
console.log("   5. Open: http://localhost:3000\n");
console.log("   To rename the site: node scripts/rename.js \"MyPlatform\"\n");
