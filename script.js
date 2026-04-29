/* ================================================
   ZieeBot Website v3.0 — script.js
   Auth + Edit/Delete + CSV Export + Charts
   ================================================ */

const API_BASE = window.location.origin;

/* ===== AUTH STATE ===== */
let authToken = localStorage.getItem('zieebot_token') || null;
let currentUser = JSON.parse(localStorage.getItem('zieebot_user') || 'null');

/* ===== DATA STATE ===== */
let mahasiswaData = [];
let tugasAllData = [];
let tugasFilter = 'all';
let editingMhsId = null;

/* ===== UTILITIES ===== */
function getInitial(n) {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function canEdit() {
  return currentUser && (currentUser.role === 'admin' || currentUser.role === 'editor' || currentUser.role === 'owner');
}

function canDelete() {
  return currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner');
}

function getRoleBadge(role) {
  const map = {
    admin: { label: 'ADMIN', color: '#FF1744' },
    editor: { label: 'EDITOR', color: '#f1c40f' },
    viewer: { label: 'VIEWER', color: '#00ff88' }
  };
  const r = map[role] || { label: role.toUpperCase(), color: '#888' };
  return `<span style="font-family:'Share Tech Mono',monospace;font-size:0.62rem;padding:2px 8px;border:1px solid ${r.color};color:${r.color};letter-spacing:1px;">${r.label}</span>`;
}

/* ===== API HELPERS ===== */
async function apiRequest(method, endpoint, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'x-auth-token': authToken } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    if (res.status === 401) {
      // Session expired
      logout(false);
      showAuthPage('login');
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, error: err.message };
  }
}

const apiGet    = (ep)       => apiRequest('GET',    ep);
const apiPost   = (ep, body) => apiRequest('POST',   ep, body);
const apiPut    = (ep, body) => apiRequest('PUT',    ep, body);
const apiPatch  = (ep, body) => apiRequest('PATCH',  ep, body);
const apiDelete = (ep)       => apiRequest('DELETE', ep);

/* ================================================
   AUTH SYSTEM
   ================================================ */

function showAuthPage(mode = 'login') {
  // Sembunyikan dashboard, tampilkan auth overlay
  const dashEl = document.getElementById('dashboardApp');
  const authEl = document.getElementById('authOverlay');
  if (dashEl) dashEl.style.display = 'none';
  if (authEl) {
    authEl.style.display = 'flex';
    switchAuthMode(mode);
  }
}

function hidAuthPage() {
  const dashEl = document.getElementById('dashboardApp');
  const authEl = document.getElementById('authOverlay');
  if (authEl) authEl.style.display = 'none';
  if (dashEl) dashEl.style.display = 'block';
}

function switchAuthMode(mode) {
  const loginForm  = document.getElementById('loginForm');
  const regForm    = document.getElementById('registerForm');
  const authTitle  = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');

  if (mode === 'login') {
    if (loginForm)  loginForm.style.display  = 'flex';
    if (regForm)    regForm.style.display    = 'none';
    if (authTitle)  authTitle.textContent    = 'ZIEEBOT LOGIN';
    if (authSubtitle) authSubtitle.textContent = '// MASUKKAN KREDENSIAL //';
  } else {
    if (loginForm)  loginForm.style.display  = 'none';
    if (regForm)    regForm.style.display    = 'flex';
    if (authTitle)  authTitle.textContent    = 'BUAT AKUN';
    if (authSubtitle) authSubtitle.textContent = '// REGISTRASI AKUN BARU //';
  }
  clearAuthErrors();
}

function clearAuthErrors() {
  ['loginError', 'registerError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
}

function showAuthError(formType, msg) {
  const el = document.getElementById(formType + 'Error');
  if (el) {
    el.textContent = '⚠ ' + msg;
    el.style.display = 'block';
  }
}

async function doLogin() {
  const username = document.getElementById('loginUsername')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;

  if (!username || !password) {
    showAuthError('login', 'Username dan password wajib diisi!');
    return;
  }

  const btn = document.getElementById('loginBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'LOADING...'; }

  const result = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(r => r.json()).catch(e => ({ success: false, error: e.message }));

  if (btn) { btn.disabled = false; btn.textContent = 'LOGIN'; }

  if (result.success) {
    authToken = result.token;
    currentUser = result.user;
    localStorage.setItem('zieebot_token', authToken);
    localStorage.setItem('zieebot_user', JSON.stringify(currentUser));
    hidAuthPage();
    updateUserInfo();
    loadMahasiswa();
    loadStats();
  } else {
    showAuthError('login', result.error || 'Login gagal!');
  }
}

async function doRegister() {
  const username = document.getElementById('regUsername')?.value?.trim();
  const password = document.getElementById('regPassword')?.value;
  const confirm  = document.getElementById('regConfirm')?.value;
  const email    = document.getElementById('regEmail')?.value?.trim();

  if (!username || !password) {
    showAuthError('register', 'Username dan password wajib diisi!');
    return;
  }
  if (password !== confirm) {
    showAuthError('register', 'Password tidak cocok!');
    return;
  }

  const btn = document.getElementById('registerBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'LOADING...'; }

  const result = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email })
  }).then(r => r.json()).catch(e => ({ success: false, error: e.message }));

  if (btn) { btn.disabled = false; btn.textContent = 'DAFTAR'; }

  if (result.success) {
    // Auto login setelah register
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
    switchAuthMode('login');
    const successEl = document.getElementById('loginError');
    if (successEl) {
      successEl.textContent = `✓ Akun berhasil dibuat! Role: ${result.role}. Silakan login.`;
      successEl.style.display = 'block';
      successEl.style.color = '#00ff88';
      successEl.style.borderColor = '#00ff88';
    }
  } else {
    showAuthError('register', result.error || 'Registrasi gagal!');
  }
}

function logout(redirect = true) {
  if (authToken) {
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'x-auth-token': authToken }
    }).catch(() => {});
  }
  authToken = null;
  currentUser = null;
  localStorage.removeItem('zieebot_token');
  localStorage.removeItem('zieebot_user');
  if (redirect) showAuthPage('login');
}

function updateUserInfo() {
  const el = document.getElementById('userInfoBar');
  if (!el || !currentUser) return;
  el.innerHTML = `
    <span style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;color:var(--text-dim);">
      👤 <span style="color:var(--white);">${currentUser.username}</span>
      &nbsp;${getRoleBadge(currentUser.role)}
    </span>
    <button onclick="logout()" style="
      font-family:'Share Tech Mono',monospace;font-size:0.65rem;
      background:transparent;border:1px solid #333;color:var(--text-dim);
      padding:4px 12px;cursor:pointer;letter-spacing:1px;transition:all 0.2s;
    " onmouseover="this.style.borderColor='#FF1744';this.style.color='#FF1744'"
       onmouseout="this.style.borderColor='#333';this.style.color='var(--text-dim)'">
      LOGOUT
    </button>
  `;
  el.style.display = 'flex';
}

async function checkAuth() {
  if (!authToken) {
    showAuthPage('login');
    return false;
  }
  const result = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'x-auth-token': authToken }
  }).then(r => r.json()).catch(() => null);

  if (!result || !result.success) {
    logout(false);
    showAuthPage('login');
    return false;
  }
  currentUser = result.user;
  localStorage.setItem('zieebot_user', JSON.stringify(currentUser));
  hidAuthPage();
  updateUserInfo();
  return true;
}

/* ================================================
   LOAD DATA
   ================================================ */
async function loadMahasiswa() {
  const data = await apiGet('/api/mahasiswa');
  if (data && data.success) {
    mahasiswaData = data.data;
    renderMhs(mahasiswaData);
  }
}

async function loadJadwal() {
  const data = await apiGet('/api/jadwal');
  if (data && data.success) renderJadwal(data.data);
}

async function loadTugas() {
  const data = await apiGet('/api/tugas');
  if (data && data.success) {
    tugasAllData = data.data;
    renderTugasFromAPI(data.data);
  }
}

