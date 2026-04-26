const db = require('./database');

// ============================================
// CARA KERJA SQLITE SEDERHANA:
// ============================================
// SQLite itu seperti Excel tapi untuk programmer.
// Data disimpan di file .db (database.db)
// Kita pakai SQL (Structured Query Language) untuk:
//   - INSERT = Tambah data baru
//   - SELECT = Ambil data
//   - UPDATE = Ubah data
//   - DELETE = Hapus data
//
// Contoh: db.prepare('SELECT * FROM user_xp WHERE user_id = ?').get('123')
//         ↑ prepare() = siapkan query
//         ↑ ? = placeholder (anti SQL injection)
//         ↑ .get() = ambil 1 baris data
//         ↑ .all() = ambil semua baris
//         ↑ .run() = jalankan (insert/update/delete)
// ============================================

// Statement SQL yang sudah di-prepare (lebih cepat kalau dipakai berulang)
const getUserStmt = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?');
const insertUserStmt = db.prepare('INSERT INTO user_xp (guild_id, user_id, xp, level, messages) VALUES (?, ?, 0, 1, 0)');
const updateUserStmt = db.prepare('UPDATE user_xp SET xp = ?, level = ?, messages = ? WHERE guild_id = ? AND user_id = ?');
const getGuildUsersStmt = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? ORDER BY xp DESC');

// Ambil data user (kalau belum ada, buat baru)
function getUserData(guildId, userId) {
  let user = getUserStmt.get(guildId, userId);

  if (!user) {
    // INSERT = tambah data baru ke tabel
    insertUserStmt.run(guildId, userId);
    user = { guild_id: guildId, user_id: userId, xp: 0, level: 1, messages: 0 };
  }

  return user;
}

// Simpan/update data user
function setUserData(guildId, userId, userData) {
  // UPDATE = ubah data yang sudah ada
  updateUserStmt.run(userData.xp, userData.level, userData.messages, guildId, userId);
}

// Hitung XP yang dibutuhkan untuk level berikutnya
function getXpForLevel(level) {
  return level * 100;
}

// Hitung total XP yang dibutuhkan untuk mencapai level tertentu
function getTotalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXpForLevel(i);
  }
  return total;
}

// Hitung level berdasarkan total XP
function calculateLevel(xp) {
  let level = 1;
  let xpNeeded = getXpForLevel(level);
  while (xp >= xpNeeded) {
    xp -= xpNeeded;
    level++;
    xpNeeded = getXpForLevel(level);
  }
  return level;
}

// Hitung XP saat ini dalam level (progress)
function getLevelProgress(xp, level) {
  const totalXpForCurrentLevel = getTotalXpForLevel(level);
  const xpInCurrentLevel = xp - totalXpForCurrentLevel;
  const xpNeeded = getXpForLevel(level);
  return { current: xpInCurrentLevel, needed: xpNeeded };
}

// Ambil title rank berdasarkan level
function getRankTitle(level) {
  if (level >= 51) return '👑 Pala Suku';
  if (level >= 31) return '🏆 TeraKarbit';
  if (level >= 21) return '⚔️ EliteKnowladge';
  if (level >= 11) return '🛡️ VeteranTuru';
  if (level >= 6) return '🧑 MemberAsu';
  return '🌱 Newbie';
}

// Ambil semua user di server (urutkan XP tertinggi)
function getGuildUsers(guildId) {
  // SELECT = ambil data, ORDER BY = urutkan
  const rows = getGuildUsersStmt.all(guildId);
  const result = {};
  for (const row of rows) {
    result[row.user_id] = row;
  }
  return result;
}

// Cooldown map (di memory, reset saat bot restart)
const cooldowns = new Map();

function isOnCooldown(guildId, userId) {
  const key = `${guildId}-${userId}`;
  const lastTime = cooldowns.get(key);
  if (!lastTime) return false;
  return Date.now() - lastTime < 60000; // 60 detik cooldown
}

function setCooldown(guildId, userId) {
  const key = `${guildId}-${userId}`;
  cooldowns.set(key, Date.now());
}

// Tambah XP ke user, return true jika naik level
function addXp(guildId, userId, amount) {
  const userData = getUserData(guildId, userId);
  const oldLevel = userData.level;
  userData.xp += amount;
  userData.messages += 1;

  const newLevel = calculateLevel(userData.xp);
  userData.level = newLevel;

  setUserData(guildId, userId, userData);

  return {
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
    userData
  };
}

module.exports = {
  getUserData,
  setUserData,
  getXpForLevel,
  getTotalXpForLevel,
  calculateLevel,
  getLevelProgress,
  getRankTitle,
  getGuildUsers,
  isOnCooldown,
  setCooldown,
  addXp
};

