const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../server/config/database');
const router = express.Router();

// JWT secret del backend principal (para impersonar)
const MAIN_JWT_SECRET = process.env.JWT_SECRET || 'portal_estudiantil_secret_key_2024';

// Helper: obtener perfil según tipo
async function getProfile(usuarioId, tipo) {
  const tableMap = {
    administrador: 'tb_administradores',
    docente: 'tb_docentes',
    apoderado: 'tb_apoderados'
  };
  const table = tableMap[tipo];
  if (!table) return null;
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE usuario_id = ?`, [usuarioId]);
  return rows[0] || null;
}

// GET /api/users — Lista usuarios con filtros
router.get('/users', async (req, res) => {
  const { tipo, activo, search, page = 1, limit = 25 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 25);
  const realLimit = Math.min(100, parseInt(limit) || 25);

  let where = ['1=1'];
  let params = [];

  if (tipo) {
    where.push('u.tipo_usuario = ?');
    params.push(tipo);
  }
  if (activo !== undefined && activo !== '') {
    where.push('u.activo = ?');
    params.push(parseInt(activo));
  }
  if (search) {
    where.push(`(u.email LIKE ? OR COALESCE(p_d.nombres, p_a.nombres, p_ad.nombres, '') LIKE ? OR COALESCE(p_d.apellidos, p_a.apellidos, p_ad.apellidos, '') LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = where.join(' AND ');

  try {
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM tb_usuarios u
      LEFT JOIN tb_docentes p_d ON u.id = p_d.usuario_id AND u.tipo_usuario = 'docente'
      LEFT JOIN tb_apoderados p_a ON u.id = p_a.usuario_id AND u.tipo_usuario = 'apoderado'
      LEFT JOIN tb_administradores p_ad ON u.id = p_ad.usuario_id AND u.tipo_usuario = 'administrador'
      WHERE ${whereClause}
    `, params);

    const [rows] = await pool.query(`
      SELECT
        u.id, u.email, u.tipo_usuario, u.activo, u.ultimo_acceso, u.fecha_creacion,
        u.intentos_fallidos, u.bloqueado_hasta, u.email_verificado,
        COALESCE(p_d.nombres, p_a.nombres, p_ad.nombres) as nombres,
        COALESCE(p_d.apellidos, p_a.apellidos, p_ad.apellidos) as apellidos,
        COALESCE(p_d.rut, p_a.rut, p_ad.rut) as rut
      FROM tb_usuarios u
      LEFT JOIN tb_docentes p_d ON u.id = p_d.usuario_id AND u.tipo_usuario = 'docente'
      LEFT JOIN tb_apoderados p_a ON u.id = p_a.usuario_id AND u.tipo_usuario = 'apoderado'
      LEFT JOIN tb_administradores p_ad ON u.id = p_ad.usuario_id AND u.tipo_usuario = 'administrador'
      WHERE ${whereClause}
      ORDER BY u.id DESC
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

// GET /api/users/sessions — Sesiones activas (ANTES de :id para evitar conflicto)
router.get('/users/sessions', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id, s.usuario_id, s.tipo_usuario, s.ip_address, s.navegador,
        s.sistema_operativo, s.fecha_login, s.fecha_ultima_actividad,
        u.email,
        COALESCE(p_d.nombres, p_a.nombres, p_ad.nombres) as nombres,
        COALESCE(p_d.apellidos, p_a.apellidos, p_ad.apellidos) as apellidos
      FROM tb_sesiones s
      JOIN tb_usuarios u ON s.usuario_id = u.id
      LEFT JOIN tb_docentes p_d ON u.id = p_d.usuario_id AND u.tipo_usuario = 'docente'
      LEFT JOIN tb_apoderados p_a ON u.id = p_a.usuario_id AND u.tipo_usuario = 'apoderado'
      LEFT JOIN tb_administradores p_ad ON u.id = p_ad.usuario_id AND u.tipo_usuario = 'administrador'
      WHERE s.activa = 1
      ORDER BY s.fecha_login DESC
    `);
    res.json({ sessions: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/sessions/:id — Forzar logout
router.delete('/users/sessions/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE tb_sesiones SET activa = 0, fecha_logout = NOW(), tipo_logout = 'forzado' WHERE id = ? AND activa = 1",
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Sesión no encontrada o ya cerrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id — Detalle completo
router.get('/users/:id', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM tb_usuarios WHERE id = ?', [req.params.id]);
    if (!users.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const usuario = users[0];
    delete usuario.password_hash;

    const perfil = await getProfile(usuario.id, usuario.tipo_usuario);

    // Sesiones recientes
    const [sesiones] = await pool.query(`
      SELECT id, ip_address, navegador, sistema_operativo, fecha_login, fecha_logout, activa
      FROM tb_sesiones WHERE usuario_id = ? ORDER BY fecha_login DESC LIMIT 10
    `, [usuario.id]);

    res.json({ usuario, perfil, sesiones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/password — Reset contraseña
router.put('/users/:id/password', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, email, tipo_usuario FROM tb_usuarios WHERE id = ?', [req.params.id]);
    if (!users.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Generar contraseña aleatoria
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let newPassword = '';
    for (let i = 0; i < 10; i++) newPassword += chars.charAt(Math.floor(Math.random() * chars.length));

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE tb_usuarios SET password_hash = ?, debe_cambiar_password = 1, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
      [hash, req.params.id]
    );

    // Intentar enviar email
    let emailSent = false;
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: 'contacto.portalestudiantil@gmail.com', pass: 'saqn mzva wpwx fnxg' }
      });
      await transporter.sendMail({
        from: '"Portal Estudiantil" <contacto.portalestudiantil@gmail.com>',
        to: users[0].email,
        subject: 'Contraseña restablecida - Portal Estudiantil',
        html: `<p>Hola,</p><p>Tu contraseña ha sido restablecida por el administrador.</p><p>Tu nueva contraseña temporal es: <strong>${newPassword}</strong></p><p>Por favor, cámbiala al iniciar sesión.</p>`
      });
      emailSent = true;
    } catch (emailErr) {
      console.error('Error enviando email:', emailErr.message);
    }

    res.json({ ok: true, newPassword, emailSent, email: users[0].email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/toggle — Activar/desactivar usuario
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, activo FROM tb_usuarios WHERE id = ?', [req.params.id]);
    if (!users.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const newState = users[0].activo ? 0 : 1;
    await pool.query('UPDATE tb_usuarios SET activo = ? WHERE id = ?', [newState, req.params.id]);

    // Si se desactiva, cerrar sesiones activas
    if (newState === 0) {
      await pool.query(
        "UPDATE tb_sesiones SET activa = 0, fecha_logout = NOW(), tipo_logout = 'forzado' WHERE usuario_id = ? AND activa = 1",
        [req.params.id]
      );
    }

    res.json({ ok: true, activo: newState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/impersonate — Generar JWT temporal del backend principal
router.post('/users/:id/impersonate', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, email, tipo_usuario FROM tb_usuarios WHERE id = ?', [req.params.id]);
    if (!users.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const u = users[0];

    // Mapear tipo_usuario a tipo frontend
    const tipoMap = { administrador: 'admin', docente: 'docente', apoderado: 'apoderado' };

    const token = jwt.sign(
      { id: u.id, email: u.email, tipo: tipoMap[u.tipo_usuario] || u.tipo_usuario, tipo_usuario: u.tipo_usuario },
      MAIN_JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, email: u.email, tipo: u.tipo_usuario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
