// Fallback database menggunakan JSON file (tanpa native module)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) { console.warn('⚠️ Gagal load JSON, buat baru'); }
  return { user_xp: {}, guild_settings: {}, mahasiswa: [], jadwal: [], tugas: [] };
}

function saveData(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('❌ Gagal save:', e.message); }
}

let dbData = loadData();
setInterval(() => saveData(dbData), 30000);

let nextId = (table) => dbData[table].length > 0 ? Math.max(...dbData[table].map(r => r.id || 0)) + 1 : 1;

const db = {
  // XP queries (backward compat)
  prepare(sql) {
    return {
      get(guildId, userId) {
        const key = `${guildId}-${userId}`;
        return dbData.user_xp[key] || null;
      },
      run(...args) {
        if (sql.includes('INSERT INTO user_xp')) {
          const [guildId, userId] = args;
          dbData.user_xp[`${guildId}-${userId}`] = { guild_id: guildId, user_id: userId, xp: 0, level: 1, messages: 0 };
          saveData(dbData);
        } else if (sql.includes('UPDATE user_xp')) {
          const [xp, level, messages, guildId, userId] = args;
          const key = `${guildId}-${userId}`;
          if (dbData.user_xp[key]) { dbData.user_xp[key].xp = xp; dbData.user_xp[key].level = level; dbData.user_xp[key].messages = messages; saveData(dbData); }
        }
        return { changes: 1, lastInsertRowid: Object.keys(dbData.user_xp).length };
      },
      all(guildId) {
        return Object.values(dbData.user_xp).filter(r => r.guild_id === guildId).sort((a, b) => b.xp - a.xp);
      }
    };
  },
  exec() { /* no-op */ },

  // ===== API baru untuk Akademik =====
  all(table) {
    return dbData[table] || [];
  },
  run(table, data) {
    const id = nextId(table);
    const row = { id, ...data };
    dbData[table].push(row);
    saveData(dbData);
    return row;
  },
  save(table, data) {
    dbData[table] = data;
    saveData(dbData);
  },

  dbType: 'json'
};

console.log('✅ Database JSON siap! (Fallback mode - tanpa SQLite)');

module.exports = db;
