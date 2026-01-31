# Mrn-forwardx-bot

Telegram forwarder bot with a simple web admin dashboard. Features:
- Album support (media_group handling)
- Force-subscribe check
- Log channel
- /disconnect note
- Forward add / remove / list / start / stop (bot commands and web)
- Per-user task isolation
- Broadcast (admin/web)
- Basic admin dashboard (login + controls)
- Koyeb-friendly PORT support

Setup
1. Create a repo on GitHub (already provided) and clone.
2. Copy files and run:
   npm install
3. Create a .env file from .env.example and set BOT_TOKEN and other vars.
4. Start: npm start

Deployment
- Use Koyeb or similar; set environment variables in the platform. Ensure PORT env is present.
