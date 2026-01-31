// Passport local strategy for admin login
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';

passport.use(new LocalStrategy((username, password, done) => {
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return done(null, { username: ADMIN_USER });
  }
  return done(null, false, { message: 'Incorrect credentials' });
}));

passport.serializeUser((user, done) => done(null, user.username));
passport.deserializeUser((username, done) => {
  if (username === ADMIN_USER) return done(null, { username });
  return done(null, false);
});

module.exports = passport;
