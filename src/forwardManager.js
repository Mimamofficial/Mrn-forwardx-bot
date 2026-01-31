// Manages forwarding behavior, album handling, start/stop
const db = require('./db');

class ForwardManager {
  constructor(bot) {
    this.bot = bot;
    this.buffers = new Map(); // key: chatId:media_group_id => [{msg, from}], timer
    this.active = true;
    // Attach main message handler
    this.handler = this._onMessage.bind(this);
    bot.on('message', this.handler);
  }

  async reloadRules() {
    this.rules = await db.listForwards();
  }

  stop() {
    this.active = false;
  }
  start() {
    this.active = true;
  }

  detach() {
    // remove handler completely
    try {
      this.bot.off('message', this.handler);
    } catch {}
  }

  async _onMessage(ctx) {
    if (!this.active) return;
    const msg = ctx.message;
    const chatId = msg.chat.id;

    // reload rules if not loaded
    if (!this.rules) await this.reloadRules();

    // find rules where src_chat_id matches (string or number)
    const matched = this.rules.filter(r => r.active && String(r.src_chat_id) === String(chatId));
    if (!matched.length) return;

    // if media group (album)
    if (msg.media_group_id) {
      await this._handleAlbum(msg, matched);
      return;
    }

    // simple forward for text/other single messages
    for (const r of matched) {
      for (const target of r.targets || []) {
        try {
          // prefer forwardMessage for exact replica when possible
          if (msg.message_id) {
            await this.bot.telegram.forwardMessage(target, chatId, msg.message_id);
          } else {
            // fallback send text
            if (msg.text) await this.bot.telegram.sendMessage(target, msg.text);
          }
        } catch (e) {
          console.error('Forward error', e);
        }
      }
    }
  }

  async _handleAlbum(msg, matched) {
    const key = `${msg.chat.id}:${msg.media_group_id}`;
    const entry = this.buffers.get(key) || { items: [], timer: null };
    entry.items.push(msg);
    // reset timer
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(async () => {
      // send album per forward rule and per target
      const items = entry.items;
      this.buffers.delete(key);
      // convert to media array for sendMediaGroup
      const media = items.map(m => {
        if (m.photo) {
          const p = m.photo[m.photo.length - 1]; // biggest
          return { type: 'photo', media: p.file_id, caption: m.caption || '' };
        }
        // other types could be added (video)
        return null;
      }).filter(Boolean);

      for (const r of matched) {
        for (const target of r.targets || []) {
          try {
            if (media.length) {
              await this.bot.telegram.sendMediaGroup(target, media);
            }
          } catch (e) {
            console.error('Album forward error', e);
          }
        }
      }
    }, 600); // 600ms window to collect album
    this.buffers.set(key, entry);
  }
}

module.exports = ForwardManager;
