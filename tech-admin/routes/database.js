const express = require('express');
const { execSync } = require('child_process');
const { pool } = require('../../server/config/database');
const router = express.Router();

// GET /api/db/tables — Lista tablas con conteo de filas y tamaño
router.get('/db/tables', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.TABLE_NAME as name,
        t.TABLE_ROWS as rows_approx,
        ROUND((t.DATA_LENGTH + t.INDEX_LENGTH) / 1024, 1) as size_kb,
        t.AUTO_INCREMENT as auto_increment,
        t.TABLE_COMMENT as comment,
        t.UPDATE_TIME as last_update
      FROM information_schema.TABLES t
      WHERE t.TABLE_SCHEMA = DATABASE()
      ORDER BY t.TABLE_NAME
    `);
    res.json({ tables: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/db/table/:name — Describe tabla (columnas, tipos, índices)
router.get('/db/table/:name', async (req, res) => {
  const table = req.params.name.replace(/[^a-zA-Z0-9_]/g, '');
  try {
    const [columns] = await pool.query(`
      SELECT
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_KEY as key_type,
        COLUMN_DEFAULT as default_value,
        EXTRA as extra
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [table]);

    const [indices] = await pool.query(`SHOW INDEX FROM \`${table}\``);

    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM \`${table}\``);

    res.json({
      table,
      columns,
      indices,
      totalRows: countResult[0].total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/db/table/:name/data — SELECT con paginación y filtros
router.get('/db/table/:name/data', async (req, res) => {
  const table = req.params.name.replace(/[^a-zA-Z0-9_]/g, '');
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const orderBy = (req.query.orderBy || 'id').replace(/[^a-zA-Z0-9_]/g, '');
  const orderDir = req.query.orderDir === 'DESC' ? 'DESC' : 'ASC';

  try {
    // Obtener columnas para saber qué buscar
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME as name, DATA_TYPE as type
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [table]);

    let whereClause = '';
    let params = [];

    if (search) {
      const textCols = cols.filter(c =>
        ['varchar', 'text', 'char', 'enum', 'longtext', 'mediumtext'].includes(c.type)
      );
      if (textCols.length > 0) {
        const conditions = textCols.map(c => `\`${c.name}\` LIKE ?`);
        whereClause = `WHERE ${conditions.join(' OR ')}`;
        params = textCols.map(() => `%${search}%`);
      }
    }

    // Verificar que la columna de orden existe
    const validCol = cols.find(c => c.name === orderBy);
    const safeOrder = validCol ? orderBy : cols[0]?.name || 'id';

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM \`${table}\` ${whereClause}`, params
    );
    const total = countResult[0].total;

    const [rows] = await pool.query(
      `SELECT * FROM \`${table}\` ${whereClause} ORDER BY \`${safeOrder}\` ${orderDir} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/db/query — Ejecutar query SQL (solo SELECT)
router.post('/db/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ error: 'Query SQL requerida' });
  }

  // Sanitizar: solo SELECT, SHOW, DESCRIBE, EXPLAIN
  const trimmed = sql.trim().toUpperCase();
  const allowed = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN'];
  if (!allowed.some(cmd => trimmed.startsWith(cmd))) {
    return res.status(403).json({ error: 'Solo se permiten consultas de lectura (SELECT, SHOW, DESCRIBE, EXPLAIN)' });
  }

  // Bloquear subqueries peligrosas
  const dangerous = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|INTO\s+OUTFILE|INTO\s+DUMPFILE|LOAD_FILE)\b/i;
  if (dangerous.test(sql)) {
    return res.status(403).json({ error: 'Query contiene operaciones no permitidas' });
  }

  try {
    const start = Date.now();
    const [rows, fields] = await pool.query(sql);
    const duration = Date.now() - start;

    res.json({
      data: Array.isArray(rows) ? rows.slice(0, 500) : rows,
      fields: fields?.map(f => ({ name: f.name, type: f.type })),
      rowCount: Array.isArray(rows) ? rows.length : 0,
      truncated: Array.isArray(rows) && rows.length > 500,
      durationMs: duration
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/db/stats — Tamaño total BD, conexiones, status
router.get('/db/stats', async (req, res) => {
  try {
    const [sizeResult] = await pool.query(`
      SELECT
        ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as total_mb,
        ROUND(SUM(DATA_LENGTH) / 1024 / 1024, 2) as data_mb,
        ROUND(SUM(INDEX_LENGTH) / 1024 / 1024, 2) as index_mb,
        COUNT(*) as table_count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
    `);

    const [processResult] = await pool.query('SHOW PROCESSLIST');
    const [statusResult] = await pool.query("SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Queries','Slow_queries','Uptime','Questions')");
    const [varsResult] = await pool.query("SHOW VARIABLES WHERE Variable_name IN ('max_connections','version','innodb_buffer_pool_size')");

    const statusMap = {};
    statusResult.forEach(r => { statusMap[r.Variable_name] = r.Value; });
    const varsMap = {};
    varsResult.forEach(r => { varsMap[r.Variable_name] = r.Value; });

    res.json({
      size: sizeResult[0],
      connections: {
        active: processResult.length,
        max: parseInt(varsMap.max_connections) || 0
      },
      status: {
        threads: parseInt(statusMap.Threads_connected) || 0,
        queries: parseInt(statusMap.Questions) || 0,
        slowQueries: parseInt(statusMap.Slow_queries) || 0,
        uptime: parseInt(statusMap.Uptime) || 0
      },
      version: varsMap.version,
      bufferPoolMB: Math.round((parseInt(varsMap.innodb_buffer_pool_size) || 0) / 1024 / 1024)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/db/indices — Todos los índices
router.get('/db/indices', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        TABLE_NAME as table_name,
        INDEX_NAME as index_name,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns,
        NON_UNIQUE as non_unique,
        INDEX_TYPE as type,
        CARDINALITY as cardinality
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE, INDEX_TYPE, CARDINALITY
      ORDER BY TABLE_NAME, INDEX_NAME
    `);
    res.json({ indices: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/db/backup — Ejecutar mysqldump
router.post('/db/backup', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `portal_estudiantil_${timestamp}.sql`;
    const filepath = `/var/backups/${filename}`;

    execSync(
      `mysqldump -u root -p'9Il2cmw4PgSQ10V' portal_estudiantil > ${filepath}`,
      { timeout: 60000 }
    );

    const stat = require('fs').statSync(filepath);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

    res.json({ ok: true, filename, filepath, sizeMB });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
