const express = require('express');
const os = require('os');
const { execSync } = require('child_process');
const router = express.Router();

// Helper: ejecutar comando shell y devolver stdout
function shell(cmd) {
  try {
    return execSync(cmd, { timeout: 5000 }).toString().trim();
  } catch {
    return null;
  }
}

// GET /api/system — RAM, CPU, disco, uptime, swap
router.get('/system', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // CPU load averages
  const loadAvg = os.loadavg();
  const cpus = os.cpus();

  // Disco
  let disk = null;
  const dfOut = shell("df -h / | tail -1");
  if (dfOut) {
    const parts = dfOut.split(/\s+/);
    disk = { total: parts[1], used: parts[2], available: parts[3], usePercent: parts[4] };
  }

  // Swap
  let swap = null;
  const swapOut = shell("free -m | grep Swap");
  if (swapOut) {
    const parts = swapOut.split(/\s+/);
    swap = { totalMB: parseInt(parts[1]), usedMB: parseInt(parts[2]), freeMB: parseInt(parts[3]) };
  }

  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime(),
    ram: {
      totalMB: Math.round(totalMem / 1024 / 1024),
      usedMB: Math.round(usedMem / 1024 / 1024),
      freeMB: Math.round(freeMem / 1024 / 1024),
      usePercent: Math.round((usedMem / totalMem) * 100)
    },
    cpu: {
      model: cpus[0]?.model,
      cores: cpus.length,
      loadAvg: { '1m': loadAvg[0].toFixed(2), '5m': loadAvg[1].toFixed(2), '15m': loadAvg[2].toFixed(2) }
    },
    disk,
    swap
  });
});

// GET /api/pm2 — Estado de procesos PM2
router.get('/pm2', (req, res) => {
  const raw = shell("pm2 jlist");
  if (!raw) return res.json({ processes: [], error: 'No se pudo obtener info de PM2' });

  try {
    const processes = JSON.parse(raw).map(p => ({
      name: p.name,
      pid: p.pid,
      status: p.pm2_env?.status,
      cpu: p.monit?.cpu,
      memoryMB: p.monit?.memory ? Math.round(p.monit.memory / 1024 / 1024) : 0,
      uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
      restarts: p.pm2_env?.restart_time
    }));
    res.json({ processes });
  } catch {
    res.json({ processes: [], error: 'Error parseando PM2' });
  }
});

// POST /api/pm2/restart/:name — Reiniciar un proceso PM2
router.post('/pm2/restart/:name', (req, res) => {
  const { name } = req.params;
  // Solo permitir reiniciar procesos conocidos
  const allowed = ['colegio-backend', 'colegio-frontend', 'tech-admin'];
  if (!allowed.includes(name)) {
    return res.status(400).json({ error: 'Proceso no permitido' });
  }
  const result = shell(`pm2 restart ${name}`);
  if (result !== null) {
    res.json({ ok: true, message: `Proceso ${name} reiniciado` });
  } else {
    res.status(500).json({ error: `Error reiniciando ${name}` });
  }
});

// GET /api/cache — Info del caché del backend principal
router.get('/cache', (req, res) => {
  try {
    const cache = require('../../server/cache');
    // Acceder al Map interno a través del módulo
    const cacheModule = require.cache[require.resolve('../../server/cache')];
    const cacheMap = cacheModule?.exports?._getMap ? cacheModule.exports._getMap() : null;

    // Intentar obtener stats via HTTP al backend principal
    const http = require('http');
    http.get('http://localhost:3001/api/health', (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        res.json({
          backendStatus: resp.statusCode === 200 ? 'online' : 'error',
          note: 'El caché vive en el proceso del backend principal (puerto 3001). No es accesible directamente desde este proceso.'
        });
      });
    }).on('error', () => {
      res.json({
        backendStatus: 'offline',
        note: 'Backend principal no responde'
      });
    });
  } catch {
    res.json({ error: 'No se pudo acceder al caché' });
  }
});

// GET /api/nginx — Estado de nginx
router.get('/nginx', (req, res) => {
  const status = shell("systemctl is-active nginx");
  const configTest = shell("nginx -t 2>&1");

  res.json({
    active: status === 'active',
    status: status || 'unknown',
    configValid: configTest?.includes('successful') || false,
    configTest
  });
});

// GET /api/health — Health check del backend principal
router.get('/health', (req, res) => {
  const http = require('http');
  const start = Date.now();

  http.get('http://localhost:3001/api/establecimientos', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      res.json({
        status: resp.statusCode === 200 ? 'ok' : 'error',
        statusCode: resp.statusCode,
        responseTimeMs: Date.now() - start
      });
    });
  }).on('error', (err) => {
    res.json({
      status: 'offline',
      error: err.message,
      responseTimeMs: Date.now() - start
    });
  });
});

module.exports = router;
