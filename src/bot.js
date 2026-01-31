// Telegraf bot setup: force-subscribe, log channel, owner commands for forward add/remove/list/start/stop
const { Telegraf } = require('telegraf');
const ForwardManager = require('./forwardManager');
const db = require('./db');

module.exports = async function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error('BOT_TOKEN is required');
    process.exit(1);
  }
  const bot = new Telegraf(token);

  const LOG_CHANNEL = process.env.LOG_CHANNEL;
  const FORCE_CHANNEL = process.env.FORCE_SUBSCRIBE_CHANNEL;
  const OWNER_USERNAME = process.env.OWNER_USERNAME;

  const fm = new ForwardManager(bot);
  await fm.reloadRules();
  // attach forward manager for external reload/control
  bot.forwardManager = fm;

  // middleware: force subscribe check for non-admins
  bot.use(async (ctx, next) => {
    const from = ctx.from;
    if (!from) return next();
    // skip check for owner if set
    if (OWNER_USERNAME && from.username === OWNER_USERNAME) return next();
    if (!FORCE_CHANNEL) return next();
    try {
      const member = await ctx.telegram.getChatMember(FORCE_CHANNEL, from.id);
      if (!member || ['left', 'kicked'].includes(member.status)) {
        // prompt user to join
        try {
          await ctx.reply(`Please join ${FORCE_CHANNEL} first to use this bot.`);
        } catch {}
        return;
      }
    } catch (e) {
      // if API error, allow through but log
      console.error('Force-check error', e);
    }
    return next();
  });

  // basic logging to configured log channel
  bot.use(async (ctx, next) => {
    try {
      if (LOG_CHANNEL) {
        const from = ctx.from ? `${ctx.from.username || ctx.from.id}` : 'unknown';
        const chat = ctx.chat ? `${ctx.chat.id}` : 'unknown';
        const text = ctx.message && ctx.message.text ? ctx.message.text.slice(0, 200) : JSON.stringify(ctx.updateType);
        await ctx.telegram.sendMessage(LOG_CHANNEL, `From: ${from}\nChat: ${chat}\nType: ${ctx.updateType}\nText: ${text}`);
      }
    } catch (e) {
      console.error('Log channel send failed', e);
    }
    return next();
  });

  // Owner-only commands via private chat
  bot.command('forward_list', async (ctx) => {
    if (!isOwner(ctx)) return ctx.reply('Unauthorized');
    const list = await db.listForwards();
    if (!list.length) return ctx.reply('No forwards configured.');
    let out = list.map(l => `${l.id} | src: ${l.src_chat_id} -> targets: ${l.targets.join(', ')} | active: ${l.active}`).join('\n');
    return ctx.reply(out);
  });

  bot.command('forward_add', async (ctx) => {
    if (!isOwner(ctx)) return ctx.reply('Unauthorized');
    // expect: /forward_add <src_chat_id> <target1,target2,...>
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('Usage: /forward_add <src_chat_id> <target1,target2,...>');
    const src = args[0];
    const targets = args[1].split(',').map(s => s.trim());
    const f = await db.addForward({ name: `fwd-${Date.now()}`, src_chat_id: src, targets, active: true });
    bot.forwardManager.reloadRules();
    ctx.reply(`Added forward ${f.id}`);
  });

  bot.command('forward_remove', async (ctx) => {
    if (!isOwner(ctx)) return ctx.reply('Unauthorized');
    const id = ctx.message.text.split(' ').slice(1)[0];
    if (!id) return ctx.reply('Usage: /forward_remove <id>');
    await db.removeForward(id);
    bot.forwardManager.reloadRules();
    ctx.reply(`Removed ${id}`);
  });

  bot.command('forward_stop', async (ctx) => {
    if (!isOwner(ctx)) return ctx.reply('Unauthorized');
    const id = ctx.message.text.split(' ').slice(1)[0];
    if (!id) return ctx.reply('Usage: /forward_stop <id>');
    await db.updateForward(id, { active: false });
    bot.forwardManager.reloadRules();
    ctx.reply(`Stopped ${id}`);
  });

  bot.command('forward_start', async (ctx) => {
    if (!isOwner(ctx)) return ctx.reply('Unauthorized');
    const id = ctx.message.text.split(' ').slice(1)[0];
    if (!id) return ctx.reply('Usage: /forward_start <id>');
    await db.updateForward(id, { active: true });
    bot.forwardManager.reloadRules();
    ctx.reply(`Started ${id}`);
  });

  bot.command('disconnect', async (ctx) => {
    // For bot-level /disconnect: reply and attempt to remove any session bindings (primarily web side)
    return ctx.reply('If you logged into the web dashboard, use the web /disconnect to logout fully.');
  });

  bot.launch().then(() => {
    console.log('Bot launched');
  }).catch(err => {
    console.error('Bot launch error', err);
  });

  // graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  function isOwner(ctx) {
    if (!OWNER_USERNAME) return false;
    return ctx.from && ctx.from.username === OWNER_USERNAME;
  }

  return bot;
};
