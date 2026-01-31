// Very small JSON-file DB for forwards and users
const fs = require('fs').promises;
const path = require('path');
const DB_FILE = path.join(__dirname, '..', 'db.json');

let state = {
  forwards: [], // { id, name, src_chat_id, targets: [chatId], active: true }
  users: [] // reserved for future
};

async function init() {
  try {
    await fs.access(DB_FILE);
    const raw = await fs.readFile(DB_FILE, 'utf8');
    state = JSON.parse(raw);
  } catch (err) {
    await save();
  }
}

async function save() {
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
  updateForward
};
