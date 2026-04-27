# TODO - Dashboard Login Fix & Owner Account

## Background
- Error login dashboard: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
- Penyebab: backend tidak punya route `/auth/*`
- Owner belum punya akun bawaan (hardcoded)

## Plan & Progress
- [x] 1. Buat `routes/auth.js` (endpoint login/register/me/logout + owner hardcoded)
- [x] 2. Mount `/auth` router di `index.js`
- [x] 3. Update `script.js` agar role `owner` punya akses penuh

## Summary Perubahan
1. **`routes/auth.js`** — File baru. Menyediakan `/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout`. User disimpan di `data/users.json`. Akun owner hardcoded (default: `owner` / `zieebot123`, bisa diubah lewat env `OWNER_USERNAME` & `OWNER_PASSWORD`).
2. **`index.js`** — Menambahkan `app.use('/auth', require('./routes/auth').router);` agar endpoint auth tersedia.
3. **`script.js`** — `canEdit()` dan `canDelete()` sekarang mengizinkan role `owner` (full akses).

