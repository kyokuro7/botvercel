require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
const { channelVerifyMiddleware, registerVerifyHandlers } = require('./middleware/channelVerify');
const { getUser, updateUser, isOwner, getDeployRemaining, getUnjoinedEventChannels } = require('./database/userDb');
const deployCommand = require('./commands/deploy');
const deleteCommand = require('./commands/delete');
const manageCommand = require('./commands/manage');
const cancelCommand = require('./commands/cancel');
const eventCommand = require('./commands/event');

const bot = new Telegraf(process.env.BOT_TOKEN);
const OWNER_ID = parseInt(process.env.OWNER_ID, 10);

// Setup session
bot.use(session());

// Inisialisasi session default
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {};
  return next();
});

// Middleware: register user ke database & update info
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const user = getUser(userId);
  // Update info user jika berubah
  if (ctx.from.first_name !== user.first_name || ctx.from.username !== user.username) {
    updateUser(userId, {
      first_name: ctx.from.first_name || null,
      username: ctx.from.username || null,
    });
  }

  return next();
});

// Middleware: cek channel utama (kecuali untuk /start dan verify actions)
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  // Owner selalu bypass
  if (isOwner(userId)) return next();

  // Bypass untuk /start command (agar bisa tampil pesan join)
  if (ctx.message?.text === '/start') return next();

  // Bypass untuk callback verify_main_channel dan verify_event_*
  if (ctx.callbackQuery?.data?.startsWith('verify_')) return next();

  // Gunakan channel verify middleware
  const middleware = channelVerifyMiddleware();
  return middleware(ctx, next);
});

