/* ================================================
   ZieeBot Website v2.1 — script.js (v1.4 Update)
   ================================================ */

const API_BASE = window.location.origin;

/* ===== STATE ===== */
let mahasiswaData = [];
let isLoading = false;
let currentUser = null;
let authToken = localStorage.getItem('zb_token') || null;
let deleteTarget = null;

/* ===== API HELPERS ===== */
async function apiGet(endpoint) {
  try {
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api${endpoint}`, { headers });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, error: err.message };
  }
}

async function apiPost(endpoint, body) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiPut(endpoint, body) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api${endpoint}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiPatch(endpoint, body) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api${endpoint}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiDelete(endpoint) {
  try {
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/api${endpoint}`, { method: 'DELETE', headers });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ===== AUTH ===== */
function updateNavAuth() {
  const navUser = document.getElementById('navUser');
  const navLoginBtn = document.getElementById('navLoginBtn');
  const navLogoutBtn = document.getElementById('navLogoutBtn');
  if (!navUser) return;
  if (currentUser) {
    navUser.textContent = `👤 ${currentUser.display_name || currentUser.username}`;
    navUser.style.display = 'inline';
    navLoginBtn.style.display = 'none';
    navLogoutBtn.style.display = 'inline-block';
  } else {
    navUser.style.display = 'none';
    navLoginBtn.style.display = 'inline-block';
    navLogoutBtn.style.display = 'none';
  }
}

async function checkAuth() {
  if (!authToken) { updateNavAuth(); return; }
  const data = await apiGet('/auth/me');
  if (data.success && data.user) {
    currentUser = data.user;
  } else {
    authToken = null; currentUser = null;
    localStorage.removeItem('zb_token');
  }
  updateNavAuth();
}

function openLoginModal() {
  document.getElementById('authModalOverlay').classList.add('active');
  switchAuthTab('login');
}

function closeAuthModal(e) {
  if (e.target === document.getElementById('authModalOverlay')) closeAuthModalDirect();
}
function closeAuthModalDirect() {
  document.getElementById('authModalOverlay').classList.remove('active');
}

function switchAuthTab(tab) {
  const tLogin = document.getElementById('tabLogin');
  const tReg = document.getElementById('tabRegister');
  if (tLogin) tLogin.classList.toggle('active', tab === 'login');
  if (tReg) tReg.classList.toggle('active', tab === 'register');
  const fLogin = document.getElementById('authLoginForm');
  const fReg = document.getElementById('authRegisterForm');
  if (fLogin) fLogin.style.display = tab === 'login' ? 'block' : 'none';
  if (fReg) fReg.style.display = tab === 'register' ? 'block' : 'none';
}

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const msgEl = document.getElementById('loginMsg');
  if (!username || !password) {
    showAuthMsg(msgEl, '⚠ Username dan password wajib diisi!', '#ffbb00');
    return;
  }
  const result = await apiPost('/auth/login', { username, password });
  if (result.success) {
    authToken = result.token; currentUser = result.user;
    localStorage.setItem('zb_token', authToken);
    updateNavAuth(); closeAuthModalDirect();
  } else {
    showAuthMsg(msgEl, '✕ ' + (result.error || 'Login gagal'), '#ff1744');
  }
}

async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const display_name = document.getElementById('reg-display').value.trim();
  const password = document.getElementById('reg-password').value;
  const msgEl = document.getElementById('regMsg');
  if (!username || !password) {
    showAuthMsg(msgEl, '⚠ Username dan password wajib diisi!', '#ffbb00');
    return;
  }
  if (password.length < 6) {
    showAuthMsg(msgEl, '⚠ Password minimal 6 karakter!', '#ffbb00');
    return;
  }
  const result = await apiPost('/auth/register', { username, password, email, display_name });
  if (result.success) {
    showAuthMsg(msgEl, '✓ Akun berhasil dibuat! Silakan login.', '#00ff88');
    setTimeout(() => switchAuthTab('login'), 1500);
  } else {
    showAuthMsg(msgEl, '✕ ' + (result.error || 'Registrasi gagal'), '#ff1744');
  }
}

function doLogout() {
  authToken = null; currentUser = null;
  localStorage.removeItem('zb_token');
  updateNavAuth();
}

function showAuthMsg(el, text, color) {
  if (!el) return;
  el.textContent = text; el.style.display = 'block';
  el.style.borderColor = color; el.style.color = color;
  setTimeout(() => el.style.display = 'none', 4000);
}

