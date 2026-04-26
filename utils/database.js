const path = require('path');
const fs = require('fs');

let db;
let dbEnabled = false;
let dbType = 'none';

// ========================
// Coba pakai better-sqlite3
// ========================
try {
  const Database = require('better-sqlite3');

  const DB_DIR = path.join(__dirname, '..', 'data');
  const DB_PATH = path.join(DB_DIR, 'database.db');

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Tabel XP
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_xp (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      messages INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    )
  `);

  // Tabel guild_settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT DEFAULT '!',
      xp_rate INTEGER DEFAULT 1
    )
  `);

  // ===== TABEL AKADEMIK (Web Dashboard) =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS mahasiswa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      nim TEXT NOT NULL UNIQUE,
      jurusan TEXT NOT NULL,
      aktif INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS jadwal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mahasiswa_id INTEGER NOT NULL,
      hari TEXT NOT NULL,
      matkul TEXT NOT NULL,
      jam TEXT NOT NULL,
      FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tugas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mahasiswa_id INTEGER NOT NULL,
      nama TEXT NOT NULL,
      matkul TEXT,
      deadline TEXT,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE
    )
  `);

  dbEnabled = true;
  dbType = 'sqlite';
  console.log('✅ Database SQLite siap! (Native mode)');
} catch (error) {
  console.warn('⚠️ better-sqlite3 tidak tersedia:', error.message);
  console.warn('   Fallback ke JSON database...');

  db = require('./database-simple');
  dbEnabled = true;
  dbType = 'json';
}

module.exports = db;
module.exports.dbEnabled = dbEnabled;
module.exports.dbType = dbType;
