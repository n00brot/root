# ROOT — Private Platform

A dark, elegant private web platform with Google OAuth authentication, SQLite database, and a modular tool/app system. Built to be hosted locally or deployed anywhere.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run setup (creates .env, directories)
npm run setup

# 3. Edit .env with your credentials (see Google OAuth below)
nano .env

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

---

## Rename the Project

The site name is controlled by a single variable in `config/site.js`.

```bash
# Rename from ROOT to anything else
node scripts/rename.js "NEXUS"
```

This updates the config. Restart the server to apply.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project → Enable **Google+ API** or **People API**
3. Create **OAuth 2.0 Client ID** → Web application
4. Add Authorized redirect URI: `http://localhost:3000/auth/google/callback`
5. Copy Client ID and Secret into your `.env`

```env
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
ALLOWED_EMAILS=you@gmail.com,friend@gmail.com
```

Leave `ALLOWED_EMAILS` empty to allow any Google account.

**First user to log in becomes admin automatically.**

---

## Project Structure

```
root/
├── config/
│   ├── site.js          ← SITE_NAME and all config (edit to rename)
│   └── passport.js      ← Google OAuth strategy
├── db/
│   ├── database.js      ← SQLite schema + query helpers
│   └── root.sqlite      ← Auto-created on first run
├── middleware/
│   └── auth.js          ← requireAuth, requireAdmin guards
├── public/
│   ├── css/main.css     ← Dark ocean design system
│   └── js/main.js       ← Canvas ocean + interactions
├── routes/
│   ├── auth.js          ← /login, /auth/google, /logout
│   └── main.js          ← /, /dashboard, /settings, /admin
├── scripts/
│   ├── rename.js        ← Rename the platform
│   └── setup.js         ← First-time setup
├── views/
│   ├── layouts/main.hbs ← Base HTML layout
│   ├── partials/nav.hbs ← Navigation bar
│   ├── index.hbs        ← Landing page
│   ├── login.hbs        ← Login page
│   ├── dashboard.hbs    ← Main dashboard
│   ├── settings.hbs     ← User settings
│   └── admin.hbs        ← Admin panel
├── .env.example         ← Template — copy to .env
├── package.json
└── server.js            ← Entry point
```

---

## Adding Tools / Apps

1. Add a record to the `tools` table in `db/database.js` seed section
2. Create a route in `routes/main.js`
3. Create a view in `views/tools/your-tool.hbs`
4. Link from the dashboard tool grid automatically

---

## Production Deployment

```bash
# Set in .env for production
NODE_ENV=production
BASE_URL=https://yourdomain.com
SESSION_SECRET=very-long-random-string
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

Use a reverse proxy (nginx/Caddy) in front of the Node server.

---

## Database

SQLite database is stored at `./db/root.sqlite` (configurable via `DB_PATH` in `.env`).

Tables:
- `users` — registered accounts
- `tools` — platform tools registry
- `activity_log` — user activity tracking
- `user_settings` — per-user preferences

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Auth**: Passport.js + Google OAuth 2.0
- **Database**: SQLite (better-sqlite3)
- **Sessions**: express-session + connect-sqlite3
- **Templates**: Handlebars (express-handlebars)
- **Design**: Custom CSS design system — dark ocean theme
