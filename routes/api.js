const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// ========================
// HELPERS
// ========================
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Simple in-memory token store (reset on restart; acceptable for this scope)
const tokenStore = new Map();

function getDb() {
  return require('../utils/database');
}

// ========================
// AUTH ROUTES
// ========================

// POST /api/auth/register — Buat akun publik
router.post('/auth/register', (req, res) => {
  try {
    const db = getDb();
    const { username, password, email, display_name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi!' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter!' });
    }

    const password_hash = hashPassword(password);

    if (db.dbType === 'sqlite') {
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        return res.status(409).json({ success: false, error: 'Username sudah terpakai!' });
      }
      const stmt = db.prepare('INSERT INTO users (username, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)');
      const result = stmt.run(username, email || null, password_hash, display_name || username, 'user');
      res.json({ success: true, message: 'Akun berhasil dibuat! Silakan login.', userId: result.lastInsertRowid });
    } else {
      const users = db.all('users') || [];
      if (users.find(u => u.username === username)) {
        return res.status(409).json({ success: false, error: 'Username sudah terpakai!' });
      }
      const newUser = db.run('users', {
        username, email: email || null, password_hash,
        display_name: display_name || username, role: 'user', created_at: new Date().toISOString()
      });
      res.json({ success: true, message: 'Akun berhasil dibuat! Silakan login.', userId: newUser.id });
    }
  } catch (error) {
    console.error('❌ Error POST /api/auth/register:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login — Login dan dapat token
router.post('/auth/login', (req, res) => {
  try {
    const db = getDb();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi!' });
    }

    const password_hash = hashPassword(password);
    let user;

    if (db.dbType === 'sqlite') {
      user = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?').get(username, password_hash);
      if (user) {
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
      }
    } else {
      const users = db.all('users') || [];
      user = users.find(u => u.username === username && u.password_hash === password_hash);
      if (user) {
        user.last_login = new Date().toISOString();
        db.save('users', users);
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Username atau password salah!' });
    }

    const token = generateToken();
    tokenStore.set(token, { userId: user.id, username: user.username, role: user.role });

    res.json({
      success: true,
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Error POST /api/auth/login:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me — Validasi token
router.get('/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token tidak ditemukan!' });
    }
    const token = authHeader.slice(7);
    const session = tokenStore.get(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Token tidak valid!' });
    }
    res.json({ success: true, user: session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================
// MAHASISWA CRUD
// ========================

// GET /api/mahasiswa - List semua mahasiswa
router.get('/mahasiswa', (req, res) => {
  try {
    const db = getDb();
    let rows;

    if (db.dbType === 'sqlite') {
      const stmt = db.prepare('SELECT * FROM mahasiswa ORDER BY created_at DESC');
      rows = stmt.all();
    } else {
      rows = db.all('mahasiswa') || [];
    }

    const result = rows.map(m => {
      let jadwal = [], tugas = [];
      if (db.dbType === 'sqlite') {
        jadwal = db.prepare('SELECT * FROM jadwal WHERE mahasiswa_id = ?').all(m.id);
        tugas = db.prepare('SELECT * FROM tugas WHERE mahasiswa_id = ?').all(m.id);
      } else {
        jadwal = db.all('jadwal').filter(j => j.mahasiswa_id === m.id) || [];
        tugas = db.all('tugas').filter(t => t.mahasiswa_id === m.id) || [];
      }
      return {
        ...m,
        aktif: m.aktif === 1 || m.aktif === true,
        jadwal: jadwal.map(j => `${j.hari}: ${j.matkul} ${j.jam}`),
        tugas: tugas.map(t => ({
          id: t.id,
          nama: t.nama,
          matkul: t.matkul || '—',
          deadline: t.deadline || '—',
          status: t.status || 'pending'
        }))
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error GET /api/mahasiswa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/mahasiswa - Tambah mahasiswa baru
router.post('/mahasiswa', (req, res) => {
  try {
    const db = getDb();
    const { nama, nim, jurusan, aktif = true, jadwal = [], tugas = [] } = req.body;

    if (!nama || !nim || !jurusan) {
      return res.status(400).json({ success: false, error: 'Nama, NIM, dan Jurusan wajib diisi!' });
    }

    let mahasiswaId;

    if (db.dbType === 'sqlite') {
      const insert = db.prepare('INSERT INTO mahasiswa (nama, nim, jurusan, aktif) VALUES (?, ?, ?, ?)');
      const result = insert.run(nama, nim, jurusan, aktif ? 1 : 0);
      mahasiswaId = result.lastInsertRowid;

      const insertJadwal = db.prepare('INSERT INTO jadwal (mahasiswa_id, hari, matkul, jam) VALUES (?, ?, ?, ?)');
      jadwal.forEach(j => {
        const match = j.match(/^(\w+):\s*(.+?)\s+(\d+:\d+)/);
        if (match) insertJadwal.run(mahasiswaId, match[1], match[2], match[3]);
      });

      const insertTugas = db.prepare('INSERT INTO tugas (mahasiswa_id, nama, matkul, deadline, status) VALUES (?, ?, ?, ?, ?)');
      tugas.forEach(t => {
        insertTugas.run(mahasiswaId, t.nama, t.matkul || '—', t.deadline || '—', t.status || 'pending');
      });
    } else {
      const mhs = db.run('mahasiswa', { nama, nim, jurusan, aktif, created_at: new Date().toISOString() });
      mahasiswaId = mhs.id;

      jadwal.forEach(j => {
        const match = j.match(/^(\w+):\s*(.+?)\s+(\d+:\d+)/);
        if (match) db.run('jadwal', { mahasiswa_id: mahasiswaId, hari: match[1], matkul: match[2], jam: match[3] });
      });

      tugas.forEach(t => {
        db.run('tugas', { mahasiswa_id: mahasiswaId, nama: t.nama, matkul: t.matkul || '—', deadline: t.deadline || '—', status: t.status || 'pending' });
      });
    }

    res.json({ success: true, message: 'Mahasiswa berhasil ditambahkan!', id: mahasiswaId });
  } catch (error) {
    console.error('❌ Error POST /api/mahasiswa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/mahasiswa/:id - Edit mahasiswa
router.put('/mahasiswa/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { nama, nim, jurusan, aktif } = req.body;

    if (!nama || !nim || !jurusan) {
      return res.status(400).json({ success: false, error: 'Nama, NIM, dan Jurusan wajib diisi!' });
    }

    if (db.dbType === 'sqlite') {
      db.prepare('UPDATE mahasiswa SET nama = ?, nim = ?, jurusan = ?, aktif = ? WHERE id = ?')
        .run(nama, nim, jurusan, aktif ? 1 : 0, id);
    } else {
      const mahasiswa = db.all('mahasiswa') || [];
      const m = mahasiswa.find(m => m.id == id);
      if (!m) return res.status(404).json({ success: false, error: 'Mahasiswa tidak ditemukan!' });
      m.nama = nama; m.nim = nim; m.jurusan = jurusan; m.aktif = aktif;
      db.save('mahasiswa', mahasiswa);
    }

    res.json({ success: true, message: 'Mahasiswa berhasil diperbarui!' });
  } catch (error) {
    console.error('❌ Error PUT /api/mahasiswa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/mahasiswa/:id - Hapus mahasiswa (cascade jadwal & tugas)
router.delete('/mahasiswa/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (db.dbType === 'sqlite') {
      db.prepare('DELETE FROM tugas WHERE mahasiswa_id = ?').run(id);
      db.prepare('DELETE FROM jadwal WHERE mahasiswa_id = ?').run(id);
      db.prepare('DELETE FROM mahasiswa WHERE id = ?').run(id);
    } else {
      let tugas = db.all('tugas') || [];
      let jadwal = db.all('jadwal') || [];
      let mahasiswa = db.all('mahasiswa') || [];
      tugas = tugas.filter(t => t.mahasiswa_id != id);
      jadwal = jadwal.filter(j => j.mahasiswa_id != id);
      mahasiswa = mahasiswa.filter(m => m.id != id);
      db.save('tugas', tugas);
      db.save('jadwal', jadwal);
      db.save('mahasiswa', mahasiswa);
    }

    res.json({ success: true, message: 'Mahasiswa beserta jadwal & tugas berhasil dihapus!' });
  } catch (error) {
    console.error('❌ Error DELETE /api/mahasiswa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================
// JADWAL CRUD
// ========================

// GET /api/jadwal - List semua jadwal
router.get('/jadwal', (req, res) => {
  try {
    const db = getDb();
    const HARI_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    let rows;

    if (db.dbType === 'sqlite') {
      rows = db.prepare(`
        SELECT j.*, m.nama as nama_mhs, m.nim 
        FROM jadwal j 
        JOIN mahasiswa m ON j.mahasiswa_id = m.id 
        ORDER BY j.hari, j.jam
      `).all();
    } else {
      const jadwal = db.all('jadwal') || [];
      const mahasiswa = db.all('mahasiswa') || [];
      rows = jadwal.map(j => {
        const m = mahasiswa.find(m => m.id === j.mahasiswa_id);
        return { ...j, nama_mhs: m?.nama || 'Unknown', nim: m?.nim || '' };
      }).sort((a, b) => {
        const hariDiff = HARI_ORDER.indexOf(a.hari) - HARI_ORDER.indexOf(b.hari);
        return hariDiff !== 0 ? hariDiff : a.jam.localeCompare(b.jam);
      });
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error GET /api/jadwal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/jadwal - Tambah jadwal untuk mahasiswa
router.post('/jadwal', (req, res) => {
  try {
    const db = getDb();
    const { mahasiswa_id, hari, matkul, jam } = req.body;

    if (!mahasiswa_id || !hari || !matkul || !jam) {
      return res.status(400).json({ success: false, error: 'Semua field wajib diisi!' });
    }

    let resultId;
    if (db.dbType === 'sqlite') {
      const stmt = db.prepare('INSERT INTO jadwal (mahasiswa_id, hari, matkul, jam) VALUES (?, ?, ?, ?)');
      const result = stmt.run(mahasiswa_id, hari, matkul, jam);
      resultId = result.lastInsertRowid;
    } else {
      const row = db.run('jadwal', { mahasiswa_id, hari, matkul, jam });
      resultId = row.id;
    }

    res.json({ success: true, message: 'Jadwal berhasil ditambahkan!', id: resultId });
  } catch (error) {
    console.error('❌ Error POST /api/jadwal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/jadwal/:id - Edit jadwal
router.put('/jadwal/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { hari, matkul, jam } = req.body;

    if (!hari || !matkul || !jam) {
      return res.status(400).json({ success: false, error: 'Hari, matkul, dan jam wajib diisi!' });
    }

    if (db.dbType === 'sqlite') {
      db.prepare('UPDATE jadwal SET hari = ?, matkul = ?, jam = ? WHERE id = ?').run(hari, matkul, jam, id);
    } else {
      const jadwal = db.all('jadwal') || [];
      const j = jadwal.find(j => j.id == id);
      if (!j) return res.status(404).json({ success: false, error: 'Jadwal tidak ditemukan!' });
      j.hari = hari; j.matkul = matkul; j.jam = jam;
      db.save('jadwal', jadwal);
    }

    res.json({ success: true, message: 'Jadwal berhasil diperbarui!' });
  } catch (error) {
    console.error('❌ Error PUT /api/jadwal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/jadwal/:id - Hapus jadwal
router.delete('/jadwal/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (db.dbType === 'sqlite') {
      db.prepare('DELETE FROM jadwal WHERE id = ?').run(id);
    } else {
      const jadwal = db.all('jadwal') || [];
      db.save('jadwal', jadwal.filter(j => j.id != id));
    }

    res.json({ success: true, message: 'Jadwal berhasil dihapus!' });
  } catch (error) {
    console.error('❌ Error DELETE /api/jadwal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================
// TUGAS CRUD
// ========================

// GET /api/tugas - List semua tugas
router.get('/tugas', (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;
    let rows;

    if (db.dbType === 'sqlite') {
      let query = `
        SELECT t.*, m.nama as nama_mhs 
        FROM tugas t 
        JOIN mahasiswa m ON t.mahasiswa_id = m.id
      `;
      if (status) query += ` WHERE t.status = '${status}'`;
      query += ` ORDER BY t.deadline`;
      rows = db.prepare(query).all();
    } else {
      const tugas = db.all('tugas') || [];
      const mahasiswa = db.all('mahasiswa') || [];
      rows = tugas.map(t => {
        const m = mahasiswa.find(m => m.id === t.mahasiswa_id);
        return { ...t, nama_mhs: m?.nama || 'Unknown' };
      });
      if (status) rows = rows.filter(r => r.status === status);
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error GET /api/tugas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tugas - Tambah tugas untuk mahasiswa
router.post('/tugas', (req, res) => {
  try {
    const db = getDb();
    const { mahasiswa_id, nama, matkul, deadline, status = 'pending' } = req.body;

    if (!mahasiswa_id || !nama) {
      return res.status(400).json({ success: false, error: 'Mahasiswa ID dan nama tugas wajib diisi!' });
    }

    let resultId;
    if (db.dbType === 'sqlite') {
      const stmt = db.prepare('INSERT INTO tugas (mahasiswa_id, nama, matkul, deadline, status) VALUES (?, ?, ?, ?, ?)');
      const result = stmt.run(mahasiswa_id, nama, matkul || '—', deadline || '—', status);
      resultId = result.lastInsertRowid;
    } else {
      const row = db.run('tugas', { mahasiswa_id, nama, matkul: matkul || '—', deadline: deadline || '—', status });
      resultId = row.id;
    }

    res.json({ success: true, message: 'Tugas berhasil ditambahkan!', id: resultId });
  } catch (error) {
    console.error('❌ Error POST /api/tugas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/tugas/:id - Edit tugas
router.put('/tugas/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { nama, matkul, deadline, status } = req.body;

    if (!nama) {
      return res.status(400).json({ success: false, error: 'Nama tugas wajib diisi!' });
    }
    if (status && !['done', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status harus "done" atau "pending"!' });
    }

    if (db.dbType === 'sqlite') {
      db.prepare('UPDATE tugas SET nama = ?, matkul = ?, deadline = ?, status = ? WHERE id = ?')
        .run(nama, matkul || '—', deadline || '—', status || 'pending', id);
    } else {
      const tugas = db.all('tugas') || [];
      const t = tugas.find(t => t.id == id);
      if (!t) return res.status(404).json({ success: false, error: 'Tugas tidak ditemukan!' });
      t.nama = nama; t.matkul = matkul || '—'; t.deadline = deadline || '—'; t.status = status || t.status;
      db.save('tugas', tugas);
    }

    res.json({ success: true, message: 'Tugas berhasil diperbarui!' });
  } catch (error) {
    console.error('❌ Error PUT /api/tugas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/tugas/:id - Hapus tugas
router.delete('/tugas/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (db.dbType === 'sqlite') {
      db.prepare('DELETE FROM tugas WHERE id = ?').run(id);
    } else {
      const tugas = db.all('tugas') || [];
      db.save('tugas', tugas.filter(t => t.id != id));
    }

    res.json({ success: true, message: 'Tugas berhasil dihapus!' });
  } catch (error) {
    console.error('❌ Error DELETE /api/tugas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/tugas/:id - Update status tugas (quick toggle)
router.patch('/tugas/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    if (!['done', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status harus "done" atau "pending"' });
    }

    if (db.dbType === 'sqlite') {
      db.prepare('UPDATE tugas SET status = ? WHERE id = ?').run(status, id);
    } else {
      const tugas = db.all('tugas') || [];
      const t = tugas.find(t => t.id == id);
      if (t) {
        t.status = status;
        db.save('tugas', tugas);
      }
    }

    res.json({ success: true, message: 'Status tugas diperbarui!' });
  } catch (error) {
    console.error('❌ Error PATCH /api/tugas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================
// DASHBOARD STATS
// ========================

// GET /api/dashboard/stats - Overview dashboard akademik
router.get('/dashboard/stats', (req, res) => {
  try {
    const db = getDb();
    let stats = {};

    if (db.dbType === 'sqlite') {
      stats.totalMahasiswa = db.prepare('SELECT COUNT(*) as c FROM mahasiswa').get().c;
      stats.aktifMahasiswa = db.prepare('SELECT COUNT(*) as c FROM mahasiswa WHERE aktif = 1').get().c;
      stats.totalJadwal = db.prepare('SELECT COUNT(*) as c FROM jadwal').get().c;
      stats.totalTugas = db.prepare('SELECT COUNT(*) as c FROM tugas').get().c;
      stats.tugasPending = db.prepare('SELECT COUNT(*) as c FROM tugas WHERE status = ?').get('pending').c;
      stats.tugasDone = db.prepare('SELECT COUNT(*) as c FROM tugas WHERE status = ?').get('done').c;
    } else {
      const mahasiswa = db.all('mahasiswa') || [];
      const jadwal = db.all('jadwal') || [];
      const tugas = db.all('tugas') || [];
      stats.totalMahasiswa = mahasiswa.length;
      stats.aktifMahasiswa = mahasiswa.filter(m => m.aktif === 1 || m.aktif === true).length;
      stats.totalJadwal = jadwal.length;
      stats.totalTugas = tugas.length;
      stats.tugasPending = tugas.filter(t => t.status === 'pending').length;
      stats.tugasDone = tugas.filter(t => t.status === 'done').length;
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Error GET /api/dashboard/stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================
// BOT STATS
// ========================

// GET /api/stats - Stats bot real-time
router.get('/stats', (req, res) => {
  try {
    const client = req.app.get('discordClient');
    res.json({
      success: true,
      data: {
        servers: client?.guilds?.cache?.size || 0,
        users: client?.users?.cache?.size || 0,
        commands: client?.commands?.size || 0,
        uptime: process.uptime(),
        status: client?.readyAt ? 'online' : 'offline'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

