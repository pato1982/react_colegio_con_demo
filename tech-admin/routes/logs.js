const express = require('express');
const { execSync } = require('child_process');
const { pool } = require('../../server/config/database');
const router = express.Router();

// GET /api/logs/stats — Actividad por hora/día, módulos más activos (ANTES de :id pattern)
router.get('/logs/stats', async (req, res) => {
  try {
    // Actividad por hora (últimas 24h)
    const [byHour] = await pool.query(`
      SELECT HOUR(fecha_hora) as hour, COUNT(*) as count
      FROM tb_log_actividades
      WHERE fecha_hora >= NOW() - INTERVAL 24 HOUR
      GROUP BY HOUR(fecha_hora)
      ORDER BY hour
    `);

    // Actividad por día (últimos 7 días)
    const [byDay] = await pool.query(`
      SELECT DATE(fecha_hora) as day, COUNT(*) as count
      FROM tb_log_actividades
      WHERE fecha_hora >= NOW() - INTERVAL 7 DAY
      GROUP BY DATE(fecha_hora)
      ORDER BY day
    `);

    // Módulos más activos
    const [byModule] = await pool.query(`
      SELECT modulo, COUNT(*) as count
      FROM tb_log_actividades
      GROUP BY modulo
      ORDER BY count DESC
      LIMIT 10
    `);

    // Acciones más frecuentes
    const [byAction] = await pool.query(`
      SELECT accion, COUNT(*) as count
      FROM tb_log_actividades
      GROUP BY accion
      ORDER BY count DESC
      LIMIT 10
    `);

    // Total
    const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM tb_log_actividades');

    res.json({
      total: totalResult[0].total,
      byHour,
      byDay,
      byModule,
      byAction
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/errors — Últimos errores del PM2 error log
router.get('/logs/errors', (req, res) => {
  const lines = Math.min(200, parseInt(req.query.lines) || 50);
  try {
    const backendLog = execSync(`tail -${lines} /root/.pm2/logs/colegio-backend-error.log 2>/dev/null || echo ""`, { timeout: 5000 }).toString();
    const techLog = execSync(`tail -${lines} /root/.pm2/logs/tech-admin-error.log 2>/dev/null || echo ""`, { timeout: 5000 }).toString();

    res.json({
      backend: backendLog.split('\n').filter(l => l.trim()).slice(-lines),
      techAdmin: techLog.split('\n').filter(l => l.trim()).slice(-lines)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/login-attempts — Intentos de login fallidos
router.get('/logs/login-attempts', async (req, res) => {
  const { page = 1, limit = 25, motivo, search } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 25);
  const realLimit = Math.min(100, parseInt(limit) || 25);

  let where = ['1=1'];
  let params = [];

  if (motivo) {
    where.push('motivo_fallo = ?');
    params.push(motivo);
  }
  if (search) {
    where.push('(email_ingresado LIKE ? OR ip_address LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.join(' AND ');

  try {
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM tb_intentos_login_fallidos WHERE ${whereClause}`, params
    );

    const [rows] = await pool.query(`
      SELECT id, email_ingresado, tipo_usuario_intentado, motivo_fallo,
             ip_address, navegador, fecha_intento, es_sospechoso
      FROM tb_intentos_login_fallidos
      WHERE ${whereClause}
      ORDER BY fecha_intento DESC
      LIMIT ? OFFSET ?
    `, [...params, realLimit, offset]);

    // Stats de motivos
    const [motivoStats] = await pool.query(`
      SELECT motivo_fallo, COUNT(*) as count
      FROM tb_intentos_login_fallidos
      GROUP BY motivo_fallo
      ORDER BY count DESC
    `);

    const total = countResult[0].total;
    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: realLimit, total, totalPages: Math.ceil(total / realLimit) },
      motivoStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs — Lista paginada con filtros
router.get('/logs', async (req, res) => {
  const { page = 1, limit = 30, usuario, modulo, accion, search } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 30);
  const realLimit = Math.min(100, parseInt(limit) || 30);

  let where = ['1=1'];
  let params = [];

  if (usuario) {
    where.push('(nombre_usuario LIKE ? OR usuario_id = ?)');
    params.push(`%${usuario}%`, parseInt(usuario) || 0);
  }
  if (modulo) {
    where.push('modulo = ?');
    params.push(modulo);
  }
  if (accion) {
    where.push('accion = ?');
    params.push(accion);
  }
  if (search) {
    where.push('(descripcion LIKE ? OR nombre_usuario LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.join(' AND ');

  try {
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM tb_log_actividades WHERE ${whereClause}`, params
    );

    const [rows] = await pool.query(`
      SELECT id, usuario_id, tipo_usuario, nombre_usuario, accion, modulo,
             descripcion, entidad_tipo, entidad_id, ip_address, fecha_hora
      FROM tb_log_actividades
      WHERE ${whereClause}
      ORDER BY fecha_hora DESC
      LIMIT ? OFFSET ?
    `, [...params, realLimit, offset]);

    const total = countResult[0].total;
    res.json({
      data: rows,
      pagination: { page: parseInt(page), limit: realLimit, total, totalPages: Math.ceil(total / realLimit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
