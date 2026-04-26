# 🚀 Panduan Deploy Jebb Bot

## 💓 Fitur Monitoring: Heartbeat
Bot akan mengirim pesan status ke owner Discord setiap **1 jam** untuk konfirmasi bot masih hidup. Kalau tidak ada pesan = bot mungkin mati.

---

## 🌐 Pilihan Hosting Gratis

**⚠️ Update Terbaru:** Render.com sekarang **butuh Kartu Kredit** untuk verifikasi!

Berikut hosting yang benar-benar **GRATIS**:

| Hosting | Gratis? | CC? | Sleep? | Rekomendasi |
|---------|---------|-----|--------|-------------|
| **Glitch** | ✅ | ❌ **Tidak perlu!** | 😴 Sleep 5 menit | 🥇 **Paling Mudah & Gratis** |
| **Replit** | ✅ | ❌ **Tidak perlu!** | 😴 Sleep 1 jam | 🥈 **Browser-based** |
| **Deta Space** | ✅ | ❌ **Tidak perlu!** | ❌ Tidak sleep | 🥉 **Micro/Serverless** |
| **Koyeb** | ✅ | ❌ **Tidak perlu!** | ❌ Tidak sleep (free tier) | 🆕 **Platform Baru** |
| **Render.com** | ✅ | ⚠️ **Butuh CC** | 😴 Sleep 15 menit | ⛔ Butuh Kartu Kredit |
| **Fly.io** | ✅ | ⚠️ **Butuh CC** | ❌ Tidak sleep | ⛔ Butuh Kartu Kredit |
| **WispByte** | ✅ | ❌ **Tidak perlu!** | ❌ Tidak sleep | ⭐ **Paling Mudah (Panel)** |
| **Termux** | ✅ 100% | ❌ **Tidak perlu!** | ❌ Tidak sleep | 📱 **HP Android** |

> **Catatan:** "Sleep" = bot mati kalau tidak ada aktivitas. Solusinya pakai **UptimeRobot** (gratis) untuk ping bot setiap 5 menit agar tetap hidup.

---

# ⭐ OPSI UTAMA: WispByte (Panel Hosting - Paling Mudah!)

**Keunggulan:**
- ✅ **Panel-based** (mudah dikelola via web)
- ✅ **Tidak sleep** (24/7 online)
- ✅ **Tidak perlu CC** (bisa pakai e-wallet/transfer)
- ✅ **SQLite persistent** (data tersimpan aman)
- ✅ **Auto restart** kalau bot crash
- ✅ Support **Node.js** langsung

---

## Step 1: Daftar & Beli Plan di WispByte

1. Buka https://wispbyte.com (atau panel hosting pterodactyl yang kamu punya)
2. Daftar akun
3. Pilih plan **Node.js Bot Hosting**
   - Plan Starter (~Rp 10k-20k/bulan) sudah cukup untuk bot Discord
4. Checkout & bayar (bisa pakai **QRIS, DANA, GoPay, OVO, dll**)

---

## Step 2: Buat Server Baru

1. Login ke Panel WispByte
2. Klik **"Create Server"** atau **"New Server"**
3. Pilih **Nest:** `Bot Hosting` → **Egg:** `Node.js`
4. Isi detail:
   - **Server Name:** `jebb-bot`
   - **Memory:** 512 MB - 1 GB (cukup untuk bot Discord)
   - **Disk:** 1 GB - 2 GB
   - **CPU:** 50% - 100%
5. Klik **"Create Server"**

---

## Step 3: Upload File Bot

Ada **2 cara** upload file:

### Cara A: Upload via Panel (SFTP/Web File Manager)
1. Di panel server, klik **"Files"**
2. Hapus semua file default (kecuali folder)
3. Upload semua file project kamu (zip dulu lalu extract, atau upload satu per satu)
4. Struktur folder harus seperti ini:
   ```
   /
   ├── commands/
   ├── events/
   ├── utils/
   ├── data/
   ├── index.js
   ├── deploy-commands.js
   ├── package.json
   ├── .env
   └── ...
   ```

### Cara B: Upload via Git (Git Clone)
1. Di panel, buka **"Startup"** tab
2. Cari field **"Git Repository"**
3. Isi dengan URL repo GitHub kamu:
   ```
   https://github.com/username/jebb-bot.git
   ```
