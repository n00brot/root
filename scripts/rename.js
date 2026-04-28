#!/usr/bin/env node
// ============================================================
//  scripts/rename.js
//  Usage: node scripts/rename.js "NewName"
//  Updates SITE_NAME in config/site.js
// ============================================================

const fs = require("fs");
const path = require("path");

const newName = process.argv[2];
if (!newName) {
  console.error("Usage: node scripts/rename.js \"NewName\"");
  process.exit(1);
}

const configPath = path.join(__dirname, "../config/site.js");
let content = fs.readFileSync(configPath, "utf8");
const oldMatch = content.match(/SITE_NAME:\s*["'](.+?)["']/);
const oldName = oldMatch ? oldMatch[1] : "ROOT";
content = content.replace(/SITE_NAME:\s*["'].+?["']/, `SITE_NAME: "${newName}"`);
// Also update DB_PATH if it uses the old name lowercased
content = content.replace(
  /DB_PATH:.*"\.\/db\/\w+\.sqlite"/,
  `DB_PATH: process.env.DB_PATH || "./db/${newName.toLowerCase()}.sqlite"`
);
fs.writeFileSync(configPath, content, "utf8");

console.log(`\n✅  Renamed: ${oldName} → ${newName}`);
console.log(`   Updated: config/site.js`);
console.log(`   Restart the server to apply changes.\n`);
