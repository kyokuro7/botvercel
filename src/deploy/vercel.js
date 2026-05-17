const axios = require('axios');

/**
 * Deploy HTML ke Vercel menggunakan Vercel API
 * @param {string} projectName - Nama project
 * @param {string} htmlContent - Konten file HTML
 * @returns {Promise<{url: string}>}
 */
async function deployToVercel(projectName, htmlContent) {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    throw new Error('VERCEL_TOKEN belum diset di file .env');
  }

  // Bersihkan nama project: huruf kecil, ganti spasi/underscore dengan strip
  const cleanName = projectName
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 52);

  // Buat deployment via Vercel API v13
  const response = await axios.post(
    'https://api.vercel.com/v13/deployments',
    {
      name: cleanName,
      target: 'production',
      files: [
        {
          file: 'index.html',
          data: htmlContent,
          encoding: 'utf-8',
        },
      ],
      projectSettings: {
        framework: null,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const deployment = response.data;

  // Tunggu deployment selesai
  const url = await waitForVercelDeployment(deployment.id, token);

  return { url };
}

/**
 * Polling status deployment Vercel sampai selesai
 */
async function waitForVercelDeployment(deploymentId, token, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(3000); // tunggu 3 detik tiap cek

    const res = await axios.get(
      `https://api.vercel.com/v13/deployments/${deploymentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { readyState, url } = res.data;

    if (readyState === 'READY') {
      return `https://${url}`;
    }

    if (readyState === 'ERROR' || readyState === 'CANCELED') {
      throw new Error(`Deployment Vercel gagal dengan status: ${readyState}`);
    }
  }

  throw new Error('Deployment Vercel timeout. Cek dashboard Vercel kamu.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { deployToVercel };