async function loadStats() {
  const data = await apiGet('/api/stats');
  if (data && data.success) {
    const stats = data.data;
    const statNums = document.querySelectorAll('[data-target]');
    if (statNums[0]) statNums[0].dataset.target = stats.servers || 0;
    if (statNums[1]) statNums[1].dataset.target = stats.users || 0;
    if (statNums[2]) statNums[2].dataset.target = stats.status === 'online' ? 99 : 0;
    if (statNums[3]) statNums[3].dataset.target = stats.commands || 0;
  }
}

async function loadChartData() {
  const data = await apiGet('/api/stats/tugas');
  if (data && data.success) renderCharts(data.data);
}

/* ================================================
   TAB SYSTEM
   ================================================ */
function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    const ids = ['mahasiswa', 'jadwal', 'tugas', 'statistik', 'tambah'];
    b.classList.toggle('active', ids[i] === id);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('tab-' + id);
  if (panel) panel.classList.add('active');

  if (id === 'mahasiswa') loadMahasiswa();
  if (id === 'jadwal')    loadJadwal();
  if (id === 'tugas')     loadTugas();
  if (id === 'statistik') loadChartData();
}

/* ================================================
   RENDER MAHASISWA — FIXED BUG
   ================================================ */
function renderMhs(data) {
  const countEl = document.getElementById('mhsCount');
  const gridEl  = document.getElementById('mhsGrid');
  if (countEl) countEl.textContent = data.length;
  if (!gridEl) return;

  if (!data.length) {
    gridEl.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-dim);font-family:\'Share Tech Mono\',monospace;grid-column:1/-1;">NO RECORDS FOUND</div>';
    return;
  }

  gridEl.innerHTML = data.map((m, idx) => {
    const doneTugas    = m.tugas.filter(t => t.status === 'done').length;
    const totalTugas   = m.tugas.length;
    const progressPct  = totalTugas > 0 ? Math.round((doneTugas / totalTugas) * 100) : 0;
    const editBtn      = canEdit()   ? `<button class="mhs-action-btn edit-btn"   onclick="event.stopPropagation();openEditModal(${idx})"   title="Edit">✏️</button>` : '';
    const deleteBtn    = canDelete() ? `<button class="mhs-action-btn delete-btn" onclick="event.stopPropagation();confirmDelete(${m.id},'${m.nama}')" title="Hapus">🗑️</button>` : '';

    return `
      <div class="mhs-card" onclick="openModal(${idx})">
        <div class="mhs-card-corner"></div>
        ${(editBtn || deleteBtn) ? `<div class="mhs-actions">${editBtn}${deleteBtn}</div>` : ''}
        <div class="mhs-avatar">
          ${getInitial(m.nama)}
          <span class="${m.aktif ? 'online-dot' : 'offline-dot'}"></span>
        </div>
        <div class="mhs-name">${m.nama}</div>
        <div class="mhs-nim">NIM: ${m.nim}</div>
        <div class="mhs-jurusan">${m.jurusan}</div>
        <hr class="mhs-divider">
        <div class="mhs-meta">
          <div>
            <div class="mhs-meta-label">STATUS</div>
            <div style="font-size:0.72rem;font-family:'Share Tech Mono',monospace;color:${m.aktif ? '#00ff88' : '#555'};margin-top:2px;">
              ${m.aktif ? '● AKTIF' : '○ NON-AKTIF'}
            </div>
          </div>
          <div style="text-align:right;">
            <div class="mhs-meta-label">TUGAS</div>
            <div class="mhs-meta-val" style="margin-top:2px;">${doneTugas}/${totalTugas} ✓</div>
          </div>
        </div>
        ${totalTugas > 0 ? `
        <div style="margin-top:10px;">
          <div style="height:3px;background:#1a0000;border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${progressPct}%;background:${progressPct===100?'#00ff88':'var(--red-bright)'};transition:width 0.5s;"></div>
          </div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;color:var(--text-dim);margin-top:3px;text-align:right;">${progressPct}%</div>
        </div>` : ''}
      </div>
    `;
  }).join('');
}

function filterMhs() {
  const q = (document.getElementById('searchMhs')?.value || '').toLowerCase();
  renderMhs(mahasiswaData.filter(m =>
    m.nama.toLowerCase().includes(q) ||
    m.nim.includes(q) ||
    m.jurusan.toLowerCase().includes(q)
  ));
}

/* ================================================
   JADWAL
   ================================================ */
function renderJadwal(rows) {
  const el = document.getElementById('jadwalList');
  if (!el) return;
  el.innerHTML = rows.length
    ? rows.map(r => `
      <div class="jadwal-row">
        <span class="jadwal-hari">${r.hari.toUpperCase()}</span>
        <span class="jadwal-time">${r.jam}</span>
        <span class="jadwal-matkul">${r.matkul}</span>
        <span class="jadwal-who">${r.nama_mhs || r.nama}</span>
      </div>
    `).join('')
    : '<div style="padding:40px;text-align:center;color:var(--text-dim);font-family:\'Share Tech Mono\',monospace;font-size:0.8rem;">NO RECORDS FOUND</div>';
}

function filterJadwal() {
  const q = (document.getElementById('searchJadwal')?.value || '').toLowerCase();
  apiGet('/api/jadwal').then(data => {
    if (!data || !data.success) return;
    renderJadwal(data.data.filter(r =>
      r.hari.toLowerCase().includes(q) ||
      r.matkul.toLowerCase().includes(q) ||
      (r.nama_mhs||'').toLowerCase().includes(q)
    ));
  });
}

/* ================================================
   TUGAS
   ================================================ */
