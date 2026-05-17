const axios = require('axios');
const archiver = require('archiver');
const { PassThrough } = require('stream');

/**
 * Deploy HTML ke Netlify menggunakan Netlify API
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

  // Buat site baru di Netlify
  let siteRes;
  try {
    siteRes = await axios.post(
      'https://api.netlify.com/api/v1/sites',
      { name: cleanName },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    const msg = err.response?.data?.errors?.name?.[0] || err.message;
    throw new Error(`Gagal membuat site Netlify: ${msg}`);
  }

  const siteId = siteRes.data.id;
  const siteName = siteRes.data.name;

  // Buat zip buffer dari HTML
  const zipBuffer = await createZipFromHtml(htmlContent);

  // Upload zip ke Netlify sebagai deployment
  try {
    await axios.post(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      zipBuffer,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/zip',
          'Content-Length': zipBuffer.length,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Gagal upload ke Netlify: ${msg}`);
  }

  const url = `https://${siteName}.netlify.app`;
  return { url };
}

/**
 * Buat zip buffer yang berisi index.html dari htmlContent
 */
function createZipFromHtml(htmlContent) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const passThrough = new PassThrough();

    passThrough.on('data', (chunk) => buffers.push(chunk));
    passThrough.on('end', () => resolve(Buffer.concat(buffers)));
    passThrough.on('error', reject);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.pipe(passThrough);

    // Tambahkan index.html ke dalam zip
    archive.append(htmlContent, { name: 'index.html' });
    archive.finalize();
  });
}

module.exports = { deployToNetlify };
