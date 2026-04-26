# 🚂 Deploy ZieeBot ke Railway.app

## 1. Push ke GitHub

```bash
# Inisialisasi git (kalau belum)
git init

# Tambah semua file
git add .

# Commit
git commit -m "Initial commit: Bot Discord + Web Dashboard"

# Tambah remote (ganti USERNAME dan REPO)
git remote add origin https://github.com/USERNAME/REPO.git

# Push
git push -u origin main
```

## 2. Deploy ke Railway

### Opsi A: via Railway Dashboard (Mudah)

1. Buka https://railway.app → Login dengan GitHub
2. Klik **"New Project"** → **"Deploy from GitHub repo"**
3. Pilih repository `USERNAME/REPO`
4. Railway otomatis detect Node.js dan jalankan `npm start`

### Opsi B: via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

## 3. Set Environment Variables

Di Railway Dashboard → tab **Variables**, tambah:

```
DISCORD_TOKEN=MTAxMjM0NTY3ODkw...
CLIENT_ID=1234567890123456789
OWNER_ID=1234567890123456789
PORT=3000
```

## 4. Aktifkan Privileged Gateway Intents

Buka https://discord.com/developers/applications → Bot kamu:

- ✅ **PRESENCE INTENT**
- ✅ **SERVER MEMBERS INTENT**
- ✅ **MESSAGE CONTENT INTENT**

## 5. Register Slash Commands (Sekali saja)

```bash
# Jalankan di local atau Railway console
node deploy-commands.js
```

## 6. Cek Log

Di Railway Dashboard → tab **Deployments** → **View Logs**

Log yang HARUS muncul:
```
🔍 Environment check:
  - DISCORD_TOKEN: ✅ ada (...)
📥 Commands loaded: 22 commands
🤖 Bot Jebb mencoba login... (attempt 1/3)
✅ Login ke Discord berhasil!
✅ ZieeBot#1234 sudah online dan siap!
🌐 Web server berjalan di port 3000
```

## 7. Invite Bot ke Server

OAuth2 URL Generator di Discord Developer Portal:
- Scopes: `bot`, `applications.commands`
- Permissions: Administrator (atau sesuai kebutuhan)

## 📁 Struktur Project

```
.
├── commands/         # Slash commands
│   ├── fun/
│   ├── moderation/
│   └── utility/
├── events/           # Discord event handlers
├── routes/           # Express API routes
├── utils/            # Database & helpers
├── index.js          # Main (Bot + Web Server)
├── deploy-commands.js # Register slash commands
├── index.html        # Web Dashboard
├── script.js         # Frontend JS
├── style.css         # Frontend CSS
└── package.json
```

## 🐛 Troubleshooting

### "Login timeout — WebSocket tidak merespons"
- **Railway TIDAK memblokir Discord** — ini normal kalau token salah
- Reset token di Discord Developer Portal

### "Cannot find module 'better-sqlite3'"
- **Normal** — Railway akan pakai JSON database fallback
- Data tetap tersimpan di `/data/database.json`

### Commands tidak muncul di Discord
- Jalankan `node deploy-commands.js` sekali lagi
- Tunggu 1-5 menit (global command cache)

## 🌐 Web Dashboard URL

Setelah deploy, Railway kasih URL random:
```
https://zieebot-production.up.railway.app
```

Buka URL tersebut untuk akses dashboard akademik.

---

**Butuh bantuan?** Copy-paste log dari Railway dashboard. 🚀

