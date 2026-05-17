const axios = require('axios');

const BASE_URL = 'https://api.vercel.com';

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bersihkan nama project
 */
function cleanProjectName(name) {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 52);
}

/**
 * Deploy HTML/ZIP ke Vercel
 */
async function deployToVercel(projectName, htmlContent) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN belum diset di file .env');

  const cleanName = cleanProjectName(projectName);

  const response = await axios.post(
    `${BASE_URL}/v13/deployments`,
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
      projectSettings: { framework: null },
    },
    { headers: getHeaders(token) }
  );

  const url = await waitForVercelDeployment(response.data.id, token);
  return { url, projectId: response.data.projectId, name: cleanName };
}

/**
 * Deploy ZIP ke Vercel (multi-file)
 */
async function deployZipToVercel(projectName, files) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN belum diset di file .env');

  const cleanName = cleanProjectName(projectName);

  const response = await axios.post(
    `${BASE_URL}/v13/deployments`,
    {
      name: cleanName,
      target: 'production',
      files,
      projectSettings: { framework: null },
    },
    { headers: getHeaders(token) }
  );

  const url = await waitForVercelDeployment(response.data.id, token);
  return { url, projectId: response.data.projectId, name: cleanName };
}

/**
 * List semua project Vercel
 */
async function listVercelProjects() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN belum diset di file .env');

  const res = await axios.get(`${BASE_URL}/v9/projects?limit=20`, {
    headers: getHeaders(token),
  });

  return res.data.projects.map((p) => ({
    id: p.id,
    name: p.name,
    url: p.alias?.[0]?.domain ? `https://${p.alias[0].domain}` : null,
  }));
}

/**
 * Hapus project Vercel
 */
async function deleteVercelProject(projectId) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN belum diset di file .env');

  await axios.delete(`${BASE_URL}/v9/projects/${projectId}`, {
    headers: getHeaders(token),
  });
}

/**
 * Rename project Vercel
 */
async function renameVercelProject(projectId, newName) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN belum diset di file .env');

  const cleanName = cleanProjectName(newName);

  const res = await axios.patch(
    `${BASE_URL}/v9/projects/${projectId}`,
    { name: cleanName },
    { headers: getHeaders(token) }
  );

  return { name: res.data.name };
}

/**
 * Update/redeploy project Vercel dengan file baru
 */
async function updateVercelProject(projectName, files) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN belum diset di file .env');

  const response = await axios.post(
    `${BASE_URL}/v13/deployments`,
    {
      name: cleanProjectName(projectName),
      target: 'production',
      files,
      projectSettings: { framework: null },
    },
    { headers: getHeaders(token) }
  );

  const url = await waitForVercelDeployment(response.data.id, token);
  return { url };
}

/**
 * Polling status deployment Vercel
 */
async function waitForVercelDeployment(deploymentId, token, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(3000);

    const res = await axios.get(
      `${BASE_URL}/v13/deployments/${deploymentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { readyState, url, alias } = res.data;

    if (readyState === 'READY') {
      if (alias && alias.length > 0) {
        const cleanAlias = alias
          .filter((a) => a.endsWith('.vercel.app'))
          .sort((a, b) => a.length - b.length)[0];
        if (cleanAlias) return `https://${cleanAlias}`;
      }
      return `https://${url}`;
    }

    if (readyState === 'ERROR' || readyState === 'CANCELED') {
      throw new Error(`Deployment Vercel gagal dengan status: ${readyState}`);
    }
  }

  throw new Error('Deployment Vercel timeout. Cek dashboard Vercel kamu.');
}

module.exports = {
  deployToVercel,
  deployZipToVercel,
  listVercelProjects,
  deleteVercelProject,
  renameVercelProject,
  updateVercelProject,
};
