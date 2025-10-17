# 🤖 MEE6 Premium Discord Bot

Bot Discord lengkap dengan fitur premium MEE6 yang tersedia GRATIS! Dibangun dengan `discord.js` dan menggunakan `.env` untuk menyimpan token dengan aman.

## 🚀 Fitur Utama

### 📊 Leveling System
- XP otomatis dari pesan
- Rank card dengan canvas
- Level roles otomatis
- Leaderboard server
- Cooldown XP untuk mencegah spam

### 💰 Economy System
- Balance wallet & bank
- Daily rewards
- Work commands dengan random rewards
- Transaction history
- Coin system lengkap

### 🛡️ Moderation System
- Auto-moderation (anti-spam, anti-link, anti-invite, bad words)
- Custom bad words management
- Warnings system
- Kick, ban, mute, unmute
- Clear messages
- Admin check tools

### 🎫 Ticket System
- Buat ticket dengan reason
- Auto-create channel dengan permissions
- Close ticket dengan button
- Ticket counter & logging

### 🎭 Reaction Roles
- Setup reaction roles dengan command
- Auto-assign/remove roles saat react

### ⚙️ Utility Features
- Custom prefix per server
- Welcome & goodbye messages dengan gambar
- User info, server info, role info
- Avatar display
- Polls dengan reactions
- 8Ball fun command
- Custom commands system

### 🔧 Admin Tools
- Set level manual
- Server management
- Role management
- Permission checking

## 📋 Daftar Commands

### 📊 Leveling
- `!rank [@user]` - Lihat rank & level user
- `!leaderboard` - Top 10 leaderboard server
- `!setlevel @user <level>` - Set level user (Admin only)

### 💰 Economy
- `!balance [@user]` - Cek balance
- `!daily` - Klaim daily reward
- `!work` - Kerja untuk dapat coins

### 🛡️ Moderation
- `!warn @user [reason]` - Warn user
- `!warnings [@user]` - Lihat warnings
- `!kick @user [reason]` - Kick user
- `!mute @user <duration> [reason]` - Mute user (10m, 1h, 1d)
- `!unmute @user` - Unmute user
- `!clear <amount>` - Hapus pesan (1-100)

### 🎫 Tickets
- `!ticket [reason]` - Buat ticket baru
- `!close` - Tutup ticket (dalam channel ticket)

### ⚙️ Utility
- `!help` - Daftar semua commands
- `!ping` - Cek latency bot
- `!setprefix <prefix>` - Ubah prefix server (Admin)
- `!serverinfo` - Info server
- `!userinfo [@user]` - Info user
- `!roleinfo <role>` - Info role
- `!avatar [@user]` - Tampilkan avatar
- `!admincheck [@user]` - Cek status admin/moderator
- `!8ball <question>` - Magic 8Ball
- `!poll <question>` - Buat poll
- `!say <text>` - Bot ulangi pesan (Manage Messages)

### 🎭 Admin Only
- `!reactionrole <messageID> <emoji> @role` - Setup reaction role
- `!badwords` - List bad words
- `!badwords add <word>` - Add bad word
- `!badwords remove <word>` - Remove bad word
- `!badwords clear` - Clear all bad words

## ⚙️ Setup & Instalasi

### Persyaratan
- Node.js v16+
- NPM atau Yarn
- Bot token dari Discord Developer Portal

### Langkah Setup
1. Clone atau download repository ini
2. Install dependensi:
   ```bash
   npm install
   ```
3. Buat file `.env`:
   ```env
   BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
   ```
4. Jalankan bot:
   ```bash
   node discord.js
   ```

### Dependencies
```json
{
  "discord.js": "^14.x",
  "dotenv": "^16.x",
  "canvas": "^2.x"
}
```

### File Structure
```
bot-discord-server/
├── discord.js          # Main bot file
├── bad_words.js        # Bad words configuration (edit this file manually)
├── database.json       # Bot data storage
├── backups/            # Auto backups
├── .env               # Bot token (create this file)
├── .gitignore         # Git ignore rules
├── LICENSE            # License file
└── README.md          # This file
```

## 🔧 Konfigurasi

Bot menggunakan sistem database JSON untuk menyimpan data:
- `database.json` - Data utama (levels, economy, warnings, dll)
- `backups/` - Auto backup setiap 24 jam

### Default Config
- **Prefix**: `!`
- **XP per message**: 15-25
- **XP Cooldown**: 60 detik
- **Daily Reward**: 100 coins
- **Auto Role**: "Member"
- **Welcome Channel**: "welcome"
- **Leave Channel**: "goodbye"
- **Log Channel**: "mod-logs"

## 📊 Auto-Moderation

Bot dilengkapi auto-mod yang dapat dikonfigurasi:
- **Anti-Spam**: Deteksi spam berdasarkan jumlah pesan per waktu
- **Anti-Link**: Blokir link eksternal (dengan whitelist)
- **Anti-Invite**: Blokir Discord invites
- **Bad Words**: Filter kata-kata terlarang (dapat dikustomisasi dengan command)
- **Mass Mention**: Batasi jumlah mention per pesan

### Custom Bad Words Management
Bot menggunakan file `bad_words.js` untuk daftar kata terlarang default. Anda dapat mengedit file tersebut secara manual untuk menambah/hapus kata.

**Untuk mengedit bad words:**
1. Buka file `bad_words.js`
2. Tambah atau hapus kata dari array `badWords`
3. Restart bot untuk menerapkan perubahan

**Contoh bad_words.js:**
```javascript
const badWords = [
    'toxic',
    'hate',
    'spam',
    'kata-lain'
];

module.exports = badWords;
```

**Command untuk management (opsional):**
- `!badwords` - Lihat daftar bad words saat ini
- `!badwords add <kata>` - Tambah kata ke daftar (sementara, hilang saat restart)
- `!badwords remove <kata>` - Hapus kata dari daftar
- `!badwords clear` - Hapus semua bad words

## 🎨 Custom Features

- **Level Roles**: Auto-assign roles saat naik level
- **Custom Commands**: Buat command custom per server
- **Reaction Roles**: Assign roles dengan reaction
- **Welcome System**: Pesan welcome dengan gambar & auto-role
- **Economy System**: Sistem coin lengkap
- **Ticket System**: Support system dengan channels

## 📈 Statistics

Bot otomatis track:
- Total messages per user
- Level & XP progress
- Economy transactions
- Warning history
- Ticket statistics

## 🔒 Keamanan

- Token disimpan di `.env` (tidak di-commit)
- Permission checks untuk semua admin commands
- Auto-moderation untuk keamanan server
- Database backup otomatis

## 📝 Customizing Bad Words

File `bad_words.js` berisi daftar kata-kata terlarang yang akan difilter. Edit file ini untuk menyesuaikan dengan kebutuhan server Anda:

```javascript
const badWords = [
    // Tambah kata-kata terlarang di sini
    'toxic',
    'hate',
    'spam',
    'kata-indonesia',
    'kata-lainnya'
];

module.exports = badWords;
```

**Catatan:** Setelah mengedit `bad_words.js`, restart bot untuk menerapkan perubahan.

## 📝 License

This project is released into the public domain under the [Unlicense](LICENSE).

## 🤝 Contributing

Feel free to fork and contribute! Semua fitur MEE6 Premium tersedia GRATIS di bot ini.

---

**Catatan**: Bot ini adalah alternatif gratis untuk MEE6 dengan fitur premium yang sama. Pastikan bot memiliki permissions yang cukup di server Discord kamu.
