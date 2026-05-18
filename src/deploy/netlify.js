const axios = require('axios');
const crypto = require('crypto');
const archiver = require('archiver');
const { PassThrough } = require('stream');

const BASE_URL = 'https://api.netlify.com/api/v1';

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Bersihkan nama project
 */
function cleanProjectName(name) {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
}

/**
 * Upload file ke Netlify deploy menggunakan File Digest API
 */
async function uploadFilesToNetlify(siteId, fileMap, token) {
  // fileMap: { 'path/file.html': Buffer, ... }
  const files = {};
  for (const [filePath, buffer] of Object.entries(fileMap)) {
    files[`/${filePath}`] = crypto.createHash('sha1').update(buffer).digest('hex');
  }

  // Buat deployment dengan file digest
  const deployRes = await axios.post(
    `${BASE_URL}/sites/${siteId}/deploys`,
    { files, async: false },
    { headers: getHeaders(token) }
  );

  const deployId = deployRes.data.id;
  const requiredFiles = deployRes.data.required || [];

  // Upload file yang diminta Netlify
  for (const [filePath, buffer] of Object.entries(fileMap)) {
    const sha1 = crypto.createHash('sha1').update(buffer).digest('hex');
    if (requiredFiles.includes(sha1)) {
      await axios.put(
        `${BASE_URL}/deploys/${deployId}/files/${filePath}`,
        buffer,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
          },
          maxBodyLength: Infinity,
        }
      );
    }
  }
}

/**
 * Deploy HTML ke Netlify
 */
async function deployToNetlify(projectName, htmlContent) {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN belum diset di file .env');

  const baseName = cleanProjectName(projectName);
  const randomSuffix = Math.random().toString(36).slice(2, 7);
  const cleanName = `${baseName}-${randomSuffix}`;

  // Buat site baru
  let siteId, siteName;
  try {
    const siteRes = await axios.post(
      `${BASE_URL}/sites`,
      { name: cleanName },
      { headers: getHeaders(token) }
    );
    siteId = siteRes.data.id;
    siteName = siteRes.data.name;
  } catch (err) {
    const msg = err.response?.data?.errors?.name?.[0] || err.message;
    throw new Error(`Gagal membuat site Netlify: ${msg}`);
  }

  // Upload file
  const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
  await uploadFilesToNetlify(siteId, { 'index.html': htmlBuffer }, token);

  return { url: `https://${siteName}.netlify.app`, siteId, name: siteName };
}

/**
 * Deploy ZIP (multi-file) ke Netlify
 */
async function deployZipToNetlify(projectName, fileMap) {
  // fileMap: { 'index.html': Buffer, 'style.css': Buffer, ... }
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN belum diset di file .env');

  const baseName = cleanProjectName(projectName);
  const randomSuffix = Math.random().toString(36).slice(2, 7);
  const cleanName = `${baseName}-${randomSuffix}`;

  let siteId, siteName;
  try {
    const siteRes = await axios.post(
      `${BASE_URL}/sites`,
      { name: cleanName },
      { headers: getHeaders(token) }
    );
    siteId = siteRes.data.id;
    siteName = siteRes.data.name;
  } catch (err) {
    const msg = err.response?.data?.errors?.name?.[0] || err.message;
    throw new Error(`Gagal membuat site Netlify: ${msg}`);
  }

  await uploadFilesToNetlify(siteId, fileMap, token);

  return { url: `https://${siteName}.netlify.app`, siteId, name: siteName };
}

/**
 * List semua site Netlify
 */
async function listNetlifySites() {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN belum diset di file .env');

  const res = await axios.get(`${BASE_URL}/sites?per_page=20`, {
    headers: getHeaders(token),
  });

  return res.data.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.ssl_url || s.url || `https://${s.name}.netlify.app`,
  }));
}

/**
 * Hapus site Netlify
 */
async function deleteNetlifySite(siteId) {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN belum diset di file .env');

  await axios.delete(`${BASE_URL}/sites/${siteId}`, {
    headers: getHeaders(token),
  });
}

/**
 * Rename site Netlify
 */
async function renameNetlifySite(siteId, newName) {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN belum diset di file .env');

  const cleanName = cleanProjectName(newName);

  const res = await axios.put(
    `${BASE_URL}/sites/${siteId}`,
    { name: cleanName },
    { headers: getHeaders(token) }
  );

  return { name: res.data.name, url: `https://${res.data.name}.netlify.app` };
}

/**
 * Update/redeploy site Netlify dengan file baru
 */
async function updateNetlifySite(siteId, fileMap) {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN belum diset di file .env');

  await uploadFilesToNetlify(siteId, fileMap, token);

  // Ambil info site untuk URL
  const res = await axios.get(`${BASE_URL}/sites/${siteId}`, {
    headers: getHeaders(token),
  });

  return { url: res.data.ssl_url || `https://${res.data.name}.netlify.app` };
}

/**
 * Tambahkan custom domain ke site Netlify
 */
async function addNetlifyDomain(siteId, domain) {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN belum diset di file .env');

  // Ambil info site dulu untuk dapat nama site
  const siteRes = await axios.get(`${BASE_URL}/sites/${siteId}`, {
    headers: getHeaders(token),
  });
  const siteName = siteRes.data.name;

  // Tambahkan custom domain ke site
  try {
    await axios.post(
      `${BASE_URL}/sites/${siteId}/domain_aliases`,
      { domain },
      { headers: getHeaders(token) }
    );
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Gagal menambahkan domain ke Netlify: ${msg}`);
  }

  return {
    domain,
    cname: `${siteName}.netlify.app`,
  };
}

/**
 * Hapus custom domain dari site Netlify
 */
async function removeNetlifyDomain(siteId, domain) {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN belum diset di file .env');

  try {
    await axios.delete(
      `${BASE_URL}/sites/${siteId}/domain_aliases/${domain}`,
      { headers: getHeaders(token) }
    );
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Gagal menghapus domain dari Netlify: ${msg}`);
  }
}

/**
 * List custom domain dari site Netlify
 */
async function listNetlifyDomains(siteId) {
  const token = process.env.NETLIFY_TOKEN;
  if (!token) throw new Error('NETLIFY_TOKEN belum diset di file .env');

  const res = await axios.get(`${BASE_URL}/sites/${siteId}`, {
    headers: getHeaders(token),
  });

  return (res.data.domain_aliases || []).filter(
    (d) => !d.endsWith('.netlify.app')
  );
}

module.exports = {
  deployToNetlify,
  deployZipToNetlify,
  listNetlifySites,
  deleteNetlifySite,
  renameNetlifySite,
  updateNetlifySite,
  addNetlifyDomain,
  removeNetlifyDomain,
  listNetlifyDomains,
};
