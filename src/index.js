require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
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
  const welcomeMessage = 
    `👋 *Selamat Datang, ${ctx.from.first_name}\\!*\n\n` +
    `🚀 *Deploy Bot* \\- Platform Deploy Otomatis\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Deploy website kamu dengan mudah ke:\n\n` +
    `🔺 *Vercel* \\- Fast \\& Reliable\n` +
    `🟩 *Netlify* \\- Simple \\& Powerful\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *Menu Utama*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Gunakan tombol di bawah atau ketik perintah:`;

  ctx.reply(welcomeMessage, {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('🚀 Deploy Website', 'menu_deploy'),
        Markup.button.callback('⚙️ Kelola Project', 'menu_manage'),
      ],
      [
        Markup.button.callback('🗑️ Hapus Project', 'menu_delete'),
        Markup.button.callback('📚 Bantuan', 'menu_help'),
      ],
      [
        Markup.button.callback('ℹ️ Tentang Bot', 'menu_about'),
      ],
    ]),
  });
});

// Command /help
bot.help((ctx) => {
  const helpMessage =
    `📚 *Panduan Lengkap Deploy Bot*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎯 *Perintah Tersedia:*\n\n` +
    `🚀 /deploy \\- Deploy website baru\n` +
    `⚙️ /manage \\- Kelola project \\(update, rename, domain\\)\n` +
    `🗑️ /delete \\- Hapus project\n` +
    `❌ /batal \\- Batalkan proses berjalan\n` +
    `/help \\- Tampilkan panduan ini\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📁 *Format File:*\n\n` +
    `• 📄 *\\.html* \\- Halaman tunggal\n` +
    `• 📦 *\\.zip* \\- Multi\\-file \\(HTML, CSS, JS, gambar\\)\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📖 *Cara Deploy:*\n\n` +
    `1️⃣ Ketik /deploy atau klik tombol\n` +
    `2️⃣ Pilih platform \\(Vercel/Netlify\\)\n` +
    `3️⃣ Masukkan nama project\n` +
    `4️⃣ Kirim file \\.html atau \\.zip\n` +
    `5️⃣ Dapatkan URL website\\! 🎉\n\n` +
    `💡 *Tip:* Ketik /batal untuk membatalkan proses kapan saja\\.`;

  ctx.reply(helpMessage, {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Deploy Sekarang', 'menu_deploy')],
      [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
    ]),
  });
});

// Register semua command
deployCommand(bot);
deleteCommand(bot);
manageCommand(bot);
cancelCommand(bot);

// =====================
// Handler tombol menu utama
// =====================
bot.action('menu_home', (ctx) => {
  const welcomeMessage = 
    `👋 *Selamat Datang, ${ctx.from.first_name}\\!*\n\n` +
    `🚀 *Deploy Bot* \\- Platform Deploy Otomatis\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Deploy website kamu dengan mudah ke:\n\n` +
    `🔺 *Vercel* \\- Fast \\& Reliable\n` +
    `🟩 *Netlify* \\- Simple \\& Powerful\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *Menu Utama*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Gunakan tombol di bawah atau ketik perintah:`;

  ctx.editMessageText(welcomeMessage, {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('🚀 Deploy Website', 'menu_deploy'),
        Markup.button.callback('⚙️ Kelola Project', 'menu_manage'),
      ],
      [
        Markup.button.callback('🗑️ Hapus Project', 'menu_delete'),
        Markup.button.callback('📚 Bantuan', 'menu_help'),
      ],
      [
        Markup.button.callback('ℹ️ Tentang Bot', 'menu_about'),
      ],
    ]),
  }).catch(() => {});
});

bot.action('menu_deploy', (ctx) => {
  ctx.session.deployState = null;
  ctx.session.platform = null;
  ctx.session.projectName = null;

  ctx.editMessageText(
    '🚀 *Deploy Website*\n\n' +
    'Pilih platform yang ingin kamu gunakan:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🔺 Vercel', 'platform_vercel'),
          Markup.button.callback('🟩 Netlify', 'platform_netlify'),
        ],
        [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
      ]),
    }
  ).catch(() => {});
});

bot.action('menu_manage', (ctx) => {
  ctx.session.manageState = null;
  ctx.session.managePlatform = null;
  ctx.session.manageProjectId = null;
  ctx.session.manageProjectName = null;
  ctx.session.manageProjectUrl = null;

  ctx.editMessageText(
    '⚙️ *Kelola Project*\n\nPilih platform:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🔺 Vercel', 'mgr_platform_vercel'),
          Markup.button.callback('🟩 Netlify', 'mgr_platform_netlify'),
        ],
        [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
      ]),
    }
  ).catch(() => {});
});

bot.action('menu_delete', (ctx) => {
  ctx.session.deleteState = null;
  ctx.session.deletePlatform = null;
  ctx.session.deleteProjectId = null;
  ctx.session.deleteProjectName = null;

  ctx.editMessageText(
    '🗑️ *Hapus Project*\n\nPilih platform:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🔺 Vercel', 'del_platform_vercel'),
          Markup.button.callback('🟩 Netlify', 'del_platform_netlify'),
        ],
        [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
      ]),
    }
  ).catch(() => {});
});

bot.action('menu_help', (ctx) => {
  const helpMessage =
    `📚 *Panduan Lengkap Deploy Bot*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎯 *Perintah Tersedia:*\n\n` +
    `🚀 /deploy \\- Deploy website baru\n` +
    `⚙️ /manage \\- Kelola project \\(update, rename, domain\\)\n` +
    `🗑️ /delete \\- Hapus project\n` +
    `❌ /batal \\- Batalkan proses berjalan\n` +
    `/help \\- Tampilkan panduan ini\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📁 *Format File:*\n\n` +
    `• 📄 *\\.html* \\- Halaman tunggal\n` +
    `• 📦 *\\.zip* \\- Multi\\-file \\(HTML, CSS, JS, gambar\\)\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📖 *Cara Deploy:*\n\n` +
    `1️⃣ Ketik /deploy atau klik tombol\n` +
    `2️⃣ Pilih platform \\(Vercel/Netlify\\)\n` +
    `3️⃣ Masukkan nama project\n` +
    `4️⃣ Kirim file \\.html atau \\.zip\n` +
    `5️⃣ Dapatkan URL website\\! 🎉\n\n` +
    `💡 *Tip:* Ketik /batal untuk membatalkan proses kapan saja\\.`;

  ctx.editMessageText(helpMessage, {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Deploy Sekarang', 'menu_deploy')],
      [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
    ]),
  }).catch(() => {});
});

bot.action('menu_about', (ctx) => {
  const aboutMessage =
    `ℹ️ *Tentang Deploy Bot*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🤖 *Deploy Bot v1\\.0\\.0*\n\n` +
    `Bot Telegram untuk deploy website secara otomatis ke platform hosting populer\\.\n\n` +
    `✨ *Fitur Utama:*\n\n` +
    `• Deploy ke Vercel \\& Netlify\n` +
    `• Support HTML \\& ZIP file\n` +
    `• Kelola project dengan mudah\n` +
    `• Custom domain support\n` +
    `• Update \\& rename project\n` +
    `• Interface yang user\\-friendly\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💼 *Platform Support:*\n\n` +
    `🔺 Vercel \\- Edge Network\n` +
    `🟩 Netlify \\- CDN Global\n\n` +
    `Made with ❤️ using Telegraf\\.js`;

  ctx.editMessageText(aboutMessage, {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
    ]),
  }).catch(() => {});
});

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
