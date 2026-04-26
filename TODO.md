# TODO.md - Progress Bot Discord Jebb Bot

## Status: ✅ Web Dashboard Integrated

### Step 1: Setup Project ✅ **DONE**
- npm init -y, install discord.js, dotenv, express, cors

### Step 2: Files Konfigurasi ✅ **DONE**
- package.json, .env, .gitignore

### Step 3: Commands & Events ✅ **DONE**
- moderation: ban, kick, clear
- fun: 8ball, avatar, quiz, tebakangka
- utility: ping, serverinfo, userinfo, botinfo, rank, leaderboard, help, schedule, afk, feedback, tiktok, instagram
- events: ready, interactionCreate, messageCreate

### Step 4: Main Files ✅ **DONE**
- index.js (Express + Discord Bot)
- deploy-commands.js

### Step 5: Web Dashboard Integration ✅ **DONE**
- `utils/database.js` — tabel akademik (mahasiswa, jadwal, tugas)
- `routes/api.js` — REST API endpoints
- `script.js` — fetch data dari API (ganti hardcoded)
- `index.js` — Express serve static + API

### Step 6: Test & Deploy ⏳ **READY**
- Jalankan `npm start`
- Buka `http://localhost:8080`

---

**Next: Test local dan deploy ke Vercel/Railway.**

