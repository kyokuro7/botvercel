require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const deployCommand = require('./commands/deploy');

const bot = new Telegraf(process.env.BOT_TOKEN);
const OWNER_ID = parseInt(process.env.OWNER_ID, 10);

// Setup session untuk menyimpan state percakapan
bot.use(session());

// Inisialisasi session default
bot.use((ctx, next) => {
  if (!ctx.session) {
    ctx.session = {};
  }
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
    `Ketik /deploy untuk mulai deploy website kamu\\!\n` +
    `Ketik /help untuk melihat daftar perintah\\.`,
    { parse_mode: 'MarkdownV2' }
  );
});

// Command /help
bot.help((ctx) => {
  ctx.reply(
    `📋 *Daftar Perintah:*\n\n` +
    `/start \\- Mulai bot\n` +
    `/deploy \\- Deploy website ke Vercel atau Netlify\n` +
    `/help \\- Tampilkan bantuan ini\n\n` +
    `*Cara pakai /deploy:*\n` +
    `1\\. Ketik /deploy\n` +
    `2\\. Pilih platform \\(Vercel atau Netlify\\)\n` +
    `3\\. Masukkan nama project\n` +
    `4\\. Kirim file HTML kamu\n` +
    `5\\. Tunggu URL website mu jadi\\! 🚀`,
    { parse_mode: 'MarkdownV2' }
  );
});

// Register deploy command dan handler
deployCommand(bot);

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