/* ===== LOAD DATA ===== */
async function loadMahasiswa() {
  isLoading = true;
  const data = await apiGet('/mahasiswa');
  mahasiswaData = data.success ? data.data : [];
  isLoading = false;
  renderMhs(mahasiswaData);
}

async function loadJadwal() {
  const data = await apiGet('/jadwal');
  renderJadwal(data.success ? data.data : []);
}

async function loadTugas() {
  const data = await apiGet('/tugas');
  renderTugasFromAPI(data.success ? data.data : []);
}

async function loadStats() {
  const data = await apiGet('/stats');
  if (data.success && data.data) {
    const s = data.data;
    const statNums = document.querySelectorAll('.stat-num');
    if (statNums[0]) statNums[0].dataset.target = s.servers || 0;
    if (statNums[1]) statNums[1].dataset.target = s.users || 0;
    if (statNums[2]) statNums[2].dataset.target = s.status === 'online' ? 99 : 0;
    if (statNums[3]) statNums[3].dataset.target = s.commands || 0;
  }
}

async function loadDashboardStats() {
  const data = await apiGet('/dashboard/stats');
  if (data.success && data.data) {
    const s = data.data;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('dashTotalMhs', s.totalMahasiswa || 0);
    set('dashAktifMhs', s.aktifMahasiswa || 0);
    set('dashTotalJadwal', s.totalJadwal || 0);
    set('dashPendingTugas', s.tugasPending || 0);
    set('dashDoneTugas', s.tugasDone || 0);
  }
}

/* ===== TAB SYSTEM ===== */
function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    const ids = ['mahasiswa', 'jadwal', 'tugas', 'tambah'];
    b.classList.toggle('active', ids[i] === id);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('tab-' + id);
  if (panel) panel.classList.add('active');
  if (id === 'mahasiswa') loadMahasiswa();
  if (id === 'jadwal') loadJadwal();
  if (id === 'tugas') loadTugas();
}

