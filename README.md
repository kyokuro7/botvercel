# 🚀 Deploy Bot - Telegram Bot untuk Deploy Website

Bot Telegram yang powerful untuk deploy website ke platform hosting populer seperti **Vercel** dan **Netlify** dengan mudah dan cepat!

## ✨ Fitur Utama

- 🔺 **Deploy ke Vercel** - Platform hosting yang cepat dan andal
- 🟩 **Deploy ke Netlify** - Platform hosting dengan CDN global
- 📄 **Support HTML** - Deploy file HTML tunggal
- 📦 **Support ZIP** - Deploy multi-file (HTML + CSS + JS + images)
- ⚙️ **Manage Project** - Update, rename, dan kelola project
- 🌐 **Custom Domain** - Tambah dan kelola custom domain
- 🎨 **UI Modern** - Interface yang clean dan profesional
- 🔒 **Owner Only** - Bot hanya bisa digunakan oleh owner

## 📋 Requirements

- Node.js >= 18.0.0
- Token Bot Telegram
- Token Vercel API
- Token Netlify API

## 🚀 Instalasi

1. Clone repository ini:
```bash
git clone https://github.com/kyokuro7/excell-botz.git
cd excell-botz
```

2. Install dependencies:
```bash
npm install
```

3. Copy file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

4. Isi file `.env` dengan token kamu:
```env
BOT_TOKEN=your_telegram_bot_token
OWNER_ID=your_telegram_user_id
VERCEL_TOKEN=your_vercel_token
NETLIFY_TOKEN=your_netlify_token
```

5. Jalankan bot:
```bash
npm start
```

Untuk development dengan auto-reload:
```bash
npm run dev
```

## 🎯 Cara Mendapatkan Token

### Telegram Bot Token
1. Buka [@BotFather](https://t.me/BotFather) di Telegram
2. Ketik `/newbot` dan ikuti instruksi
3. Copy token yang diberikan

### Telegram User ID
1. Buka [@userinfobot](https://t.me/userinfobot)
2. Bot akan memberikan User ID kamu

### Vercel Token
1. Login ke [Vercel](https://vercel.com)
2. Buka Settings → Tokens
3. Create new token

### Netlify Token
1. Login ke [Netlify](https://netlify.com)
2. Buka User Settings → Applications
3. Create new access token

## 📖 Cara Penggunaan

### Deploy Website
1. Kirim `/deploy` atau klik tombol "🚀 Deploy Website"
2. Pilih platform (Vercel/Netlify)
3. Masukkan nama project
4. Kirim file `.html` atau `.zip`
5. Tunggu deploy selesai dan dapatkan URL!

### Kelola Project
1. Kirim `/manage` atau klik tombol "⚙️ Kelola Project"
2. Pilih platform
3. Pilih project yang ingin dikelola
4. Pilih aksi: Update File, Ganti Nama, Custom Domain, atau Lihat URL

### Custom Domain
1. Masuk ke menu Kelola Project
2. Pilih "🌐 Custom Domain"
3. Klik "➕ Tambah Domain"
4. Masukkan domain/subdomain kamu (contoh: `blog.namadomain.com`)
5. Setting DNS di panel domain kamu sesuai instruksi bot

### Hapus Project
1. Kirim `/delete` atau klik tombol "🗑️ Hapus Project"
2. Pilih platform
3. Pilih project yang ingin dihapus
4. Konfirmasi penghapusan

## 🎨 Tampilan Menu

Bot ini memiliki tampilan menu yang modern dan profesional dengan:
- ✅ Button interaktif yang mudah digunakan
- 🎯 Navigasi yang jelas dan intuitif
- 📱 Responsive untuk semua device
- 🌈 Visual yang menarik dengan emoji
- ⚡ Loading indicator yang informatif

## 🔧 Struktur Project

```
excell-botz/
├── src/
│   ├── commands/
│   │   ├── cancel.js      # Handler untuk /batal
│   │   ├── delete.js      # Handler untuk /delete
│   │   ├── deploy.js      # Handler untuk /deploy
│   │   └── manage.js      # Handler untuk /manage
│   ├── deploy/
│   │   ├── netlify.js     # Netlify API functions
│   │   └── vercel.js      # Vercel API functions
│   └── index.js           # Bot main file
├── index.js               # Entry point
├── package.json
├── .env.example
└── README.md
```

## 🐛 Troubleshooting

### Error 404 pada Custom Domain Netlify
Masalah ini sudah diperbaiki! Bot sekarang menggunakan endpoint API yang benar:
- `/sites/{siteId}/domains` untuk add domain
- `/sites/{siteId}/domains/{domain}` untuk remove domain

### Bot tidak merespon
- Pastikan BOT_TOKEN sudah benar
- Pastikan bot sudah running dengan `npm start`
- Check console untuk error message

### Deploy gagal
- Pastikan VERCEL_TOKEN/NETLIFY_TOKEN sudah benar
- Pastikan file yang dikirim format HTML atau ZIP
- Untuk ZIP, pastikan ada file `index.html` di dalamnya

## 📝 Changelog

### v1.0.0
- ✅ Tampilan menu baru yang modern dan profesional
- ✅ Fix error 404 pada custom domain Netlify
- ✅ Button interaktif untuk navigasi
- ✅ Improved UI/UX
- ✅ Better error handling
- ✅ Loading indicators

## 📄 License

MIT License

## 👨‍💻 Author

**Kyokuro7**

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

Made with ❤️ using [Telegraf.js](https://telegraf.js.org/)