4. Klik **"Install"** atau **"Pull"**

---

## Step 4: Setup Environment Variables (`.env`)

**⚠️ Catatan:** Banyak panel WispByte/Pterodactyl **tidak menampilkan** Environment Variables di UI. Jangan khawatir, cara paling mudah adalah pakai **file `.env`**.

### ✅ Cara Buat File `.env` (Pasti Berhasil!)

1. Di panel, klik tab **"Files"** (File Manager)
2. Klik **"New File"** (biasanya tombol di kanan atas)
3. Nama file: `.env`
4. Isi file dengan:
   ```env
   DISCORD_TOKEN=token_bot_kamu
   CLIENT_ID=application_id_bot
   OWNER_ID=id_discord_kamu
   ```
5. Klik **"Save"**

> **Penting:** Ganti `token_bot_kamu`, `application_id_bot`, dan `id_discord_kamu` dengan data asli kamu!

### 🔍 Cara Dapatkan Data:
- **DISCORD_TOKEN:** Buka https://discord.com/developers/applications → Bot → Copy Token
- **CLIENT_ID:** Buka https://discord.com/developers/applications → Application ID
- **OWNER_ID:** Discord → Right click profil kamu → Copy User ID (harus aktifkan Developer Mode dulu)

---

### ⚠️ Penting: Install `dotenv` via NODE_PACKAGES
Beberapa panel WispByte membutuhkan package tambahan di environment variable.

1. Di tab **"Startup"**, cari field **NODE_PACKAGES**
2. Isi dengan:
   ```
   dotenv
   ```
   *(Kalau mau tambah package lain, pisah dengan spasi: `dotenv axios canvas`)*
3. Klik **"Save"**

> **Kenapa?** Panel WispByte punya startup command: `npm install ${NODE_PACKAGES}`. Kalau `dotenv` tidak di-set di sini, bot error "Cannot find module 'dotenv'".

### Alternatif: Kalau Panel Ada Environment Variables
Kalau di tab **"Startup"** atau **"Settings"** kamu menemukan **"Environment Variables"**, bisa pakai itu juga. Tapi kalau tidak ada, **file `.env` sudah cukup** dan pasti berhasil! ✅

---

## Step 5: Install Dependencies

1. Di panel, klik tab **"Console"**
2. Ketik command:
   ```bash
   npm install
   ```
3. Tunggu sampai selesai (akan muncul `node_modules/`)

---

## Step 6: Deploy Slash Commands

Di console, jalankan:
```bash
node deploy-commands.js
```

Kalau sukses akan muncul:
```
✅ Berhasil register global slash commands!
```

---

## Step 7: Start Bot

1. Di panel, klik tombol **"Start"** (warna hijau)
2. Atau di console ketik:
   ```bash
   npm start
   ```
3. Kalau bot berjalan normal, console akan menunjukkan:
   ```
   ✅ Database SQLite siap!
   🤖 Bot Jebb sedang login...
   🌐 Health check server berjalan di port 8080
   ✅ Jebb Bot#1234 sudah online dan siap!
   📊 Aktif di X server dengan X users.
   🚀 Pesan online terkirim ke owner.
   ```

---

## Step 8: Auto-Restart (Wajib!)

1. Di panel, klik tab **"Settings"**
2. Cari **"Auto Restart"** → Enable ✅
3. Kalau bot crash atau mati, akan otomatis nyala lagi!

---

## 📝 Catatan Penting WispByte

| Fitur | Detail |
|-------|--------|
| **Harga** | ~Rp 10k-50k/bulan (tergantung plan) |
| **Kartu Kredit?** | ❌ **Tidak perlu!** (bisa QRIS/e-wallet) |
| **Sleep?** | ❌ **Tidak sleep!** (24/7) |
| **Auto Restart?** | ✅ Ya |
| **SQLite** | ✅ Persistent (disk tersimpan) |
| **Console Access** | ✅ Ya (via web panel) |
| **FTP/SFTP** | ✅ Ya |
| **Git Support** | ✅ Ya |

---

## 🆘 Troubleshooting WispByte

