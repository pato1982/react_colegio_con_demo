const express = require('express');
const { pool } = require('../../server/config/database');
const router = express.Router();

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

    // Siempre es establecimiento nuevo (se crea al momento del registro del admin)
    const establecimientoId = null;
    const nombreEstablecimiento = establecimiento;

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
       modalidad_academica || 'trimestral',
       estructura_cursos ? JSON.stringify(estructura_cursos) : null,
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

// GET /api/registro/admin-by-rut?rut=... — Buscar admin activo por RUT
router.get('/registro/admin-by-rut', async (req, res) => {
  const { rut } = req.query;
  if (!rut) return res.status(400).json({ error: 'RUT es requerido' });

  try {
    const [rows] = await pool.query(`
      SELECT a.id as admin_id, a.usuario_id, a.rut, a.nombres, a.apellidos, a.telefono as admin_telefono,
             u.email as admin_email,
             e.id as establecimiento_id, e.nombre as establecimiento_nombre,
             e.direccion, e.comuna, e.region, e.telefono as est_telefono, e.email as est_email,
             e.modalidad_academica
      FROM tb_administradores a
      JOIN tb_usuarios u ON a.usuario_id = u.id
      JOIN tb_administrador_establecimiento ae ON a.id = ae.administrador_id AND ae.activo = 1
      JOIN tb_establecimientos e ON ae.establecimiento_id = e.id
      WHERE UPPER(REPLACE(REPLACE(a.rut, '.', ''), '-', '')) = UPPER(REPLACE(REPLACE(?, '.', ''), '-', ''))
        AND a.activo = 1
        AND u.activo = 1
    `, [rut]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró un administrador activo con ese RUT' });
    }

    const r = rows[0];
    res.json({
      admin: {
        id: r.admin_id,
        usuario_id: r.usuario_id,
        rut: r.rut,
        nombres: r.nombres,
        apellidos: r.apellidos,
        email: r.admin_email,
        telefono: r.admin_telefono
      },
      establecimiento: {
        id: r.establecimiento_id,
        nombre: r.establecimiento_nombre,
        direccion: r.direccion,
        comuna: r.comuna,
        region: r.region,
        telefono: r.est_telefono,
        email: r.est_email,
        modalidad_academica: r.modalidad_academica
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/registro/admin/:id — Actualizar datos personales del administrador
router.put('/registro/admin/:id', async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, email, telefono } = req.body;

  if (!nombres || !apellidos || !email) {
    return res.status(400).json({ error: 'Nombres, apellidos y email son requeridos' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Obtener usuario_id del admin
    const [admin] = await connection.query('SELECT usuario_id FROM tb_administradores WHERE id = ?', [id]);
    if (admin.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Administrador no encontrado' });
    }

    // Actualizar tb_administradores
    await connection.query(
      'UPDATE tb_administradores SET nombres = ?, apellidos = ?, telefono = ? WHERE id = ?',
      [nombres, apellidos, telefono || null, id]
    );

    // Actualizar email en tb_usuarios
    await connection.query(
      'UPDATE tb_usuarios SET email = ? WHERE id = ?',
      [email, admin[0].usuario_id]
    );

    await connection.commit();
    res.json({ ok: true, message: 'Administrador actualizado' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// PUT /api/registro/establecimiento/:id — Actualizar datos del establecimiento
router.put('/registro/establecimiento/:id', async (req, res) => {
  const { id } = req.params;
  const { direccion, comuna, region, telefono, email } = req.body;

  try {
    await pool.query(
      `UPDATE tb_establecimientos SET direccion = ?, comuna = ?, region = ?, telefono = ?, email = ? WHERE id = ?`,
      [direccion || null, comuna || null, region || null, telefono || null, email || null, id]
    );
    res.json({ ok: true, message: 'Establecimiento actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registro/cambiar-admin — Crear pre-registro para reemplazar admin existente
router.post('/registro/cambiar-admin', async (req, res) => {
  const { admin_anterior_id, establecimiento_id, rut, nombres, apellidos, email, telefono, codigo: codigoRaw } = req.body;
  const codigo = codigoRaw ? codigoRaw.replace(/[\s\-]/g, '') : '';

  if (!admin_anterior_id || !establecimiento_id || !rut || !nombres || !apellidos || !email || !codigo) {
    return res.status(400).json({ error: 'Todos los campos obligatorios son requeridos' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar que el RUT no tenga ya un pre-registro activo
    const [existeRut] = await connection.query(
      'SELECT id FROM tb_preregistro_administradores WHERE UPPER(REPLACE(REPLACE(rut, \'.\', \'\'), \'-\', \'\')) = UPPER(REPLACE(REPLACE(?, \'.\', \'\'), \'-\', \'\')) AND activo = 1 AND usado = 0',
      [rut]
    );
    if (existeRut.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ya existe un pre-registro activo para este RUT' });
    }

    // Verificar que el admin anterior existe y está activo
    const [adminAnterior] = await connection.query(
      'SELECT id FROM tb_administradores WHERE id = ? AND activo = 1',
      [admin_anterior_id]
    );
    if (adminAnterior.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'El administrador a reemplazar no existe o no está activo' });
    }

    // Obtener nombre del establecimiento
    const [est] = await connection.query('SELECT nombre FROM tb_establecimientos WHERE id = ?', [establecimiento_id]);
    const nombreEst = est.length > 0 ? est[0].nombre : '';

    // Crear código de validación con establecimiento_id real
    const [resultCodigo] = await connection.query(
      `INSERT INTO tb_codigos_validacion (establecimiento_id, codigo, tipo, descripcion, usos_maximos, fecha_expiracion, activo)
       VALUES (?, ?, 'administrador', 'Código cambio admin desde TechPanel', 1, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1)`,
      [establecimiento_id, codigo]
    );
    const codigoId = resultCodigo.insertId;

    // Crear pre-registro con establecimiento_id real + reemplaza_admin_id
    await connection.query(
      `INSERT INTO tb_preregistro_administradores
       (establecimiento_id, nombre_establecimiento, rut, nombres, apellidos, email, telefono,
        codigo_validacion_id, reemplaza_admin_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [establecimiento_id, nombreEst, rut, nombres, apellidos, email, telefono || null, codigoId, admin_anterior_id]
    );

    await connection.commit();
    res.json({ ok: true, message: 'Pre-registro de cambio de administrador creado con éxito' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// GET /api/registro/establecimientos — Lista de establecimientos activos
router.get('/registro/establecimientos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre FROM tb_establecimientos WHERE activo = 1 ORDER BY nombre'
    );
    res.json({ establecimientos: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/registro/asignaturas/:establecimientoId — Asignaturas de un establecimiento
router.get('/registro/asignaturas/:establecimientoId', async (req, res) => {
  const { establecimientoId } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre FROM tb_asignaturas WHERE establecimiento_id = ? AND activo = 1 ORDER BY nombre',
      [establecimientoId]
    );
    res.json({ asignaturas: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registro/docente-tech — Pre-registrar docente desde TechPanel
router.post('/registro/docente-tech', async (req, res) => {
  const { establecimiento_id, rut, nombres, apellidos, email, telefono, asignaturas = [] } = req.body;

  if (!establecimiento_id || !rut || !nombres || !apellidos) {
    return res.status(400).json({ error: 'Establecimiento, RUT, nombres y apellidos son requeridos' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar si el docente ya existe en tb_docentes (ya tiene cuenta)
    const [docenteExistente] = await connection.query(
      'SELECT id FROM tb_docentes WHERE UPPER(rut) = UPPER(?) AND activo = 1',
      [rut]
    );

    if (docenteExistente.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Este docente ya tiene cuenta en el sistema. Usa la pestaña de modificación para cambios.' });
    }

    // Verificar si ya está en preregistro para este establecimiento
    const [enPreregistro] = await connection.query(
      'SELECT id FROM tb_preregistro_docentes WHERE UPPER(rut) = UPPER(?) AND establecimiento_id = ? AND activo = 1 AND usado = 0',
      [rut, establecimiento_id]
    );

    if (enPreregistro.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Este docente ya está en espera de registro para este establecimiento' });
    }

    // Obtener nombres de asignaturas para campo especialidad (texto informativo)
    let especialidadTexto = null;
    if (asignaturas.length > 0) {
      const [nombresAsig] = await connection.query(
        'SELECT nombre FROM tb_asignaturas WHERE id IN (?) AND activo = 1',
        [asignaturas]
      );
      especialidadTexto = nombresAsig.map(a => a.nombre).join(', ');
    }

    // Crear preregistro
    const [resultPreregistro] = await connection.query(
      `INSERT INTO tb_preregistro_docentes
       (establecimiento_id, rut, nombres, apellidos, email, especialidad, activo, usado)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
      [establecimiento_id, rut, nombres, apellidos, email || null, especialidadTexto]
    );

    const preregistroId = resultPreregistro.insertId;

    // Guardar asignaturas en tb_preregistro_docente_asignatura
    for (const asignaturaId of asignaturas) {
      await connection.query(
        'INSERT INTO tb_preregistro_docente_asignatura (preregistro_docente_id, asignatura_id) VALUES (?, ?)',
        [preregistroId, asignaturaId]
      );
    }

    // Log en tb_log_actividades
    await connection.query(
      `INSERT INTO tb_log_actividades
       (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
        entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
       VALUES (NULL, 'sistema', 'TechPanel', 'crear', 'docentes', ?, 'docente', ?, NULL, ?, ?)`,
      [
        `Docente pre-registrado desde TechPanel: ${nombres} ${apellidos} (RUT: ${rut})`,
        0,
        JSON.stringify({ rut, nombres, apellidos, email, telefono, asignaturas }),
        establecimiento_id
      ]
    );

    await connection.commit();
    res.json({ ok: true, message: 'Docente pre-registrado correctamente. Podrá registrarse en el sistema con su RUT.' });

  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// GET /api/registro/docente-by-rut?rut=... — Buscar docente activo por RUT con establecimiento, asignaturas y cursos
router.get('/registro/docente-by-rut', async (req, res) => {
  const { rut } = req.query;
  if (!rut) return res.status(400).json({ error: 'RUT es requerido' });

  try {
    // Datos del docente + establecimiento
    const [rows] = await pool.query(`
      SELECT d.id as docente_id, d.usuario_id, d.rut, d.nombres, d.apellidos, d.email, d.telefono,
             u.email as usuario_email,
             e.id as establecimiento_id, e.nombre as establecimiento_nombre,
             de.cargo, de.horas_contrato
      FROM tb_docentes d
      JOIN tb_usuarios u ON d.usuario_id = u.id
      JOIN tb_docente_establecimiento de ON d.id = de.docente_id AND de.activo = 1
      JOIN tb_establecimientos e ON de.establecimiento_id = e.id
      WHERE UPPER(REPLACE(REPLACE(d.rut, '.', ''), '-', '')) = UPPER(REPLACE(REPLACE(?, '.', ''), '-', ''))
        AND d.activo = 1
        AND u.activo = 1
    `, [rut]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró un docente activo con ese RUT' });
    }

    const r = rows[0];

    // Asignaturas del docente (tb_docente_asignatura)
    const [asignaturas] = await pool.query(`
      SELECT da.asignatura_id, a.nombre
      FROM tb_docente_asignatura da
      JOIN tb_asignaturas a ON da.asignatura_id = a.id
      WHERE da.docente_id = ? AND da.activo = 1 AND a.activo = 1
      ORDER BY a.nombre
    `, [r.docente_id]);

    // Cursos asignados (tb_asignaciones) con nombre de asignatura
    const [cursos] = await pool.query(`
      SELECT asig.id as asignacion_id, c.id as curso_id, c.nombre as curso_nombre,
             asig.asignatura_id, a.nombre as asignatura_nombre
      FROM tb_asignaciones asig
      JOIN tb_cursos c ON asig.curso_id = c.id
      JOIN tb_asignaturas a ON asig.asignatura_id = a.id
      WHERE asig.docente_id = ? AND asig.activo = 1 AND c.activo = 1
      ORDER BY c.nombre, a.nombre
    `, [r.docente_id]);

    res.json({
      docente: {
        id: r.docente_id,
        usuario_id: r.usuario_id,
        rut: r.rut,
        nombres: r.nombres,
        apellidos: r.apellidos,
        email: r.usuario_email,
        telefono: r.telefono,
        cargo: r.cargo,
        horas_contrato: r.horas_contrato
      },
      establecimiento: {
        id: r.establecimiento_id,
        nombre: r.establecimiento_nombre
      },
      asignaturas: asignaturas.map(a => a.asignatura_id),
      asignaturas_detalle: asignaturas,
      cursos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/registro/docente/:id — Actualizar datos personales del docente
router.put('/registro/docente/:id', async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, email, telefono } = req.body;

  if (!nombres || !apellidos || !email) {
    return res.status(400).json({ error: 'Nombres, apellidos y email son requeridos' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [docente] = await connection.query('SELECT usuario_id FROM tb_docentes WHERE id = ? AND activo = 1', [id]);
    if (docente.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Docente no encontrado' });
    }

    // Guardar datos anteriores para log
    const [antes] = await connection.query(
      'SELECT d.nombres, d.apellidos, d.telefono, u.email FROM tb_docentes d JOIN tb_usuarios u ON d.usuario_id = u.id WHERE d.id = ?', [id]
    );

    await connection.query(
      'UPDATE tb_docentes SET nombres = ?, apellidos = ?, telefono = ? WHERE id = ?',
      [nombres, apellidos, telefono || null, id]
    );

    await connection.query(
      'UPDATE tb_usuarios SET email = ? WHERE id = ?',
      [email, docente[0].usuario_id]
    );

    // Log
    await connection.query(
      `INSERT INTO tb_log_actividades
       (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
        entidad_tipo, entidad_id, datos_anteriores, datos_nuevos)
       VALUES (NULL, 'sistema', 'TechPanel', 'editar', 'docentes', ?, 'docente', ?, ?, ?)`,
      [
        `Docente actualizado desde TechPanel: ${nombres} ${apellidos}`,
        id,
        JSON.stringify(antes[0] || {}),
        JSON.stringify({ nombres, apellidos, email, telefono })
      ]
    );

    await connection.commit();
    res.json({ ok: true, message: 'Datos del docente actualizados' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// PUT /api/registro/docente-asignaturas/:id — Actualizar asignaturas del docente
router.put('/registro/docente-asignaturas/:id', async (req, res) => {
  const { id } = req.params;
  const { asignaturas = [] } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [docente] = await connection.query('SELECT id FROM tb_docentes WHERE id = ? AND activo = 1', [id]);
    if (docente.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Docente no encontrado' });
    }

    // Obtener asignaturas actuales
    const [actuales] = await connection.query(
      'SELECT asignatura_id FROM tb_docente_asignatura WHERE docente_id = ? AND activo = 1', [id]
    );
    const idsActuales = actuales.map(a => a.asignatura_id);

    // Desactivar las que se quitaron
    const quitar = idsActuales.filter(a => !asignaturas.includes(a));
    for (const asigId of quitar) {
      await connection.query(
        'UPDATE tb_docente_asignatura SET activo = 0 WHERE docente_id = ? AND asignatura_id = ?',
        [id, asigId]
      );
    }

    // Agregar las nuevas
    const agregar = asignaturas.filter(a => !idsActuales.includes(a));
    for (const asigId of agregar) {
      // Verificar si ya existe inactivo
      const [existe] = await connection.query(
        'SELECT id FROM tb_docente_asignatura WHERE docente_id = ? AND asignatura_id = ?', [id, asigId]
      );
      if (existe.length > 0) {
        await connection.query(
          'UPDATE tb_docente_asignatura SET activo = 1 WHERE docente_id = ? AND asignatura_id = ?',
          [id, asigId]
        );
      } else {
        await connection.query(
          'INSERT INTO tb_docente_asignatura (docente_id, asignatura_id, activo) VALUES (?, ?, 1)',
          [id, asigId]
        );
      }
    }

    // Log
    await connection.query(
      `INSERT INTO tb_log_actividades
       (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
        entidad_tipo, entidad_id, datos_anteriores, datos_nuevos)
       VALUES (NULL, 'sistema', 'TechPanel', 'editar', 'docentes', ?, 'docente', ?, ?, ?)`,
      [
        `Asignaturas del docente actualizadas desde TechPanel`,
        id,
        JSON.stringify({ asignaturas: idsActuales }),
        JSON.stringify({ asignaturas, agregadas: agregar, quitadas: quitar })
      ]
    );

    await connection.commit();
    res.json({ ok: true, message: 'Asignaturas actualizadas correctamente' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// GET /api/registro/cursos/:establecimientoId — Cursos de un establecimiento
router.get('/registro/cursos/:establecimientoId', async (req, res) => {
  const { establecimientoId } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre FROM tb_cursos WHERE establecimiento_id = ? AND activo = 1 ORDER BY nombre',
      [establecimientoId]
    );
    res.json({ cursos: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/registro/docente-asignacion — Crear asignaciones (curso + asignaturas)
router.post('/registro/docente-asignacion', async (req, res) => {
  const { docente_id, establecimiento_id, curso_id, asignaturas = [] } = req.body;

  if (!docente_id || !establecimiento_id || !curso_id || asignaturas.length === 0) {
    return res.status(400).json({ error: 'Docente, establecimiento, curso y al menos una asignatura son requeridos' });
  }

  const anio = new Date().getFullYear();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let creadas = 0;
    for (const asignaturaId of asignaturas) {
      // Verificar si ya existe (activa o inactiva)
      const [existe] = await connection.query(
        'SELECT id, activo FROM tb_asignaciones WHERE docente_id = ? AND curso_id = ? AND asignatura_id = ? AND anio_academico = ?',
        [docente_id, curso_id, asignaturaId, anio]
      );

      if (existe.length > 0) {
        if (existe[0].activo === 0) {
          // Reactivar
          await connection.query('UPDATE tb_asignaciones SET activo = 1 WHERE id = ?', [existe[0].id]);
          creadas++;
        }
        // Si ya está activa, skip silenciosamente
      } else {
        await connection.query(
          'INSERT INTO tb_asignaciones (establecimiento_id, docente_id, curso_id, asignatura_id, anio_academico, activo) VALUES (?, ?, ?, ?, ?, 1)',
          [establecimiento_id, docente_id, curso_id, asignaturaId, anio]
        );
        creadas++;
      }
    }

    await connection.commit();
    res.json({ ok: true, message: `${creadas} asignación${creadas !== 1 ? 'es' : ''} creada${creadas !== 1 ? 's' : ''}` });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/registro/docente-asignacion/:id — Eliminar asignación (soft delete)
router.delete('/registro/docente-asignacion/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE tb_asignaciones SET activo = 0 WHERE id = ? AND activo = 1',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }
    res.json({ ok: true, message: 'Asignación eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/registro/docente/:id — Eliminar docente (soft delete completo)
router.delete('/registro/docente/:id', async (req, res) => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar que existe
    const [docente] = await connection.query(
      'SELECT d.id, d.usuario_id, d.nombres, d.apellidos FROM tb_docentes d WHERE d.id = ? AND d.activo = 1', [id]
    );
    if (docente.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Docente no encontrado' });
    }

    // Desactivar docente
    await connection.query('UPDATE tb_docentes SET activo = 0 WHERE id = ?', [id]);

    // Desactivar usuario (no podrá hacer login)
    await connection.query('UPDATE tb_usuarios SET activo = 0 WHERE id = ?', [docente[0].usuario_id]);

    // Desactivar relación con establecimiento
    await connection.query('UPDATE tb_docente_establecimiento SET activo = 0 WHERE docente_id = ?', [id]);

    // Desactivar asignaturas del docente
    await connection.query('UPDATE tb_docente_asignatura SET activo = 0 WHERE docente_id = ?', [id]);

    // Desactivar todas las asignaciones a cursos
    await connection.query('UPDATE tb_asignaciones SET activo = 0 WHERE docente_id = ?', [id]);

    // Log
    await connection.query(
      `INSERT INTO tb_log_actividades
       (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
        entidad_tipo, entidad_id, datos_anteriores, datos_nuevos)
       VALUES (NULL, 'sistema', 'TechPanel', 'eliminar', 'docentes', ?, 'docente', ?, ?, NULL)`,
      [
        `Docente eliminado desde TechPanel: ${docente[0].nombres} ${docente[0].apellidos}`,
        id,
        JSON.stringify({ id, nombres: docente[0].nombres, apellidos: docente[0].apellidos })
      ]
    );

    await connection.commit();
    res.json({ ok: true, message: 'Docente eliminado correctamente' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
