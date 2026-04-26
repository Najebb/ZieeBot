/* ================================================
   ZieeBot Website v2.0 — script.js (API Version)
   ================================================ */

// API Base URL (auto-detect)
const API_BASE = window.location.origin;

/* ===== STATE ===== */
let mahasiswaData = [];
let isLoading = false;

/* ===== UTILITIES ===== */
function getInitial(n) {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ===== API HELPERS ===== */
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE}/api${endpoint}`);
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (err) {
    console.error('API Error:', err);
    return [];
  }
}

async function apiPost(endpoint, body) {
  try {
    const res = await fetch(`${API_BASE}/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, error: err.message };
  }
}

async function apiPatch(endpoint, body) {
  try {
    const res = await fetch(`${API_BASE}/api${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, error: err.message };
  }
}

/* ===== LOAD DATA ===== */
async function loadMahasiswa() {
  isLoading = true;
  mahasiswaData = await apiGet('/mahasiswa');
  isLoading = false;
  renderMhs(mahasiswaData);
}

async function loadJadwal() {
  const rows = await apiGet('/jadwal');
  renderJadwal(rows);
}

async function loadTugas() {
  const rows = await apiGet('/tugas');
  renderTugasFromAPI(rows);
}

async function loadStats() {
  const stats = await apiGet('/stats');
  if (stats) {
    // Update stat cards dengan data real dari bot
    const statNums = document.querySelectorAll('.stat-num');
    if (statNums[0]) statNums[0].dataset.target = stats.servers || 0;
    if (statNums[1]) statNums[1].dataset.target = stats.users || 0;
    if (statNums[2]) statNums[2].dataset.target = stats.status === 'online' ? 99 : 0;
    if (statNums[3]) statNums[3].dataset.target = stats.commands || 0;
  }
}

/* ================================================
   ANIMASI HERO — TYPEWRITER
   ================================================ */
function initTypewriter() {
  const subtitleEl = document.getElementById('hero-typewriter');
  if (!subtitleEl) return;

  const phrases = [
    'MULTI-PURPOSE DISCORD BOT',
    'MODERATION • MUSIC • FUN',
    'AKADEMIK DASHBOARD',
    'POWERED BY DISCORD.JS v14',
    'READY TO SERVE YOUR SERVER'
  ];
  let phraseIdx = 0, charIdx = 0, deleting = false;

  function tick() {
    const current = phrases[phraseIdx];
    if (!deleting) {
      subtitleEl.textContent = current.slice(0, charIdx + 1);
      charIdx++;
      if (charIdx === current.length) {
        deleting = true;
        setTimeout(tick, 1800);
        return;
      }
    } else {
      subtitleEl.textContent = current.slice(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
      }
    }
    setTimeout(tick, deleting ? 45 : 90);
  }
  tick();
}

/* ================================================
   ANIMASI HERO — MATRIX RAIN CANVAS
   ================================================ */
function initMatrixRain() {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
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
      if (y > 0 && y < canvas.height / fontSize) {
        ctx.fillStyle = '#FF1744';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FF1744';
      } else {
        const alpha = 0.08 + Math.random() * 0.12;
        ctx.fillStyle = `rgba(139,0,0,${alpha})`;
        ctx.shadowBlur = 0;
      }
      ctx.fillText(char, i * fontSize, y * fontSize);
      drops[i] += 0.4 + Math.random() * 0.3;
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
    });
    ctx.shadowBlur = 0;
    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================
   ANIMASI — FLOATING PARTICLES
   ================================================ */
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    size: Math.random() * 1.5 + 0.3,
    opacity: Math.random() * 0.2 + 0.04
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,23,68,${p.opacity})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ================================================
   ANIMASI — AVATAR BOT SCAN LINE
   ================================================ */
function initAvatarAnimation() {
  const scanEl = document.getElementById('avatarScanLine');
  if (!scanEl) return;

  let y = 0, dir = 1;
  function tick() {
    y += dir * 1.2;
    if (y > 100) dir = -1;
    if (y < 0) dir = 1;
    scanEl.setAttribute('y', y + '%');
    requestAnimationFrame(tick);
  }
  tick();

  const eyes = document.querySelectorAll('.bot-eye');
  function blink() {
    eyes.forEach(e => {
      e.style.transform = 'scaleY(0.05)';
      setTimeout(() => e.style.transform = 'scaleY(1)', 120);
    });
    setTimeout(blink, 2800 + Math.random() * 2000);
  }
  setTimeout(blink, 1500);

  const statusTexts = ['ONLINE', 'READY', 'ACTIVE', 'SERVING', 'v2.0.0'];
  let sIdx = 0;
  const statusEl = document.getElementById('avatarStatusText');
  if (statusEl) {
    setInterval(() => {
      sIdx = (sIdx + 1) % statusTexts.length;
      statusEl.textContent = statusTexts[sIdx];
    }, 2200);
  }
}

/* ================================================
   ANIMASI — HERO ENTRANCE
   ================================================ */
function initHeroEntrance() {
  const items = document.querySelectorAll('.hero-enter');
  items.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 300 + i * 150);
  });
}

/* ===== TAB SYSTEM ===== */
function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    const ids = ['mahasiswa', 'jadwal', 'tugas', 'tambah'];
    b.classList.toggle('active', ids[i] === id);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');

  if (id === 'mahasiswa') loadMahasiswa();
  if (id === 'jadwal') loadJadwal();
  if (id === 'tugas') loadTugas();
}

/* ===== RENDER MAHASISWA ===== */
function renderMhs(data) {
  document.getElementById('mhsCount').textContent = data.length;
  document.getElementById('mhsGrid').innerHTML = data.length
    ? data.map((m, idx) => `
      <div class="mhs-card" onclick="openModal(${idx})">
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
            <div class="mhs-meta-val" style="margin-top:2px;">${m.tugas.filter(t => t.status === 'done').length}/${m.tugas.length} ✓</div>
        </div>
    `).join('')
    : '<div style="padding:40px;text-align:center;color:var(--text-dim);font-family:\'Share Tech Mono\',monospace;">NO RECORDS FOUND</div>';
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
const HARI_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function renderJadwal(rows) {
  document.getElementById('jadwalList').innerHTML = rows.length
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
  const q = document.getElementById('searchJadwal').value.toLowerCase();
  // Reload dan filter client-side
  apiGet('/jadwal').then(rows => {
    const filtered = rows.filter(r =>
      r.hari.toLowerCase().includes(q) ||
      r.matkul.toLowerCase().includes(q) ||
      (r.nama_mhs || r.nama).toLowerCase().includes(q)
    );
    renderJadwal(filtered);
  });
}

/* ===== TUGAS ===== */
let tugasFilter = 'all';

function renderTugasFromAPI(rows) {
  const filtered = tugasFilter === 'all' ? rows : rows.filter(r => r.status === tugasFilter);
  document.getElementById('tugasBody').innerHTML = filtered.length
    ? filtered.map(r => `
      <tr>
        <td>${r.nama}</td>
        <td style="color:var(--text-dim);">${r.nama_mhs || '—'}</td>
        <td style="color:var(--text-dim);">${r.matkul || '—'}</td>
        <td style="font-family:'Share Tech Mono',monospace;font-size:0.78rem;">${r.deadline || '—'}</td>
        <td>
          <span class="badge badge-${r.status === 'done' ? 'done' : 'pending'}" 
                onclick="toggleTugasStatus(${r.id}, '${r.status}')"
                style="cursor:pointer;">
            ${r.status === 'done' ? 'SELESAI' : 'PENDING'}
          </span>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-dim);font-family:\'Share Tech Mono\',monospace;font-size:0.8rem;">NO RECORDS FOUND</td></tr>';
}

function filterTugas(f) {
  tugasFilter = f;
  loadTugas();
}

async function toggleTugasStatus(id, currentStatus) {
  const newStatus = currentStatus === 'done' ? 'pending' : 'done';
  const result = await apiPatch(`/tugas/${id}`, { status: newStatus });
  if (result.success) {
    loadTugas(); // Refresh
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
  const tugas = tugasRaw
    ? tugasRaw.split(',').map(s => ({ nama: s.trim(), matkul: '—', deadline: '—', status: 'pending' })).filter(t => t.nama)
    : [];

  const result = await apiPost('/mahasiswa', { nama, nim, jurusan, aktif, jadwal, tugas });

  if (result.success) {
    showMsg('✓ DATA MAHASISWA BERHASIL DITAMBAHKAN', '#00ff88');
    resetForm();
    setTimeout(() => switchTab('mahasiswa'), 1200);
  } else {
    showMsg('✕ ' + (result.error || 'Gagal menambahkan'), '#ff1744');
  }
}

function resetForm() {
  ['f-nama', 'f-nim', 'f-jadwal', 'f-tugas'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-jurusan').value = '';
  document.getElementById('f-status').value = 'true';
}

function showMsg(text, color) {
  const el = document.getElementById('formMsg');
  el.textContent = text;
  el.style.display = 'block';
  el.style.borderColor = color;
  el.style.color = color;
  setTimeout(() => el.style.display = 'none', 3000);
}

/* ===== MODAL ===== */
function openModal(idx) {
  const m = mahasiswaData[idx];
  if (!m) return;

  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
      <div style="width:56px;height:56px;background:var(--red-dim);border:1px solid var(--red);display:flex;align-items:center;justify-content:center;font-family:'Orbitron',monospace;font-size:1rem;font-weight:700;color:var(--red-bright);clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);">${getInitial(m.nama)}</div>
      <div>
        <div style="font-family:'Orbitron',monospace;font-size:1rem;font-weight:700;color:#fff;">${m.nama}</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;color:var(--red-bright);">NIM: ${m.nim}</div>
        <div style="font-size:0.8rem;color:var(--text-dim);">${m.jurusan}</div>
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
            <span class="badge badge-${t.status === 'done' ? 'done' : 'pending'}">${t.status === 'done' ? 'SELESAI' : 'PENDING'}</span>
          </div>`).join('')
        : '<div style="color:var(--text-dim);font-size:0.8rem;padding:8px 0;">Belum ada tugas.</div>'
      }
    </div>
  `;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('modalOverlay').classList.remove('active');
}

/* ===== STAT COUNTER ===== */
function initStatCounter() {
  const statObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const target = parseInt(e.target.dataset.target);
        const suffix = e.target.closest('.stat-card').querySelector('.stat-label').textContent.includes('%') ? '%' : '+';
        const duration = 1800;
        const start = performance.now();
        const update = now => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          e.target.textContent = Math.floor(eased * target).toLocaleString() + (p === 1 ? suffix : '');
          if (p < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        statObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-target]').forEach(el => statObs.observe(el));
}

/* ===== SCROLL REVEAL ===== */
function initScrollReveal() {
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => revObs.observe(el));
}

/* ===== CUSTOM CURSOR ===== */
function initCursor() {
  const cur = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.style.left = mx + 'px'; cur.style.top = my + 'px';
    spawnTrail(mx, my);
  });

  function lerpRing() {
    rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(lerpRing);
  }
  lerpRing();

  document.querySelectorAll('a, button, .mhs-card, .feature-card, .stat-card, .tab-btn').forEach(el => {
    el.addEventListener('mouseenter', () => { cur.classList.add('hover'); ring.classList.add('hover'); });
    el.addEventListener('mouseleave', () => { cur.classList.remove('hover'); ring.classList.remove('hover'); });
  });
}

