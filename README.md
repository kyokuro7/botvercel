# 🤖 Telegram Deploy Bot

Bot Telegram untuk deploy website HTML ke **Vercel** dan **Netlify** secara otomatis.

---

## ✨ Fitur

- Deploy website ke **Vercel** dengan satu perintah
- Deploy website ke **Netlify** dengan satu perintah
- Flow interaktif dengan inline keyboard
- Support file `.html` / `.htm`
- Hanya owner yang bisa menggunakan bot (keamanan)

---

## 🚀 Cara Setup

### 1. Clone & Install

```bash
git clone https://github.com/kyokuro7/botvercel.git
cd botvercel
npm install
```

### 2. Buat file `.env`

```bash
cp .env.example .env
```

Lalu isi nilainya:

```env
BOT_TOKEN=your_telegram_bot_token
VERCEL_TOKEN=your_vercel_token
NETLIFY_TOKEN=your_netlify_token
OWNER_ID=your_telegram_user_id
```

### 3. Cara dapat token

| Token | Cara Dapat |
|---|---|
| `BOT_TOKEN` | Chat [@BotFather](https://t.me/BotFather) → `/newbot` |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create |
| `NETLIFY_TOKEN` | [app.netlify.com/user/applications](https://app.netlify.com/user/applications/personal) → New access token |
| `OWNER_ID` | Chat [@userinfobot](https://t.me/userinfobot) → lihat ID kamu |

### 4. Jalankan Bot

```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

---

## 📋 Cara Pakai

1. Buka bot di Telegram
2. Ketik `/deploy`
3. Pilih platform: **Vercel** atau **Netlify**
4. Ketik nama project (contoh: `my-website`)
5. Kirim file `.html` kamu
6. Tunggu beberapa detik...
7. Bot akan kirim URL website kamu! 🎉

---

## 🗂️ Struktur Project

```
botvercel/
├── src/
│   ├── index.js              # Entry point bot
│   ├── commands/
│   │   └── deploy.js         # /deploy command & flow handler
│   └── deploy/
│       ├── vercel.js         # Vercel API handler
│       └── netlify.js        # Netlify API handler
├── .env                      # Token (jangan di-commit!)
├── .env.example              # Contoh .env
├── .gitignore
├── package.json
└── README.md
```

---

## ⚠️ Catatan Penting

- File `.env` **JANGAN** di-push ke GitHub
- Token Vercel & Netlify bersifat rahasia, jaga baik-baik
- Nama project otomatis diformat ke huruf kecil dengan tanda `-`
