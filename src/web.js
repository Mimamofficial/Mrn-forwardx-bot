// Express web admin dashboard (basic): login, dashboard list/add/remove/start/stop, broadcast
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('./auth');
const db = require('./db');

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.redirect('/login');
}

module.exports = (bot) => {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/views');
  app.use(express.static(__dirname + '/public'));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.json());

  // Health endpoint for Koyeb / load balancers
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Debug API: list forwards as JSON (authenticated)
  app.get('/api/forwards', ensureAuth, async (req, res) => {
    const forwards = await db.listForwards();
    res.json(forwards);
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'please_change',
    resave: false,
    saveUninitialized: false
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/login', (req, res) => {
    res.render('login', { error: null });
  });

  app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
  }));

  app.get('/disconnect', (req, res) => {
    req.logout && req.logout();
    req.session && req.session.destroy(() => {});
    res.redirect('/login');
  });

  app.get('/', ensureAuth, async (req, res) => {
    const forwards = await db.listForwards();
    res.render('dashboard', { forwards, user: req.user });
  });

  app.post('/forwards/add', ensureAuth, async (req, res) => {
    const { src_chat_id, targets, name } = req.body;
    const targetList = (targets || '').split(',').map(s => s.trim()).filter(Boolean);
    await db.addForward({ name: name || `fwd-${Date.now()}`, src_chat_id, targets: targetList, active: true });
    bot.forwardManager && bot.forwardManager.reloadRules();
    res.redirect('/');
  });

  app.post('/forwards/remove', ensureAuth, async (req, res) => {
    const { id } = req.body;
    await db.removeForward(id);
    bot.forwardManager && bot.forwardManager.reloadRules();
    res.redirect('/');
  });

  app.post('/forwards/toggle', ensureAuth, async (req, res) => {
    const { id, action } = req.body;
    const active = action === 'start';
    await db.updateForward(id, { active });
    bot.forwardManager && bot.forwardManager.reloadRules();
    res.redirect('/');
  });

  app.get('/broadcast', ensureAuth, (req, res) => {
    res.render('broadcast', { result: null });
  });

  app.post('/broadcast', ensureAuth, async (req, res) => {
    const { text, targets } = req.body;
    const targetList = (targets || '').split(',').map(s => s.trim()).filter(Boolean);
    const results = [];
    for (const t of targetList) {
      try {
        await bot.telegram.sendMessage(t, text);
        results.push({ target: t, ok: true });
      } catch (e) {
        results.push({ target: t, ok: false, error: String(e) });
      }
    }
    res.render('broadcast', { result: results });
  });

  return app;
};