function renderTugasFromAPI(rows) {
  const filtered = tugasFilter === 'all' ? rows : rows.filter(r => r.status === tugasFilter);
  const tbody = document.getElementById('tugasBody');
  if (!tbody) return;

  tbody.innerHTML = filtered.length
    ? filtered.map(r => `
      <tr>
        <td>${r.nama}</td>
        <td style="color:var(--text-dim);">${r.nama_mhs || '—'}</td>
        <td style="color:var(--text-dim);">${r.matkul || '—'}</td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:0.78rem;">${r.deadline || '—'}</td>
        <td>
          <span class="badge badge-${r.status === 'done' ? 'done' : 'pending'}"
                onclick="${canEdit() ? `toggleTugasStatus(${r.id},'${r.status}')` : ''}"
                style="cursor:${canEdit() ? 'pointer' : 'default'};"
                title="${canEdit() ? 'Klik untuk ubah status' : ''}">
            ${r.status === 'done' ? 'SELESAI' : 'PENDING'}
          </span>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-dim);font-family:\'Share Tech Mono\',monospace;font-size:0.8rem;">NO RECORDS FOUND</td></tr>';
}

function filterTugas(f) {
  tugasFilter = f;
  renderTugasFromAPI(tugasAllData);
}

async function toggleTugasStatus(id, currentStatus) {
  if (!canEdit()) return;
  const newStatus = currentStatus === 'done' ? 'pending' : 'done';
  const result = await apiPatch(`/api/tugas/${id}`, { status: newStatus });
  if (result?.success) {
    loadTugas();
  } else {
    showToast('Gagal update status: ' + (result?.error || 'Unknown error'), 'error');
  }
}

/* ================================================
   MODAL DETAIL
   ================================================ */
function openModal(idx) {
  const m = mahasiswaData[idx];
  if (!m) return;

  const editBtn = canEdit() ? `
    <button onclick="closeModalDirect();openEditModal(${idx})" style="
      font-family:'Orbitron',monospace;font-size:0.65rem;letter-spacing:1px;
      background:transparent;border:1px solid var(--red);color:var(--red-bright);
      padding:8px 18px;cursor:pointer;transition:all 0.2s;margin-top:1.5rem;margin-right:0.5rem;
    " onmouseover="this.style.background='var(--red-dim)'" onmouseout="this.style.background='transparent'">
      ✏️ EDIT
    </button>` : '';

  const deleteBtn = canDelete() ? `
    <button onclick="closeModalDirect();confirmDelete(${m.id},'${m.nama}')" style="
      font-family:'Orbitron',monospace;font-size:0.65rem;letter-spacing:1px;
      background:transparent;border:1px solid #ff4444;color:#ff4444;
      padding:8px 18px;cursor:pointer;transition:all 0.2s;margin-top:1.5rem;
    " onmouseover="this.style.background='rgba(255,68,68,0.1)'" onmouseout="this.style.background='transparent'">
      🗑️ HAPUS
    </button>` : '';

  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
      <div style="width:56px;height:56px;background:var(--red-dim);border:1px solid var(--red);
        display:flex;align-items:center;justify-content:center;font-family:'Orbitron',monospace;
        font-size:1rem;font-weight:700;color:var(--red-bright);
        clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);">
        ${getInitial(m.nama)}
      </div>
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:1rem;font-weight:700;color:#fff;">${m.nama}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;color:var(--red-bright);">NIM: ${m.nim}</div>
        <div style="font-size:0.8rem;color:var(--text-dim);">${m.jurusan}</div>
        <div style="font-size:0.72rem;font-family:'Share Tech Mono',monospace;color:${m.aktif?'#00ff88':'#555'};margin-top:2px;">
          ${m.aktif ? '● AKTIF' : '○ NON-AKTIF'}
        </div>
      </div>
    </div>
    <div style="margin-bottom:1.2rem;">
      <div style="font-family:'Share Tech Mono',monospace;font-size:0.68rem;color:var(--red-bright);letter-spacing:2px;margin-bottom:0.6rem;">// JADWAL KULIAH</div>
      ${m.jadwal.length
        ? m.jadwal.map(j => `<div style="font-size:0.85rem;color:var(--text);padding:7px 0;border-bottom:1px solid #1a1a1a;">📅 ${j}</div>`).join('')
        : '<div style="color:var(--text-dim);font-size:0.8rem;padding:8px 0;">Belum ada jadwal.</div>'
      }
    </div>
    <div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:0.68rem;color:var(--red-bright);letter-spacing:2px;margin-bottom:0.8rem;">// STATUS TUGAS</div>
      ${m.tugas.length
        ? m.tugas.map(t => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #1a1a1a;">
            <span style="font-size:0.85rem;color:var(--text);">${t.nama}</span>
            <span class="badge badge-${t.status==='done'?'done':'pending'}">${t.status==='done'?'SELESAI':'PENDING'}</span>
          </div>`).join('')
        : '<div style="color:var(--text-dim);font-size:0.8rem;padding:8px 0;">Belum ada tugas.</div>'
      }
    </div>
    <div>${editBtn}${deleteBtn}</div>
  `;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModalDirect();
}
function closeModalDirect() {
  document.getElementById('modalOverlay')?.classList.remove('active');
}

/* ================================================
   EDIT MODAL
   ================================================ */
function openEditModal(idx) {
  if (!canEdit()) return;
  const m = mahasiswaData[idx];
  if (!m) return;
  editingMhsId = m.id;

  document.getElementById('editModalBody').innerHTML = `
    <div style="font-family:'Share Tech Mono',monospace;font-size:0.68rem;color:var(--red-bright);letter-spacing:2px;margin-bottom:1.5rem;">
      // EDIT DATA MAHASISWA — ID: ${m.id}
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nama Lengkap *</label>
        <input class="form-input" id="edit-nama" type="text" value="${m.nama}">
      </div>
      <div class="form-group">
        <label class="form-label">NIM *</label>
        <input class="form-input" id="edit-nim" type="text" value="${m.nim}">
      </div>
      <div class="form-group">
        <label class="form-label">Jurusan *</label>
        <select class="form-select" id="edit-jurusan">
          ${['Teknik Informatika','Sistem Informasi','Desain Komunikasi Visual','Teknik Elektro','Manajemen']
            .map(j => `<option ${m.jurusan===j?'selected':''}>${j}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="edit-status">
          <option value="true"  ${m.aktif?'selected':''}>Aktif</option>
          <option value="false" ${!m.aktif?'selected':''}>Tidak Aktif</option>
        </select>
      </div>
    </div>
    <div id="editMsg" style="display:none;margin-top:1rem;padding:10px 14px;border:1px solid;font-family:'Share Tech Mono',monospace;font-size:0.75rem;letter-spacing:1px;"></div>
    <div style="display:flex;gap:0.8rem;margin-top:1.5rem;">
      <button class="add-btn" onclick="saveEdit()">💾 SIMPAN</button>
      <button class="btn-outline" style="padding:10px 20px;font-size:0.7rem;cursor:pointer;" onclick="closeEditModal()">BATAL</button>
    </div>
  `;
  document.getElementById('editModalOverlay')?.classList.add('active');
}

function closeEditModal() {
  document.getElementById('editModalOverlay')?.classList.remove('active');
  editingMhsId = null;
}

async function saveEdit() {
  if (!editingMhsId) return;
  const nama    = document.getElementById('edit-nama')?.value?.trim();
  const nim     = document.getElementById('edit-nim')?.value?.trim();
  const jurusan = document.getElementById('edit-jurusan')?.value;
  const aktif   = document.getElementById('edit-status')?.value === 'true';

  if (!nama || !nim || !jurusan) {
    showEditMsg('Field wajib tidak boleh kosong!', 'error');
    return;
  }

  const result = await apiPut(`/api/mahasiswa/${editingMhsId}`, { nama, nim, jurusan, aktif });
  if (result?.success) {
    showEditMsg('✓ Data berhasil diupdate!', 'success');
    setTimeout(() => { closeEditModal(); loadMahasiswa(); }, 1000);
  } else {
    showEditMsg(result?.error || 'Gagal update data!', 'error');
  }
}

function showEditMsg(msg, type) {
  const el = document.getElementById('editMsg');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = (type === 'success' ? '✓ ' : '⚠ ') + msg;
  el.style.color = type === 'success' ? '#00ff88' : '#FF1744';
  el.style.borderColor = type === 'success' ? '#00ff88' : '#FF1744';
}

/* ================================================
   DELETE CONFIRM
   ================================================ */
function confirmDelete(id, nama) {
  if (!canDelete()) return;

  document.getElementById('deleteConfirmBody').innerHTML = `
    <div style="text-align:center;padding:1rem 0;">
      <div style="font-size:2.5rem;margin-bottom:1rem;">⚠️</div>
      <div style="font-family:'Orbitron',monospace;font-size:1rem;font-weight:700;color:#FF1744;margin-bottom:0.8rem;">
        KONFIRMASI HAPUS
      </div>
      <div style="color:var(--text-dim);font-size:0.9rem;line-height:1.6;margin-bottom:1.5rem;">
        Yakin ingin menghapus data mahasiswa<br>
        <span style="color:var(--white);font-weight:600;">"${nama}"</span>?<br>
        <span style="font-size:0.78rem;color:#FF1744;">Semua jadwal dan tugas akan ikut terhapus!</span>
      </div>
      <div style="display:flex;gap:0.8rem;justify-content:center;">
        <button onclick="doDelete(${id})" style="
          font-family:'Orbitron',monospace;font-size:0.65rem;letter-spacing:2px;
          background:#FF1744;color:#000;border:none;padding:12px 28px;cursor:pointer;
          font-weight:700;clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);
        ">YA, HAPUS</button>
        <button onclick="closeDeleteModal()" style="
          font-family:'Orbitron',monospace;font-size:0.65rem;letter-spacing:2px;
          background:transparent;color:var(--text);border:1px solid #444;padding:12px 28px;cursor:pointer;
          clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);
        ">BATAL</button>
      </div>
    </div>
  `;
  document.getElementById('deleteConfirmOverlay')?.classList.add('active');
}

function closeDeleteModal() {
  document.getElementById('deleteConfirmOverlay')?.classList.remove('active');
}

async function doDelete(id) {
  const result = await apiDelete(`/api/mahasiswa/${id}`);
  closeDeleteModal();
  if (result?.success) {
    showToast('✓ Mahasiswa berhasil dihapus!', 'success');
    loadMahasiswa();
  } else {
    showToast('Gagal hapus: ' + (result?.error || 'Unknown error'), 'error');
  }
}

/* ================================================
   TAMBAH MAHASISWA
   ================================================ */
async function tambahMahasiswa() {
  if (!canEdit()) { showToast('Akses ditolak!', 'error'); return; }

  const nama    = document.getElementById('f-nama')?.value?.trim();
  const nim     = document.getElementById('f-nim')?.value?.trim();
  const jurusan = document.getElementById('f-jurusan')?.value;
  const aktif   = document.getElementById('f-status')?.value === 'true';
  const jadwalRaw = document.getElementById('f-jadwal')?.value?.trim();
  const tugasRaw  = document.getElementById('f-tugas')?.value?.trim();

  if (!nama || !nim || !jurusan) {
    showMsg('⚠ FIELD WAJIB BELUM DIISI (Nama, NIM, Jurusan)', '#ffbb00');
    return;
  }

  const jadwal = jadwalRaw ? jadwalRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
  const tugas  = tugasRaw
    ? tugasRaw.split(',').map(s => ({ nama: s.trim(), matkul: '—', deadline: '—', status: 'pending' })).filter(t => t.nama)
    : [];

  const result = await apiPost('/api/mahasiswa', { nama, nim, jurusan, aktif, jadwal, tugas });
  if (result?.success) {
    showMsg('✓ DATA MAHASISWA BERHASIL DITAMBAHKAN', '#00ff88');
    resetForm();
    setTimeout(() => switchTab('mahasiswa'), 1200);
  } else {
    showMsg('✕ ' + (result?.error || 'Gagal menambahkan'), '#ff1744');
  }
}

function resetForm() {
  ['f-nama','f-nim','f-jadwal','f-tugas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const jEl = document.getElementById('f-jurusan');
  const sEl = document.getElementById('f-status');
  if (jEl) jEl.value = '';
  if (sEl) sEl.value = 'true';
}

function showMsg(text, color) {
  const el = document.getElementById('formMsg');
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  el.style.borderColor = color;
  el.style.color = color;
  setTimeout(() => el.style.display = 'none', 3000);
}

/* ================================================
   EXPORT CSV
   ================================================ */
function exportCSV() {
  if (!authToken) { showToast('Login dulu!', 'error'); return; }
  const link = document.createElement('a');
  link.href = `${API_BASE}/api/export/csv`;
  link.setAttribute('x-auth-token', authToken);

  // Buka di tab baru dengan token di header tidak bisa langsung — pakai URL param fallback
  window.open(`${API_BASE}/api/export/csv?token=${authToken}`, '_blank');
}

/* ================================================
   CHARTS / STATISTIK
   ================================================ */
function renderCharts(data) {
  const { summary, perMahasiswa, perJurusan } = data;

  // Update summary cards
  const totalEl     = document.getElementById('stat-total-tugas');
  const doneEl      = document.getElementById('stat-done-tugas');
  const pendingEl   = document.getElementById('stat-pending-tugas');
  const mhsEl       = document.getElementById('stat-total-mhs');
  if (totalEl)   totalEl.textContent   = summary.total;
  if (doneEl)    doneEl.textContent    = summary.done;
  if (pendingEl) pendingEl.textContent = summary.pending;
  if (mhsEl)     mhsEl.textContent     = summary.totalMahasiswa;

  // Donut chart: done vs pending
  renderDonutChart('donutChart', summary.done, summary.pending, summary.total);

  // Bar chart: per mahasiswa
  renderBarChart('barChart', perMahasiswa);

  // Progress list
  renderProgressList('progressList', perMahasiswa);
}

function renderDonutChart(canvasId, done, pending, total) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 20;

  ctx.clearRect(0, 0, W, H);

  if (total === 0) {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.font = '11px Share Tech Mono';
    ctx.textAlign = 'center';
    ctx.fillText('NO DATA', cx, cy+4);
    return;
  }

  const donePct    = done / total;
  const pendingPct = pending / total;
  const startAngle = -Math.PI / 2;

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.strokeStyle = '#1a0000';
  ctx.lineWidth = 28;
  ctx.stroke();

  // Done arc
  if (donePct > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, startAngle + Math.PI*2*donePct);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 28;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Pending arc
  if (pendingPct > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle + Math.PI*2*donePct, startAngle + Math.PI*2);
    ctx.strokeStyle = '#FF1744';
    ctx.lineWidth = 28;
    ctx.shadowColor = '#FF1744';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Center text
  ctx.fillStyle = '#fff';
  ctx.font = `bold 22px Orbitron, monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(donePct*100) + '%', cx, cy + 4);
  ctx.fillStyle = '#888';
  ctx.font = '10px Share Tech Mono, monospace';
  ctx.fillText('SELESAI', cx, cy + 18);
}

function renderBarChart(canvasId, perMahasiswa) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = 40, barGap = 6;

  ctx.clearRect(0, 0, W, H);

  if (!perMahasiswa.length) {
    ctx.fillStyle = '#555';
    ctx.font = '11px Share Tech Mono';
    ctx.textAlign = 'center';
    ctx.fillText('NO DATA', W/2, H/2);
    return;
  }

  const data  = perMahasiswa.slice(0, 8); // max 8 bars
  const maxV  = Math.max(...data.map(d => d.total), 1);
  const barW  = (W - pad*2) / data.length - barGap;
  const chartH = H - pad - 30;

  // Grid lines
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
  }

  data.forEach((d, i) => {
    const x       = pad + i * (barW + barGap);
    const doneH   = (d.done / maxV) * chartH;
    const pendH   = (d.pending / maxV) * chartH;

    // Pending bar (background)
    if (pendH > 0) {
      ctx.fillStyle = 'rgba(255,23,68,0.3)';
      ctx.fillRect(x, pad + chartH - doneH - pendH, barW, pendH);
    }

    // Done bar
    if (doneH > 0) {
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 4;
      ctx.fillRect(x, pad + chartH - doneH, barW, doneH);
      ctx.shadowBlur = 0;
    }

    // Label (nama singkat)
    ctx.fillStyle = '#888';
    ctx.font = '8px Share Tech Mono, monospace';
    ctx.textAlign = 'center';
    const label = d.nama.split(' ')[0].substring(0, 7);
    ctx.fillText(label, x + barW/2, H - 8);
  });
}

function renderProgressList(elId, perMahasiswa) {
  const el = document.getElementById(elId);
  if (!el) return;

  if (!perMahasiswa.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;font-family:\'Share Tech Mono\',monospace;">NO DATA</div>';
    return;
  }

  el.innerHTML = perMahasiswa
    .sort((a, b) => b.progress - a.progress)
    .map(m => `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-family:'Rajdhani',sans-serif;font-size:0.88rem;color:var(--white);">${m.nama}</span>
          <span style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;color:${m.progress===100?'#00ff88':'var(--red-bright)'};">
            ${m.progress}% (${m.done}/${m.total})
          </span>
        </div>
        <div style="height:4px;background:#1a0000;border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${m.progress}%;background:${m.progress===100?'#00ff88':'var(--red-bright)'};
            transition:width 0.6s ease;box-shadow:0 0 6px ${m.progress===100?'#00ff88':'var(--red)'};">
          </div>
        </div>
      </div>
    `).join('');
}

/* ================================================
   TOAST NOTIFICATION
   ================================================ */
function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:30px;right:30px;z-index:99999;
    font-family:'Share Tech Mono',monospace;font-size:0.78rem;letter-spacing:1px;
    padding:14px 22px;border:1px solid;
    background:var(--dark3);color:${type==='success'?'#00ff88':'#FF1744'};
    border-color:${type==='success'?'#00ff88':'#FF1744'};
    clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
    animation:slideInToast 0.3s ease;
    box-shadow:0 0 20px ${type==='success'?'rgba(0,255,136,0.2)':'rgba(255,23,68,0.2)'};
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

/* ================================================
   EXPORT CSV — update untuk pakai token di query
   ================================================ */
// Override fungsi export untuk support token via query param
async function exportCSV() {
  if (!authToken) { showToast('Login dulu!', 'error'); return; }

  // Tambahkan token sementara ke request via fetch dan download
  try {
    const res = await fetch(`${API_BASE}/api/export/csv`, {
      headers: { 'x-auth-token': authToken }
    });
    if (!res.ok) { showToast('Export gagal!', 'error'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `mahasiswa_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ Export CSV berhasil!', 'success');
  } catch (err) {
    showToast('Export error: ' + err.message, 'error');
  }
}

