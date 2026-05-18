require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const deployCommand = require('./commands/deploy');
const deleteCommand = require('./commands/delete');
const manageCommand = require('./commands/manage');
const cancelCommand = require('./commands/cancel');

const bot = new Telegraf(process.env.BOT_TOKEN);
const OWNER_ID = parseInt(process.env.OWNER_ID, 10);

// Setup session
bot.use(session());

// Inisialisasi session default
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// Middleware: cek owner
bot.use((ctx, next) => {
  const userId = ctx.from?.id;

  if (!OWNER_ID) {
    console.warn('⚠️  OWNER_ID belum diset di .env! Bot terbuka untuk semua orang.');
    return next();
  }

  if (userId !== OWNER_ID) {
    return ctx.reply('🚫 Maaf, kamu tidak memiliki akses untuk menggunakan bot ini.');
  }

  return next();
});

// Command /start
bot.start((ctx) => {
  ctx.reply(
    `👋 Halo *${ctx.from.first_name}*\\!\n\n` +
    `Aku adalah bot deploy otomatis\\. Aku bisa membantu kamu deploy website ke:\n\n` +
    `• 🔺 *Vercel*\n` +
    `• 🟩 *Netlify*\n\n` +
    `*Perintah tersedia:*\n` +
    `/deploy \\- Deploy website baru\n` +
    `/manage \\- Kelola project \\(update, rename, lihat URL\\)\n` +
    `/delete \\- Hapus project\n` +
    `/batal \\- Batalkan proses yang sedang berjalan\n` +
    `/help \\- Bantuan lengkap`,
    { parse_mode: 'MarkdownV2' }
  );
});

// Command /help
bot.help((ctx) => {
  ctx.reply(
    `📋 *Daftar Perintah:*\n\n` +
    `🚀 /deploy \\- Deploy website baru ke Vercel atau Netlify\n` +
    `⚙️ /manage \\- Kelola project \\(update file, ganti nama, lihat URL\\)\n` +
    `🗑️ /delete \\- Hapus project dari Vercel atau Netlify\n` +
    `❌ /batal \\- Batalkan proses yang sedang berjalan\n` +
    `/help \\- Tampilkan bantuan ini\n\n` +
    `*Format file yang didukung:*\n` +
    `• 📄 *.html* \\- Halaman tunggal\n` +
    `• 📦 *.zip* \\- Multi\\-file \\(HTML \\+ CSS \\+ JS \\+ gambar, dll\\)\n\n` +
    `*Cara pakai /deploy:*\n` +
    `1\\. Ketik /deploy\n` +
    `2\\. Pilih platform\n` +
    `3\\. Masukkan nama project\n` +
    `4\\. Kirim file \\.html atau \\.zip\n` +
    `5\\. Tunggu URL website mu jadi\\! 🚀\n\n` +
    `💡 *Tips:* Ketik /batal kapan saja untuk membatalkan proses yang sedang berjalan\\.`,
    { parse_mode: 'MarkdownV2' }
  );
});

// Register semua command
deployCommand(bot);
deleteCommand(bot);
manageCommand(bot);
cancelCommand(bot);

// Error handler
bot.catch((err, ctx) => {
  console.error(`Error untuk update ${ctx.updateType}:`, err);
  ctx.reply('❌ Terjadi kesalahan. Coba lagi ya!');
});

// Jalankan bot
bot.launch().then(() => {
  console.log('🤖 Bot berjalan...');
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
