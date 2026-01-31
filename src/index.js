// Entrypoint: start bot and web server
const Bot = require('./bot');
const createWeb = require('./web');
const db = require('./db');

(async () => {
  // ensure DB file exists
  await db.init();

  const bot = await Bot(); // starts Telegraf and attaches forwardManager
  const app = createWeb(bot);

  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Web server listening on http://0.0.0.0:${port}`);
  });
})();