/* ================================================
   ANIMASI
   ================================================ */
function initTypewriter() {
  const subtitleEl = document.getElementById('hero-typewriter');
  if (!subtitleEl) return;
  const phrases = ['MULTI-PURPOSE DISCORD BOT','MODERATION • MUSIC • FUN','AKADEMIK DASHBOARD','POWERED BY DISCORD.JS v14','READY TO SERVE YOUR SERVER'];
  let phraseIdx = 0, charIdx = 0, deleting = false;
  function tick() {
    const current = phrases[phraseIdx];
    if (!deleting) {
      subtitleEl.textContent = current.slice(0, charIdx+1);
      charIdx++;
      if (charIdx === current.length) { deleting = true; setTimeout(tick, 1800); return; }
    } else {
      subtitleEl.textContent = current.slice(0, charIdx-1);
      charIdx--;
      if (charIdx === 0) { deleting = false; phraseIdx = (phraseIdx+1) % phrases.length; }
    }
    setTimeout(tick, deleting ? 45 : 90);
  }
  tick();
}

function initMatrixRain() {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const chars = '01ZIEEBOT<>{}[]//\\--DISCORD.JS//ONLINE//API//QUERY';
  const fontSize = 13;
  let columns = Math.floor(canvas.width / fontSize);
  let drops = Array.from({ length: columns }, () => Math.random() * -50);
  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    columns = Math.floor(canvas.width / fontSize);
    while (drops.length < columns) drops.push(Math.random() * -50);
    ctx.font = `${fontSize}px 'Share Tech Mono', monospace`;
    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      if (y > 0 && y < canvas.height / fontSize) { ctx.fillStyle = '#FF1744'; ctx.shadowBlur = 8; ctx.shadowColor = '#FF1744'; }
      else { ctx.fillStyle = `rgba(139,0,0,${0.08 + Math.random() * 0.12})`; ctx.shadowBlur = 0; }
      ctx.fillText(char, i * fontSize, y * fontSize);
      drops[i] += 0.4 + Math.random() * 0.3;
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
    });
    ctx.shadowBlur = 0;
    requestAnimationFrame(draw);
  }
  draw();
}

