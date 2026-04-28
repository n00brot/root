const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const config = require("../config/site");
const { queries } = require("../db/database");

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  try { done(null, queries.findUserById(id) || false); }
  catch(err) { done(err); }
});

if (!config.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID === "your-google-client-id.apps.googleusercontent.com") {
  console.warn("\n⚠️  Google OAuth not configured. Edit .env with your credentials.\n");
} else {
  passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.GOOGLE_CALLBACK_URL,
    scope: ["profile", "email"],
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error("No email from Google"));
      if (config.ALLOWED_EMAILS.length > 0 && !config.ALLOWED_EMAILS.includes(email))
        return done(null, false, { message: "Access denied." });

      let user = queries.findUserByGoogleId(profile.id) || queries.findUserByEmail(email);
      const avatar = profile.photos?.[0]?.value || null;

      if (user) {
        queries.updateUserLogin({ id: user.id, name: profile.displayName, avatar });
        user = queries.findUserById(user.id);
      } else {
        const isFirst = queries.getUserCount().count === 0;
        const result = queries.createUser({
          google_id: profile.id, email,
          name: profile.displayName, avatar,
          role: isFirst ? "admin" : "user",
        });
        user = queries.findUserById(result.lastInsertRowid);
      }
      return done(null, user);
    } catch(err) { return done(err); }
  }));
}

module.exports = passport;