// =====================
// Command /start
// =====================
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const user = getUser(userId);

  // Cek apakah user sudah join channel utama
  const CHANNEL_ID = process.env.CHANNEL_ID;

  if (CHANNEL_ID && !user.joined_main_channel && !isOwner(userId)) {
    // Belum join channel utama - tampilkan pesan join
    const { showJoinMainChannelMessage } = require('./middleware/channelVerify');
    return showJoinMainChannelMessage(ctx);
  }

  // Sudah join atau owner - tampilkan menu utama
  const remaining = getDeployRemaining(userId);
  const unjoinedChannels = getUnjoinedEventChannels(userId);
  const eventNotif = unjoinedChannels.length > 0
    ? `\n🎯 *${unjoinedChannels.length} event channel* tersedia\\! Ketik /event`
    : '';

  const welcomeMessage =
    `👋 *Selamat Datang, ${escapeMarkdown(ctx.from.first_name)}\\!*\n\n` +
    `🚀 *Deploy Bot* \\- Platform Deploy Otomatis\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Deploy website kamu dengan mudah ke:\n\n` +
    `🔺 *Vercel* \\- Fast \\& Reliable\n` +
    `🟩 *Netlify* \\- Simple \\& Powerful\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *Sisa Limit Deploy:* ${remaining}\n` +
    `${eventNotif}\n` +
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
        Markup.button.callback('🎯 Event', 'menu_event'),
      ],
      [
        Markup.button.callback('📊 Limit Saya', 'menu_limit'),
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
    `📊 /limit \\- Cek sisa limit deploy\n` +
    `🎯 /event \\- Lihat event channel untuk limit tambahan\n` +
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
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 *Cara Dapat Limit Deploy:*\n\n` +
    `• Join channel utama \\= \\+2 limit\n` +
    `• Join channel event \\= \\+2 limit per channel\n` +
    `• Ketik /event untuk lihat channel tersedia`;

  ctx.reply(helpMessage, {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Deploy Sekarang', 'menu_deploy')],
      [Markup.button.callback('🎯 Event Channel', 'menu_event')],
      [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
    ]),
  });
});

// Register semua command
deployCommand(bot);
deleteCommand(bot);
manageCommand(bot);
cancelCommand(bot);
eventCommand(bot);

// Register verify handlers (untuk tombol verifikasi channel)
registerVerifyHandlers(bot);

// =====================
// Handler tombol menu
// =====================
bot.action('menu_home', (ctx) => {
  const userId = ctx.from.id;
  const remaining = getDeployRemaining(userId);
  const unjoinedChannels = getUnjoinedEventChannels(userId);
  const eventNotif = unjoinedChannels.length > 0
    ? `\n🎯 *${unjoinedChannels.length} event channel* tersedia\\! Ketik /event`
    : '';

  const welcomeMessage =
    `👋 *Selamat Datang, ${escapeMarkdown(ctx.from.first_name)}\\!*\n\n` +
    `🚀 *Deploy Bot* \\- Platform Deploy Otomatis\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Deploy website kamu dengan mudah ke:\n\n` +
    `🔺 *Vercel* \\- Fast \\& Reliable\n` +
    `🟩 *Netlify* \\- Simple \\& Powerful\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *Sisa Limit Deploy:* ${remaining}\n` +
    `${eventNotif}\n` +
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
        Markup.button.callback('🎯 Event', 'menu_event'),
      ],
      [
        Markup.button.callback('📊 Limit Saya', 'menu_limit'),
        Markup.button.callback('📚 Bantuan', 'menu_help'),
      ],
      [
        Markup.button.callback('ℹ️ Tentang Bot', 'menu_about'),
      ],
    ]),
  }).catch(() => {});
});

bot.action('menu_deploy', (ctx) => {
  // Cek limit dulu
  const userId = ctx.from.id;
  const remaining = getDeployRemaining(userId);

  if (remaining <= 0 && !isOwner(userId)) {
    return ctx.editMessageText(
      `❌ *Limit Deploy Habis\\!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Kamu tidak punya sisa limit deploy\\.\n\n` +
        `💡 *Cara dapat limit tambahan:*\n` +
        `• Join channel event \\= \\+2 limit per channel\n` +
        `• Ketik /event untuk lihat channel tersedia\n\n` +
        `━━━━━━━━━━━━━━━━━━━━`,
      {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🎯 Lihat Event', 'menu_event')],
          [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
        ]),
      }
    ).catch(() => {});
  }

  ctx.session.deployState = null;
  ctx.session.platform = null;
  ctx.session.projectName = null;

  ctx.editMessageText(
    `🚀 *Deploy Website*\n\n` +
      `📊 Sisa limit: *${remaining}* deploy\n\n` +
      `Pilih platform yang ingin kamu gunakan:`,
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

bot.action('menu_event', (ctx) => {
  const userId = ctx.from.id;
  const unjoinedChannels = getUnjoinedEventChannels(userId);

  if (unjoinedChannels.length === 0) {
    return ctx.editMessageText(
      `📭 *Tidak ada event channel baru*\n\n` +
        `Kamu sudah join semua channel event yang tersedia\\.\n` +
        `Tunggu owner menambahkan channel baru ya\\!`,
      {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
        ]),
      }
    ).catch(() => {});
  }

  const buttons = [];
  unjoinedChannels.forEach((ch) => {
    buttons.push([Markup.button.url(`📢 ${ch.title}`, ch.url)]);
    buttons.push([Markup.button.callback(`✅ Verifikasi: ${ch.title}`, `verify_event_${ch.channel_id}`)]);
  });
  buttons.push([Markup.button.callback('🏠 Menu Utama', 'menu_home')]);

  ctx.editMessageText(
    `🎉 *Event Channel Tersedia*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Join channel di bawah untuk mendapatkan *\\+2 limit deploy* per channel\\!\n\n` +
      `📋 *Langkah:*\n` +
      `1️⃣ Klik tombol channel untuk join\n` +
      `2️⃣ Klik "✅ Verifikasi" setelah join\n` +
      `3️⃣ Dapatkan limit tambahan\\!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━`,
    {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard(buttons),
    }
  ).catch(() => {});
});

bot.action('menu_limit', (ctx) => {
  const userId = ctx.from.id;
  const user = getUser(userId);
  const remaining = getDeployRemaining(userId);
  const unjoinedChannels = getUnjoinedEventChannels(userId);

  const emoji = remaining > 0 ? '✅' : '❌';
  const eventText = unjoinedChannels.length > 0
    ? `\n\n💡 Ada *${unjoinedChannels.length}* channel event yang bisa kamu join\\!`
    : '';

  ctx.editMessageText(
    `📊 *Deploy Limit*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${emoji} Sisa limit: *${remaining}* deploy\n\n` +
      `📈 *Statistik:*\n` +
      `• Total limit: ${user.deploy_limit}\n` +
      `• Sudah dipakai: ${user.deploy_used}\n` +
      `• Sisa: ${remaining}` +
      `${eventText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━`,
    {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        ...(unjoinedChannels.length > 0 ? [[Markup.button.callback('🎯 Lihat Event', 'menu_event')]] : []),
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
    `⚙️ /manage \\- Kelola project\n` +
    `🗑️ /delete \\- Hapus project\n` +
    `❌ /batal \\- Batalkan proses\n` +
    `📊 /limit \\- Cek sisa limit\n` +
    `🎯 /event \\- Event channel\n` +
    `/help \\- Panduan ini\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 *Cara Dapat Limit Deploy:*\n\n` +
    `• Join channel utama \\= \\+2 limit\n` +
    `• Join channel event \\= \\+2 limit per channel\n` +
    `• Ketik /event untuk lihat channel tersedia`;

  ctx.editMessageText(helpMessage, {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Deploy Sekarang', 'menu_deploy')],
      [Markup.button.callback('🎯 Event Channel', 'menu_event')],
      [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
    ]),
  }).catch(() => {});
});

bot.action('menu_about', (ctx) => {
  const aboutMessage =
    `ℹ️ *Tentang Deploy Bot*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🤖 *Deploy Bot v2\\.0\\.0*\n\n` +
    `Bot Telegram untuk deploy website secara otomatis ke platform hosting populer\\.\n\n` +
    `✨ *Fitur Utama:*\n\n` +
    `• Deploy ke Vercel \\& Netlify\n` +
    `• Support HTML \\& ZIP file\n` +
    `• Sistem limit deploy\n` +
    `• Event channel untuk limit tambahan\n` +
    `• Custom domain support\n` +
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
  ctx.reply('❌ Terjadi kesalahan. Coba lagi ya!').catch(() => {});
});

// Jalankan bot
bot.launch().then(() => {
  console.log('🤖 Bot berjalan...');
  console.log(`👤 Owner ID: ${OWNER_ID}`);
  console.log(`📢 Channel ID: ${process.env.CHANNEL_ID || 'Tidak diset'}`);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/**
 * Escape karakter khusus MarkdownV2
 */
function escapeMarkdown(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