function initDashboardHubRain() {
  const canvas = document.getElementById('dashboardHubMatrix');
  const section = document.getElementById('dashboards');
  if (!canvas || !section) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = section.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(section.scrollHeight));
    canvas.width = width;
    canvas.height = height;
    // #region agent log
    fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2257f3'},body:JSON.stringify({sessionId:'2257f3',runId:'initial',hypothesisId:'H5',location:'script.js:initDashboardHubRain:resize',message:'dashboard hub matrix resized',data:{width,height},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  resize();
  window.addEventListener('resize', resize);

  const chars = '01DASHBOARDHUBZIEEBOT{}[]<>/';
  const fontSize = 13;
  let columns = Math.floor(canvas.width / fontSize);
  let drops = Array.from({ length: columns }, () => Math.random() * -30);

  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    columns = Math.floor(canvas.width / fontSize);
    while (drops.length < columns) drops.push(Math.random() * -30);
    ctx.font = `${fontSize}px 'Share Tech Mono', monospace`;
    for (let i = 0; i < columns; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = `rgba(255,23,68,${0.16 + Math.random() * 0.2})`;
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);
      drops[i] += 0.34 + Math.random() * 0.28;
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
    }
    requestAnimationFrame(draw);
  }
  draw();
}

function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    vx: (Math.random()-0.5)*0.4, vy: (Math.random()-0.5)*0.4,
    size: Math.random()*1.5+0.3, opacity: Math.random()*0.2+0.04
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,23,68,${p.opacity})`; ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

function initAvatarAnimation() {
  const scanEl = document.getElementById('avatarScanLine');
  if (!scanEl) return;
  let y = 0, dir = 1;
  function tick() {
    y += dir * 1.2;
    if (y > 100) dir = -1;
    if (y < 0)   dir = 1;
    scanEl.setAttribute('y', y + '%');
    requestAnimationFrame(tick);
  }
  tick();
  const eyes = document.querySelectorAll('.bot-eye');
  function blink() {
    eyes.forEach(e => { e.style.transform = 'scaleY(0.05)'; setTimeout(() => e.style.transform = 'scaleY(1)', 120); });
    setTimeout(blink, 2800 + Math.random() * 2000);
  }
  setTimeout(blink, 1500);
  const statusTexts = ['ONLINE','READY','ACTIVE','SERVING','v2.0.0'];
  let sIdx = 0;
  const statusEl = document.getElementById('avatarStatusText');
  if (statusEl) setInterval(() => { sIdx = (sIdx+1) % statusTexts.length; statusEl.textContent = statusTexts[sIdx]; }, 2200);
}

function initHeroEntrance() {
  document.querySelectorAll('.hero-enter').forEach((el, i) => {
    el.style.opacity = '0'; el.style.transform = 'translateY(30px)';
    setTimeout(() => { el.style.transition = 'opacity 0.7s ease, transform 0.7s ease'; el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 300 + i * 150);
  });
}

function initStatCounter() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const target = parseInt(e.target.dataset.target);
      const suffix = e.target.closest('.stat-card')?.querySelector('.stat-label')?.textContent.includes('%') ? '%' : '+';
      const start = performance.now();
      const update = now => {
        const p = Math.min((now - start) / 1800, 1);
        const eased = 1 - Math.pow(1-p, 3);
        e.target.textContent = Math.floor(eased * target).toLocaleString() + (p === 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-target]').forEach(el => obs.observe(el));
}

function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => obs.observe(el));
}

function initCursor() {
  const cur = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (!cur || !ring) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.style.left = mx + 'px'; cur.style.top = my + 'px';
    spawnTrail(mx, my);
  });
  function lerpRing() { rx += (mx-rx)*0.14; ry += (my-ry)*0.14; ring.style.left = rx+'px'; ring.style.top = ry+'px'; requestAnimationFrame(lerpRing); }
  lerpRing();
  document.querySelectorAll('a, button, .mhs-card, .feature-card, .stat-card, .tab-btn').forEach(el => {
    el.addEventListener('mouseenter', () => { cur.classList.add('hover'); ring.classList.add('hover'); });
    el.addEventListener('mouseleave', () => { cur.classList.remove('hover'); ring.classList.remove('hover'); });
  });
}

function spawnTrail(x, y) {
  const d = document.createElement('div');
  d.className = 'cursor-trail';
  d.style.left = x + 'px'; d.style.top = y + 'px';
  d.style.transform = 'translate(-50%, -50%)';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 600);
}

function initRipple() {
  document.querySelectorAll('.btn-primary, .btn-outline, .add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const r = document.createElement('span');
      r.className = 'ripple-effect';
      r.style.left = e.offsetX + 'px'; r.style.top = e.offsetY + 'px';
      btn.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  });
}

function initBootSequence() {
  const overlay = document.getElementById('bootOverlay');
  if (!overlay) return;
  const lines = ['> INITIALIZING ZIEEBOT v3.0...','> LOADING AUTH MODULES...','> CONNECTING TO DATABASE...','> AKADEMIK DASHBOARD READY...','> ALL SYSTEMS OPERATIONAL ✓'];
  const logEl = document.getElementById('bootLog');
  let i = 0;
  function addLine() {
    if (i < lines.length) {
      const div = document.createElement('div');
      div.textContent = lines[i];
      div.style.cssText = 'opacity:0;transition:opacity 0.3s;';
      logEl.appendChild(div);
      setTimeout(() => div.style.opacity = '1', 50);
      i++;
      setTimeout(addLine, 320);
    } else {
      setTimeout(() => {
        overlay.style.transition = 'opacity 0.8s ease';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 900);
      }, 400);
    }
  }
  addLine();
}

/* ================================================
   INIT ALL
   ================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Inject toast animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInToast { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .mhs-actions { position:absolute;top:10px;right:10px;display:flex;gap:4px;z-index:10; }
    .mhs-action-btn { width:28px;height:28px;border:1px solid #333;background:rgba(0,0,0,0.7);color:var(--text-dim);cursor:pointer;font-size:0.75rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s;border-radius:2px; }
    .mhs-action-btn.edit-btn:hover { border-color:var(--red-bright);color:var(--red-bright);background:var(--red-dim); }
    .mhs-action-btn.delete-btn:hover { border-color:#ff4444;color:#ff4444;background:rgba(255,68,68,0.1); }
    .mhs-card { position:relative; }
  `;
  document.head.appendChild(style);

  initBootSequence();
  initMatrixRain();
  initDashboardHubRain();
  initParticles();
  initTypewriter();
  initHeroEntrance();
  initAvatarAnimation();
  initCursor();
  initRipple();
  initStatCounter();
  initScrollReveal();

  // Cek auth
  const authed = await checkAuth();
  if (authed) {
    loadMahasiswa();
    loadStats();
  }
});

