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
  const { rut, nombres, apellidos, email, telefono, establecimiento, codigo: codigoRaw,
    modalidad_academica, estructura_cursos,
    direccion_establecimiento, comuna_establecimiento, region_establecimiento,
    telefono_establecimiento, email_establecimiento } = req.body;
  const codigo = codigoRaw ? codigoRaw.replace(/[\s\-]/g, '') : '';

  if (!rut || !nombres || !apellidos || !email || !establecimiento || !codigo) {
    return res.status(400).json({ error: 'Todos los campos obligatorios son requeridos' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Determinar si es establecimiento existente o nuevo
    let establecimientoId = null;
    let nombreEstablecimiento = null;
    const [existeEst] = await connection.query(
      'SELECT id FROM tb_establecimientos WHERE nombre = ?', [establecimiento]
    );
    if (existeEst.length > 0) {
      establecimientoId = existeEst[0].id;
    } else {
      nombreEstablecimiento = establecimiento;
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

    // Crear código de validación (establecimiento_id puede ser NULL si es nuevo)
    const [resultCodigo] = await connection.query(
      `INSERT INTO tb_codigos_validacion (establecimiento_id, codigo, tipo, descripcion, usos_maximos, fecha_expiracion, activo)
       VALUES (?, ?, 'administrador', 'Código generado desde TechPanel', 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1)`,
      [establecimientoId, codigo]
    );
    const codigoId = resultCodigo.insertId;

    // Crear pre-registro con todos los datos del establecimiento
    await connection.query(
      `INSERT INTO tb_preregistro_administradores
       (establecimiento_id, nombre_establecimiento, direccion_establecimiento, comuna_establecimiento,
        region_establecimiento, telefono_establecimiento, email_establecimiento,
        modalidad_academica, estructura_cursos,
        rut, nombres, apellidos, email, telefono, codigo_validacion_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [establecimientoId, nombreEstablecimiento,
       direccion_establecimiento || null, comuna_establecimiento || null,
       region_establecimiento || null, telefono_establecimiento || null,
       email_establecimiento || null,
       nombreEstablecimiento ? (modalidad_academica || 'trimestral') : null,
       nombreEstablecimiento && estructura_cursos ? JSON.stringify(estructura_cursos) : null,
       rut, nombres, apellidos, email, telefono || null, codigoId]
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
