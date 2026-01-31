# Mrn-forwardx-bot

Telegram forwarder bot with a simple web admin dashboard.

Features
- Album support (media_group handling)
- Force-subscribe check
- Log channel
- /disconnect note
- Forward add / remove / list / start / stop (bot commands and web)
- Per-user task isolation
- Broadcast (admin/web)
- Basic admin dashboard (login + controls)
- Koyeb-friendly PORT support

Quick start (local)
1. Clone repo
2. Install:
   npm ci
3. Copy `.env.example` to `.env` and set values:
   - BOT_TOKEN (Telegram bot token)
   - ADMIN_USER / ADMIN_PASS (dashboard login)
   - LOG_CHANNEL (e.g. @your_log_channel or -100...)
   - FORCE_SUBSCRIBE_CHANNEL (optional)
   - OWNER_USERNAME (your telegram username)
   - SESSION_SECRET (strong secret)
   - (optional) DB_PATH (e.g. /data/db.json) for custom DB location
4. Run:
   npm start
5. Open admin dashboard at http://localhost:3000/login

Docker (recommended for production)
- A Dockerfile is included. Build & run locally:
  docker build -t mrn-forwardx-bot .
  docker run -e BOT_TOKEN=... -e ADMIN_USER=... -e ADMIN_PASS=... -p 3000:3000 mrn-forwardx-bot

Koyeb deployment (recommended if you want PaaS)
- Use Koyeb “Build from source” or Docker image.
- Important: containers are ephemeral — for persistent DB use DB_PATH mounted to a persistent volume.
- In Koyeb environment variables, set:
  BOT_TOKEN, ADMIN_USER, ADMIN_PASS, LOG_CHANNEL, FORCE_SUBSCRIBE_CHANNEL, OWNER_USERNAME, SESSION_SECRET
- If using local file DB persistently, set DB_PATH=/data/db.json and mount a persistent volume to `/data`.

Persistence / DB
- By default the app uses a JSON file (db.json). This is ok for testing but not ideal for production because containers can be ephemeral.
- Options:
  - Mount a persistent volume and set DB_PATH to point inside the volume (recommended if you keep JSON store).
  - Use a small managed DB (Postgres, MongoDB, or SQLite on a volume).
  - Migrate to an external config store for more scale.

Security notes
- Never commit `.env` with secrets. Use platform secrets.
- Use strong SESSION_SECRET and ADMIN_PASS.
- Limit access to the dashboard (use strong credentials and secure the admin account).

Useful commands (git)
- Commit & push:
  git add .
  git commit -m "Add CI, health endpoint, persistence improvements"
  git push origin main

Troubleshooting
- Bot not receiving channel posts? Ensure bot is admin in the channel for channel_post updates.
- Albums split? Increase album buffer timeout in src/forwardManager.js (currently 600ms).
- Check logs (local terminal or Koyeb logs) for errors like "bot launch" or Telegram API errors.