/* ================================================
   SPA NAVIGATION — Economy & Music Dashboard
   ================================================ */

const mainSections = ['hero','stats','features','dashboards','kelas','invite'];
let spaActive = false;
let currentSpaPage = null;
let transitionOverlayEl = null;

function debugSpaLog(hypothesisId, location, message, data = {}, runId = 'initial') {
  // #region agent log
  fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2257f3'},body:JSON.stringify({sessionId:'2257f3',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

function ensureSpaTransitionOverlay() {
  if (transitionOverlayEl) return transitionOverlayEl;
  transitionOverlayEl = document.createElement('div');
  transitionOverlayEl.id = 'spaTransitionOverlay';
  transitionOverlayEl.style.cssText = `
    position:fixed;inset:0;z-index:999997;pointer-events:none;opacity:0;
    background:
      repeating-linear-gradient(0deg, rgba(255,23,68,0.05), rgba(255,23,68,0.05) 2px, transparent 2px, transparent 4px),
      radial-gradient(ellipse at center, rgba(255,23,68,0.22), rgba(0,0,0,0.96) 65%);
  `;
  document.body.appendChild(transitionOverlayEl);
  return transitionOverlayEl;
}

function playSpaTransition() {
  const el = ensureSpaTransitionOverlay();
  el.animate(
    [
      { opacity: 0, transform: 'scale(1.02)' },
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(1.01)' }
    ],
    { duration: 420, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
  );
}

async function navigateTo(page) {
  debugSpaLog('H1', 'script.js:navigateTo:entry', 'navigateTo called', {
    page,
    spaActive,
    hash: window.location.hash || '',
    path: window.location.pathname || ''
  });

  if (page === 'home') {
    playSpaTransition();
    exitSPA(); return;
  }

  const spaContainer = document.getElementById('spaContainer');
  if (!spaContainer) return;
  playSpaTransition();

  // Hide all main sections
  mainSections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.querySelector('footer')?.style && (document.querySelector('footer').style.display = 'none');
  document.querySelector('nav')?.style && (document.querySelector('nav').style.display = 'none');

  // Show SPA container with loading state
  spaContainer.style.display = 'block';
  spaContainer.innerHTML = `
    <div style="
      min-height:100vh;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:1.5rem;
      background:var(--dark);
    ">
      <div style="font-family:'Orbitron',monospace;font-size:1.5rem;font-weight:900;
        color:#FF1744;text-shadow:0 0 20px #FF1744;letter-spacing:4px;animation:flicker 2s infinite;">
        ${page === 'economy' ? '💰 ECONOMY' : '🎵 MUSIC'} DASHBOARD
      </div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:.75rem;color:#555;letter-spacing:3px;">
        // LOADING...
      </div>
      <div style="width:240px;height:2px;background:#1a0000;overflow:hidden;">
        <div style="height:100%;background:#FF1744;animation:bootBar 1s ease forwards;box-shadow:0 0 8px #FF1744;"></div>
      </div>
    </div>
  `;

  spaActive = true;
  currentSpaPage = page;
  if (!history.state || history.state.page !== page || !history.state.spa) {
    history.pushState({ spa: true, page }, '', `#dashboard-${page}`);
    debugSpaLog('H3', 'script.js:navigateTo:pushState', 'history state pushed for spa page', {
      page,
      hash: window.location.hash || ''
    });
  }
  window.scrollTo(0, 0);

  try {
    const pageFileMap = {
      economy: '/economy-dashboard.html',
      music: '/music-dashboard.html',
      kelas: '/kelas-dashboard.html'
    };
    const file = pageFileMap[page];
    if (!file) {
      throw new Error(`Unknown SPA page: ${page}`);
    }
    const res  = await fetch(file);
    debugSpaLog('H2', 'script.js:navigateTo:fetch', 'dashboard HTML fetch completed', {
      page,
      file,
      ok: res.ok,
      status: res.status
    });
    const html = await res.text();

    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');

    // Extract styles
    const styleEls = Array.from(doc.querySelectorAll('style'));
    const styleHtml = styleEls.map(s => s.outerHTML).join('');

    // Extract body content (excluding script tags)
    const bodyEl  = doc.body.cloneNode(true);
    Array.from(bodyEl.querySelectorAll('script')).forEach(s => s.remove());
    const bodyHtml = bodyEl.innerHTML;

    // Extract script contents
    const scriptContents = Array.from(doc.querySelectorAll('script'))
      .map(s => s.textContent)
      .filter(Boolean)
      .join('\n;\n');
    debugSpaLog('H1', 'script.js:navigateTo:extract', 'dashboard assets extracted', {
      page,
      styleCount: styleEls.length,
      scriptLength: scriptContents.length
    });

    // Inject content
    spaContainer.innerHTML = styleHtml + bodyHtml;

    // Execute scripts
    const scriptEl = document.createElement('script');
    scriptEl.textContent = `try{${scriptContents}}catch(e){fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2257f3'},body:JSON.stringify({sessionId:'2257f3',runId:'initial',hypothesisId:'H1',location:'script.js:navigateTo:scriptExecute',message:'dashboard script execution failed',data:{page:${JSON.stringify(page)},errorMessage:e&&e.message?e.message:String(e)},timestamp:Date.now()})}).catch(()=>{});throw e;}`;
    spaContainer.appendChild(scriptEl);
    debugSpaLog('H1', 'script.js:navigateTo:scriptAppended', 'dashboard script appended', {
      page
    });

  } catch(err) {
    debugSpaLog('H2', 'script.js:navigateTo:catch', 'navigateTo failed', {
      page,
      errorMessage: err.message
    });
    spaContainer.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;">
        <div style="font-family:'Orbitron',monospace;color:#FF1744;font-size:1rem;">LOAD ERROR</div>
        <div style="font-family:'Share Tech Mono',monospace;color:#555;font-size:.75rem;">${err.message}</div>
        <button onclick="exitSPA()" style="
          font-family:'Orbitron',monospace;font-size:.7rem;letter-spacing:2px;
          background:transparent;border:1px solid #FF1744;color:#FF1744;
          padding:.6rem 1.5rem;cursor:pointer;margin-top:1rem;
        ">← KEMBALI</button>
      </div>
    `;
    console.error('SPA load error:', err);
  }
}

function exitSPA() {
  playSpaTransition();
  debugSpaLog('H3', 'script.js:exitSPA', 'exitSPA called', {
    spaActive,
    hash: window.location.hash || '',
    path: window.location.pathname || ''
  });

  const spaContainer = document.getElementById('spaContainer');
  if (spaContainer) {
    spaContainer.style.display = 'none';
    spaContainer.innerHTML = '';
  }

  // Show all main sections again
  mainSections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  const footer = document.querySelector('footer');
  const nav    = document.querySelector('nav');
  if (footer) footer.style.display = '';
  if (nav)    nav.style.display = '';

  spaActive = false;
  currentSpaPage = null;
  window.scrollTo(0, 0);
}

// Listen for back navigation from sub-dashboards
window.addEventListener('spa-navigate', (e) => {
  debugSpaLog('H4', 'script.js:spa-navigate:event', 'spa-navigate event received', {
    detail: e.detail
  });
  if (e.detail === 'home') exitSPA();
  else navigateTo(e.detail);
});

window.addEventListener('popstate', () => {
  debugSpaLog('H3', 'script.js:popstate', 'browser back/forward detected', {
    spaActive,
    state: history.state || null,
    hash: window.location.hash || '',
    path: window.location.pathname || ''
  });

  const state = history.state;
  if (state && state.spa && state.page) {
    if (!spaActive || currentSpaPage !== state.page) {
      navigateTo(state.page);
    }
    return;
  }

  if (spaActive) {
    exitSPA();
  }
});

// Expose globally
window.navigateTo = navigateTo;
window.exitSPA    = exitSPA;

if (!history.state) {
  history.replaceState({ spa: false, page: 'home' }, '', '#home');
  debugSpaLog('H3', 'script.js:init:replaceState', 'initialized home history state', {
    hash: window.location.hash || ''
  });
}

// =============================================================================
// ABSEN SIMKULIAH — Frontend JS
// Tempel kode ini di AKHIR file script.js kamu
// =============================================================================

const BOT_URL = window.BOT_URL || '/api'; // pakai proxy via Express (direkomendasikan)
// Jika bot berjalan terpisah, ganti dengan:
// const BOT_URL = 'http://localhost:5001/api';

// ─────────────────────────────────────────────────────────────────────────────
// View switcher dalam tab Absen
// ─────────────────────────────────────────────────────────────────────────────

function switchAbsenView(view) {
  ['accounts', 'add', 'log'].forEach(v => {
    const el = document.getElementById(`absenView-${v}`);
    if (el) el.style.display = v === view ? 'block' : 'none';
  });
  if (view === 'accounts') loadAkunAbsen();
  if (view === 'log')      loadAbsenLog();
}

// Override switchTab untuk load data saat tab absen dibuka
const _origSwitchTab = typeof switchTab === 'function' ? switchTab : null;
function switchTab(name) {
  if (_origSwitchTab) _origSwitchTab(name);

  // Setelah tab absen dibuka, load daftar akun
  if (name === 'absen') {
    setTimeout(() => {
      switchAbsenView('accounts');
    }, 50);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Load daftar akun
// ─────────────────────────────────────────────────────────────────────────────

async function loadAkunAbsen() {
  const grid    = document.getElementById('akунGrid');
  const emptyEl = document.getElementById('absenEmptyMsg');
  const countEl = document.getElementById('absenCount');

  if (!grid) return;
  grid.innerHTML = `<div style="
    grid-column:1/-1;text-align:center;padding:2rem;
    font-family:'Share Tech Mono',monospace;font-size:0.75rem;color:var(--text-dim);">
    <div class="absen-spinner"></div>
    LOADING...
  </div>`;

  try {
    const res  = await fetch(`${BOT_URL}/accounts`);
    const data = await res.json();
    const list = data.data || [];

    if (countEl) countEl.textContent = list.length;

    if (list.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    grid.innerHTML = list.map(acc => `
      <div class="feature-card absen-account-card" id="card-${acc.id}" style="
        position:relative;padding:1.4rem;display:flex;flex-direction:column;gap:0.8rem;">

        <!-- BADGE STATUS -->
        <div class="absen-status-badge" id="badge-${acc.id}" style="
          position:absolute;top:12px;right:12px;
          font-family:'Share Tech Mono',monospace;font-size:0.6rem;
          letter-spacing:2px;padding:3px 10px;border-radius:2px;
          background:rgba(0,255,136,0.08);border:1px solid #00ff88;color:#00ff88;">
          READY
        </div>

        <!-- INFO AKUN -->
        <div style="padding-right:60px;">
          <div style="font-family:'Orbitron',monospace;font-size:0.85rem;
            font-weight:700;color:#fff;margin-bottom:4px;">
            ${escHtml(acc.nama)}
          </div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;
            color:var(--red-bright);">
            NPM: ${escHtml(acc.npm)}
          </div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:0.65rem;
            color:var(--text-dim);margin-top:4px;">
            Ditambah: ${formatDate(acc.created_at)}
          </div>
        </div>

        <!-- HASIL ABSEN -->
        <div id="result-${acc.id}" style="display:none;"></div>

        <!-- ACTIONS -->
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.4rem;">
          <button class="add-btn absen-single-btn" id="btn-${acc.id}"
            onclick="absenSatu(${acc.id}, '${escHtml(acc.nama)}')"
            style="flex:1;min-width:120px;font-size:0.68rem;padding:8px 12px;">
            ⚡ ABSEN
          </button>
          <button onclick="hapusAkun(${acc.id}, '${escHtml(acc.nama)}')"
            style="background:transparent;border:1px solid #3E0000;
              color:#ff4444;padding:8px 12px;font-family:'Share Tech Mono',monospace;
              font-size:0.65rem;cursor:pointer;letter-spacing:1px;
              transition:all 0.2s;"
            onmouseover="this.style.borderColor='#ff4444'"
            onmouseout="this.style.borderColor='#3E0000'">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    grid.innerHTML = `<div style="
      grid-column:1/-1;text-align:center;padding:2rem;
      font-family:'Share Tech Mono',monospace;font-size:0.75rem;color:#ff4444;">
      ❌ Gagal memuat akun. Pastikan server bot berjalan.<br>
      <span style="color:var(--text-dim);font-size:0.65rem;">${err.message}</span>
    </div>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Absen satu akun
// ─────────────────────────────────────────────────────────────────────────────

async function absenSatu(id, nama) {
  const btn      = document.getElementById(`btn-${id}`);
  const badge    = document.getElementById(`badge-${id}`);
  const resultEl = document.getElementById(`result-${id}`);

  setAbsenState(btn, badge, 'loading', `ABSEN ${nama.split(' ')[0].toUpperCase()}...`);

  try {
    const res  = await fetch(`${BOT_URL}/absen/${id}`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      setAbsenState(btn, badge, 'success');
      showAbsenResult(resultEl, data.data || [], true);
      showStatusBar(`✅ ${nama}: ${data.message}`, 'success');
    } else {
      setAbsenState(btn, badge, 'error');
      showAbsenResult(resultEl, [], false, data.message);
      showStatusBar(`❌ ${nama}: ${data.message}`, 'error');
    }
  } catch (err) {
    setAbsenState(btn, badge, 'error');
    showStatusBar(`❌ Koneksi gagal: ${err.message}`, 'error');
  }

  // Reset tombol setelah 8 detik
  setTimeout(() => setAbsenState(btn, badge, 'ready'), 8000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Absen semua akun
// ─────────────────────────────────────────────────────────────────────────────

async function absenAll() {
  const btn = document.getElementById('btnAbsenAll');
  if (!btn) return;

  const origText = btn.innerHTML;
  btn.disabled   = true;
  btn.innerHTML  = `<span class="absen-spinner"></span> PROSES SEMUA AKUN...`;
  btn.style.opacity = '0.7';

  showStatusBar('⏳ Menjalankan absen untuk semua akun...', 'loading');

  try {
    const res  = await fetch(`${BOT_URL}/absen/all`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      const berhasil = (data.data || []).filter(x => x.success).length;
      const gagal    = (data.data || []).filter(x => !x.success).length;
      showStatusBar(`✅ Selesai: ${berhasil} akun berhasil, ${gagal} gagal.`, 'success');

      // Update badge tiap akun
      (data.data || []).forEach(item => {
        const badge = document.getElementById(`badge-${item.account_id}`);
        const btn2  = document.getElementById(`btn-${item.account_id}`);
        const res2  = document.getElementById(`result-${item.account_id}`);
        if (badge && btn2) {
          setAbsenState(btn2, badge, item.success ? 'success' : 'error');
          if (res2) showAbsenResult(res2, item.absen_list || [], item.success);
        }
      });
    } else {
      showStatusBar(`❌ ${data.message}`, 'error');
    }
  } catch (err) {
    showStatusBar(`❌ Koneksi gagal: ${err.message}`, 'error');
  }

  btn.disabled  = false;
  btn.innerHTML = origText;
  btn.style.opacity = '1';
}

// ─────────────────────────────────────────────────────────────────────────────
// Tambah akun
// ─────────────────────────────────────────────────────────────────────────────

async function tambahAkunAbsen() {
  const nama     = document.getElementById('ab-nama')?.value.trim();
  const npm      = document.getElementById('ab-npm')?.value.trim();
  const password = document.getElementById('ab-password')?.value.trim();
  const msgEl    = document.getElementById('absenFormMsg');

  if (!nama || !npm || !password) {
    showFormMsg(msgEl, '⚠️ Semua field wajib diisi.', 'error');
    return;
  }

  try {
    const res  = await fetch(`${BOT_URL}/accounts`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ nama, npm, password }),
    });
    const data = await res.json();

    if (data.success) {
      showFormMsg(msgEl, `✅ Akun ${nama} berhasil ditambahkan.`, 'success');
      resetFormAbsen();
      // Kembali ke view accounts setelah 1.5 detik
      setTimeout(() => switchAbsenView('accounts'), 1500);
    } else {
      showFormMsg(msgEl, `❌ ${data.message}`, 'error');
    }
  } catch (err) {
    showFormMsg(msgEl, `❌ Koneksi gagal: ${err.message}`, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hapus akun
// ─────────────────────────────────────────────────────────────────────────────

async function hapusAkun(id, nama) {
  if (!confirm(`Hapus akun "${nama}"? Log absen juga akan terhapus.`)) return;

  try {
    const res  = await fetch(`${BOT_URL}/accounts/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      const card = document.getElementById(`card-${id}`);
      if (card) {
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        card.style.opacity    = '0';
        card.style.transform  = 'scale(0.95)';
        setTimeout(() => loadAkunAbsen(), 350);
      }
      showStatusBar(`🗑️ Akun ${nama} dihapus.`, 'success');
    } else {
      showStatusBar(`❌ ${data.message}`, 'error');
    }
  } catch (err) {
    showStatusBar(`❌ Koneksi gagal: ${err.message}`, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Load log absen
// ─────────────────────────────────────────────────────────────────────────────

async function loadAbsenLog() {
  const tbody = document.getElementById('absenLogBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;
    font-family:'Share Tech Mono',monospace;font-size:0.75rem;color:var(--text-dim);">
    <div class="absen-spinner" style="margin:0 auto 8px;"></div>LOADING...
  </td></tr>`;

  try {
    const res  = await fetch(`${BOT_URL}/absen/log`);
    const data = await res.json();
    const logs = data.data || [];

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;
        font-family:'Share Tech Mono',monospace;font-size:0.75rem;color:var(--text-dim);">
        Belum ada log absen.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(log => `
      <tr>
        <td style="font-family:'Share Tech Mono',monospace;font-size:0.72rem;">
          ${escHtml(log.nama || '—')}
        </td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;
          color:var(--red-bright);">
          ${escHtml(log.npm || '—')}
        </td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;max-width:200px;">
          ${escHtml(log.kelas || '—')}
        </td>
        <td>
          <span style="
            font-family:'Share Tech Mono',monospace;font-size:0.65rem;
            padding:3px 10px;border-radius:2px;letter-spacing:1px;
            ${log.status === 'berhasil'
              ? 'background:rgba(0,255,136,0.08);border:1px solid #00ff88;color:#00ff88;'
              : 'background:rgba(255,23,68,0.08);border:1px solid var(--red-bright);color:var(--red-bright);'}
          ">
            ${escHtml(log.status?.toUpperCase() || '—')}
          </span>
        </td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:0.65rem;
          color:var(--text-dim);white-space:nowrap;">
          ${formatDate(log.absen_at)}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ff4444;
      font-family:'Share Tech Mono',monospace;font-size:0.75rem;padding:1rem;">
      ❌ Gagal muat log: ${err.message}
    </td></tr>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────────

function setAbsenState(btn, badge, state, customLabel) {
  if (!btn || !badge) return;

  const states = {
    loading: { btnTxt: `<span class="absen-spinner"></span> ${customLabel || 'PROSES...'}`, btnDis: true,  badgeTxt: 'RUNNING', badgeStyle: 'background:rgba(255,200,0,0.08);border:1px solid #ffc800;color:#ffc800;' },
    success: { btnTxt: '✅ SELESAI',  btnDis: false, badgeTxt: 'DONE',    badgeStyle: 'background:rgba(0,255,136,0.08);border:1px solid #00ff88;color:#00ff88;' },
    error:   { btnTxt: '❌ GAGAL',    btnDis: false, badgeTxt: 'ERROR',   badgeStyle: 'background:rgba(255,23,68,0.08);border:1px solid var(--red-bright);color:var(--red-bright);' },
    ready:   { btnTxt: '⚡ ABSEN',    btnDis: false, badgeTxt: 'READY',   badgeStyle: 'background:rgba(0,255,136,0.08);border:1px solid #00ff88;color:#00ff88;' },
  };

  const s = states[state] || states.ready;
  btn.innerHTML   = s.btnTxt;
  btn.disabled    = s.btnDis;
  badge.innerHTML = s.badgeTxt;
  badge.style.cssText += s.badgeStyle;
}

function showAbsenResult(el, list, success, errMsg) {
  if (!el) return;
  el.style.display = 'block';

  if (!success) {
    el.innerHTML = `<div style="padding:8px 12px;border:1px solid var(--red-bright);
      background:rgba(255,23,68,0.05);font-family:'Share Tech Mono',monospace;
      font-size:0.68rem;color:#ff6b6b;">
      ❌ ${escHtml(errMsg || 'Gagal')}
    </div>`;
    return;
  }

  if (!list || list.length === 0) {
    el.innerHTML = `<div style="padding:8px 12px;border:1px solid #00ff88;
      background:rgba(0,255,136,0.05);font-family:'Share Tech Mono',monospace;
      font-size:0.68rem;color:#00ff88;">
      ✅ Sudah terabsen sebelumnya
    </div>`;
    return;
  }

  el.innerHTML = `<div style="padding:10px 12px;border:1px solid #1a3a1a;
    background:rgba(0,255,136,0.03);">
    ${list.map(item => `
      <div style="font-family:'Share Tech Mono',monospace;font-size:0.68rem;
        color:${item.status === 'berhasil' ? '#00ff88' : '#ff6b6b'};
        padding:2px 0;">
        ${item.status === 'berhasil' ? '✅' : '❌'} ${escHtml(item.kelas)}
      </div>
    `).join('')}
  </div>`;
}

function showStatusBar(msg, type) {
  const bar = document.getElementById('absenStatusBar');
  if (!bar) return;

  const styles = {
    success: 'background:rgba(0,255,136,0.05);border-color:#00ff88;color:#00ff88;',
    error:   'background:rgba(255,23,68,0.05);border-color:var(--red-bright);color:#ff6b6b;',
    loading: 'background:rgba(255,200,0,0.05);border-color:#ffc800;color:#ffc800;',
  };

  bar.style.cssText += styles[type] || styles.loading;
  bar.innerHTML      = msg;
  bar.style.display  = 'block';

  if (type !== 'loading') {
    setTimeout(() => { bar.style.display = 'none'; }, 6000);
  }
}

function showFormMsg(el, msg, type) {
  if (!el) return;
  el.style.display     = 'block';
  el.innerHTML          = msg;
  el.style.borderColor  = type === 'success' ? '#00ff88' : 'var(--red-bright)';
  el.style.color        = type === 'success' ? '#00ff88' : '#ff6b6b';
  el.style.background   = type === 'success' ? 'rgba(0,255,136,0.05)' : 'rgba(255,23,68,0.05)';
}

function resetFormAbsen() {
  ['ab-nama','ab-npm','ab-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const msgEl = document.getElementById('absenFormMsg');
  if (msgEl) msgEl.style.display = 'none';
}

function togglePw() {
  const input = document.getElementById('ab-password');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}