**Bot tidak mau start?**
- Cek console logs untuk error
- Pastikan `npm install` sudah dijalankan
- Cek environment variables sudah benar

**Slash commands tidak muncul?**
- Jalankan `node deploy-commands.js` di console
- Tunggu 1-60 menit (global commands)

**Database SQLite error?**
- Pastikan folder `data/` ada dan writable
- Cek disk space tidak penuh

**Bot crash terus?**
- Enable Auto Restart di settings
- Cek error logs di console
- Pastikan RAM cukup (naikkan plan kalau perlu)

---

# 🥇 OPSI 1: Glitch.com (Paling Mudah & Benar-Benar Gratis!)

**Keunggulan:**
- ✅ **Benar-benar gratis, TIDAK PERLU CC!**
- ✅ Edit langsung di browser
- ✅ Auto-deploy (save = deploy)
- ⚠️ Sleep setelah 5 menit tidak ada request → **Pakai UptimeRobot**
- ⚠️ Project public (kode bisa dilihat orang) → Jangan simpan token di kode!

## Step 1: Import ke Glitch
1. Buka https://glitch.com
2. Sign up gratis (pakai GitHub/Email, **tidak perlu CC!**)
3. Klik **"New Project"** → **"Import from GitHub"**
4. Paste URL repo GitHub kamu
   - Contoh: `https://github.com/username/jebb-bot`
5. Tunggu import selesai

## Step 2: Environment Variables (.env)
1. Klik file `.env` di sidebar (atau buat baru)
2. Isi:
```env
DISCORD_TOKEN=token_bot_kamu
CLIENT_ID=application_id_bot
OWNER_ID=id_discord_kamu
```
> **Penting:** File `.env` di Glitch **private** (tidak bisa dilihat orang lain) ✅

## Step 3: Update package.json
Di Glitch, edit `package.json` tambah:
```json
"scripts": {
  "start": "node index.js"
}
```

## Step 4: Run
Glitch otomatis run saat kamu save file. Lihat logs di panel bawah.

## Step 5: Anti-Sleep dengan UptimeRobot
Glitch free tier sleep setelah **5 menit**!

1. Copy URL Glitch (contoh: `https://jebb-bot.glitch.me`)
2. Buka https://uptimerobot.com → Daftar gratis
3. **Add New Monitor**:
   - Type: HTTP(s)
   - URL: URL Glitch kamu
   - Interval: 5 menit
4. **Create Monitor**

✅ Bot tetap online 24/7!

---

### 📝 Catatan Penting Glitch

| Fitur | Detail |
|-------|--------|
| **Gratis?** | ✅ Ya |
| **Kartu Kredit?** | ❌ **Tidak perlu!** |
| **Sleep?** | 😴 Ya, 5 menit idle |
| **Solusi Sleep** | UptimeRobot |
| **SQLite** | ✅ Bisa (tapi reset saat sleep) |
| **RAM/Disk** | Cukup untuk bot Discord |
| **Public Code?** | ⚠️ Ya (kecuali .env) |

---

# 🥈 OPSI 2: Deta Space (Gratis, Tidak Sleep!)

**Keunggulan:**
- ✅ **Benar-benar gratis, TIDAK PERLU CC!**
- ✅ **Tidak sleep!** (selalu online)
- ✅ Serverless (tidak perlu maintain server)
- ⚠️ Batasan: 500 MB RAM, cocok untuk bot kecil

## Step 1: Install Deta CLI
```bash
# Windows (PowerShell)
iwr https://get.deta.dev/space-cli.ps1 -useb | iex

# Mac/Linux
curl -fsSL https://get.deta.dev/space-cli.sh | sh
```

## Step 2: Login & Init
```bash
space login
space new
```

## Step 3: Buat `Spacefile`
Buat file `Spacefile` di root project:
```yaml
v: 0
micros:
  - name: jebb-bot
    src: ./
    engine: nodejs16
    primary: true
    run: node index.js
    dev: node index.js
    presets:
      env:
        - name: DISCORD_TOKEN
          description: Token bot Discord
        - name: CLIENT_ID
          description: Application ID bot
        - name: OWNER_ID
          description: ID Discord owner
```

## Step 4: Deploy
```bash
space push
```

