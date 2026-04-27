# TODO.md — Progress Update v1.4 Jebb Bot

## Status: 🚧 IN PROGRESS

### Step 1: Database & API Foundation ✅ DONE
- [x] Update `utils/database.js` — tambah tabel `users` untuk login/register
- [x] Update `utils/database-simple.js` — tambah users di JSON fallback
- [x] Update `routes/api.js` — tambah endpoint: auth (login/register), CRUD mahasiswa/jadwal/tugas, dashboard stats

### Step 2: Discord Events & History ✅ DONE
- [x] Update `events/messageCreate.js` — tambah v1.4 ke updateHistory[]
- [x] Buat `events/guildMemberAdd.js` — welcome message otomatis
- [x] Update `events/ready.js` — integrasi banner profile

### Step 3: Dashboard Frontend (Login + CRUD)
- [ ] Update `index.html` — login modal/register, tombol edit/delete, dashboard overview card
- [ ] Update `script.js` — auth flow (JWT), handler edit/delete/tambah, dashboard stats
- [ ] Update `style.css` — style login modal, form edit, action buttons

### Step 4: Commands & Help
- [ ] Update `commands/utility/help.js` — tambah info fitur baru (dashboard, login, banner)

### Step 5: Banner Integration
- [ ] Integrasi `zieebot-banner-animated.html` ke dashboard (iframe atau embed)
- [ ] Serve banner via Express static atau endpoint khusus

### Step 6: Testing & Finalisasi
- [ ] Test login/register flow
- [ ] Test CRUD dashboard
- [ ] Test welcome message
- [ ] Test update history v1.4
- [ ] Jalankan `npm start` dan cek semua fitur

