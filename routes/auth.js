const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading users:', e.message);
  }
  return [];
}

function saveUsers(users) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error saving users:', e.message);
  }
}

// In-memory state
let users = loadUsers();
const tokens = new Map(); // token => userId

// Ensure owner account exists
const ownerUsername = process.env.OWNER_USERNAME || 'owner';
const ownerPassword = process.env.OWNER_PASSWORD || 'zieebot123';
let ownerUser = users.find(u => u.role === 'owner');
if (!ownerUser) {
  ownerUser = {
    id: 'owner-' + Date.now(),
    username: ownerUsername,
    password: ownerPassword,
    email: '',
    role: 'owner',
    createdAt: new Date().toISOString()
  };
  users.push(ownerUser);
  saveUsers(users);
  console.log(`👑 Owner account created: ${ownerUsername}`);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /auth/register
router.post('/register', (req, res) => {
  try {
    const { username, password, email } = req.body;
    // #region agent log
    fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2257f3'},body:JSON.stringify({sessionId:'2257f3',runId:'initial',hypothesisId:'H4',location:'routes/auth.js:register:entry',message:'register endpoint called',data:{hasUsername:Boolean(username),hasPassword:Boolean(password),hasEmail:Boolean(email)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi!' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ success: false, error: 'Username 3-20 karakter!' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter!' });
    }
    if (username === ownerUsername) {
      return res.status(409).json({ success: false, error: 'Username tidak tersedia!' });
    }
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ success: false, error: 'Username sudah terdaftar!' });
    }

    const isFirstUser = users.filter(u => u.role !== 'owner').length === 0;
    const user = {
      id: 'u-' + Date.now(),
      username,
      password,
      email: email || '',
      role: isFirstUser ? 'admin' : 'viewer',
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    res.json({ success: true, message: 'Akun berhasil dibuat!', role: user.role });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    // #region agent log
    fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2257f3'},body:JSON.stringify({sessionId:'2257f3',runId:'initial',hypothesisId:'H4',location:'routes/auth.js:login:entry',message:'login endpoint called',data:{hasUsername:Boolean(username),hasPassword:Boolean(password)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi!' });
    }

    const user = users.find(u => u.username === username && u.password === password);
    // #region agent log
    fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2257f3'},body:JSON.stringify({sessionId:'2257f3',runId:'initial',hypothesisId:'H4',location:'routes/auth.js:login:lookup',message:'login credential lookup complete',data:{usernameProvided:username||null,userFound:Boolean(user)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!user) {
      return res.status(401).json({ success: false, error: 'Username atau password salah!' });
    }

    const token = generateToken();
    tokens.set(token, user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /auth/me
router.get('/me', (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token || !tokens.has(token)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = tokens.get(token);
    const user = users.find(u => u.id === userId);
    if (!user) {
      tokens.delete(token);
      return res.status(401).json({ success: false, error: 'User tidak ditemukan' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (token) tokens.delete(token);
    res.json({ success: true, message: 'Logout berhasil' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Middleware for other routes
function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const userId = tokens.get(token);
  const user = users.find(u => u.id === userId);
  if (!user) {
    tokens.delete(token);
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    // Owner bypasses all role checks
    if (req.user.role === 'owner') return next();
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ success: false, error: 'Forbidden' });
  };
}

// GET /auth/users - list akun (admin/owner)
router.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email || '',
      role: u.role,
      createdAt: u.createdAt || null
    }));
    res.json({ success: true, data: safeUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /auth/users/:id/export - download data akun (admin/owner)
router.get('/users/:id/export', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email || '',
      role: user.role,
      createdAt: user.createdAt || null
    };
    const safeName = (user.username || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="akun_${safeName}.json"`);
    res.send(JSON.stringify(safeUser, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /auth/users/:id - hapus akun (admin/owner)
router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const targetId = req.params.id;
    const targetUser = users.find(u => u.id === targetId);

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User tidak ditemukan' });
    }
    if (targetUser.role === 'owner') {
      return res.status(403).json({ success: false, error: 'Akun owner tidak bisa dihapus' });
    }
    if (req.user.id === targetId) {
      return res.status(400).json({ success: false, error: 'Tidak bisa menghapus akun sendiri' });
    }

    users = users.filter(u => u.id !== targetId);
    saveUsers(users);

    for (const [token, userId] of tokens.entries()) {
      if (userId === targetId) tokens.delete(token);
    }

    res.json({ success: true, message: 'Akun berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, requireAuth, requireRole };