## Step 5: Set Environment Variables
```bash
space env set DISCORD_TOKEN="token_kamu"
space env set CLIENT_ID="app_id_kamu"
space env set OWNER_ID="owner_id_kamu"
```

✅ **Selesai!** Bot akan online terus tanpa sleep!

---

### 📝 Catatan Penting Deta Space

| Fitur | Detail |
|-------|--------|
| **Gratis?** | ✅ Ya |
| **Kartu Kredit?** | ❌ **Tidak perlu!** |
| **Sleep?** | ❌ **Tidak sleep!** |
| **SQLite** | ⚠️ Tidak persistent (gunakan Deta Base) |
| **RAM** | 500 MB |
| **Cocok untuk?** | Bot kecil-menengah |

---

# 🥉 OPSI 3: Replit (Browser-based)

**Keunggulan:**
- ✅ Browser-based (tidak perlu install apa-apa)
- ✅ Benar-benar gratis, **tidak perlu CC**
- ⚠️ Sleep setelah 1 jam → **Pakai UptimeRobot**

## Step 1: Import ke Replit
1. Buka https://replit.com
2. Klik **"Create"** → **"Import from GitHub"**
3. Paste URL repo GitHub kamu
4. Pilih template **"Node.js"**

## Step 2: Environment Variables
1. Di sidebar kiri, klik **"Secrets"** (icon gembok)
2. Tambah secrets:
```
DISCORD_TOKEN = token_bot_kamu
CLIENT_ID = application_id_bot
OWNER_ID = id_discord_kamu
```

## Step 3: Run
Klik tombol **"Run"** di atas.

## Step 4: Anti-Sleep (UptimeRobot)
1. Copy URL Replit (contoh: `https://jebb-bot.username.repl.co`)
2. Buka https://uptimerobot.com
3. Add monitor HTTP(s) ke URL Replit
4. Interval: 5 menit

---

# 🆕 OPSI 4: Koyeb (Platform Baru, Tidak Sleep!)

**Keunggulan:**
- ✅ **Benar-benar gratis, TIDAK PERLU CC!**
- ✅ **Tidak sleep** di free tier
- ✅ Deploy dari GitHub
- ⚠️ Relatif baru, dokumentasi terbatas

## Step 1: Push ke GitHub
```bash
git init
git add .
git commit -m "Ready deploy"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

## Step 2: Daftar Koyeb
1. Buka https://www.koyeb.com
2. Sign up pakai GitHub (gratis, **tidak perlu CC!**)
3. Klik **"Create App"** → **"GitHub"**
4. Pilih repo kamu

## Step 3: Konfigurasi
- **Builder:** Node.js
- **Start Command:** `node index.js`
- Tambah Environment Variables:
  ```
  DISCORD_TOKEN = token_bot_kamu
  CLIENT_ID = application_id_bot
  OWNER_ID = id_discord_kamu
  ```

## Step 4: Deploy
Klik **"Deploy"**

✅ **Selesai!** Bot online tanpa sleep!

---

### 📝 Catatan Penting Koyeb

| Fitur | Detail |
|-------|--------|
| **Gratis?** | ✅ Ya |
| **Kartu Kredit?** | ❌ **Tidak perlu!** |
| **Sleep?** | ❌ **Tidak sleep!** |
| **SQLite** | ⚠️ Tidak persistent (ephemeral) |
| **RAM** | 512 MB |

---

# ⛔ OPSI 5: Render.com (Butuh Kartu Kredit!)

**⚠️ WARNING:** Render.com sekarang **butuh Kartu Kredit** untuk verifikasi!

Kalau kamu punya CC, Render tetap pilihan bagus:
- ✅ SQLite persistent (pakai Disk)
- ✅ RAM 512 MB
- ⚠️ Sleep 15 menit → Pakai UptimeRobot

Lihat file `render.yaml` untuk konfigurasi Blueprints.

---

# ⛔ OPSI 6: Fly.io (Butuh Kartu Kredit!)

Fly.io free tier butuh CC untuk verifikasi (tidak dicas, hanya verifikasi).

Lihat file `fly.toml` yang sudah tersedia.

Panduan Fly.io:
```bash
# Install
