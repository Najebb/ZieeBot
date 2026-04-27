const express = require('express');
const router = express.Router();

// Import auth middleware
let requireAuth, requireRole;
try {
  const auth = require('./auth');
  requireAuth = auth.requireAuth;
  requireRole = auth.requireRole;
} catch(e) {
  // Fallback jika auth belum ada
  requireAuth = (req, res, next) => next();
  requireRole = () => (req, res, next) => next();
}

// ========================
// API Routes untuk Web Dashboard
// ========================

// GET /api/mahasiswa - List semua mahasiswa
router.get('/mahasiswa', requireAuth, (req, res) => {
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

// POST /api/mahasiswa - Tambah mahasiswa baru (editor & admin)
router.post('/mahasiswa', requireAuth, requireRole('admin', 'editor'), (req, res) => {
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

// PUT /api/mahasiswa/:id - Edit mahasiswa (editor & admin)
router.put('/mahasiswa/:id', requireAuth, requireRole('admin', 'editor'), (req, res) => {
  try {
    const db = require('../utils/database');
    const { id } = req.params;
    const { nama, nim, jurusan, aktif } = req.body;

    if (!nama || !nim || !jurusan) {
      return res.status(400).json({ success: false, error: 'Nama, NIM, dan Jurusan wajib diisi!' });
    }

    if (db.dbType === 'sqlite') {
      const existing = db.prepare('SELECT id FROM mahasiswa WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ success: false, error: 'Mahasiswa tidak ditemukan!' });

      db.prepare('UPDATE mahasiswa SET nama = ?, nim = ?, jurusan = ?, aktif = ? WHERE id = ?')
        .run(nama, nim, jurusan, aktif ? 1 : 0, id);
    } else {
      const mahasiswa = db.all('mahasiswa') || [];
      const idx = mahasiswa.findIndex(m => m.id == id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Mahasiswa tidak ditemukan!' });
      mahasiswa[idx] = { ...mahasiswa[idx], nama, nim, jurusan, aktif };
      db.save('mahasiswa', mahasiswa);
    }

    res.json({ success: true, message: 'Data mahasiswa berhasil diupdate!' });
  } catch (error) {
    console.error('❌ Error PUT /api/mahasiswa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/mahasiswa/:id - Hapus mahasiswa (admin only)
router.delete('/mahasiswa/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const db = require('../utils/database');
    const { id } = req.params;

    if (db.dbType === 'sqlite') {
      const existing = db.prepare('SELECT id FROM mahasiswa WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ success: false, error: 'Mahasiswa tidak ditemukan!' });

      // CASCADE akan hapus jadwal & tugas juga
      db.prepare('DELETE FROM mahasiswa WHERE id = ?').run(id);
    } else {
      const mahasiswa = (db.all('mahasiswa') || []).filter(m => m.id != id);
      db.save('mahasiswa', mahasiswa);
      const jadwal = (db.all('jadwal') || []).filter(j => j.mahasiswa_id != id);
      db.save('jadwal', jadwal);
      const tugas = (db.all('tugas') || []).filter(t => t.mahasiswa_id != id);
      db.save('tugas', tugas);
    }

    res.json({ success: true, message: 'Mahasiswa berhasil dihapus!' });
  } catch (error) {
    console.error('❌ Error DELETE /api/mahasiswa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/jadwal - List semua jadwal
router.get('/jadwal', requireAuth, (req, res) => {
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
router.get('/tugas', requireAuth, (req, res) => {
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

// PATCH /api/tugas/:id - Update status tugas (editor & admin)
router.patch('/tugas/:id', requireAuth, requireRole('admin', 'editor'), (req, res) => {
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

// GET /api/export/csv - Export semua data mahasiswa sebagai CSV
router.get('/export/csv', requireAuth, (req, res) => {
  try {
    const db = require('../utils/database');
    let mahasiswaRows, allTugas, allJadwal;

    if (db.dbType === 'sqlite') {
      mahasiswaRows = db.prepare('SELECT * FROM mahasiswa ORDER BY nama').all();
      allTugas = db.prepare('SELECT * FROM tugas').all();
      allJadwal = db.prepare('SELECT * FROM jadwal').all();
    } else {
      mahasiswaRows = db.all('mahasiswa') || [];
      allTugas = db.all('tugas') || [];
      allJadwal = db.all('jadwal') || [];
    }

    // Build CSV
    const header = ['ID', 'Nama', 'NIM', 'Jurusan', 'Status', 'Jumlah Jadwal', 'Total Tugas', 'Tugas Selesai', 'Tugas Pending', 'Tanggal Daftar'];
    const rows = mahasiswaRows.map(m => {
      const jadwalM = allJadwal.filter(j => j.mahasiswa_id == m.id);
      const tugasM = allTugas.filter(t => t.mahasiswa_id == m.id);
      const done = tugasM.filter(t => t.status === 'done').length;
      return [
        m.id,
        `"${m.nama}"`,
        m.nim,
        `"${m.jurusan}"`,
        m.aktif ? 'Aktif' : 'Non-Aktif',
        jadwalM.length,
        tugasM.length,
        done,
        tugasM.length - done,
        m.created_at ? new Date(m.created_at).toLocaleDateString('id-ID') : '—'
      ].join(',');
    });

    const csv = [header.join(','), ...rows].join('\n');
    const filename = `mahasiswa_${new Date().toISOString().slice(0,10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM untuk Excel compatibility
  } catch (error) {
    console.error('❌ Error GET /api/export/csv:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/stats/tugas - Statistik tugas untuk grafik
router.get('/stats/tugas', requireAuth, (req, res) => {
  try {
    const db = require('../utils/database');
    let mahasiswaRows, allTugas;

    if (db.dbType === 'sqlite') {
      mahasiswaRows = db.prepare('SELECT * FROM mahasiswa ORDER BY nama').all();
      allTugas = db.prepare('SELECT * FROM tugas').all();
    } else {
      mahasiswaRows = db.all('mahasiswa') || [];
      allTugas = db.all('tugas') || [];
    }

    const totalDone = allTugas.filter(t => t.status === 'done').length;
    const totalPending = allTugas.filter(t => t.status === 'pending').length;
    const totalTugas = allTugas.length;

    // Per mahasiswa
    const perMahasiswa = mahasiswaRows.map(m => {
      const tugasM = allTugas.filter(t => t.mahasiswa_id == m.id);
      const done = tugasM.filter(t => t.status === 'done').length;
      return {
        nama: m.nama,
        nim: m.nim,
        total: tugasM.length,
        done,
        pending: tugasM.length - done,
        progress: tugasM.length > 0 ? Math.round((done / tugasM.length) * 100) : 0
      };
    }).filter(m => m.total > 0);

    // Per jurusan
    const jurusanMap = {};
    mahasiswaRows.forEach(m => {
      const tugasM = allTugas.filter(t => t.mahasiswa_id == m.id);
      if (!jurusanMap[m.jurusan]) jurusanMap[m.jurusan] = { done: 0, pending: 0, total: 0 };
      jurusanMap[m.jurusan].total += tugasM.length;
      jurusanMap[m.jurusan].done += tugasM.filter(t => t.status === 'done').length;
      jurusanMap[m.jurusan].pending += tugasM.filter(t => t.status === 'pending').length;
    });

    res.json({
      success: true,
      data: {
        summary: { total: totalTugas, done: totalDone, pending: totalPending, totalMahasiswa: mahasiswaRows.length },
        perMahasiswa,
        perJurusan: Object.entries(jurusanMap).map(([jurusan, stat]) => ({ jurusan, ...stat }))
      }
    });
  } catch (error) {
    console.error('❌ Error GET /api/stats/tugas:', error);
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

// =====================================================
// ECONOMY API ROUTES
// =====================================================

// GET /api/economy/overview
router.get('/economy/overview', requireAuth, (req, res) => {
  try {
    const db = require('../utils/database');
    const guildId = req.query.guild_id || '';
    let users, transactions, shopItems;

    if (db.dbType === 'sqlite') {
      users = guildId
        ? db.prepare('SELECT * FROM economy WHERE guild_id=? ORDER BY balance+bank DESC').all(guildId)
        : db.prepare('SELECT * FROM economy ORDER BY balance+bank DESC').all();
      transactions = guildId
        ? db.prepare('SELECT * FROM transactions WHERE guild_id=? ORDER BY created_at DESC LIMIT 50').all(guildId)
        : db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 50').all();
      shopItems = guildId
        ? db.prepare('SELECT * FROM shop_items WHERE guild_id=?').all(guildId)
        : db.prepare('SELECT * FROM shop_items').all();
    } else {
      users        = db.all('economy') || [];
      transactions = (db.all('transactions') || []).slice(0, 50);
      shopItems    = db.all('shop_items') || [];
    }

    const totalSupply = users.reduce((s, u) => s + (u.balance||0) + (u.bank||0), 0);
    const txToday     = transactions.filter(t => (Date.now()/1000 - t.created_at) < 86400).length;

    res.json({ success: true, data: { users, transactions, shopItems, stats: { totalUsers: users.length, totalSupply, txToday, totalItems: shopItems.length } } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/economy/admin/add
router.post('/economy/admin/add', requireAuth, requireRole('admin', 'editor'), (req, res) => {
  try {
    const db = require('../utils/database');
    const { guild_id, user_id, amount, note } = req.body;
    if (!guild_id || !user_id || !amount) return res.status(400).json({ success: false, error: 'guild_id, user_id, amount wajib diisi' });

    if (db.dbType === 'sqlite') {
      const existing = db.prepare('SELECT * FROM economy WHERE guild_id=? AND user_id=?').get(guild_id, user_id);
      if (!existing) db.prepare('INSERT INTO economy (guild_id,user_id,balance,bank,last_daily,last_work,last_crime) VALUES (?,?,0,0,0,0,0)').run(guild_id, user_id);
      db.prepare('UPDATE economy SET balance=balance+? WHERE guild_id=? AND user_id=?').run(amount, guild_id, user_id);
      db.prepare('INSERT INTO transactions (guild_id,user_id,type,amount,note,created_at) VALUES (?,?,?,?,?,?)').run(guild_id, user_id, 'admin_grant', amount, note || 'Admin grant', Math.floor(Date.now()/1000));
    } else {
      const all = db.all('economy') || [];
      let u = all.find(r => r.guild_id === guild_id && r.user_id === user_id);
      if (!u) { u = { guild_id, user_id, balance: 0, bank: 0, last_daily: 0, last_work: 0, last_crime: 0 }; all.push(u); }
      u.balance += amount;
      db.save('economy', all);
      const txs = db.all('transactions') || [];
      txs.unshift({ id: Date.now(), guild_id, user_id, type: 'admin_grant', amount, note: note || 'Admin grant', created_at: Math.floor(Date.now()/1000) });
      db.save('transactions', txs.slice(0, 500));
    }
    res.json({ success: true, message: `+${amount} ZN ditambahkan ke ${user_id}` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/economy/admin/deduct
router.post('/economy/admin/deduct', requireAuth, requireRole('admin', 'editor'), (req, res) => {
  try {
    const db = require('../utils/database');
    const { guild_id, user_id, amount, note } = req.body;
    if (!guild_id || !user_id || !amount) return res.status(400).json({ success: false, error: 'guild_id, user_id, amount wajib diisi' });

    if (db.dbType === 'sqlite') {
      db.prepare('UPDATE economy SET balance=MAX(0,balance-?) WHERE guild_id=? AND user_id=?').run(amount, guild_id, user_id);
      db.prepare('INSERT INTO transactions (guild_id,user_id,type,amount,note,created_at) VALUES (?,?,?,?,?,?)').run(guild_id, user_id, 'admin_deduct', -amount, note || 'Admin deduct', Math.floor(Date.now()/1000));
    } else {
      const all = db.all('economy') || [];
      const u = all.find(r => r.guild_id === guild_id && r.user_id === user_id);
      if (u) { u.balance = Math.max(0, u.balance - amount); db.save('economy', all); }
    }
    res.json({ success: true, message: `-${amount} ZN dikurangi dari ${user_id}` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/economy/shop/add
router.post('/economy/shop/add', requireAuth, requireRole('admin', 'editor'), (req, res) => {
  try {
    const db = require('../utils/database');
    const { guild_id, name, description, price, stock, role_id } = req.body;
    if (!guild_id || !name || !price) return res.status(400).json({ success: false, error: 'guild_id, name, price wajib diisi' });

    let id;
    if (db.dbType === 'sqlite') {
      const r = db.prepare('INSERT INTO shop_items (guild_id,name,description,price,stock,role_id) VALUES (?,?,?,?,?,?)').run(guild_id, name, description||'', price, stock||-1, role_id||null);
      id = r.lastInsertRowid;
    } else {
      const all = db.all('shop_items') || [];
      id = all.length > 0 ? Math.max(...all.map(i => i.id||0)) + 1 : 1;
      all.push({ id, guild_id, name, description: description||'', price, stock: stock||-1, role_id: role_id||null, created_at: new Date().toISOString() });
      db.save('shop_items', all);
    }
    res.json({ success: true, message: `Item "${name}" ditambahkan`, id });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/economy/shop/:id
router.delete('/economy/shop/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const db = require('../utils/database');
    const { id } = req.params;
    if (db.dbType === 'sqlite') {
      db.prepare('DELETE FROM shop_items WHERE id=?').run(id);
    } else {
      db.save('shop_items', (db.all('shop_items') || []).filter(i => i.id != id));
    }
    res.json({ success: true, message: 'Item dihapus' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// =====================================================
// MUSIC API ROUTES
// =====================================================

// GET /api/music/stats
router.get('/music/stats', requireAuth, (req, res) => {
  try {
    const db = require('../utils/database');
    const guildId = req.query.guild_id || '';
    let history, tracks, nowPlaying = null;

    if (db.dbType === 'sqlite') {
      history = guildId
        ? db.prepare('SELECT * FROM music_history WHERE guild_id=? ORDER BY played_at DESC LIMIT 50').all(guildId)
        : db.prepare('SELECT * FROM music_history ORDER BY played_at DESC LIMIT 50').all();
      tracks = guildId
        ? db.prepare('SELECT * FROM music_tracks WHERE guild_id=? ORDER BY play_count DESC LIMIT 20').all(guildId)
        : db.prepare('SELECT * FROM music_tracks ORDER BY play_count DESC LIMIT 20').all();
    } else {
      history = (db.all('music_history') || []).slice(0, 50);
      tracks  = (db.all('music_tracks')  || []).sort((a,b) => (b.play_count||0) - (a.play_count||0)).slice(0, 20);
    }

    // Queue dari memory
    try {
      const { queues } = require('../commands/music/music');
      if (guildId && queues.has(guildId)) {
        const q = queues.get(guildId);
        if (q.playing && q.tracks.length) {
          nowPlaying = { ...q.tracks[q.currentIndex], volume: q.volume, loop: q.loop, queueLength: q.tracks.length };
        }
      }
    } catch (_) {}

    const totalPlays = tracks.reduce((s, t) => s + (t.play_count||0), 0);

    res.json({ success: true, data: { history, topTracks: tracks, nowPlaying, stats: { totalTracks: tracks.length, totalPlays, historyCount: history.length } } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/music/queue
router.get('/music/queue', requireAuth, (req, res) => {
  try {
    const guildId = req.query.guild_id || '';
    let queueData = { tracks: [], playing: false, currentIndex: 0, volume: 80, loop: false };
    try {
      const { queues } = require('../commands/music/music');
      if (guildId && queues.has(guildId)) queueData = queues.get(guildId);
    } catch (_) {}
    res.json({ success: true, data: queueData });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/music/volume
router.post('/music/volume', requireAuth, requireRole('admin', 'editor'), (req, res) => {
  try {
    const { guild_id, volume } = req.body;
    if (!guild_id || volume === undefined) return res.status(400).json({ success: false, error: 'guild_id dan volume wajib' });
    try {
      const { queues } = require('../commands/music/music');
      if (queues.has(guild_id)) queues.get(guild_id).volume = Math.max(0, Math.min(100, volume));
    } catch (_) {}
    res.json({ success: true, message: `Volume diset ke ${volume}%` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/music/skip
router.post('/music/skip', requireAuth, requireRole('admin', 'editor'), (req, res) => {
  try {
    const { guild_id } = req.body;
    try {
      const { queues } = require('../commands/music/music');
      if (queues.has(guild_id)) {
        const q = queues.get(guild_id);
        q.currentIndex++;
        if (q.currentIndex >= q.tracks.length) { q.playing = false; q.tracks = []; q.currentIndex = 0; }
      }
    } catch (_) {}
    res.json({ success: true, message: 'Lagu diskip' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
