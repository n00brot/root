require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { engine } = require("express-handlebars");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const config = require("./config/site");
const { initDB } = require("./db/database");
const { injectLocals } = require("./middleware/auth");

async function start() {
  await initDB();

  const passport   = require("./config/passport");
  const authRoutes = require("./routes/auth");
  const mainRoutes = require("./routes/main");
  const fileRoutes = require("./routes/files");
  const noteRoutes = require("./routes/notes");

  const app = express();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    app.set("trust proxy", 1);
    app.use((req, res, next) => {
      if (req.secure || req.headers["x-forwarded-proto"] === "https") return next();
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    });
    if (config.SESSION_SECRET === "change-this-secret-in-production") {
      console.error("ERROR: SESSION_SECRET must be set in production. Update your environment variables.");
      process.exit(1);
    }
  }

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc:    ["'self'", "https://fonts.gstatic.com"],
        imgSrc:     ["'self'", "data:", "https:", "blob:"],
        mediaSrc:   ["'self'", "https:", "blob:"],
        connectSrc: ["'self'", "https://accounts.google.com"],
        frameSrc:   ["https://accounts.google.com"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }));

  app.engine("hbs", engine({
    extname: ".hbs",
    defaultLayout: "main",
    layoutsDir:  path.join(__dirname, "views/layouts"),
    partialsDir: path.join(__dirname, "views/partials"),
    helpers: {
      eq: (a, b) => a === b,
      json: val => JSON.stringify(val),
      formatDate: date => date ? new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      }) : "—",
    },
  }));
  app.set("view engine", "hbs");
  app.set("views", path.join(__dirname, "views"));

  app.use(morgan("dev"));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, "public")));

  app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: isProduction,
    cookie: {
      maxAge: config.SESSION_MAX_AGE,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(injectLocals);

  // ── Routes ──────────────────────────────────────────────────
  app.use("/", authRoutes);
  app.use("/", mainRoutes);
  app.use("/api/files", fileRoutes);
  app.use("/api/notes", noteRoutes);

  // 404
  app.use((req, res) => {
    res.status(404).render("error", { title: "404 — Not Found", message: "Page not found." });
  });
  // Error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render("error", { title: "500 — Error", message: err.message });
  });

  app.listen(config.PORT, config.HOST, () => {
    console.log(`\n🌊  ${config.SITE_NAME} → http://${config.HOST}:${config.PORT}`);
    console.log(`    Files stored in: ./storage/files/\n`);
  });
}

start().catch(err => { console.error("Startup failed:", err); process.exit(1); });
