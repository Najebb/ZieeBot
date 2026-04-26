# 🚀 Panduan Deploy Bot Jebb ke Wispbyte

## ❌❌❌ MASALAH UTAMA: RATE LIMITED (429) ❌❌❌

Dari log terbaru:

```
✅ Discord API reachable! Status: 429
```

**Status 429 = Too Many Requests (Rate Limited)**

IP server Wispbyte kamu sudah di-rate-limit oleh Discord karena terlalu banyak percobaan login yang gagal (timeout berulang kali). **Ini BUKAN masalah token salah** — ini masalah IP/server.

---

## 🔧 SOLUSI (Pilih Salah Satu)

### Solusi 1: RESET TOKEN BOT (Cepat, Coba Dulu!)
Ini paling mudah dan sering berhasil:

1. Buka https://discord.com/developers/applications
2. Pilih bot kamu → tab **Bot**
3. Klik **"Reset Token"** (tombol biru di bawah TOKEN)
4. Copy token baru
5. Paste ke environment variable Wispbyte:
   ```
   DISCORD_TOKEN=token_baru_kamu
   ```
6. **Restart server Wispbyte**
7. Cek log — kalau berhasil akan muncul:
   ```
   ✅ Discord API reachable! Status: 200
   ✅ Login ke Discord berhasil!
   ✅ BotJebb#1234 sudah online dan siap!
   ```

### Solusi 2: TUNGGU (Pasif)
Rate limit Discord biasanya berlaku selama **1-6 jam** per IP. Kalau tidak urgent, matikan server Wispbyte dan tunggu beberapa jam, lalu coba lagi.

### Soliusi 3: PINDAH HOSTING (Pasti Berhasil)
Kalau Wispbyte selalu rate limit, pindah ke hosting lain dengan IP berbeda:

| Hosting | Gratis? | Cara Deploy | WebSocket? |
|---------|---------|-------------|------------|
| **Railway.app** | ✅ 500 jam/bulan | GitHub / CLI | ✅ Support |
| **Render.com** | ✅ (sleep 15min) | GitHub | ✅ Support |
| **Replit.com** | ⚠️ Paid untuk 24/7 | Upload langsung | ✅ Support |
| **VPS (Contabo)** | ❌ $4-5/bulan | SSH / FTP | ✅ Support |

**Railway.app paling recommended untuk bot Discord gratis.**

---

## 📋 Cara Pindah ke Railway.app (Gratis)

### Step 1: Buat Akun
1. Buka https://railway.app
2. Login dengan GitHub

### Step 2: Push Code ke GitHub
1. Buat repository GitHub baru
2. Upload semua file bot (kecuali `node_modules/` dan `.env`)
3. Commit & push

### Step 3: Deploy di Railway
1. Dashboard Railway → **New Project**
2. Pilih **Deploy from GitHub repo**
3. Pilih repository bot kamu
4. Tunggu build selesai

### Step 4: Set Environment Variables
1. Di Railway dashboard → tab **Variables**
2. Tambah:
   ```
   DISCORD_TOKEN = token_bot_kamu
   CLIENT_ID = application_id_bot_kamu
   ```
3. Railway akan auto-restart bot

### Step 5: Cek Log
Di tab **Deployments** → **View Logs**

Harusnya muncul:
```
🔍 Environment check:
  - DISCORD_TOKEN: ✅ ada (...)
📥 Commands loaded: 22 commands
🤖 Bot Jebb mencoba login... (attempt 1/5)
✅ Login ke Discord berhasil!
✅ BotJebb#1234 sudah online dan siap!
```

---

## 🐛 Error Lain yang Mungkin Muncul

### ❌ "TOKEN_INVALID"
**Solusi:** Reset token di Discord Developer Portal → paste token baru ke environment variables

### ❌ "disallowed intent"
**Solusi:** Discord Developer Portal → Bot → centang semua:
- ✅ PRESENCE INTENT
- ✅ SERVER MEMBERS INTENT
- ✅ MESSAGE CONTENT INTENT

### ⚠️ "better-sqlite3 tidak tersedia"
**Normal!** Bot otomatis pakai JSON database. Fitur XP tetap jalan.

---

## 💬 Butuh Bantuan?

1. **Coba RESET TOKEN dulu** (Solusi 1 di atas)
2. Kalau masih 429, **tunggu 1-6 jam** atau **pindah ke Railway.app**
3. Copy-paste log terbaru kalau masih error
