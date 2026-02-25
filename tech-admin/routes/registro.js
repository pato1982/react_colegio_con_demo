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
  const { rut, nombres, apellidos, email, telefono, establecimiento, codigo: codigoRaw, modalidad_academica, estructura_cursos } = req.body;
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
      const modalidad = (modalidad_academica === 'semestral') ? 'semestral' : 'trimestral';
      const [newEst] = await connection.query(
        'INSERT INTO tb_establecimientos (nombre, modalidad_academica, activo) VALUES (?, ?, 1)', [establecimiento, modalidad]
      );
      establecimientoId = newEst.insertId;

      // Crear cursos para el nuevo establecimiento
      if (estructura_cursos && estructura_cursos.length > 0) {
        const LETRAS = ['A', 'B', 'C', 'D'];
        const anio = new Date().getFullYear();
        const cursos = [];
        const nivelesActivos = new Set();

        for (const item of estructura_cursos) {
          const { nivel, grado, secciones } = item;
          nivelesActivos.add(nivel);
          for (let s = 0; s < secciones; s++) {
            const letra = LETRAS[s];
            let nombre, codigoCurso;
            if (nivel === 'parvularia') {
              nombre = `${grado === 1 ? 'Pre-Kinder' : 'Kinder'} ${letra}`;
              codigoCurso = `${grado === 1 ? 'PK' : 'K'}${letra}`;
            } else if (nivel === 'basica') {
              nombre = `${grado}° Basico ${letra}`;
              codigoCurso = `${grado}B${letra}`;
            } else {
              nombre = `${grado}° Medio ${letra}`;
              codigoCurso = `${grado}M${letra}`;
            }
            cursos.push([establecimientoId, nombre, codigoCurso, nivel, grado, letra, anio]);
          }
        }

        if (cursos.length > 0) {
          await connection.query(
            `INSERT INTO tb_cursos (establecimiento_id, nombre, codigo, nivel, grado, letra, anio_academico)
             VALUES ?`,
            [cursos]
          );
          const nivelStr = [...nivelesActivos].join(',');
          await connection.query(
            'UPDATE tb_establecimientos SET nivel_educativo = ? WHERE id = ?',
            [nivelStr, establecimientoId]
          );
        }
      }
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
