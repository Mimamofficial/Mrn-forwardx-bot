// Very small JSON-file DB for forwards and users
// Now supports configurable DB path via process.env.DB_PATH and ensures directory exists.

const fs = require('fs').promises;
const path = require('path');

const DEFAULT_DB = path.join(__dirname, '..', 'db.json');
const DB_FILE = process.env.DB_PATH || DEFAULT_DB;
const DB_DIR = path.dirname(DB_FILE);

let state = {
  forwards: [], // { id, name, src_chat_id, targets: [chatId], active: true }
  users: [] // reserved for future
};

async function ensureDir() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function init() {
  await ensureDir();
  try {
    await fs.access(DB_FILE);
    const raw = await fs.readFile(DB_FILE, 'utf8');
    state = JSON.parse(raw);
  } catch (err) {
    // if file doesn't exist or is invalid, write default
    await save();
  }
}

async function save() {
  await ensureDir();
  await fs.writeFile(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function listForwards() {
  return state.forwards;
}

async function getForward(id) {
  return state.forwards.find(f => f.id === id);
}

async function addForward(fwd) {
  fwd.id = Date.now().toString();
  state.forwards.push(fwd);
  await save();
  return fwd;
}

async function removeForward(id) {
  state.forwards = state.forwards.filter(f => f.id !== id);
  await save();
}

async function updateForward(id, patch) {
  const f = state.forwards.find(f => f.id === id);
  if (!f) return null;
  Object.assign(f, patch);
  await save();
  return f;
}

module.exports = {
  init,
  listForwards,
  getForward,
  addForward,
  removeForward,
  updateForward,
  DB_FILE
};