/* ===== CURSOR TRAIL ===== */
function spawnTrail(x, y) {
  const d = document.createElement('div');
  d.className = 'cursor-trail';
  d.style.left = x + 'px'; d.style.top = y + 'px';
  d.style.transform = 'translate(-50%, -50%)';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 600);
}

/* ===== RIPPLE ON CLICK ===== */
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

/* ===== BOOT SEQUENCE OVERLAY ===== */
function initBootSequence() {
  const overlay = document.getElementById('bootOverlay');
  if (!overlay) return;

  const lines = [
    '> INITIALIZING ZIEEBOT v2.0...',
    '> LOADING DISCORD.JS MODULES...',
    '> CONNECTING TO GATEWAY...',
    '> SYNCING SLASH COMMANDS...',
    '> AKADEMIK DASHBOARD READY...',
    '> ALL SYSTEMS OPERATIONAL ✓'
  ];
  const logEl = document.getElementById('bootLog');
  let i = 0;

  function addLine() {
    if (i < lines.length) {
      const div = document.createElement('div');
      div.textContent = lines[i];
      div.style.opacity = '0';
      div.style.transition = 'opacity 0.3s';
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

/* ===== INIT ALL ===== */
document.addEventListener('DOMContentLoaded', () => {
  initBootSequence();
  initMatrixRain();
  initParticles();
  initTypewriter();
  initHeroEntrance();
  initAvatarAnimation();
  initCursor();
  initRipple();
  initStatCounter();
  initScrollReveal();

  // Load data dari API
  loadMahasiswa();
  loadStats();
});
