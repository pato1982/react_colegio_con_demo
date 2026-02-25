const express = require('express');
const { execSync, exec } = require('child_process');
const router = express.Router();

const PROJECT_DIR = '/var/www/colegio-react';

// Helper: ejecutar comando sync con timeout
function shell(cmd, timeout = 5000) {
  try {
    return execSync(cmd, { timeout, cwd: PROJECT_DIR }).toString().trim();
  } catch (e) {
    return { error: e.stderr?.toString().trim() || e.message };
  }
}

// Helper: ejecutar comando async con timeout
function shellAsync(cmd, timeout = 30000) {
  return new Promise((resolve) => {
    const child = exec(cmd, { timeout, cwd: PROJECT_DIR }, (err, stdout, stderr) => {
      if (err) {
        resolve({ error: stderr?.trim() || err.message, stdout: stdout?.trim() });
      } else {
        resolve({ ok: true, output: stdout?.trim() });
      }
    });
  });
}

// GET /api/deploy/git-log — Últimos 15 commits
router.get('/deploy/git-log', (req, res) => {
  const result = shell('git log --oneline -15', 5000);
  if (result?.error) return res.json({ error: result.error, commits: [] });

  const commits = result.split('\n').filter(Boolean).map(line => {
    const hash = line.substring(0, 7);
    const message = line.substring(8);
    return { hash, message };
  });
  res.json({ commits });
});

// GET /api/deploy/git-status — Branch, cambios, ahead/behind
router.get('/deploy/git-status', (req, res) => {
  const branch = shell('git rev-parse --abbrev-ref HEAD');
  const status = shell('git status --porcelain');
  const lastCommit = shell('git log -1 --format="%H|%s|%cr"');

  // Fetch para obtener ahead/behind (si falla, no importa)
  shell('git fetch origin --quiet 2>/dev/null', 10000);
  const ahead = shell('git rev-list HEAD --not origin/master --count 2>/dev/null');
  const behind = shell('git rev-list origin/master --not HEAD --count 2>/dev/null');

  let last = {};
  if (lastCommit && !lastCommit.error) {
    const parts = lastCommit.split('|');
    last = { hash: parts[0]?.substring(0, 7), message: parts[1], time: parts[2] };
  }

  const hasChanges = status && !status.error && status.length > 0;
  const changedFiles = hasChanges ? status.split('\n').filter(Boolean).length : 0;

  res.json({
    branch: branch?.error ? 'unknown' : branch,
    hasChanges,
    changedFiles,
    ahead: parseInt(ahead) || 0,
    behind: parseInt(behind) || 0,
    lastCommit: last
  });
});

// POST /api/deploy/pull — git pull origin master
router.post('/deploy/pull', async (req, res) => {
  const result = await shellAsync('git pull origin master 2>&1', 30000);
  res.json(result);
});

// POST /api/deploy/build — Build vite (portal y/o tech-admin)
router.post('/deploy/build', async (req, res) => {
  const { target = 'both' } = req.body; // 'main', 'tech', 'both'
  const outputs = [];

  if (target === 'main' || target === 'both') {
    outputs.push({ step: 'Build portal', ...(await shellAsync(
      `cd ${PROJECT_DIR} && npx vite build 2>&1`, 120000
    ))});
  }

  if (target === 'tech' || target === 'both') {
    outputs.push({ step: 'Build tech-admin', ...(await shellAsync(
      `cd ${PROJECT_DIR}/tech-admin/client && npx vite build 2>&1`, 120000
    ))});
  }

  const allOk = outputs.every(o => o.ok);
  res.json({ ok: allOk, steps: outputs });
});

// POST /api/deploy/restart — pm2 restart all
router.post('/deploy/restart', (req, res) => {
  const result = shell('pm2 restart all 2>&1', 10000);
  if (result?.error) return res.json({ error: result.error });
  res.json({ ok: true, output: result });
});

