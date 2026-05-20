const { Markup } = require('telegraf');
const { getUser, setUserJoinedMainChannel, isOwner, getUnjoinedEventChannels } = require('../database/userDb');

const CHANNEL_ID = process.env.CHANNEL_ID; // Channel utama: @username atau -100xxxxx
const CHANNEL_URL = process.env.CHANNEL_URL; // URL channel utama

/**
 * Cek apakah user sudah join channel via Telegram API
 */
async function checkChannelMembership(ctx, channelId, userId) {
  try {
    const member = await ctx.telegram.getChatMember(channelId, userId);
    const validStatuses = ['creator', 'administrator', 'member'];
    return validStatuses.includes(member.status);
  } catch (err) {
    console.error(`Channel check error for ${channelId}:`, err.message);
    return false;
  }
}

/**
 * Tampilkan pesan join channel utama
 */
function showJoinMainChannelMessage(ctx) {
  const channelUrl = CHANNEL_URL || `https://t.me/${String(CHANNEL_ID).replace('@', '')}`;

  const message =
    `🔒 *Akses Terbatas*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Untuk menggunakan bot ini, kamu harus bergabung ke channel kami terlebih dahulu\\.\n\n` +
    `📋 *Langkah:*\n` +
    `1️⃣ Klik tombol "📢 Join Channel"\n` +
    `2️⃣ Bergabung ke channel\n` +
    `3️⃣ Kembali dan klik "✅ Verifikasi"\n\n` +
    `🎁 *Bonus:* Dapatkan *2 limit deploy gratis\\!*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  return ctx.reply(message, {
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📢 Join Channel', channelUrl)],
      [Markup.button.callback('✅ Verifikasi', 'verify_main_channel')],
    ]),
  }).catch(() => {});
}

/**
 * Middleware untuk verifikasi channel utama
 */
function channelVerifyMiddleware() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    // Owner selalu bypass
    if (isOwner(userId)) return next();

    // Jika CHANNEL_ID tidak diset, skip verification
    if (!CHANNEL_ID) return next();

    // Update info user
    const user = getUser(userId);

    // Jika user sudah join channel utama, lanjut
    if (user.joined_main_channel) return next();

    // Cek langsung ke Telegram API
    const isMember = await checkChannelMembership(ctx, CHANNEL_ID, userId);

    if (isMember) {
      setUserJoinedMainChannel(userId);
      return next();
    }

    // User belum join - tampilkan pesan
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('❌ Kamu harus join channel dulu!', { show_alert: true }).catch(() => {});
    }

    await showJoinMainChannelMessage(ctx);
    return; // Stop, jangan lanjut
  };
}

/**
 * Register handler untuk verifikasi channel utama
 */
function registerVerifyHandlers(bot) {
  // Verifikasi channel utama
  bot.action('verify_main_channel', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!CHANNEL_ID) {
      return ctx.answerCbQuery('Channel belum dikonfigurasi.', { show_alert: true });
    }

    const isMember = await checkChannelMembership(ctx, CHANNEL_ID, userId);

    if (isMember) {
      const user = setUserJoinedMainChannel(userId);
      const remaining = user.deploy_limit - user.deploy_used;

      await ctx.editMessageText(
        `✅ *Verifikasi Berhasil\\!*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Selamat\\! Kamu sudah bergabung di channel kami\\.\n\n` +
          `🎁 *Bonus:* \\+2 limit deploy gratis\\!\n` +
          `📊 *Sisa limit:* ${remaining} deploy\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Ketik /start untuk mulai menggunakan bot\\!`,
        {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
          ]),
        }
      ).catch(() => {});
    } else {
      await ctx.answerCbQuery(
        '❌ Kamu belum bergabung di channel! Join dulu ya, lalu klik Verifikasi lagi.',
        { show_alert: true }
      ).catch(() => {});
    }
  });

  // Verifikasi channel event (dynamic: verify_event_CHANNELID)
  bot.action(/^verify_event_(.+)$/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const channelId = ctx.match[1];
    const isMember = await checkChannelMembership(ctx, channelId, userId);

    if (isMember) {
      const { setUserJoinedEventChannel, getDeployRemaining } = require('../database/userDb');
      const { user, alreadyJoined } = setUserJoinedEventChannel(userId, channelId);

      if (alreadyJoined) {
        return ctx.answerCbQuery('✅ Kamu sudah pernah join channel ini!', { show_alert: true });
      }

      const remaining = getDeployRemaining(userId);

      await ctx.editMessageText(
        `✅ *Channel Event Berhasil Diverifikasi\\!*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🎁 *Reward:* \\+2 limit deploy\\!\n` +
          `📊 *Sisa limit:* ${remaining} deploy\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Gunakan /deploy untuk deploy website kamu\\!`,
        {
          parse_mode: 'MarkdownV2',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
          ]),
        }
      ).catch(() => {});
    } else {
      await ctx.answerCbQuery(
        '❌ Kamu belum join channel ini! Join dulu, lalu klik Verifikasi lagi.',
        { show_alert: true }
      ).catch(() => {});
    }
  });
}

module.exports = {
  channelVerifyMiddleware,
  registerVerifyHandlers,
  checkChannelMembership,
  showJoinMainChannelMessage,
};
