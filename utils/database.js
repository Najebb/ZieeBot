const path = require('path');
const fs = require('fs');

let db;
let dbEnabled = false;
let dbType = 'none';

try {
  const Database = require('better-sqlite3');
  const DB_DIR  = path.join(__dirname, '..', 'data');
  const DB_PATH = path.join(DB_DIR, 'database.db');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`CREATE TABLE IF NOT EXISTS user_xp (guild_id TEXT NOT NULL, user_id TEXT NOT NULL, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1, messages INTEGER DEFAULT 0, PRIMARY KEY (guild_id, user_id))`);
  db.exec(`CREATE TABLE IF NOT EXISTS guild_settings (guild_id TEXT PRIMARY KEY, prefix TEXT DEFAULT '!', xp_rate INTEGER DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS mahasiswa (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, nim TEXT NOT NULL UNIQUE, jurusan TEXT NOT NULL, aktif INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.exec(`CREATE TABLE IF NOT EXISTS jadwal (id INTEGER PRIMARY KEY AUTOINCREMENT, mahasiswa_id INTEGER NOT NULL, hari TEXT NOT NULL, matkul TEXT NOT NULL, jam TEXT NOT NULL, FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE)`);
  db.exec(`CREATE TABLE IF NOT EXISTS tugas (id INTEGER PRIMARY KEY AUTOINCREMENT, mahasiswa_id INTEGER NOT NULL, nama TEXT NOT NULL, matkul TEXT, deadline TEXT, status TEXT DEFAULT 'pending', FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE)`);
  db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, email TEXT, role TEXT DEFAULT 'viewer' CHECK(role IN ('admin','editor','viewer')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.exec(`CREATE TABLE IF NOT EXISTS economy (guild_id TEXT NOT NULL, user_id TEXT NOT NULL, balance INTEGER DEFAULT 0, bank INTEGER DEFAULT 0, last_daily INTEGER DEFAULT 0, last_work INTEGER DEFAULT 0, last_crime INTEGER DEFAULT 0, PRIMARY KEY (guild_id, user_id))`);
  db.exec(`CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT, created_at INTEGER DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS shop_items (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT, price INTEGER NOT NULL, stock INTEGER DEFAULT -1, role_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.exec(`CREATE TABLE IF NOT EXISTS music_history (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT, duration TEXT, requested_by TEXT, played_at INTEGER DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS music_tracks (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT, duration TEXT, play_count INTEGER DEFAULT 0, last_played INTEGER DEFAULT 0)`);

  dbEnabled = true;
  dbType = 'sqlite';
  console.log('✅ Database SQLite siap!');
} catch (error) {
  console.warn('⚠️ better-sqlite3 tidak tersedia:', error.message);
  db = require('./database-simple');
  dbEnabled = true;
  dbType = 'json';
}

module.exports = db;
module.exports.dbEnabled = dbEnabled;
module.exports.dbType = dbType;
