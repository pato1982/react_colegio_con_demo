const express = require('express');
const { pool } = require('../../server/config/database');
const router = express.Router();

// GET /api/consultas/stats — Conteos por estado (ANTES de :id)
router.get('/consultas/stats', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        estado,
        COUNT(*) as count
      FROM tb_consultas_contacto
      WHERE activo = 1
      GROUP BY estado
    `);
    const stats = { pendiente: 0, en_proceso: 0, respondida: 0, cerrada: 0, total: 0 };
    rows.forEach(r => {
      stats[r.estado] = r.count;
      stats.total += r.count;
    });

    // Tiempo promedio respuesta (solo respondidas)
    const [avgResult] = await pool.query(`
      SELECT AVG(TIMESTAMPDIFF(HOUR, fecha_envio, fecha_respuesta)) as avg_hours
      FROM tb_consultas_contacto
      WHERE activo = 1 AND fecha_respuesta IS NOT NULL
    `);
    stats.avgResponseHours = avgResult[0].avg_hours ? Math.round(avgResult[0].avg_hours) : null;

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/consultas — Lista con filtros
router.get('/consultas', async (req, res) => {
  const { estado, search, page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit) || 20);
  const realLimit = Math.min(50, parseInt(limit) || 20);

  let where = ['activo = 1'];
  let params = [];

  if (estado) {
    where.push('estado = ?');
    params.push(estado);
  }
  if (search) {
    where.push('(nombre_solicitante LIKE ? OR correo LIKE ? OR consulta LIKE ? OR establecimiento LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = where.join(' AND ');

  try {
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM tb_consultas_contacto WHERE ${whereClause}`, params
    );

    const [rows] = await pool.query(`
      SELECT id, nombre_solicitante, establecimiento, correo, telefono,
             LEFT(consulta, 120) as consulta_preview, estado, fecha_envio, fecha_respuesta
      FROM tb_consultas_contacto
      WHERE ${whereClause}
      ORDER BY FIELD(estado, 'pendiente', 'en_proceso', 'respondida', 'cerrada'), fecha_envio DESC
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

// GET /api/consultas/:id — Detalle completo
router.get('/consultas/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tb_consultas_contacto WHERE id = ? AND activo = 1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Consulta no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/consultas/:id/responder — Responder y enviar email
router.put('/consultas/:id/responder', async (req, res) => {
  const { respuesta } = req.body;
  if (!respuesta || !respuesta.trim()) {
    return res.status(400).json({ error: 'Respuesta requerida' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM tb_consultas_contacto WHERE id = ? AND activo = 1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Consulta no encontrada' });

    const consulta = rows[0];

    await pool.query(`
      UPDATE tb_consultas_contacto
      SET respuesta = ?, estado = 'respondida', fecha_respuesta = NOW(), respondido_por = 0
      WHERE id = ?
    `, [respuesta.trim(), req.params.id]);

    // Enviar email al solicitante
    let emailSent = false;
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: 'contacto.portalestudiantil@gmail.com', pass: 'saqn mzva wpwx fnxg' }
      });
      await transporter.sendMail({
        from: '"Portal Estudiantil" <contacto.portalestudiantil@gmail.com>',
        to: consulta.correo,
        subject: 'Respuesta a su consulta - Portal Estudiantil',
        replyTo: 'contacto.portalestudiantil@gmail.com',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#1a56db,#2563eb);padding:20px;border-radius:8px 8px 0 0">
              <h2 style="color:#fff;margin:0">Respuesta a su consulta</h2>
            </div>
            <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
              <p>Estimado/a <strong>${consulta.nombre_solicitante}</strong>,</p>
              <p>Hemos recibido su consulta y le respondemos a continuación:</p>
              <div style="background:#fff;border-left:4px solid #2563eb;padding:12px 16px;margin:16px 0;border-radius:4px">
                <p style="color:#64748b;font-size:13px;margin:0 0 8px">Su consulta:</p>
                <p style="margin:0">${consulta.consulta}</p>
              </div>
              <div style="background:#fff;border-left:4px solid #16a34a;padding:12px 16px;margin:16px 0;border-radius:4px">
                <p style="color:#64748b;font-size:13px;margin:0 0 8px">Nuestra respuesta:</p>
                <p style="margin:0">${respuesta.trim().replace(/\n/g, '<br>')}</p>
              </div>
              <p style="color:#64748b;font-size:13px;margin-top:20px">Si tiene más preguntas, puede responder directamente a este correo.</p>
            </div>
          </div>
        `
      });
      emailSent = true;
    } catch (emailErr) {
      console.error('Error enviando email de respuesta:', emailErr.message);
    }

    res.json({ ok: true, emailSent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/consultas/:id/estado — Cambiar estado
router.put('/consultas/:id/estado', async (req, res) => {
  const { estado } = req.body;
  const valid = ['pendiente', 'en_proceso', 'respondida', 'cerrada'];
  if (!valid.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE tb_consultas_contacto SET estado = ? WHERE id = ? AND activo = 1',
      [estado, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Consulta no encontrada' });
    res.json({ ok: true, estado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/consultas/:id — Soft delete
router.delete('/consultas/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE tb_consultas_contacto SET activo = 0 WHERE id = ? AND activo = 1',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Consulta no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