// POST /api/deploy/full — Pull → Build → Restart secuencial
router.post('/deploy/full', async (req, res) => {
  const steps = [];

  // Step 1: Pull
  steps.push({ step: 'git pull', ...(await shellAsync('git pull origin master 2>&1', 30000)) });
  if (!steps[0].ok) return res.json({ ok: false, steps, failedAt: 'pull' });

  // Step 2: Build portal
  steps.push({ step: 'Build portal', ...(await shellAsync(
    `cd ${PROJECT_DIR} && npx vite build 2>&1`, 120000
  ))});
  if (!steps[1].ok) return res.json({ ok: false, steps, failedAt: 'build-main' });

  // Step 3: Build tech-admin
  steps.push({ step: 'Build tech-admin', ...(await shellAsync(
    `cd ${PROJECT_DIR}/tech-admin/client && npx vite build 2>&1`, 120000
  ))});
  if (!steps[2].ok) return res.json({ ok: false, steps, failedAt: 'build-tech' });

  // Step 4: Restart
  const restart = shell('pm2 restart all 2>&1', 10000);
  steps.push({ step: 'pm2 restart', ok: !restart?.error, output: restart?.error ? restart.error : restart });

  res.json({ ok: steps.every(s => s.ok), steps });
});

// GET /api/deploy/swap — Estado swap
router.get('/deploy/swap', (req, res) => {
  const swapon = shell('swapon --show 2>/dev/null');
  const free = shell('free -h');
  const active = swapon && !swapon.error && swapon.length > 0 && swapon !== '';

  res.json({ active, swapon: active ? swapon : null, free: free?.error ? null : free });
});

// POST /api/deploy/swap — Activar swap 1GB
router.post('/deploy/swap', async (req, res) => {
  // Check if swap already active
  const check = shell('swapon --show 2>/dev/null');
  if (check && !check.error && check.length > 10) {
    return res.json({ ok: true, message: 'Swap ya está activo', alreadyActive: true });
  }

  const result = await shellAsync(
    'fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile 2>&1',
    15000
  );
  res.json(result);
});

// GET /api/deploy/ssl — Info certificado SSL
router.get('/deploy/ssl', (req, res) => {
  // Buscar cert en ubicación estándar Let's Encrypt / certbot
  const certPaths = [
    '/etc/letsencrypt/live',
    '/etc/ssl/certs',
    '/etc/nginx/ssl'
  ];

  // Intentar leer info del certificado desde nginx config
  const nginxConf = shell('grep -r ssl_certificate /etc/nginx/sites-available/ 2>/dev/null | grep -v snakeoil | head -1');
  let certPath = null;

  if (nginxConf && !nginxConf.error) {
    const match = nginxConf.match(/ssl_certificate\s+([^;]+)/);
    if (match) certPath = match[1].trim();
  }

  if (!certPath) {
    return res.json({ error: 'No se encontró certificado SSL configurado' });
  }

  const certInfo = shell(`openssl x509 -in ${certPath} -noout -dates -subject 2>/dev/null`);
  if (!certInfo || certInfo.error) {
    return res.json({ certPath, error: 'No se pudo leer el certificado' });
  }

  const lines = certInfo.split('\n');
  let notBefore = null, notAfter = null, subject = null;
  for (const line of lines) {
    if (line.startsWith('notBefore=')) notBefore = line.replace('notBefore=', '');
    if (line.startsWith('notAfter=')) notAfter = line.replace('notAfter=', '');
    if (line.startsWith('subject=')) subject = line.replace('subject=', '').trim();
  }

  let daysRemaining = null;
  if (notAfter) {
    const expDate = new Date(notAfter);
    daysRemaining = Math.floor((expDate - Date.now()) / (1000 * 60 * 60 * 24));
  }

  res.json({ certPath, notBefore, notAfter, daysRemaining, subject });
});

// POST /api/deploy/cache-clear — Limpiar caché (restart backend)
router.post('/deploy/cache-clear', (req, res) => {
  const result = shell('pm2 restart colegio-backend 2>&1', 10000);
  if (result?.error) return res.json({ error: result.error });
  res.json({ ok: true, message: 'Backend reiniciado. Caché limpiado, warmup en ~3s.' });
});

module.exports = router;
