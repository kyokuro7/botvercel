const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/users.json');
const CHANNELS_PATH = path.join(__dirname, '../../data/channels.json');

// Pastikan folder data ada
function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// =====================
// USER DATABASE
// =====================

function loadUsers() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveUsers(users) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

/**
 * Ambil data user, buat baru jika belum ada
 */
function getUser(userId) {
  const users = loadUsers();
  const id = String(userId);

  if (!users[id]) {
    users[id] = {
      id: userId,
      username: null,
      first_name: null,
      joined_main_channel: false, // Sudah join channel utama?
      joined_event_channels: [],  // List channel event yang sudah di-join
      deploy_limit: 0,
      deploy_used: 0,
      registered_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    };
    saveUsers(users);
  }

  return users[id];
}

/**
 * Update data user
 */
function updateUser(userId, data) {
  const users = loadUsers();
  const id = String(userId);

  if (!users[id]) {
    getUser(userId);
    return updateUser(userId, data);
  }

  users[id] = { ...users[id], ...data, last_active: new Date().toISOString() };
  saveUsers(users);
  return users[id];
}

/**
 * Set user sudah join channel utama & berikan 2 limit deploy
 */
function setUserJoinedMainChannel(userId) {
  const user = getUser(userId);
  if (!user.joined_main_channel) {
    return updateUser(userId, {
      joined_main_channel: true,
      deploy_limit: user.deploy_limit + 2,
    });
  }
  return user;
}

/**
 * Set user sudah join channel event & berikan 2 limit deploy
 */
function setUserJoinedEventChannel(userId, channelId) {
  const user = getUser(userId);
  const joinedList = user.joined_event_channels || [];

  if (joinedList.includes(String(channelId))) {
    return { user, alreadyJoined: true };
  }

  joinedList.push(String(channelId));

  const updated = updateUser(userId, {
    joined_event_channels: joinedList,
    deploy_limit: user.deploy_limit + 2,
  });

  return { user: updated, alreadyJoined: false };
}

/**
 * Gunakan 1 deploy limit
 */
function useDeployLimit(userId) {
  const user = getUser(userId);
  const remaining = user.deploy_limit - user.deploy_used;

  if (remaining <= 0) {
    return { success: false, remaining: 0, user };
  }

  const updated = updateUser(userId, {
    deploy_used: user.deploy_used + 1,
  });

  return {
    success: true,
    remaining: updated.deploy_limit - updated.deploy_used,
    user: updated,
  };
}

/**
 * Cek sisa deploy limit user
 */
function getDeployRemaining(userId) {
  const user = getUser(userId);
  return Math.max(0, user.deploy_limit - user.deploy_used);
}

/**
 * Tambah deploy limit ke user (manual dari owner)
 */
function addDeployLimit(userId, amount) {
  const user = getUser(userId);
  return updateUser(userId, {
    deploy_limit: user.deploy_limit + amount,
  });
}

/**
 * Ambil semua user
 */
function getAllUsers() {
  return loadUsers();
}

/**
 * Cek apakah user adalah owner
 */
function isOwner(userId) {
  const ownerId = parseInt(process.env.OWNER_ID, 10);
  return userId === ownerId;
}

// =====================
// CHANNELS DATABASE (Event Channels)
// =====================

function loadChannels() {
  ensureDataDir();
  if (!fs.existsSync(CHANNELS_PATH)) {
    fs.writeFileSync(CHANNELS_PATH, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveChannels(channels) {
  ensureDataDir();
  fs.writeFileSync(CHANNELS_PATH, JSON.stringify(channels, null, 2));
}

/**
 * Tambah channel event baru (owner only)
 * channelId = @username atau -100xxxxx
 * channelTitle = nama channel
 * channelUrl = https://t.me/xxx
 */
function addEventChannel({ channelId, channelTitle, channelUrl }) {
  const channels = loadChannels();

  // Cek duplikat
  const exists = channels.find((c) => c.channel_id === channelId);
  if (exists) {
    return { success: false, reason: 'Channel sudah ada di daftar event.' };
  }

  const channel = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    channel_id: channelId,
    title: channelTitle || channelId,
    url: channelUrl || `https://t.me/${String(channelId).replace('@', '')}`,
    active: true,
    created_at: new Date().toISOString(),
  };

  channels.push(channel);
  saveChannels(channels);
  return { success: true, channel };
}

/**
 * List semua channel event aktif
 */
function getActiveEventChannels() {
  const channels = loadChannels();
  return channels.filter((c) => c.active);
}

/**
 * List semua channel event
 */
function getAllEventChannels() {
  return loadChannels();
}

/**
 * Nonaktifkan channel event
 */
function deactivateEventChannel(channelInternalId) {
  const channels = loadChannels();
  const idx = channels.findIndex((c) => c.id === channelInternalId);
  if (idx === -1) return null;

  channels[idx].active = false;
  saveChannels(channels);
  return channels[idx];
}

/**
 * Hapus channel event
 */
function deleteEventChannel(channelInternalId) {
  let channels = loadChannels();
  const channel = channels.find((c) => c.id === channelInternalId);
  if (!channel) return null;

  channels = channels.filter((c) => c.id !== channelInternalId);
  saveChannels(channels);
  return channel;
}

/**
 * Cek channel event mana yang belum di-join user
 */
function getUnjoinedEventChannels(userId) {
  const user = getUser(userId);
  const activeChannels = getActiveEventChannels();
  const joinedList = user.joined_event_channels || [];

  return activeChannels.filter((c) => !joinedList.includes(c.channel_id));
}

module.exports = {
  // User functions
  getUser,
  updateUser,
  setUserJoinedMainChannel,
  setUserJoinedEventChannel,
  useDeployLimit,
  getDeployRemaining,
  addDeployLimit,
  getAllUsers,
  isOwner,
  // Channel event functions
  addEventChannel,
  getActiveEventChannels,
  getAllEventChannels,
  deactivateEventChannel,
  deleteEventChannel,
  getUnjoinedEventChannels,
};
