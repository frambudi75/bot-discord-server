# 🤖 Discord Bot Starter (Fixed Version)

Bot Discord sederhana berbasis `discord.js` dan `.env` untuk menyimpan token dengan aman.

## 🚀 Fitur
- Baca token otomatis dari `.env`
- Cek validasi token sebelum login
- Command `!ping` → balas `🏓 Pong!`
- Logging login dan jumlah server

## ⚙️ Cara setup
1. Ekstrak ZIP ini ke folder mana pun
2. Install dependensi:
   ```bash
   npm install discord.js dotenv
   ```
3. Buat file `.env` (atau salin dari `.env.example`):
   ```env
   BOT_TOKEN=YOUR_REAL_TOKEN
   ```
4. Jalankan bot:
   ```bash
   node discord.js
   ```

Kalau berhasil, kamu akan melihat:
```
🎉 Bot berhasil login sebagai: NamaBot#1234
📊 Bergabung di 1 server
✅ Login sukses!
```
