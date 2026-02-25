const express = require('express');
const { pool } = require('../../server/config/database');
const router = express.Router();

// GET /api/registro/establecimientos
router.get('/registro/establecimientos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre FROM tb_establecimientos WHERE activo = 1 ORDER BY nombre');
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registro/admin — Crear pre-registro de administrador con código
router.post('/registro/admin', async (req, res) => {
  const { rut, nombres, apellidos, email, telefono, establecimiento, codigo: codigoRaw } = req.body;
  const codigo = codigoRaw ? codigoRaw.replace(/[\s\-]/g, '') : '';

  if (!rut || !nombres || !apellidos || !email || !establecimiento || !codigo) {
    return res.status(400).json({ error: 'Todos los campos obligatorios son requeridos' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Buscar o crear establecimiento por nombre
    let establecimientoId;
    const [existeEst] = await connection.query(
      'SELECT id FROM tb_establecimientos WHERE nombre = ?', [establecimiento]
    );
    if (existeEst.length > 0) {
      establecimientoId = existeEst[0].id;
    } else {
      const [newEst] = await connection.query(
        'INSERT INTO tb_establecimientos (nombre, activo) VALUES (?, 1)', [establecimiento]
      );
      establecimientoId = newEst.insertId;
    }

    // Verificar que el RUT no tenga ya un pre-registro activo
    const [existeRut] = await connection.query(
      'SELECT id FROM tb_preregistro_administradores WHERE UPPER(rut) = UPPER(?) AND activo = 1 AND usado = 0',
      [rut]
    );
    if (existeRut.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ya existe un pre-registro activo para este RUT' });
    }

    // Crear código de validación
    const [resultCodigo] = await connection.query(
      `INSERT INTO tb_codigos_validacion (establecimiento_id, codigo, tipo, descripcion, usos_maximos, fecha_expiracion, activo)
       VALUES (?, ?, 'administrador', 'Código generado desde TechPanel', 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1)`,
      [establecimientoId, codigo]
    );
    const codigoId = resultCodigo.insertId;

    // Crear pre-registro
    await connection.query(
      `INSERT INTO tb_preregistro_administradores
       (establecimiento_id, rut, nombres, apellidos, email, telefono, codigo_validacion_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [establecimientoId, rut, nombres, apellidos, email, telefono || null, codigoId]
    );

    await connection.commit();
    res.json({ ok: true, message: 'Pre-registro confirmado con éxito' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
