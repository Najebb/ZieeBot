const express = require('express');
const router = express.Router();

// ========================
// API Routes untuk Web Dashboard
// ========================

// GET /api/mahasiswa - List semua mahasiswa
router.get('/mahasiswa', (req, res) => {
  try {
    const db = require('../utils/database');
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
    const db = require('../utils/database');
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

// GET /api/jadwal - List semua jadwal
router.get('/jadwal', (req, res) => {
  try {
    const db = require('../utils/database');
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

// GET /api/tugas - List semua tugas
router.get('/tugas', (req, res) => {
  try {
    const db = require('../utils/database');
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

// PATCH /api/tugas/:id - Update status tugas
router.patch('/tugas/:id', (req, res) => {
  try {
    const db = require('../utils/database');
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

