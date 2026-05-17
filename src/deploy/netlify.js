const axios = require('axios');
const crypto = require('crypto');

/**
 * Deploy HTML ke Netlify menggunakan Netlify File Digest API
 * @param {string} projectName - Nama project/site
 * @param {string} htmlContent - Konten file HTML
 * @returns {Promise<{url: string}>}
 */
async function deployToNetlify(projectName, htmlContent) {
  const token = process.env.NETLIFY_TOKEN;

  if (!token) {
    throw new Error('NETLIFY_TOKEN belum diset di file .env');
  }

  // Bersihkan nama project
  const baseName = projectName
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);

  // Tambahkan suffix acak agar nama unik secara global di Netlify
  const randomSuffix = Math.random().toString(36).slice(2, 7);
  const cleanName = `${baseName}-${randomSuffix}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. Buat site baru di Netlify
  let siteId, siteName;
  try {
    const siteRes = await axios.post(
      'https://api.netlify.com/api/v1/sites',
      { name: cleanName },
      { headers }
    );
    siteId = siteRes.data.id;
    siteName = siteRes.data.name;
  } catch (err) {
    const msg = err.response?.data?.errors?.name?.[0] || err.message;
    throw new Error(`Gagal membuat site Netlify: ${msg}`);
  }

  // 2. Hitung SHA1 dari isi index.html
  const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
  const sha1 = crypto.createHash('sha1').update(htmlBuffer).digest('hex');

  // 3. Buat deployment dengan file digest
  let deployId, requiredFiles;
  try {
    const deployRes = await axios.post(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        files: { '/index.html': sha1 },
        async: false,
      },
      { headers }
    );
    deployId = deployRes.data.id;
    requiredFiles = deployRes.data.required || [];
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Gagal membuat deployment Netlify: ${msg}`);
  }

  // 4. Upload index.html jika diminta Netlify
  if (requiredFiles.includes(sha1)) {
    try {
      await axios.put(
        `https://api.netlify.com/api/v1/deploys/${deployId}/files/index.html`,
        htmlBuffer,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
          },
          maxBodyLength: Infinity,
        }
      );
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      throw new Error(`Gagal upload file ke Netlify: ${msg}`);
    }
  }

  const url = `https://${siteName}.netlify.app`;
  return { url };
}

module.exports = { deployToNetlify };