/* ===== RENDER MAHASISWA ===== */
function getInitial(n) {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function renderMhs(data) {
  const countEl = document.getElementById('mhsCount');
  const gridEl = document.getElementById('mhsGrid');
  if (countEl) countEl.textContent = data.length;
  if (!gridEl) return;
  gridEl.innerHTML = data.length ? data.map((m, idx) => {
    const doneCount = m.tugas ? m.tugas.filter(t => t.status === 'done').length : 0;
    const totalCount = m.tugas ? m.tugas.length : 0;
    return `
      <div class="mhs-card">
        <div class="mhs-card-corner"></div>
        <div class="mhs-avatar">${getInitial(m.nama)}<span class="${m.aktif ? 'online-dot' : 'offline-dot'}"></span></div>
        <div class="mhs-name">${m.nama}</div>
        <div class="mhs-nim">NIM: ${m.nim}</div>
        <div class="mhs-jurusan">${m.jurusan}</div>
        <hr class="mhs-divider">
        <div class="mhs-meta">
          <div>
            <div class="mhs-meta-label">STATUS</div>
            <div style="font-size:0.72rem;font-family:'Share Tech Mono',monospace;color:${m.aktif ? '#00ff88' : '#555'};margin-top:2px;">${m.aktif ? '● AKTIF' : '○ NON-AKTIF'}</div>
          <div style="text-align:right;">
            <div class="mhs-meta-label">TUGAS</div>
            <div class="mhs-meta-val" style="margin-top:2px;">${doneCount}/${totalCount} ✓</div>
        </div>
        <div class="mhs-actions">
          <button class="action-btn edit" onclick="openEditMhs(${m.id})">✏️</button>
          <button class="action-btn detail" onclick="openModal(${idx})">👁</button>
          <button class="action-btn delete" onclick="confirmDelete('mahasiswa', ${m.id}, '${m.nama.replace(/'/g, "\\'")}')">🗑</button>
        </div>`;
  }).join('') : '<div style="padding:40px;text-align:center;color:var(--text-dim);font-family:\'Share Tech Mono\',monospace;">NO RECORDS FOUND</div>';
}

function filterMhs() {
  const q = document.getElementById('searchMhs').value.toLowerCase();
  renderMhs(mahasiswaData.filter(m =>
    m.nama.toLowerCase().includes(q) ||
    m.nim.includes(q) ||
    m.jurusan.toLowerCase().includes(q)
  ));
}

/* ===== JADWAL ===== */
function renderJadwal(rows) {
  const el = document.getElementById('jadwalList');
  if (!el) return;
  el.innerHTML = rows.length ? rows.map(r => `
    <div class="jadwal-row">
      <span class="jadwal-hari">${r.hari.toUpperCase()}</span>
      <span class="jadwal-time">${r.jam}</span>
      <span class="jadwal-matkul">${r.matkul}</span>
      <span class="jadwal-who">${r.nama_mhs || r.nama || '—'}</span>
      <div class="jadwal-actions">
        <button class="action-btn edit" onclick="openEditJadwal(${r.id}, '${r.hari}', '${r.matkul.replace(/'/g, "\\'")}', '${r.jam}')">✏️</button>
        <button class="action-btn delete" onclick="confirmDelete('jadwal', ${r.id}, '${r.matkul.replace(/'/g, "\\'")}')">🗑</button>
      </div>`).join('') : '<div style="padding:40px;text-align:center;color:var(--text-dim);font-family:\'Share Tech Mono\',monospace;font-size:0.8rem;">NO RECORDS FOUND</div>';
}

function filterJadwal() {
  const q = document.getElementById('searchJadwal').value.toLowerCase();
  apiGet('/jadwal').then(data => {
    const rows = data.success ? data.data : [];
    const filtered = rows.filter(r =>
      r.hari.toLowerCase().includes(q) ||
      r.matkul.toLowerCase().includes(q) ||
      (r.nama_mhs || r.nama || '').toLowerCase().includes(q)
    );
    renderJadwal(filtered);
  });
}

/* ===== TUGAS ===== */
let tugasFilter = 'all';

function renderTugasFromAPI(rows) {
  const filtered = tugasFilter === 'all' ? rows : rows.filter(r => r.status === tugasFilter);
  const el = document.getElementById('tugasBody');
  if (!el) return;
  el.innerHTML = filtered.length ? filtered.map(r => `
    <tr>
      <td>${r.nama}</td>
      <td style="color:var(--text-dim);">${r.nama_mhs || '—'}</td>
      <td style="color:var(--text-dim);">${r.matkul || '—'}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:0.78rem;">${r.deadline || '—'}</td>
      <td><span class="badge badge-${r.status === 'done' ? 'done' : 'pending'}" onclick="toggleTugasStatus(${r.id}, '${r.status}')" style="cursor:pointer;">${r.status === 'done' ? 'SELESAI' : 'PENDING'}</span></td>
      <td>
        <button class="action-btn edit" onclick="openEditTugas(${r.id}, '${r.nama.replace(/'/g, "\\'")}', '${(r.matkul || '').replace(/'/g, "\\'")}', '${r.deadline || ''}', '${r.status}')">✏️</button>
        <button class="action-btn delete" onclick="confirmDelete('tugas', ${r.id}, '${r.nama.replace(/'/g, "\\'")}')">🗑</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-dim);font-family:\'Share Tech Mono\',monospace;font-size:0.8rem;">NO RECORDS FOUND</td></tr>';
}

function filterTugas(f) {
  tugasFilter = f;
  loadTugas();
}

async function toggleTugasStatus(id, currentStatus) {
  const newStatus = currentStatus === 'done' ? 'pending' : 'done';
  const result = await apiPatch(`/tugas/${id}`, { status: newStatus });
  if (result.success) {
    loadTugas(); loadDashboardStats();
  } else {
    alert('Gagal update status: ' + (result.error || 'Unknown error'));
  }
}

/* ===== TAMBAH MAHASISWA ===== */
async function tambahMahasiswa() {
  const nama = document.getElementById('f-nama').value.trim();
  const nim = document.getElementById('f-nim').value.trim();
  const jurusan = document.getElementById('f-jurusan').value;
  const aktif = document.getElementById('f-status').value === 'true';
  const jadwalRaw = document.getElementById('f-jadwal').value.trim();
  const tugasRaw = document.getElementById('f-tugas').value.trim();

  if (!nama || !nim || !jurusan) {
    showMsg('⚠ FIELD WAJIB BELUM DIISI (Nama, NIM, Jurusan)', '#ffbb00');
    return;
  }

  const jadwal = jadwalRaw ? jadwalRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
  const tugas = tugasRaw ? tugasRaw.split(',').map(s => ({ nama: s.trim(), matkul: '—', deadline: '—', status: 'pending' })).filter(t => t.nama) : [];

  const result = await apiPost('/mahasiswa', { nama, nim, jurusan, aktif, jadwal, tugas });
  if (result.success) {
    showMsg('✓ DATA MAHASISWA BERHASIL DITAMBAHKAN', '#00ff88');
    resetForm(); loadDashboardStats();
    setTimeout(() => switchTab('mahasiswa'), 1200);
  } else {
    showMsg('✕ ' + (result.error || 'Gagal menambahkan'), '#ff1744');
  }
}

function resetForm() {
  ['f-nama', 'f-nim', 'f-jadwal', 'f-tugas'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const jurusanEl = document.getElementById('f-jurusan');
  const statusEl = document.getElementById('f-status');
  if (jurusanEl) jurusanEl.value = '';
  if (statusEl) statusEl.value = 'true';
}

function showMsg(text, color) {
  const el = document.getElementById('formMsg');
  if (!el) return;
  el.textContent = text; el.style.display = 'block';
  el.style.borderColor = color; el.style.color = color;
  setTimeout(() => el.style.display = 'none', 3000);
}

/* ===== EDIT FUNCTIONS ===== */
function openEditMhs(id) {
  const m = mahasiswaData.find(x => x.id === id);
  if (!m) return;
  const body = document.getElementById('editModalBody');
  if (!body) return;
  body.innerHTML = `
    <div style="font-family:'Share Tech Mono',monospace;font-size:0.72rem;color:var(--red-bright);letter-spacing:2px;margin-bottom:20px;">$ UPDATE mahasiswa SET ... WHERE id = ${id}</div>
    <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Nama Lengkap *</label><input class="form-input" id="edit-mhs-nama" type="text" value="${m.nama.replace(/"/g, '"')}"></div>
    <div class="form-group" style="margin-bottom:12px;"><label class="form-label">NIM *</label><input class="form-input" id="edit-mhs-nim" type="text" value="${m.nim}"></div>
    <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Jurusan *</label><input class="form-input" id="edit-mhs-jurusan" type="text" value="${m.jurusan.replace(/"/g, '"')}"></div>
    <div class="form-group" style="margin-bottom:20px;"><label class="form-label">Status</label><select class="form-select" id="edit-mhs-aktif"><option value="true" ${m.aktif ? 'selected' : ''}>Aktif</option><option value="false" ${!m.aktif ? 'selected' : ''}>Tidak Aktif</option></select></div>
    <button class="add-btn" style="width:100%;" onclick="saveEditMhs(${id})">💾 SIMPAN PERUBAHAN</button>
    <div id="editMsg" style="margin-top:12px;font-family:'Share Tech Mono',monospace;font-size:0.78rem;display:none;padding:10px 14px;border:1px solid;letter-spacing:1px;"></div>`;
  document.getElementById('editModalOverlay').classList.add('active');
}

async function saveEditMhs(id) {
  const nama = document.getElementById('edit-mhs-nama').value.trim();
  const nim = document.getElementById('edit-mhs-nim').value.trim();
  const jurusan = document.getElementById('edit-mhs-jurusan').value.trim();
  const aktif = document.getElementById('edit-mhs-aktif').value === 'true';
  const msgEl = document.getElementById('editMsg');
  if (!nama || !nim || !jurusan) {
    showAuthMsg(msgEl, '⚠ Semua field wajib diisi!', '#ffbb00');
    return;
  }
  const result = await apiPut(`/mahasiswa/${id}`, { nama, nim, jurusan, aktif });
  if (result.success) {
    showAuthMsg(msgEl, '✓ Mahasiswa berhasil diperbarui!', '#00ff88');
    loadMahasiswa(); loadDashboardStats();
    setTimeout(() => closeEditModalDirect(), 1000);
  } else {
    showAuthMsg(msgEl, '✕ ' + (result.error || 'Gagal memperbarui'), '#ff1744');
  }
}

function openEditJadwal(id, hari, matkul, jam) {
  const body = document.getElementById('editModalBody');
  if (!body) return;
  body.innerHTML = `
    <div style="font-family:'Share Tech Mono',monospace;font-size:0.72rem;color:var(--red-bright);letter-spacing:2px;margin-bottom:20px;">$ UPDATE jadwal SET ... WHERE id = ${id}</div>
    <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Hari *</label><input class="form-input" id="edit-jadwal-hari" type="text" value="${hari.replace(/"/g, '"')}"></div>
    <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Mata Kuliah *</label><input class="form-input" id="edit-jadwal-matkul" type="text" value="${matkul.replace(/"/g, '"')}"></div>
    <div class="form-group" style="margin-bottom:20px;"><label class="form-label">Jam *</label><input class="form-input" id="edit-jadwal-jam" type="text" value="${jam.replace(/"/g, '"')}"></div>
    <button class="add-btn" style="width:100%;" onclick="saveEditJadwal(${id})">💾 SIMPAN PERUBAHAN</button>
    <div id="editMsg" style="margin-top:12px;font-family:'Share Tech Mono',monospace;font-size:0.78rem;display:none;padding:10px 14px;border:1px solid;letter-spacing:1px;"></div>`;
  document.getElementById('editModalOverlay').classList.add('active');
}

async function saveEditJadwal(id) {
  const hari = document.getElementById('edit-jadwal-hari').value.trim();
  const matkul = document.getElementById('edit-jadwal-matkul').value.trim();
  const jam = document.getElementById('edit-jadwal-jam').value.trim();
  const msgEl = document.getElementById('editMsg');
  if (!hari || !matkul || !jam) {
    showAuthMsg(msgEl, '⚠ Semua field wajib diisi!', '#ffbb00');
    return;
  }
  const result = await apiPut(`/jadwal/${id}`, { hari, matkul, jam });
  if (result.success) {
    showAuthMsg(msgEl, '✓ Jadwal berhasil diperbarui!', '#00ff88');
    loadJadwal(); loadDashboardStats();
    setTimeout(() => closeEditModalDirect(), 1000);
  } else {
    showAuthMsg(msgEl, '✕ ' + (result.error || 'Gagal memperbarui'), '#ff1744');
  }
}

function openEditTugas(id, nama, matkul, deadline, status) {
  const body = document.getElementById('editModalBody');
  if (!body) return;
  body.innerHTML = `
    <div style="font-family:'Share Tech Mono',monospace;font-size:0.72rem;color:var(--red-bright);letter-spacing:2px;margin-bottom:20px;">$ UPDATE tugas SET ... WHERE id = ${id}</div>
    <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Nama Tugas *</label><input class="form-input" id="edit-tugas-nama" type="text" value="${nama.replace(/"/g, '"')}"></div>
    <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Mata Kuliah</label><input class="form-input" id="edit-tugas-matkul" type="text" value="${matkul.replace(/"/g, '"')}"></div>
    <div class="form-group" style="margin-bottom:12px;"><label class="form-label">Deadline</label><input class="form-input" id="edit-tugas-deadline" type="text" value="${deadline.replace(/"/g, '"')}"></div>
    <div class="form-group" style="margin-bottom:20px;"><label class="form-label">Status</label><select class="form-select" id="edit-tugas-status"><option value="pending" ${status === 'pending' ? 'selected' : ''}>PENDING</option><option value="done" ${status === 'done' ? 'selected' : ''}>SELESAI</option></select></div>
    <button class="add-btn" style="width:100%;" onclick="saveEditTugas(${id})">💾 SIMPAN PERUBAHAN</button>
    <div id="editMsg" style="margin-top:12px;font-family:'Share Tech Mono',monospace;font-size:0.78rem;display:none;padding:10px 14px;border:1px solid;letter-spacing:1px;"></div>`;
  document.getElementById('editModalOverlay').classList.add('active');
}

async function saveEditTugas(id) {
  const nama = document.getElementById('edit-tugas-nama').value.trim();
  const matkul = document.getElementById('edit-tugas-matkul').value.trim();
  const deadline = document.getElementById('edit-tugas-deadline').value.trim();
  const status = document.getElementById('edit-tugas-status').value;
  const msgEl = document.getElementById('editMsg');
  if (!nama) {
    showAuthMsg(msgEl, '⚠ Nama tugas wajib diisi!', '#ffbb00');
    return;
  }
  const result = await apiPut(`/tugas/${id}`, { nama, matkul, deadline, status });
  if (result.success) {
    showAuthMsg(msgEl, '✓ Tugas berhasil diperbarui!', '#00ff88');
    loadTugas(); loadDashboardStats();
    setTimeout(() => closeEditModalDirect(), 1000);
  } else {
    showAuthMsg(msgEl, '✕ ' + (result.error || 'Gagal memperbarui'), '#ff1744');
  }
}

/* ===== DELETE CONFIRM ===== */
function confirmDelete(type, id, name) {
  deleteTarget = { type, id };
  const textEl = document.getElementById('confirmText');
  if (textEl) textEl.textContent = `Yakin ingin menghapus ${type} "${name}"? Tindakan ini tidak bisa dibatalkan.`;
  document.getElementById('confirmModalOverlay').classList.add('active');
}

function closeConfirmModal(e) {
  if (e.target === document.getElementById('confirmModalOverlay')) closeConfirmModalDirect();
}
function closeConfirmModalDirect() {
  document.getElementById('confirmModalOverlay').classList.remove('active');
  deleteTarget = null;
}

async function executeDelete() {
  if (!deleteTarget) return;
