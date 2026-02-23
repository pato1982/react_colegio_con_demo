const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const registroRoutes = require('./routes/registro');
const chatRoutes = require('./routes/chat');
const contactoRoutes = require('./routes/contacto');
const matriculasRoutes = require('./routes/matriculas');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Ajustar según config real si es necesario
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware para disponibilizar io en las rutas
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- DEMO MODE INTERCEPTOR ---
// Si el usuario es demo, este middleware interceptará las peticiones y responderá con datos simulados
app.use(require('./middleware/demoInterceptor'));
// --- END DEMO INTERCEPTOR ---

// Gestión de conexiones Socket.io
io.on('connection', (socket) => {
    console.log('Cliente conectado al socket:', socket.id);

    // Evento para que el usuario se una a su "sala personal"
    // Esto permite enviarle notificaciones directas (ej: user_123)
    socket.on('join_user', (userId) => {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        console.log(`Usuario ${userId} unido a sala ${roomName}`);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado del socket:', socket.id);
    });
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de registro
app.use('/api/registro', registroRoutes);

// Rutas de chat
app.use('/api/chat', chatRoutes);

// Rutas de contacto
app.use('/api/contacto', contactoRoutes);

// Rutas de matriculas
app.use('/api/matriculas', matriculasRoutes);

// ============================================
// RUTAS DE ESTABLECIMIENTOS
// ============================================

// GET /api/establecimientos - Obtener todos los establecimientos
app.get('/api/establecimientos', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT id, nombre, rbd, direccion, telefono, email
      FROM tb_establecimientos
      WHERE activo = 1
      ORDER BY nombre
    `);

        // Para el frontend, devolver solo los nombres
        const establecimientos = rows.map(e => e.nombre);
        res.json({ success: true, establecimientos, data: rows });
    } catch (error) {
        console.error('Error al obtener establecimientos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener establecimientos' });
    }
});

// ============================================
// RUTAS DE ALUMNOS
// ============================================

// GET /api/alumnos - Obtener todos los alumnos con sus cursos
app.get('/api/alumnos', async (req, res) => {
    const { curso_id } = req.query;
    const anioActual = new Date().getFullYear();

    try {
        let query = `
      SELECT
        a.id,
        a.rut,
        a.nombres,
        a.apellidos,
        a.fecha_nacimiento,
        a.sexo,
        CONCAT(a.apellidos, ', ', a.nombres) AS nombre_completo,
        c.nombre AS curso_nombre,
        c.id AS curso_id
      FROM tb_alumnos a
      LEFT JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id AND ae.activo = 1 AND ae.anio_academico = ?
      LEFT JOIN tb_cursos c ON ae.curso_id = c.id
      WHERE a.activo = 1
    `;

        const params = [anioActual];

        // Filtrar por curso si se especifica
        if (curso_id) {
            query += ` AND c.id = ?`;
            params.push(curso_id);
        }

        query += ` ORDER BY c.nombre, a.apellidos, a.nombres`;

        const [rows] = await pool.query(query, params);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener alumnos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener alumnos' });
    }
});

// GET /api/alumnos/por-curso - Obtener alumnos agrupados por curso
app.get('/api/alumnos/por-curso', async (req, res) => {
    const anioActual = new Date().getFullYear();
    try {
        const [rows] = await pool.query(`
      SELECT
        a.id,
        a.rut,
        a.nombres,
        a.apellidos,
        a.fecha_nacimiento,
        a.sexo,
        CONCAT(a.apellidos, ', ', a.nombres) AS nombre_completo,
        c.nombre AS curso_nombre,
        c.id AS curso_id
      FROM tb_alumnos a
      LEFT JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id AND ae.activo = 1 AND ae.anio_academico = ?
      LEFT JOIN tb_cursos c ON ae.curso_id = c.id
      WHERE a.activo = 1
      ORDER BY c.nombre, a.apellidos, a.nombres
    `, [anioActual]);

        // Agrupar por curso
        const alumnosPorCurso = {};
        rows.forEach(alumno => {
            const cursoNombre = alumno.curso_nombre || 'Sin Curso';
            if (!alumnosPorCurso[cursoNombre]) {
                alumnosPorCurso[cursoNombre] = [];
            }
            alumnosPorCurso[cursoNombre].push(alumno);
        });

        res.json({ success: true, data: alumnosPorCurso });
    } catch (error) {
        console.error('Error al obtener alumnos por curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener alumnos' });
    }
});

// GET /api/alumnos/:id/detalle - Obtener ficha completa (Alumno + Apoderado + Curso)
app.get('/api/alumnos/:id/detalle', async (req, res) => {
    try {
        const { id } = req.params;
        const anioActual = new Date().getFullYear();
        // 1. Datos Alumno + Curso (via alumno_establecimiento)
        const [alumnoRows] = await pool.query(`
            SELECT
                a.*,
                ae.id as matricula_id,
                ae.anio_academico,
                c.id as curso_id,
                c.nombre as curso_nombre
            FROM tb_alumnos a
            LEFT JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id AND ae.activo = 1 AND ae.anio_academico = ?
            LEFT JOIN tb_cursos c ON ae.curso_id = c.id
            WHERE a.id = ?
        `, [anioActual, id]);

        if (alumnoRows.length === 0) return res.status(404).json({ success: false, error: 'Alumno no encontrado' });
        const alumno = alumnoRows[0];

        // 2. Datos Apoderado (via tb_apoderado_alumno)
        let apoderado = null;
        const [apodRows] = await pool.query(`
            SELECT ap.*, aa.parentesco as parentezco
            FROM tb_apoderado_alumno aa
            JOIN tb_apoderados ap ON aa.apoderado_id = ap.id
            WHERE aa.alumno_id = ? AND aa.activo = 1
            ORDER BY aa.es_apoderado_titular DESC LIMIT 1
        `, [id]);
        if (apodRows.length > 0) {
            apoderado = apodRows[0];
        }

        res.json({ success: true, data: { alumno, apoderado } });

    } catch (error) {
        console.error('Error al obtener detalle alumno:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// POST /api/alumnos - Crear nuevo alumno (sin apoderado)
app.post('/api/alumnos', async (req, res) => {
    const { rut, nombres, apellidos, fecha_nacimiento, sexo, curso_id, establecimiento_id = 1 } = req.body;

    try {
        // Insertar alumno
        const [result] = await pool.query(`
      INSERT INTO tb_alumnos (rut, nombres, apellidos, fecha_nacimiento, sexo, activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [rut, nombres, apellidos, fecha_nacimiento, sexo]);

        const alumnoId = result.insertId;

        // Asociar al establecimiento y curso
        if (curso_id) {
            await pool.query(`
        INSERT INTO tb_alumno_establecimiento
        (alumno_id, establecimiento_id, curso_id, anio_academico, fecha_ingreso, activo)
        VALUES (?, ?, ?, YEAR(CURDATE()), CURDATE(), 1)
      `, [alumnoId, establecimiento_id, curso_id]);
        }

        // Registrar en tb_log_actividades
        await pool.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (NULL, 'administrador', 'Administrador', 'crear', 'alumnos', ?, 'alumno', ?, NULL, ?, ?)
        `, [
            `Alumno creado: ${nombres} ${apellidos} (RUT: ${rut})`,
            alumnoId,
            JSON.stringify({ rut, nombres, apellidos, fecha_nacimiento, sexo, curso_id }),
            establecimiento_id
        ]);

        res.json({ success: true, message: 'Alumno creado correctamente', id: alumnoId });
    } catch (error) {
        console.error('Error al crear alumno:', error);
        res.status(500).json({ success: false, error: 'Error al crear alumno' });
    }
});

// POST /api/alumnos/con-apoderado - Crear alumno + preregistro de relación con apoderado
app.post('/api/alumnos/con-apoderado', async (req, res) => {
    const {
        // Datos del alumno
        alumno_rut,
        alumno_nombres,
        alumno_apellidos,
        alumno_fecha_nacimiento,
        alumno_sexo,
        curso_id,
        establecimiento_id = 1,
        // Datos del apoderado
        apoderado_rut,
        apoderado_nombres,
        apoderado_apellidos,
        apoderado_telefono,
        apoderado_email,
        parentesco,
        // Tipo: 'nuevo' o 'existente'
        tipo_apoderado
    } = req.body;

    // Validaciones básicas
    if (!alumno_rut || !alumno_nombres || !alumno_apellidos || !curso_id) {
        return res.status(400).json({
            success: false,
            error: 'Faltan datos obligatorios del alumno'
        });
    }

    if (!apoderado_rut || !apoderado_nombres || !apoderado_apellidos || !parentesco) {
        return res.status(400).json({
            success: false,
            error: 'Faltan datos obligatorios del apoderado'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Verificar si el alumno ya existe (por RUT, case-insensitive)
        const [alumnoExistente] = await connection.query(
            'SELECT id FROM tb_alumnos WHERE UPPER(rut) = UPPER(?)',
            [alumno_rut]
        );

        if (alumnoExistente.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Ya existe un alumno con ese RUT'
            });
        }

        // 2. Crear alumno en tb_alumnos
        const [resultAlumno] = await connection.query(`
            INSERT INTO tb_alumnos (rut, nombres, apellidos, fecha_nacimiento, sexo, activo)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [alumno_rut, alumno_nombres, alumno_apellidos, alumno_fecha_nacimiento, alumno_sexo]);

        const alumnoId = resultAlumno.insertId;

        // 3. Asociar alumno al establecimiento y curso
        await connection.query(`
            INSERT INTO tb_alumno_establecimiento
            (alumno_id, establecimiento_id, curso_id, anio_academico, fecha_ingreso, activo)
            VALUES (?, ?, ?, YEAR(CURDATE()), CURDATE(), 1)
        `, [alumnoId, establecimiento_id, curso_id]);

        // 4. Verificar si el apoderado ya existe en el sistema (tiene cuenta)
        const [apoderadoExistente] = await connection.query(
            'SELECT id FROM tb_apoderados WHERE UPPER(rut) = UPPER(?) AND activo = 1',
            [apoderado_rut]
        );

        if (tipo_apoderado === 'existente') {
            // Si el apoderado ya existe, verificar que realmente existe
            if (apoderadoExistente.length === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'No se encontró un apoderado con ese RUT en el sistema'
                });
            }
        }

        // 5. Crear preregistro de relación en tb_preregistro_relaciones
        // (Siempre se crea para que el apoderado nuevo pueda registrarse
        //  o el existente pueda agregar al pupilo)
        await connection.query(`
            INSERT INTO tb_preregistro_relaciones
            (establecimiento_id, rut_apoderado, nombres_apoderado, apellidos_apoderado,
             telefono_apoderado, email_apoderado, rut_alumno, nombres_alumno, apellidos_alumno,
             parentesco, es_apoderado_titular, activo, usado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0)
        `, [
            establecimiento_id,
            apoderado_rut,
            apoderado_nombres,
            apoderado_apellidos,
            apoderado_telefono || null,
            apoderado_email || null,
            alumno_rut,
            alumno_nombres,
            alumno_apellidos,
            parentesco
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: tipo_apoderado === 'nuevo'
                ? 'Alumno creado correctamente. El apoderado podrá registrarse en el sistema.'
                : 'Alumno creado correctamente. El apoderado podrá agregar al pupilo desde su cuenta.',
            alumno_id: alumnoId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear alumno con apoderado:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear alumno'
        });
    } finally {
        connection.release();
    }
});

// PUT /api/alumnos/:id - Actualizar alumno con logging y datos de ficha
app.put('/api/alumnos/:id', async (req, res) => {
    const { id } = req.params;
    const {
        rut, nombres, apellidos, curso_id, direccion, sexo,
        alergias, enfermedades_cronicas, tiene_nee, detalle_nee,
        contacto_emergencia_nombre, contacto_emergencia_telefono,
        establecimiento_id = 1
    } = req.body;

    const connection = await pool.getConnection();
    const anioActual = new Date().getFullYear();

    try {
        await connection.beginTransaction();

        // 1. Verificar que el alumno existe y obtener datos anteriores completos
        const [alumnoActual] = await connection.query(`
            SELECT
                a.id, a.rut, a.nombres, a.apellidos, a.direccion, a.sexo,
                a.alergias, a.enfermedades_cronicas,
                a.contacto_emergencia_nombre, a.contacto_emergencia_telefono,
                m.id as matricula_id,
                m.curso_asignado_id as curso_id,
                c.nombre as curso_nombre
            FROM tb_alumnos a
            LEFT JOIN tb_matriculas m ON a.id = m.alumno_id AND m.activo = 1 AND m.anio_academico = ?
            LEFT JOIN tb_cursos c ON m.curso_asignado_id = c.id
            WHERE a.id = ?
        `, [anioActual, id]);

        if (alumnoActual.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Alumno no encontrado' });
        }

        const datosAnteriores = alumnoActual[0];

        // 2. Actualizar tb_alumnos (todos los campos editables)
        await connection.query(`
            UPDATE tb_alumnos
            SET rut = ?, nombres = ?, apellidos = ?, direccion = ?, sexo = ?,
                alergias = ?, enfermedades_cronicas = ?,
                contacto_emergencia_nombre = ?, contacto_emergencia_telefono = ?
            WHERE id = ?
        `, [
            rut, nombres, apellidos, direccion || null, sexo || null,
            alergias || null, enfermedades_cronicas || null,
            contacto_emergencia_nombre || null, contacto_emergencia_telefono || null,
            id
        ]);

        // 3. Si cambió el curso, actualizar tb_matriculas y tb_alumno_establecimiento
        if (datosAnteriores.matricula_id && curso_id !== undefined) {
            await connection.query(
                'UPDATE tb_matriculas SET curso_asignado_id = ? WHERE id = ?',
                [curso_id || null, datosAnteriores.matricula_id]
            );
            await connection.query(`
                UPDATE tb_alumno_establecimiento
                SET curso_id = ?
                WHERE alumno_id = ? AND establecimiento_id = ? AND anio_academico = ? AND activo = 1
            `, [curso_id || null, id, establecimiento_id, anioActual]);
        }

        // 4. Registrar en tb_log_actividades
        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (NULL, 'administrador', 'Administrador', 'editar', 'alumnos', ?, 'alumno', ?, ?, ?, ?)
        `, [
            `Alumno editado: ${datosAnteriores.nombres} ${datosAnteriores.apellidos}`,
            id,
            JSON.stringify({ rut: datosAnteriores.rut, nombres: datosAnteriores.nombres, apellidos: datosAnteriores.apellidos, direccion: datosAnteriores.direccion, sexo: datosAnteriores.sexo, alergias: datosAnteriores.alergias, enfermedades_cronicas: datosAnteriores.enfermedades_cronicas, contacto_emergencia_nombre: datosAnteriores.contacto_emergencia_nombre, contacto_emergencia_telefono: datosAnteriores.contacto_emergencia_telefono, curso_id: datosAnteriores.curso_id }),
            JSON.stringify({ rut, nombres, apellidos, direccion, sexo, alergias, enfermedades_cronicas, contacto_emergencia_nombre, contacto_emergencia_telefono, curso_id }),
            establecimiento_id
        ]);

        await connection.commit();
        res.json({ success: true, message: 'Ficha actualizada correctamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar alumno:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar alumno' });
    } finally {
        connection.release();
    }
});

// PUT /api/alumnos/:alumnoId/apoderado - Actualizar datos del apoderado vinculado al alumno
app.put('/api/alumnos/:alumnoId/apoderado', async (req, res) => {
    const { alumnoId } = req.params;
    const { rut, nombres, apellidos, email, telefono, direccion, parentesco } = req.body;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Obtener apoderado vinculado al alumno con datos anteriores
        const [relRows] = await connection.query(
            `SELECT aa.id, aa.apoderado_id, aa.parentesco,
                    ap.rut as ap_rut, ap.nombres as ap_nombres, ap.apellidos as ap_apellidos,
                    ap.email as ap_email, ap.telefono as ap_telefono, ap.direccion as ap_direccion
             FROM tb_apoderado_alumno aa
             JOIN tb_apoderados ap ON aa.apoderado_id = ap.id
             WHERE aa.alumno_id = ? AND aa.activo = 1
             ORDER BY aa.es_apoderado_titular DESC LIMIT 1`,
            [alumnoId]
        );

        if (relRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'No hay apoderado vinculado a este alumno' });
        }

        const anterior = relRows[0];
        const { id: relacionId, apoderado_id } = anterior;

        // 2. Actualizar tb_apoderados
        await connection.query(`
            UPDATE tb_apoderados
            SET rut = ?, nombres = ?, apellidos = ?, email = ?, telefono = ?, direccion = ?
            WHERE id = ?
        `, [rut, nombres, apellidos, email || null, telefono || null, direccion || null, apoderado_id]);

        // 3. Actualizar parentesco en tb_apoderado_alumno
        if (parentesco) {
            await connection.query(
                'UPDATE tb_apoderado_alumno SET parentesco = ? WHERE id = ?',
                [parentesco, relacionId]
            );
        }

        // 4. Registrar en tb_log_actividades
        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (NULL, 'administrador', 'Administrador', 'editar', 'apoderados', ?, 'apoderado', ?, ?, ?, 1)
        `, [
            `Apoderado editado: ${anterior.ap_nombres} ${anterior.ap_apellidos}`,
            apoderado_id,
            JSON.stringify({ rut: anterior.ap_rut, nombres: anterior.ap_nombres, apellidos: anterior.ap_apellidos, email: anterior.ap_email, telefono: anterior.ap_telefono, direccion: anterior.ap_direccion, parentesco: anterior.parentesco }),
            JSON.stringify({ rut, nombres, apellidos, email, telefono, direccion, parentesco })
        ]);

        await connection.commit();
        res.json({ success: true, message: 'Apoderado actualizado correctamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar apoderado:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar apoderado' });
    } finally {
        connection.release();
    }
});

// DELETE /api/alumnos/:id - Eliminar alumno (soft delete) con logging
app.delete('/api/alumnos/:id', async (req, res) => {
    const { id } = req.params;
    const {
        establecimiento_id = 1,
        usuario_id = null,
        tipo_usuario = 'sistema',
        nombre_usuario = 'Sistema'
    } = req.body || {};

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obtener datos del alumno para el log
        const [alumnoActual] = await connection.query(`
            SELECT a.rut, a.nombres, a.apellidos, ae.curso_id, c.nombre as curso_nombre
            FROM tb_alumnos a
            LEFT JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id AND ae.activo = 1
            LEFT JOIN tb_cursos c ON ae.curso_id = c.id
            WHERE a.id = ?
        `, [id]);

        if (alumnoActual.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Alumno no encontrado' });
        }

        const alumno = alumnoActual[0];
        const descripcion = `Alumno eliminado: ${alumno.nombres} ${alumno.apellidos} (RUT: ${alumno.rut}) - Curso: ${alumno.curso_nombre || 'Sin curso'}`;

        // 2. Soft delete del alumno
        await connection.query(`UPDATE tb_alumnos SET activo = 0 WHERE id = ?`, [id]);

        // 3. Desactivar también la relación con el establecimiento
        await connection.query(`UPDATE tb_alumno_establecimiento SET activo = 0 WHERE alumno_id = ?`, [id]);

        // 4. Registrar en tb_log_actividades
        const datosAnterioresJson = JSON.stringify({
            rut: alumno.rut,
            nombres: alumno.nombres,
            apellidos: alumno.apellidos,
            curso_id: alumno.curso_id,
            activo: 1
        });

        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (?, ?, ?, 'eliminar', 'alumnos', ?, 'alumno', ?, ?, NULL, ?)
        `, [
            usuario_id,
            tipo_usuario,
            nombre_usuario,
            descripcion,
            id,
            datosAnterioresJson,
            establecimiento_id
        ]);

        await connection.commit();

        res.json({ success: true, message: 'Alumno eliminado correctamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error al eliminar alumno:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar alumno' });
    } finally {
        connection.release();
    }
});

// ============================================
// RUTAS DE CURSOS
// ============================================

// GET /api/cursos - Obtener cursos del establecimiento
app.get('/api/cursos', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT id, nombre, codigo, nivel, grado, letra, anio_academico
            FROM tb_cursos
            WHERE establecimiento_id = ?
            AND anio_academico = ?
            AND activo = 1
            ORDER BY nivel, grado, letra
        `, [establecimiento_id, anio]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener cursos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener cursos' });
    }
});

// ============================================
// RUTAS DE APODERADO
// ============================================

// GET /api/apoderado/pupilos-pendientes/:rutApoderado - Obtener pupilos pendientes de vinculación
app.get('/api/apoderado/pupilos-pendientes/:rutApoderado', async (req, res) => {
    const { rutApoderado } = req.params;

    try {
        // Buscar en tb_preregistro_relaciones los pupilos pendientes (case-insensitive)
        const [pendientes] = await pool.query(`
            SELECT
                pr.id as preregistro_id,
                pr.rut_alumno,
                pr.nombres_alumno,
                pr.apellidos_alumno,
                pr.parentesco,
                pr.establecimiento_id,
                e.nombre as establecimiento_nombre,
                a.id as alumno_id,
                c.nombre as curso_nombre
            FROM tb_preregistro_relaciones pr
            JOIN tb_establecimientos e ON pr.establecimiento_id = e.id
            JOIN tb_alumnos a ON UPPER(a.rut) = UPPER(pr.rut_alumno) AND a.activo = 1
            LEFT JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id AND ae.activo = 1
            LEFT JOIN tb_cursos c ON ae.curso_id = c.id
            WHERE UPPER(pr.rut_apoderado) = UPPER(?)
              AND pr.activo = 1
              AND pr.usado = 0
        `, [rutApoderado]);

        res.json({
            success: true,
            data: pendientes,
            cantidad: pendientes.length
        });

    } catch (error) {
        console.error('Error obteniendo pupilos pendientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener pupilos pendientes'
        });
    }
});

// POST /api/apoderado/confirmar-pupilo - Confirmar vinculación de pupilo
app.post('/api/apoderado/confirmar-pupilo', async (req, res) => {
    const { preregistro_id, apoderado_id } = req.body;

    if (!preregistro_id || !apoderado_id) {
        return res.status(400).json({
            success: false,
            error: 'Faltan datos requeridos'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obtener datos del preregistro
        const [preregistros] = await connection.query(
            'SELECT * FROM tb_preregistro_relaciones WHERE id = ? AND activo = 1 AND usado = 0',
            [preregistro_id]
        );

        if (preregistros.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Preregistro no encontrado o ya fue usado'
            });
        }

        const preregistro = preregistros[0];

        // 2. Buscar el alumno por RUT (case-insensitive)
        const [alumnos] = await connection.query(
            'SELECT id FROM tb_alumnos WHERE UPPER(rut) = UPPER(?) AND activo = 1',
            [preregistro.rut_alumno]
        );

        if (alumnos.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'El alumno no está registrado en el sistema'
            });
        }

        const alumnoId = alumnos[0].id;

        // 3. Verificar que no exista ya la relación
        const [relacionExistente] = await connection.query(
            'SELECT id FROM tb_apoderado_alumno WHERE apoderado_id = ? AND alumno_id = ? AND activo = 1',
            [apoderado_id, alumnoId]
        );

        if (relacionExistente.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: 'Este pupilo ya está vinculado a su cuenta'
            });
        }

        // 4. Crear relación en tb_apoderado_alumno
        await connection.query(`
            INSERT INTO tb_apoderado_alumno
            (apoderado_id, alumno_id, parentesco, es_apoderado_titular, activo)
            VALUES (?, ?, ?, ?, 1)
        `, [apoderado_id, alumnoId, preregistro.parentesco, preregistro.es_apoderado_titular || 1]);

        // 5. Marcar preregistro como usado
        await connection.query(`
            UPDATE tb_preregistro_relaciones
            SET usado = 1, fecha_uso = NOW()
            WHERE id = ?
        `, [preregistro_id]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Pupilo vinculado correctamente'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error confirmando pupilo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al vincular pupilo'
        });
    } finally {
        connection.release();
    }
});

// POST /api/apoderado/vincular-manual - Vincular alumno manualmente ingresando RUT
app.post('/api/apoderado/vincular-manual', async (req, res) => {
    const { rut_alumno, apoderado_id, rut_apoderado } = req.body;

    if (!rut_alumno || !apoderado_id || !rut_apoderado) {
        return res.status(400).json({ success: false, error: 'Faltan datos requeridos' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Buscar si hay una relación pendiente en tb_preregistro_relaciones
        // que coincida con el RUT del apoderado Y el RUT del alumno
        const [preregistros] = await connection.query(`
            SELECT id, parentesco, es_apoderado_titular
            FROM tb_preregistro_relaciones
            WHERE UPPER(rut_apoderado) = UPPER(?)
            AND UPPER(rut_alumno) = UPPER(?)
            AND activo = 1
            AND usado = 0
        `, [rut_apoderado, rut_alumno]);

        if (preregistros.length === 0) {
            await connection.rollback();
            // Buscar si al menos existe el alumno para dar un mensaje mas especifico
            const [alumnoExiste] = await connection.query('SELECT id FROM tb_alumnos WHERE UPPER(rut) = UPPER(?)', [rut_alumno]);
            if (alumnoExiste.length === 0) {
                return res.status(404).json({ success: false, error: 'RUT de alumno no encontrado en el sistema.' });
            }
            return res.status(400).json({
                success: false,
                error: 'No se encontró una vinculación autorizada pendiente para este alumno y su cuenta. Contacte al establecimiento.'
            });
        }

        const datosRelacion = preregistros[0];

        // 2. Obtener ID del Alumno
        const [alumnos] = await connection.query('SELECT id FROM tb_alumnos WHERE UPPER(rut) = UPPER(?)', [rut_alumno]);
        if (alumnos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Error interno: Alumno no encontrado en tabla maestra.' });
        }
        const alumnoId = alumnos[0].id;

        // 3. Verificar si ya está vinculado
        const [yaVinculado] = await connection.query('SELECT id FROM tb_apoderado_alumno WHERE apoderado_id = ? AND alumno_id = ? AND activo = 1', [apoderado_id, alumnoId]);
        if (yaVinculado.length > 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, error: 'Este alumno ya está vinculado a su cuenta.' });
        }

        // 4. Crear el vínculo definitivo
        await connection.query(`
            INSERT INTO tb_apoderado_alumno (apoderado_id, alumno_id, parentesco, es_apoderado_titular, activo)
            VALUES (?, ?, ?, ?, 1)
        `, [apoderado_id, alumnoId, datosRelacion.parentesco, datosRelacion.es_apoderado_titular]);

        // 5. Marcar preregistro como usado
        await connection.query('UPDATE tb_preregistro_relaciones SET usado = 1, fecha_uso = NOW() WHERE id = ?', [datosRelacion.id]);

        await connection.commit();

        res.json({ success: true, message: 'Alumno vinculado exitosamente.' });

    } catch (error) {
        await connection.rollback();
        console.error('Error en vinculación manual:', error);
        res.status(500).json({ success: false, error: 'Error del servidor al vincular.' });
    } finally {
        connection.release();
    }
});

// GET /api/apoderado/mis-pupilos/:apoderadoId - Obtener pupilos vinculados del apoderado
app.get('/api/apoderado/mis-pupilos/:apoderadoId', async (req, res) => {
    const { apoderadoId } = req.params;

    try {
        const [pupilos] = await pool.query(`
            SELECT
                a.id,
                a.rut,
                a.nombres,
                a.apellidos,
                a.fecha_nacimiento,
                a.sexo,
                CONCAT(a.nombres, ' ', a.apellidos) as nombre_completo,
                aa.parentesco,
                aa.es_apoderado_titular,
                c.nombre as curso_nombre,
                e.nombre as establecimiento_nombre
            FROM tb_apoderado_alumno aa
            JOIN tb_alumnos a ON aa.alumno_id = a.id AND a.activo = 1
            LEFT JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id AND ae.activo = 1
            LEFT JOIN tb_cursos c ON ae.curso_id = c.id
            LEFT JOIN tb_establecimientos e ON ae.establecimiento_id = e.id
            WHERE aa.apoderado_id = ? AND aa.activo = 1
            ORDER BY a.apellidos, a.nombres
        `, [apoderadoId]);

        res.json({
            success: true,
            data: pupilos
        });

    } catch (error) {
        console.error('Error obteniendo pupilos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener pupilos'
        });
    }
});

// GET /api/apoderado/pupilo/:alumnoId/notas - Obtener notas de un pupilo
app.get('/api/apoderado/pupilo/:alumnoId/notas', async (req, res) => {
    const { alumnoId } = req.params;
    const { establecimiento_id } = req.query;

    try {
        const anioActual = new Date().getFullYear();

        const [notas] = await pool.query(`
            SELECT
                asig.nombre as asignatura,
                n.trimestre,
                n.numero_evaluacion,
                n.nota,
                n.fecha_evaluacion as fecha,
                n.comentario,
                n.es_pendiente
            FROM tb_notas n
            JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
            WHERE n.alumno_id = ?
            AND n.activo = 1
            AND n.anio_academico = ?
            ${establecimiento_id ? 'AND n.establecimiento_id = ?' : ''}
            ORDER BY asig.nombre ASC, n.trimestre ASC, n.numero_evaluacion ASC
        `, establecimiento_id ? [alumnoId, anioActual, establecimiento_id] : [alumnoId, anioActual]);

        res.json({
            success: true,
            data: notas
        });

    } catch (error) {
        console.error('Error obteniendo notas del pupilo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener notas'
        });
    }
});

// GET /api/apoderado/pupilo/:alumnoId/comunicados - Obtener comunicados del curso del pupilo
app.get('/api/apoderado/pupilo/:alumnoId/comunicados', async (req, res) => {
    const { alumnoId } = req.params;
    const { usuario_id } = req.query;

    try {
        // Obtener el curso_id del alumno
        const [alumnoData] = await pool.query(`
            SELECT ae.curso_id, ae.establecimiento_id
            FROM tb_alumno_establecimiento ae
            WHERE ae.alumno_id = ? AND ae.activo = 1
            LIMIT 1
        `, [alumnoId]);

        if (alumnoData.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const { curso_id, establecimiento_id } = alumnoData[0];

        // Obtener comunicados para el curso del alumno o para todos los cursos
        const [comunicados] = await pool.query(`
            SELECT DISTINCT
                c.id,
                c.titulo,
                c.mensaje,
                c.tipo,
                c.prioridad,
                c.fecha_envio as fecha,
                c.fecha_evento,
                c.hora_evento,
                c.lugar_evento,
                c.requiere_confirmacion,
                CASE WHEN cl.id IS NOT NULL THEN 1 ELSE 0 END as leido,
                cl.fecha_lectura
            FROM tb_comunicados c
            LEFT JOIN tb_comunicado_curso cc ON c.id = cc.comunicado_id
            LEFT JOIN tb_comunicado_leido cl ON c.id = cl.comunicado_id AND cl.usuario_id = ?
            WHERE c.establecimiento_id = ?
            AND c.activo = 1
            AND c.enviado = 1
            AND c.para_apoderados = 1
            AND (c.para_todos_cursos = 1 OR cc.curso_id = ?)
            AND (c.fecha_expiracion IS NULL OR c.fecha_expiracion >= CURDATE())
            ORDER BY c.fecha_envio DESC
        `, [usuario_id || 0, establecimiento_id, curso_id]);

        res.json({
            success: true,
            data: comunicados
        });

    } catch (error) {
        console.error('Error obteniendo comunicados del pupilo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener comunicados'
        });
    }
});

// POST /api/apoderado/comunicado/:comunicadoId/marcar-leido - Marcar comunicado como leido
app.post('/api/apoderado/comunicado/:comunicadoId/marcar-leido', async (req, res) => {
    const { comunicadoId } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere usuario_id'
        });
    }

    try {
        // Verificar si ya existe el registro
        const [existing] = await pool.query(`
            SELECT id FROM tb_comunicado_leido
            WHERE comunicado_id = ? AND usuario_id = ?
        `, [comunicadoId, usuario_id]);

        if (existing.length === 0) {
            // Insertar nuevo registro de lectura
            await pool.query(`
                INSERT INTO tb_comunicado_leido (comunicado_id, usuario_id, fecha_lectura)
                VALUES (?, ?, NOW())
            `, [comunicadoId, usuario_id]);
        }

        res.json({
            success: true,
            message: 'Comunicado marcado como leido'
        });

    } catch (error) {
        console.error('Error marcando comunicado como leido:', error);
        res.status(500).json({
            success: false,
            error: 'Error al marcar comunicado'
        });
    }
});

// GET /api/apoderado/pupilo/:alumnoId/progreso - Obtener estadisticas de progreso del pupilo
app.get('/api/apoderado/pupilo/:alumnoId/progreso', async (req, res) => {
    const { alumnoId } = req.params;

    try {
        const anioActual = new Date().getFullYear();

        // 0. Obtener el establecimiento_id y curso_id actual del alumno
        const [alumnoInfo] = await pool.query(`
            SELECT establecimiento_id, curso_id 
            FROM tb_alumno_establecimiento 
            WHERE alumno_id = ? AND anio_academico = ? AND activo = 1
            LIMIT 1
        `, [alumnoId, anioActual]);

        const estId = alumnoInfo[0]?.establecimiento_id;
        const cursoId = alumnoInfo[0]?.curso_id;

        // 1. Obtener todas las notas del alumno (filtrando por contexto actual)
        let queryNotas = `
            SELECT
                n.nota,
                n.trimestre,
                n.fecha_evaluacion,
                asig.nombre as asignatura
            FROM tb_notas n
            JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
            WHERE n.alumno_id = ?
            AND n.activo = 1
            AND n.anio_academico = ?
            AND n.es_pendiente = 0
            AND n.nota IS NOT NULL
        `;

        const queryParams = [alumnoId, anioActual];

        if (estId) {
            queryNotas += ` AND n.establecimiento_id = ?`;
            queryParams.push(estId);
        }
        if (cursoId) {
            queryNotas += ` AND n.curso_id = ?`;
            queryParams.push(cursoId);
        }

        queryNotas += ` ORDER BY n.fecha_evaluacion ASC`;

        const [notas] = await pool.query(queryNotas, queryParams);

        // 2. Calcular estadisticas de notas
        let estadisticas = {
            totalNotas: 0,
            promedio: 0,
            notaMaxima: 0,
            notaMinima: 0,
            aprobadas: 0,
            reprobadas: 0,
            porcentajeAprobacion: 0
        };

        if (notas.length > 0) {
            const notasValores = notas.map(n => parseFloat(n.nota));
            const suma = notasValores.reduce((acc, n) => acc + n, 0);
            const aprobadas = notasValores.filter(n => n >= 4.0).length;

            estadisticas = {
                totalNotas: notas.length,
                promedio: suma / notas.length,
                notaMaxima: Math.max(...notasValores),
                notaMinima: Math.min(...notasValores),
                aprobadas: aprobadas,
                reprobadas: notas.length - aprobadas,
                porcentajeAprobacion: (aprobadas / notas.length) * 100
            };
        }

        // 3. Calcular promedios por trimestre
        const promediosPorTrimestre = {};
        [1, 2, 3].forEach(trim => {
            const notasTrim = notas.filter(n => n.trimestre === trim);
            if (notasTrim.length > 0) {
                const suma = notasTrim.reduce((acc, n) => acc + parseFloat(n.nota), 0);
                promediosPorTrimestre[trim] = suma / notasTrim.length;
            }
        });

        // 4. Calcular promedios por asignatura
        const asignaturas = [...new Set(notas.map(n => n.asignatura))].sort();
        const promediosPorAsignatura = {};
        asignaturas.forEach(asig => {
            const notasAsig = notas.filter(n => n.asignatura === asig);
            if (notasAsig.length > 0) {
                const suma = notasAsig.reduce((acc, n) => acc + parseFloat(n.nota), 0);
                promediosPorAsignatura[asig] = suma / notasAsig.length;
            }
        });

        // 5. Calcular promedios mensuales (para grafico de linea)
        const promediosMensuales = {};
        notas.forEach(n => {
            if (n.fecha_evaluacion) {
                const mes = new Date(n.fecha_evaluacion).getMonth() + 1; // 1-12
                if (!promediosMensuales[mes]) {
                    promediosMensuales[mes] = { suma: 0, count: 0 };
                }
                promediosMensuales[mes].suma += parseFloat(n.nota);
                promediosMensuales[mes].count++;
            }
        });
        // Convertir a promedios
        Object.keys(promediosMensuales).forEach(mes => {
            promediosMensuales[mes] = promediosMensuales[mes].suma / promediosMensuales[mes].count;
        });

        // 6. Obtener asistencia del alumno
        const [asistenciaData] = await pool.query(`
            SELECT
                COUNT(*) as totalDias,
                SUM(CASE WHEN estado IN ('presente', 'atrasado', 'justificado') THEN 1 ELSE 0 END) as diasPresente
            FROM tb_asistencia
            WHERE alumno_id = ?
            AND anio_academico = ?
            AND activo = 1
        `, [alumnoId, anioActual]);

        let asistencia = {
            porcentaje: 0,
            diasPresente: 0,
            totalDias: 0
        };

        if (asistenciaData.length > 0 && asistenciaData[0].totalDias > 0) {
            asistencia = {
                porcentaje: (asistenciaData[0].diasPresente / asistenciaData[0].totalDias) * 100,
                diasPresente: asistenciaData[0].diasPresente || 0,
                totalDias: asistenciaData[0].totalDias || 0
            };
        }

        res.json({
            success: true,
            data: {
                estadisticas,
                asistencia,
                promediosPorTrimestre,
                promediosPorAsignatura,
                promediosMensuales,
                asignaturas
            }
        });

    } catch (error) {
        console.error('Error obteniendo progreso del pupilo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener progreso'
        });
    }
});

// ============================================
// RUTAS DE ASIGNATURAS
// ============================================

// GET /api/asignaturas - Obtener asignaturas del establecimiento
app.get('/api/asignaturas', async (req, res) => {
    const { establecimiento_id = 1 } = req.query;

    try {
        const [rows] = await pool.query(`
            SELECT id, nombre, codigo, descripcion
            FROM tb_asignaturas
            WHERE establecimiento_id = ? AND activo = 1
            ORDER BY nombre
        `, [establecimiento_id]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener asignaturas:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asignaturas' });
    }
});

// POST /api/asignaturas - Crear nueva asignatura
app.post('/api/asignaturas', async (req, res) => {
    const { nombre, codigo, descripcion, establecimiento_id = 1 } = req.body;

    if (!nombre) {
        return res.status(400).json({ success: false, error: 'El nombre es requerido' });
    }

    try {
        // Verificar si ya existe una asignatura con ese nombre en el establecimiento
        const [existente] = await pool.query(
            'SELECT id FROM tb_asignaturas WHERE UPPER(nombre) = UPPER(?) AND establecimiento_id = ? AND activo = 1',
            [nombre, establecimiento_id]
        );

        if (existente.length > 0) {
            return res.status(400).json({ success: false, error: 'Ya existe una asignatura con ese nombre' });
        }

        const [result] = await pool.query(`
            INSERT INTO tb_asignaturas (nombre, codigo, descripcion, establecimiento_id, activo)
            VALUES (?, ?, ?, ?, 1)
        `, [nombre, codigo || null, descripcion || null, establecimiento_id]);

        // Registrar en tb_log_actividades
        await pool.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (NULL, 'administrador', 'Administrador', 'crear', 'asignaturas', ?, 'asignatura', ?, NULL, ?, ?)
        `, [
            `Asignatura creada: ${nombre}`,
            result.insertId,
            JSON.stringify({ nombre, codigo, descripcion }),
            establecimiento_id
        ]);

        res.json({
            success: true,
            message: 'Asignatura creada correctamente',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error al crear asignatura:', error);
        res.status(500).json({ success: false, error: 'Error al crear asignatura' });
    }
});

// DELETE /api/asignaturas/:id - Eliminar asignatura (soft delete)
app.delete('/api/asignaturas/:id', async (req, res) => {
    const { id } = req.params;
    const { establecimiento_id = 1 } = req.body || {};

    try {
        // Verificar si la asignatura tiene docentes asignados activos
        const [docentesAsignados] = await pool.query(
            'SELECT COUNT(*) as count FROM tb_docente_asignatura WHERE asignatura_id = ? AND activo = 1',
            [id]
        );

        if (docentesAsignados[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar: hay docentes asignados a esta asignatura'
            });
        }

        // Obtener datos antes de eliminar
        const [asigActual] = await pool.query('SELECT nombre, codigo, descripcion FROM tb_asignaturas WHERE id = ?', [id]);

        await pool.query('UPDATE tb_asignaturas SET activo = 0 WHERE id = ?', [id]);

        // Registrar en tb_log_actividades
        if (asigActual.length > 0) {
            await pool.query(`
                INSERT INTO tb_log_actividades
                (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
                 entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
                VALUES (NULL, 'administrador', 'Administrador', 'eliminar', 'asignaturas', ?, 'asignatura', ?, ?, NULL, ?)
            `, [
                `Asignatura eliminada: ${asigActual[0].nombre}`,
                id,
                JSON.stringify(asigActual[0]),
                establecimiento_id
            ]);
        }

        res.json({ success: true, message: 'Asignatura eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar asignatura:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar asignatura' });
    }
});

// ============================================
// RUTAS DE DOCENTES
// ============================================

// GET /api/docentes - Obtener docentes del establecimiento con sus asignaturas
app.get('/api/docentes', async (req, res) => {
    const { establecimiento_id = 1 } = req.query;

    try {
        // Obtener docentes del establecimiento
        const [docentes] = await pool.query(`
            SELECT
                d.id,
                d.rut,
                d.nombres,
                d.apellidos,
                d.email,
                CONCAT(d.apellidos, ', ', d.nombres) as nombre_completo,
                de.id as relacion_id,
                de.cargo
            FROM tb_docentes d
            JOIN tb_docente_establecimiento de ON d.id = de.docente_id AND de.activo = 1
            WHERE de.establecimiento_id = ? AND d.activo = 1
            ORDER BY d.apellidos, d.nombres
        `, [establecimiento_id]);

        // Obtener asignaturas de cada docente (filtradas por establecimiento de la asignatura)
        for (let docente of docentes) {
            const [asignaturas] = await pool.query(`
                SELECT a.id, a.nombre
                FROM tb_docente_asignatura da
                JOIN tb_asignaturas a ON da.asignatura_id = a.id AND a.activo = 1
                WHERE da.docente_id = ? AND da.activo = 1 AND a.establecimiento_id = ?
            `, [docente.id, establecimiento_id]);
            docente.asignaturas = asignaturas;
        }

        res.json({ success: true, data: docentes });
    } catch (error) {
        console.error('Error al obtener docentes:', error);
        res.status(500).json({ success: false, error: 'Error al obtener docentes' });
    }
});

// POST /api/docentes/agregar - Agregar docente (verifica si existe o va a preregistro)
app.post('/api/docentes/agregar', async (req, res) => {
    const {
        rut,
        nombres,
        apellidos,
        email,
        asignaturas = [], // Array de IDs de asignaturas
        establecimiento_id = 1
    } = req.body;

    if (!rut || !nombres || !apellidos) {
        return res.status(400).json({
            success: false,
            error: 'RUT, nombres y apellidos son requeridos'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Verificar si el docente ya existe en tb_docentes (ya registrado en el sistema)
        const [docenteExistente] = await connection.query(
            'SELECT id, nombres, apellidos FROM tb_docentes WHERE UPPER(rut) = UPPER(?) AND activo = 1',
            [rut]
        );

        let docenteId = null;
        let mensaje = '';
        let yaRegistrado = false;

        if (docenteExistente.length > 0) {
            // El docente YA está registrado en el sistema (tiene cuenta)
            docenteId = docenteExistente[0].id;
            yaRegistrado = true;

            // Verificar si ya está en este establecimiento
            const [yaEnEstablecimiento] = await connection.query(
                'SELECT id FROM tb_docente_establecimiento WHERE docente_id = ? AND establecimiento_id = ? AND activo = 1',
                [docenteId, establecimiento_id]
            );

            if (yaEnEstablecimiento.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Este docente ya está registrado en este establecimiento'
                });
            }

            // Agregar al establecimiento
            await connection.query(`
                INSERT INTO tb_docente_establecimiento (docente_id, establecimiento_id, fecha_ingreso, activo)
                VALUES (?, ?, CURDATE(), 1)
            `, [docenteId, establecimiento_id]);

            mensaje = `Docente ${docenteExistente[0].nombres} ${docenteExistente[0].apellidos} agregado al establecimiento. Ya tiene cuenta en el sistema.`;

        } else {
            // El docente NO está registrado - verificar si ya está en preregistro para este establecimiento
            const [enPreregistro] = await connection.query(
                'SELECT id FROM tb_preregistro_docentes WHERE UPPER(rut) = UPPER(?) AND establecimiento_id = ? AND activo = 1 AND usado = 0',
                [rut, establecimiento_id]
            );

            if (enPreregistro.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Este docente ya está en espera de registro para este establecimiento'
                });
            }

            // Obtener nombres de asignaturas para guardar en campo especialidad (texto informativo)
            let especialidadTexto = null;
            if (asignaturas.length > 0) {
                const [nombresAsig] = await connection.query(
                    `SELECT nombre FROM tb_asignaturas WHERE id IN (?) AND activo = 1`,
                    [asignaturas]
                );
                especialidadTexto = nombresAsig.map(a => a.nombre).join(', ');
            }

            // Crear preregistro para que el docente pueda registrarse
            const [resultPreregistro] = await connection.query(`
                INSERT INTO tb_preregistro_docentes
                (establecimiento_id, rut, nombres, apellidos, email, especialidad, activo, usado)
                VALUES (?, ?, ?, ?, ?, ?, 1, 0)
            `, [establecimiento_id, rut, nombres, apellidos, email || null, especialidadTexto]);

            const preregistroId = resultPreregistro.insertId;

            // Guardar las asignaturas en tb_preregistro_docente_asignatura (relación real)
            if (asignaturas.length > 0) {
                for (const asignaturaId of asignaturas) {
                    await connection.query(`
                        INSERT INTO tb_preregistro_docente_asignatura (preregistro_docente_id, asignatura_id)
                        VALUES (?, ?)
                    `, [preregistroId, asignaturaId]);
                }
            }

            mensaje = 'Docente agregado correctamente. Podrá registrarse en el sistema con su RUT.';
        }

        // 2. Si el docente ya estaba registrado, asignar las asignaturas directamente
        if (yaRegistrado && asignaturas.length > 0) {
            for (const asignaturaId of asignaturas) {
                // Verificar que no exista ya la asignación
                const [yaAsignada] = await connection.query(
                    'SELECT id FROM tb_docente_asignatura WHERE docente_id = ? AND asignatura_id = ? AND activo = 1',
                    [docenteId, asignaturaId]
                );

                if (yaAsignada.length === 0) {
                    await connection.query(`
                        INSERT INTO tb_docente_asignatura (docente_id, asignatura_id, activo)
                        VALUES (?, ?, 1)
                    `, [docenteId, asignaturaId]);
                }
            }
        }

        // Registrar en tb_log_actividades
        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (NULL, 'administrador', 'Administrador', 'crear', 'docentes', ?, 'docente', ?, NULL, ?, ?)
        `, [
            yaRegistrado ? `Docente existente agregado al establecimiento: ${nombres} ${apellidos}` : `Docente pre-registrado: ${nombres} ${apellidos} (RUT: ${rut})`,
            docenteId || 0,
            JSON.stringify({ rut, nombres, apellidos, email, asignaturas, docente_existente: yaRegistrado }),
            establecimiento_id
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: mensaje,
            docente_existente: yaRegistrado,
            docente_id: docenteId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al agregar docente:', error);
        res.status(500).json({ success: false, error: 'Error al agregar docente' });
    } finally {
        connection.release();
    }
});

// PUT /api/docentes/:id - Actualizar docente con logging
app.put('/api/docentes/:id', async (req, res) => {
    const { id } = req.params;
    const {
        rut, nombres, apellidos, email, asignaturas = [],
        establecimiento_id = 1,
        usuario_id = null,
        tipo_usuario = 'sistema',
        nombre_usuario = 'Sistema'
    } = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obtener datos actuales
        const [docenteActual] = await connection.query(
            'SELECT rut, nombres, apellidos, email FROM tb_docentes WHERE id = ?',
            [id]
        );

        if (docenteActual.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Docente no encontrado' });
        }

        const datosAnteriores = docenteActual[0];

        // 2. Actualizar datos básicos del docente
        await connection.query(`
            UPDATE tb_docentes SET rut = ?, nombres = ?, apellidos = ?, email = ?
            WHERE id = ?
        `, [rut, nombres, apellidos, email, id]);

        // 3. Actualizar asignaturas: desactivar las del establecimiento actual y crear las nuevas
        // Nota: tb_docente_asignatura no tiene establecimiento_id, filtramos por establecimiento de la asignatura
        await connection.query(`
            UPDATE tb_docente_asignatura da
            JOIN tb_asignaturas a ON da.asignatura_id = a.id
            SET da.activo = 0
            WHERE da.docente_id = ? AND a.establecimiento_id = ?
        `, [id, establecimiento_id]);

        for (const asignaturaId of asignaturas) {
            // Verificar si existe el registro (aunque inactivo)
            const [existe] = await connection.query(
                'SELECT id FROM tb_docente_asignatura WHERE docente_id = ? AND asignatura_id = ?',
                [id, asignaturaId]
            );

            if (existe.length > 0) {
                await connection.query(
                    'UPDATE tb_docente_asignatura SET activo = 1 WHERE id = ?',
                    [existe[0].id]
                );
            } else {
                await connection.query(`
                    INSERT INTO tb_docente_asignatura (docente_id, asignatura_id, activo)
                    VALUES (?, ?, 1)
                `, [id, asignaturaId]);
            }
        }

        // 4. Registrar en tb_log_actividades
        const cambios = [];
        if (rut !== datosAnteriores.rut) cambios.push(`RUT: "${datosAnteriores.rut}" → "${rut}"`);
        if (nombres !== datosAnteriores.nombres) cambios.push(`Nombres: "${datosAnteriores.nombres}" → "${nombres}"`);
        if (apellidos !== datosAnteriores.apellidos) cambios.push(`Apellidos: "${datosAnteriores.apellidos}" → "${apellidos}"`);
        if (email !== datosAnteriores.email) cambios.push(`Email: "${datosAnteriores.email || ''}" → "${email || ''}"`);

        if (cambios.length > 0) {
            const datosAnterioresJson = JSON.stringify({
                rut: datosAnteriores.rut,
                nombres: datosAnteriores.nombres,
                apellidos: datosAnteriores.apellidos,
                email: datosAnteriores.email
            });
            const datosNuevosJson = JSON.stringify({
                rut, nombres, apellidos, email
            });

            await connection.query(`
                INSERT INTO tb_log_actividades
                (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
                 entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
                VALUES (?, ?, ?, 'editar', 'docentes', ?, 'docente', ?, ?, ?, ?)
            `, [usuario_id, tipo_usuario, nombre_usuario, cambios.join(' | '), id,
                datosAnterioresJson, datosNuevosJson, establecimiento_id]);
        }

        await connection.commit();

        res.json({ success: true, message: 'Docente actualizado correctamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar docente:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar docente' });
    } finally {
        connection.release();
    }
});

// DELETE /api/docentes/:id - Eliminar docente del establecimiento (soft delete)
app.delete('/api/docentes/:id', async (req, res) => {
    const { id } = req.params;
    const {
        establecimiento_id = 1,
        usuario_id = null,
        tipo_usuario = 'sistema',
        nombre_usuario = 'Sistema'
    } = req.body || {};

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 0. VERIFICAR ASIGNACIONES ACTIVAS
        const [asignacionesActivas] = await connection.query(`
            SELECT c.nombre AS curso, a.nombre AS asignatura
            FROM tb_asignaciones asig
            JOIN tb_cursos c ON asig.curso_id = c.id
            JOIN tb_asignaturas a ON asig.asignatura_id = a.id
            WHERE asig.docente_id = ? 
              AND asig.establecimiento_id = ?
              AND asig.activo = 1
              AND asig.anio_academico = YEAR(CURDATE())
        `, [id, establecimiento_id]);

        if (asignacionesActivas.length > 0) {
            await connection.rollback();
            return res.json({
                success: false,
                error: 'Docente con asignaciones activas',
                asignaciones: asignacionesActivas
            });
        }

        // 1. Obtener datos del docente para el log
        const [docenteActual] = await connection.query(`
            SELECT d.rut, d.nombres, d.apellidos, d.email, e.nombre as establecimiento_nombre
            FROM tb_docentes d
            JOIN tb_docente_establecimiento de ON d.id = de.docente_id
            JOIN tb_establecimientos e ON de.establecimiento_id = e.id
            WHERE d.id = ? AND de.establecimiento_id = ?
        `, [id, establecimiento_id]);

        if (docenteActual.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Docente no encontrado en este establecimiento' });
        }

        const docente = docenteActual[0];

        // 2. Desactivar relación con el establecimiento
        await connection.query(
            'UPDATE tb_docente_establecimiento SET activo = 0 WHERE docente_id = ? AND establecimiento_id = ?',
            [id, establecimiento_id]
        );

        // 3. Desactivar asignaturas de este establecimiento (via join con tb_asignaturas)
        // Nota: tb_docente_asignatura no tiene establecimiento_id, usamos el de tb_asignaturas
        await connection.query(`
            UPDATE tb_docente_asignatura da
            JOIN tb_asignaturas a ON da.asignatura_id = a.id
            SET da.activo = 0
            WHERE da.docente_id = ? AND a.establecimiento_id = ?
        `, [id, establecimiento_id]);

        // 4. Verificar si el docente tiene otros establecimientos activos
        const [otrosEstablecimientos] = await connection.query(
            'SELECT COUNT(*) as count FROM tb_docente_establecimiento WHERE docente_id = ? AND activo = 1',
            [id]
        );

        // Si no tiene otros establecimientos, desactivar el docente completamente
        if (otrosEstablecimientos[0].count === 0) {
            await connection.query('UPDATE tb_docentes SET activo = 0 WHERE id = ?', [id]);
        }

        // 5. Registrar en tb_log_actividades
        const descripcion = `Docente eliminado: ${docente.nombres} ${docente.apellidos} (RUT: ${docente.rut}) del establecimiento ${docente.establecimiento_nombre}`;
        const datosAnterioresJson = JSON.stringify({
            rut: docente.rut,
            nombres: docente.nombres,
            apellidos: docente.apellidos,
            email: docente.email,
            establecimiento: docente.establecimiento_nombre
        });

        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (?, ?, ?, 'eliminar', 'docentes', ?, 'docente', ?, ?, NULL, ?)
        `, [usuario_id, tipo_usuario, nombre_usuario, descripcion, id,
            datosAnterioresJson, establecimiento_id]);

        await connection.commit();

        res.json({ success: true, message: 'Docente eliminado del establecimiento correctamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error al eliminar docente:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar docente' });
    } finally {
        connection.release();
    }
});

// GET /api/docente/:docenteId/establecimientos - Obtener establecimientos del docente
app.get('/api/docente/:docenteId/establecimientos', async (req, res) => {
    const { docenteId } = req.params;

    try {
        const [establecimientos] = await pool.query(`
            SELECT
                e.id,
                e.nombre,
                e.comuna,
                e.ciudad,
                e.region,
                de.cargo,
                de.es_profesor_jefe,
                de.fecha_ingreso
            FROM tb_docente_establecimiento de
            JOIN tb_establecimientos e ON de.establecimiento_id = e.id
            WHERE de.docente_id = ? AND de.activo = 1 AND e.activo = 1
            ORDER BY de.fecha_ingreso DESC
        `, [docenteId]);

        res.json({ success: true, data: establecimientos });
    } catch (error) {
        console.error('Error al obtener establecimientos del docente:', error);
        res.status(500).json({ success: false, error: 'Error al obtener establecimientos' });
    }
});

// GET /api/docente/:docenteId/cursos - Obtener cursos asignados al docente
app.get('/api/docente/:docenteId/cursos', async (req, res) => {
    const { docenteId } = req.params;
    const { establecimiento_id } = req.query;
    const anio = new Date().getFullYear();

    try {
        const [cursos] = await pool.query(`
            SELECT DISTINCT
                c.id,
                c.nombre,
                c.codigo,
                c.nivel,
                c.grado,
                c.letra
            FROM tb_asignaciones a
            JOIN tb_cursos c ON a.curso_id = c.id
            JOIN tb_asignaturas asig ON a.asignatura_id = asig.id
            WHERE a.docente_id = ?
            AND a.establecimiento_id = ?
            AND a.anio_academico = ?
            AND a.activo = 1
            AND c.activo = 1
            AND asig.activo = 1
            ORDER BY c.grado, c.letra, c.nombre
        `, [docenteId, establecimiento_id, anio]);

        res.json({ success: true, data: cursos });
    } catch (error) {
        console.error('Error al obtener cursos del docente:', error);
        res.status(500).json({ success: false, error: 'Error al obtener cursos' });
    }
});

// GET /api/docente/:docenteId/asignaturas-por-curso/:cursoId - Asignaturas que el docente imparte en un curso
app.get('/api/docente/:docenteId/asignaturas-por-curso/:cursoId', async (req, res) => {
    const { docenteId, cursoId } = req.params;
    const { establecimiento_id } = req.query;
    const anio = new Date().getFullYear();

    try {
        const [asignaturas] = await pool.query(`
            SELECT DISTINCT
                asig.id,
                asig.nombre,
                asig.codigo
            FROM tb_asignaciones a
            JOIN tb_asignaturas asig ON a.asignatura_id = asig.id
            WHERE a.docente_id = ?
            AND a.curso_id = ?
            AND a.establecimiento_id = ?
            AND a.anio_academico = ?
            AND a.activo = 1
            AND asig.activo = 1
            ORDER BY asig.nombre ASC
        `, [docenteId, cursoId, establecimiento_id, anio]);

        res.json({ success: true, data: asignaturas });
    } catch (error) {
        console.error('Error al obtener asignaturas del docente:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asignaturas' });
    }
});

// GET /api/tipos-evaluacion - Obtener tipos de evaluación del establecimiento
app.get('/api/tipos-evaluacion', async (req, res) => {
    const { establecimiento_id = 1 } = req.query;

    try {
        const [tipos] = await pool.query(`
            SELECT
                id,
                nombre,
                abreviatura,
                ponderacion_default,
                es_sumativa
            FROM tb_tipos_evaluacion
            WHERE establecimiento_id = ? AND activo = 1
            ORDER BY orden ASC, nombre ASC
        `, [establecimiento_id]);

        res.json({ success: true, data: tipos });
    } catch (error) {
        console.error('Error al obtener tipos de evaluación:', error);
        res.status(500).json({ success: false, error: 'Error al obtener tipos de evaluación' });
    }
});

// POST /api/notas/registrar - Registrar una nueva nota
app.post('/api/notas/registrar', async (req, res) => {
    const {
        establecimiento_id,
        alumno_id,
        asignatura_id,
        curso_id,
        docente_id,
        registrado_por,
        tipo_evaluacion_id,
        trimestre,
        nota,
        es_pendiente,
        fecha_evaluacion,
        descripcion,
        comentario
    } = req.body;

    if (!establecimiento_id || !alumno_id || !asignatura_id || !curso_id || !trimestre) {
        return res.status(400).json({
            success: false,
            error: 'Faltan datos requeridos'
        });
    }

    if (!es_pendiente && (nota === null || nota === undefined || nota === '')) {
        return res.status(400).json({
            success: false,
            error: 'Debe ingresar una nota o marcar como pendiente'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Obtener el periodo académico activo del establecimiento
        const [periodoActivo] = await connection.query(
            'SELECT anio FROM tb_periodos_academicos WHERE establecimiento_id = ? AND activo = 1 LIMIT 1',
            [establecimiento_id]
        );

        // El año académico es el del periodo activo, o el de la fecha si no hay activo
        // Usar la fecha de evaluación o la fecha actual si no viene
        const fechaParaAnio = fecha_evaluacion || new Date().toISOString().split('T')[0];
        // Extraer el año directamente del string (ej: "2026-01-15" -> 2026)
        const anioAcademico = parseInt(fechaParaAnio.split('-')[0]);

        // Obtener nombres para el log
        const [alumnoRow] = await connection.query('SELECT nombres, apellidos FROM tb_alumnos WHERE id = ?', [alumno_id]);
        const [asignaturaRow] = await connection.query('SELECT nombre FROM tb_asignaturas WHERE id = ?', [asignatura_id]);
        const [userRow] = await connection.query(`SELECT u.tipo_usuario, COALESCE(d.nombres, a.nombres) as nombres, COALESCE(d.apellidos, a.apellidos) as apellidos FROM tb_usuarios u LEFT JOIN tb_docentes d ON u.id = d.usuario_id LEFT JOIN tb_administradores a ON u.id = a.usuario_id WHERE u.id = ?`, [registrado_por]);

        const nombreAlumno = alumnoRow.length > 0 ? `${alumnoRow[0].nombres} ${alumnoRow[0].apellidos}` : `ID ${alumno_id}`;
        const nombreAsignatura = asignaturaRow.length > 0 ? asignaturaRow[0].nombre : `ID ${asignatura_id}`;
        const nombreUsuario = userRow.length > 0 ? `${userRow[0].nombres} ${userRow[0].apellidos}` : 'Usuario';
        const tipoUsuario = userRow.length > 0 ? userRow[0].tipo_usuario : 'docente';

        // Obtener el siguiente número de evaluación para este alumno/asignatura/trimestre
        const [maxEval] = await connection.query(`
            SELECT COALESCE(MAX(numero_evaluacion), 0) + 1 as siguiente
            FROM tb_notas
            WHERE alumno_id = ?
            AND asignatura_id = ?
            AND curso_id = ?
            AND trimestre = ?
            AND anio_academico = ?
            AND activo = 1
        `, [alumno_id, asignatura_id, curso_id, trimestre, anioAcademico]);

        const numeroEvaluacion = maxEval[0].siguiente;

        // Insertar la nota
        const [result] = await connection.query(`
            INSERT INTO tb_notas (
                establecimiento_id, alumno_id, asignatura_id, curso_id, docente_id,
                tipo_evaluacion_id, anio_academico, trimestre, numero_evaluacion,
                nota, es_pendiente, fecha_evaluacion, descripcion, comentario
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            establecimiento_id,
            alumno_id,
            asignatura_id,
            curso_id,
            docente_id || null,
            tipo_evaluacion_id || null,
            anioAcademico,
            trimestre,
            numeroEvaluacion,
            es_pendiente ? null : nota,
            es_pendiente ? 1 : 0,
            fecha_evaluacion || null,
            descripcion || null,
            comentario || null
        ]);

        // Registrar en tb_log_actividades
        const valorNota = es_pendiente ? 'PENDIENTE' : nota;
        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, establecimiento_id)
            VALUES (?, ?, ?, 'crear', 'notas', ?, 'nota', ?, ?)
        `, [
            registrado_por,
            tipoUsuario,
            nombreUsuario,
            `Registro de nota ${valorNota} para el alumno ${nombreAlumno} en la asignatura ${nombreAsignatura}`,
            result.insertId,
            establecimiento_id
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Nota registrada correctamente',
            data: { id: result.insertId, numero_evaluacion: numeroEvaluacion }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar nota:', error);
        res.status(500).json({ success: false, error: 'Error al registrar nota' });
    } finally {
        connection.release();
    }
});

// GET /api/docente/:docenteId/notas-recientes - Obtener últimas notas registradas por el docente
app.get('/api/docente/:docenteId/notas-recientes', async (req, res) => {
    const { docenteId } = req.params;
    const { establecimiento_id, curso_id, alumno_id, limit = 30 } = req.query;

    try {
        let query = `
            SELECT
                n.id,
                n.alumno_id,
                n.curso_id,
                n.asignatura_id,
                n.trimestre,
                n.nota,
                n.es_pendiente,
                n.fecha_evaluacion,
                n.descripcion,
                n.fecha_creacion,
                a.nombres as alumno_nombres,
                a.apellidos as alumno_apellidos,
                c.nombre as curso_nombre,
                asig.nombre as asignatura_nombre,
                te.nombre as tipo_evaluacion_nombre,
                te.abreviatura as tipo_evaluacion_abrev
            FROM tb_notas n
            JOIN tb_alumnos a ON n.alumno_id = a.id
            JOIN tb_cursos c ON n.curso_id = c.id
            JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
            LEFT JOIN tb_tipos_evaluacion te ON n.tipo_evaluacion_id = te.id
            WHERE n.docente_id = ?
            AND n.establecimiento_id = ?
            AND n.activo = 1
        `;

        const params = [docenteId, establecimiento_id];

        if (curso_id) {
            query += ` AND n.curso_id = ?`;
            params.push(curso_id);
        }

        if (alumno_id) {
            query += ` AND n.alumno_id = ?`;
            params.push(alumno_id);
        }

        query += ` ORDER BY n.fecha_creacion DESC, n.id DESC LIMIT ?`;
        params.push(parseInt(limit));

        const [notas] = await pool.query(query, params);

        res.json({ success: true, data: notas });
    } catch (error) {
        console.error('Error al obtener notas recientes:', error);
        res.status(500).json({ success: false, error: 'Error al obtener notas recientes' });
    }
});

// GET /api/docente/:docenteId/fechas-con-notas - Obtener fechas donde el docente ha registrado notas
app.get('/api/docente/:docenteId/fechas-con-notas', async (req, res) => {
    const { docenteId } = req.params;
    const { establecimiento_id, curso_id, asignatura_id, alumno_id } = req.query;

    try {
        let query = `
            SELECT DISTINCT DATE_FORMAT(fecha_evaluacion, '%Y-%m-%d') as fecha
            FROM tb_notas
            WHERE docente_id = ?
            AND establecimiento_id = ?
            AND activo = 1
            AND fecha_evaluacion IS NOT NULL
        `;
        const params = [docenteId, establecimiento_id];

        if (curso_id) {
            query += ` AND curso_id = ?`;
            params.push(curso_id);
        }

        if (asignatura_id) {
            query += ` AND asignatura_id = ?`;
            params.push(asignatura_id);
        }

        if (alumno_id) {
            query += ` AND alumno_id = ?`;
            params.push(alumno_id);
        }

        query += ` ORDER BY fecha DESC`;

        const [fechas] = await pool.query(query, params);

        // Retornar array de fechas en formato YYYY-MM-DD
        // Al usar DATE_FORMAT en SQL, f.fecha ya es un string
        const fechasArray = fechas.map(f => f.fecha);

        res.json({ success: true, data: fechasArray });
    } catch (error) {
        console.error('Error al obtener fechas con notas:', error);
        res.status(500).json({ success: false, error: 'Error al obtener fechas' });
    }
});

// GET /api/docente/:docenteId/notas/buscar - Buscar notas del docente con filtros
app.get('/api/docente/:docenteId/notas/buscar', async (req, res) => {
    const { docenteId } = req.params;
    const { establecimiento_id, curso_id, asignatura_id, alumno_id, fecha } = req.query;

    if (!curso_id) {
        return res.status(400).json({
            success: false,
            error: 'Debe seleccionar un curso'
        });
    }

    try {
        let query = `
            SELECT
                n.id,
                n.alumno_id,
                n.curso_id,
                n.asignatura_id,
                n.trimestre,
                n.numero_evaluacion,
                n.nota,
                n.es_pendiente,
                n.fecha_evaluacion,
                n.comentario,
                n.fecha_creacion,
                a.nombres as alumno_nombres,
                a.apellidos as alumno_apellidos,
                c.nombre as curso_nombre,
                asig.nombre as asignatura_nombre,
                te.nombre as tipo_evaluacion_nombre
            FROM tb_notas n
            JOIN tb_alumnos a ON n.alumno_id = a.id
            JOIN tb_cursos c ON n.curso_id = c.id
            JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
            LEFT JOIN tb_tipos_evaluacion te ON n.tipo_evaluacion_id = te.id
            WHERE n.docente_id = ?
            AND n.establecimiento_id = ?
            AND n.curso_id = ?
            AND n.activo = 1
        `;

        const params = [docenteId, establecimiento_id, curso_id];

        if (asignatura_id) {
            query += ` AND n.asignatura_id = ?`;
            params.push(asignatura_id);
        }

        if (alumno_id) {
            query += ` AND n.alumno_id = ?`;
            params.push(alumno_id);
        }

        if (fecha) {
            query += ` AND DATE(n.fecha_evaluacion) = ?`;
            params.push(fecha);
        }

        query += ` ORDER BY n.fecha_evaluacion DESC, a.apellidos ASC, a.nombres ASC`;

        const [notas] = await pool.query(query, params);

        res.json({ success: true, data: notas });
    } catch (error) {
        console.error('Error al buscar notas:', error);
        res.status(500).json({ success: false, error: 'Error al buscar notas' });
    }
});

// PUT /api/notas/:notaId - Actualizar una nota
app.put('/api/notas/:notaId', async (req, res) => {
    const { notaId } = req.params;
    const { nota, trimestre, fecha_evaluacion, comentario, es_pendiente } = req.body;

    try {
        // Verificar que la nota existe y obtener datos anteriores
        const [notaExistente] = await pool.query(
            'SELECT n.id, n.nota, n.trimestre, n.fecha_evaluacion, n.comentario, n.es_pendiente, n.alumno_id, n.asignatura_id, n.establecimiento_id, a.nombres as alumno_nombres, a.apellidos as alumno_apellidos FROM tb_notas n LEFT JOIN tb_alumnos a ON n.alumno_id = a.id WHERE n.id = ? AND n.activo = 1',
            [notaId]
        );

        if (notaExistente.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nota no encontrada'
            });
        }

        const notaAnterior = notaExistente[0];

        // Validar nota si no es pendiente
        if (!es_pendiente && nota !== null && nota !== undefined) {
            const notaNum = parseFloat(nota);
            if (notaNum < 1.0 || notaNum > 7.0) {
                return res.status(400).json({
                    success: false,
                    error: 'La nota debe estar entre 1.0 y 7.0'
                });
            }
        }

        // Actualizar la nota
        await pool.query(`
            UPDATE tb_notas
            SET nota = ?,
                trimestre = ?,
                fecha_evaluacion = ?,
                comentario = ?,
                es_pendiente = ?,
                fecha_modificacion = NOW()
            WHERE id = ?
        `, [
            es_pendiente ? null : nota,
            trimestre,
            fecha_evaluacion || null,
            comentario || null,
            es_pendiente ? 1 : 0,
            notaId
        ]);

        // Registrar en tb_log_actividades
        await pool.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (NULL, 'docente', 'Docente', 'editar', 'notas', ?, 'nota', ?, ?, ?, ?)
        `, [
            `Nota editada de ${notaAnterior.alumno_nombres} ${notaAnterior.alumno_apellidos}: ${notaAnterior.nota} → ${es_pendiente ? 'pendiente' : nota}`,
            notaId,
            JSON.stringify({ nota: notaAnterior.nota, trimestre: notaAnterior.trimestre, fecha_evaluacion: notaAnterior.fecha_evaluacion, comentario: notaAnterior.comentario, es_pendiente: notaAnterior.es_pendiente }),
            JSON.stringify({ nota: es_pendiente ? null : nota, trimestre, fecha_evaluacion, comentario, es_pendiente: es_pendiente ? 1 : 0 }),
            notaAnterior.establecimiento_id || 1
        ]);

        res.json({
            success: true,
            message: 'Nota actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar nota:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar nota' });
    }
});

// DELETE /api/notas/:notaId - Eliminar una nota (soft delete)
app.delete('/api/notas/:notaId', async (req, res) => {
    const { notaId } = req.params;

    try {
        // Obtener datos antes de eliminar
        const [notaExistente] = await pool.query(
            'SELECT n.id, n.nota, n.trimestre, n.alumno_id, n.asignatura_id, n.establecimiento_id, n.tipo_evaluacion_id, a.nombres as alumno_nombres, a.apellidos as alumno_apellidos FROM tb_notas n LEFT JOIN tb_alumnos a ON n.alumno_id = a.id WHERE n.id = ? AND n.activo = 1',
            [notaId]
        );

        if (notaExistente.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Nota no encontrada'
            });
        }

        const notaAnterior = notaExistente[0];

        // Soft delete - marcar como inactivo
        await pool.query(`
            UPDATE tb_notas
            SET activo = 0,
                fecha_modificacion = NOW()
            WHERE id = ?
        `, [notaId]);

        // Registrar en tb_log_actividades
        await pool.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (NULL, 'docente', 'Docente', 'eliminar', 'notas', ?, 'nota', ?, ?, NULL, ?)
        `, [
            `Nota eliminada de ${notaAnterior.alumno_nombres} ${notaAnterior.alumno_apellidos}: ${notaAnterior.nota} (T${notaAnterior.trimestre})`,
            notaId,
            JSON.stringify({ nota: notaAnterior.nota, trimestre: notaAnterior.trimestre, alumno_id: notaAnterior.alumno_id, asignatura_id: notaAnterior.asignatura_id }),
            notaAnterior.establecimiento_id || 1
        ]);

        res.json({
            success: true,
            message: 'Nota eliminada correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar nota:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar nota' });
    }
});

// GET /api/docente/:docenteId/notas/por-asignatura - Obtener notas de una asignatura para un curso
app.get('/api/docente/:docenteId/notas/por-asignatura', async (req, res) => {
    const { docenteId } = req.params;
    const { establecimiento_id, curso_id, asignatura_id, alumno_id } = req.query;

    if (!curso_id || !asignatura_id) {
        return res.status(400).json({
            success: false,
            error: 'Debe especificar curso y asignatura'
        });
    }

    try {
        // Primero obtener todos los alumnos del curso ordenados alfabéticamente
        let alumnosQuery = `
            SELECT DISTINCT
                a.id as alumno_id,
                a.nombres as alumno_nombres,
                a.apellidos as alumno_apellidos
            FROM tb_alumnos a
            JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id
            WHERE ae.curso_id = ?
            AND ae.activo = 1
            AND a.activo = 1
        `;
        const alumnosParams = [curso_id];

        if (alumno_id) {
            alumnosQuery += ` AND a.id = ?`;
            alumnosParams.push(alumno_id);
        }

        alumnosQuery += ` ORDER BY a.apellidos ASC, a.nombres ASC`;

        const [alumnos] = await pool.query(alumnosQuery, alumnosParams);

        // Luego obtener todas las notas de esos alumnos en la asignatura
        const alumnoIds = alumnos.map(a => a.alumno_id);

        let notas = [];
        if (alumnoIds.length > 0) {
            const [notasResult] = await pool.query(`
                SELECT
                    n.alumno_id,
                    n.trimestre,
                    n.numero_evaluacion,
                    n.nota,
                    n.es_pendiente
                FROM tb_notas n
                WHERE n.docente_id = ?
                AND n.establecimiento_id = ?
                AND n.curso_id = ?
                AND n.asignatura_id = ?
                AND n.alumno_id IN (?)
                AND n.activo = 1
                ORDER BY n.alumno_id, n.trimestre, n.numero_evaluacion
            `, [docenteId, establecimiento_id, curso_id, asignatura_id, alumnoIds]);
            notas = notasResult;
        }

        // Estructurar datos: cada alumno con sus notas organizadas por trimestre
        const resultado = alumnos.map(alumno => {
            const notasAlumno = notas.filter(n => n.alumno_id === alumno.alumno_id);

            // Organizar notas por trimestre
            const notasPorTrimestre = {
                1: [],
                2: [],
                3: []
            };

            notasAlumno.forEach(nota => {
                if (notasPorTrimestre[nota.trimestre]) {
                    notasPorTrimestre[nota.trimestre].push({
                        numero: nota.numero_evaluacion,
                        nota: nota.nota,
                        es_pendiente: nota.es_pendiente
                    });
                }
            });

            // Ordenar notas dentro de cada trimestre por numero_evaluacion
            Object.keys(notasPorTrimestre).forEach(trim => {
                notasPorTrimestre[trim].sort((a, b) => a.numero - b.numero);
            });

            return {
                alumno_id: alumno.alumno_id,
                alumno_nombres: alumno.alumno_nombres,
                alumno_apellidos: alumno.alumno_apellidos,
                notas_t1: notasPorTrimestre[1],
                notas_t2: notasPorTrimestre[2],
                notas_t3: notasPorTrimestre[3]
            };
        });

        res.json({ success: true, data: resultado });
    } catch (error) {
        console.error('Error al obtener notas por asignatura:', error);
        res.status(500).json({ success: false, error: 'Error al obtener notas' });
    }
});

// GET /api/curso/:cursoId/alumnos - Obtener alumnos de un curso
app.get('/api/curso/:cursoId/alumnos', async (req, res) => {
    const { cursoId } = req.params;

    try {
        const [alumnos] = await pool.query(`
            SELECT
                a.id,
                a.rut,
                a.nombres,
                a.apellidos,
                ae.numero_lista
            FROM tb_alumnos a
            JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id
            WHERE ae.curso_id = ? AND ae.activo = 1 AND a.activo = 1
            ORDER BY a.apellidos ASC, a.nombres ASC
        `, [cursoId]);

        res.json({ success: true, data: alumnos });
    } catch (error) {
        console.error('Error al obtener alumnos del curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener alumnos' });
    }
});

// GET /api/asistencia/verificar/:cursoId/:fecha - Verificar si existe asistencia registrada
app.get('/api/asistencia/verificar/:cursoId/:fecha', async (req, res) => {
    const { cursoId, fecha } = req.params;

    try {
        const [registros] = await pool.query(`
            SELECT
                a.id,
                a.alumno_id,
                a.estado,
                a.observacion
            FROM tb_asistencia a
            WHERE a.curso_id = ? AND a.fecha = ? AND a.activo = 1
        `, [cursoId, fecha]);

        const existe = registros.length > 0;
        const asistenciaMap = {};
        registros.forEach(r => {
            // Mapear 'atrasado' de la BD a 'tardio' para el frontend
            let estado = r.estado;
            if (estado === 'atrasado') estado = 'tardio';
            asistenciaMap[r.alumno_id] = {
                estado,
                observacion: r.observacion
            };
        });

        res.json({ success: true, existe, data: asistenciaMap });
    } catch (error) {
        console.error('Error al verificar asistencia:', error);
        res.status(500).json({ success: false, error: 'Error al verificar asistencia' });
    }
});

// POST /api/asistencia/registrar - Registrar asistencia de un curso
app.post('/api/asistencia/registrar', async (req, res) => {
    const {
        establecimiento_id,
        curso_id,
        fecha,
        asistencia,
        registrado_por,
        docente_id
    } = req.body;

    if (!establecimiento_id || !curso_id || !fecha || !asistencia) {
        return res.status(400).json({
            success: false,
            error: 'Faltan datos requeridos'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Obtener el periodo académico activo del establecimiento
        const [periodoActivo] = await connection.query(
            'SELECT anio FROM tb_periodos_academicos WHERE establecimiento_id = ? AND activo = 1 LIMIT 1',
            [establecimiento_id]
        );

        // El año académico es el del periodo activo, o el de la fecha si no hay activo
        // Extraer el año directamente del string de fecha (ej: "2026-01-15" -> 2026)
        const anioAcademico = parseInt(fecha.split('-')[0]);

        // Calcular trimestre (lógica chilena estándar pero robustecida)
        const mes = new Date(fecha).getUTCMonth() + 1; // Usar UTC para parsear "YYYY-MM-DD" correctamente
        const trimestre = mes <= 5 ? 1 : mes <= 8 ? 2 : 3;

        // Obtener nombres para el log
        const [userRow] = await connection.query(`SELECT u.tipo_usuario, COALESCE(d.nombres, a.nombres) as nombres, COALESCE(d.apellidos, a.apellidos) as apellidos FROM tb_usuarios u LEFT JOIN tb_docentes d ON u.id = d.usuario_id LEFT JOIN tb_administradores a ON u.id = a.usuario_id WHERE u.id = ?`, [registrado_por]);
        const [cursoRow] = await connection.query('SELECT nombre FROM tb_cursos WHERE id = ?', [curso_id]);

        const nombreUsuario = userRow.length > 0 ? `${userRow[0].nombres} ${userRow[0].apellidos}` : 'Usuario';
        const tipoUsuario = userRow.length > 0 ? userRow[0].tipo_usuario : 'docente';
        const nombreCurso = cursoRow.length > 0 ? cursoRow[0].nombre : `ID ${curso_id}`;

        // Contar asistencias existentes para el log
        const [existentes] = await connection.query('SELECT COUNT(*) as count FROM tb_asistencia WHERE curso_id = ? AND fecha = ? AND establecimiento_id = ?', [curso_id, fecha, establecimiento_id]);
        const esModificacion = existentes[0].count > 0;

        // Eliminar asistencia existente para esa fecha, curso y establecimiento (seguridad++)
        await connection.query(`
            DELETE FROM tb_asistencia
            WHERE curso_id = ? AND fecha = ? AND establecimiento_id = ?
        `, [curso_id, fecha, establecimiento_id]);

        // Insertar nueva asistencia
        for (const [alumnoId, datos] of Object.entries(asistencia)) {
            // Mapear 'tardio' del frontend a 'atrasado' de la BD
            let estadoDB = datos.estado;
            if (estadoDB === 'tardio') estadoDB = 'atrasado';

            await connection.query(`
                INSERT INTO tb_asistencia
                (establecimiento_id, alumno_id, curso_id, fecha, anio_academico, trimestre, estado, observacion, registrado_por)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                establecimiento_id,
                alumnoId,
                curso_id,
                fecha,
                anioAcademico,
                trimestre,
                estadoDB,
                datos.observacion || null,
                registrado_por || null
            ]);
        }

        // Registrar en tb_log_actividades
        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, establecimiento_id)
            VALUES (?, ?, ?, ?, 'asistencia', ?, 'curso', ?, ?)
        `, [
            registrado_por,
            tipoUsuario,
            nombreUsuario,
            esModificacion ? 'editar' : 'crear',
            `${esModificacion ? 'Modificación' : 'Registro'} de asistencia para el curso ${nombreCurso} el día ${fecha}`,
            curso_id,
            establecimiento_id
        ]);

        await connection.commit();
        res.json({ success: true, message: 'Asistencia registrada correctamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar asistencia:', error);
        res.status(500).json({ success: false, error: 'Error al registrar asistencia' });
    } finally {
        connection.release();
    }
});

// ============================================
// RUTAS DE ASIGNACIONES (Docente-Curso-Asignatura)
// ============================================

// GET /api/asignaciones - Listar asignaciones del establecimiento
app.get('/api/asignaciones', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [asignaciones] = await pool.query(`
            SELECT
                a.id,
                a.docente_id,
                a.curso_id,
                a.asignatura_id,
                a.anio_academico,
                a.horas_asignadas,
                a.es_titular,
                d.nombres as docente_nombres,
                d.apellidos as docente_apellidos,
                CONCAT(d.nombres, ' ', d.apellidos) as docente_nombre_completo,
                c.nombre as curso_nombre,
                c.codigo as curso_codigo,
                asig.nombre as asignatura_nombre
            FROM tb_asignaciones a
            JOIN tb_docentes d ON a.docente_id = d.id
            JOIN tb_cursos c ON a.curso_id = c.id
            JOIN tb_asignaturas asig ON a.asignatura_id = asig.id
            WHERE a.establecimiento_id = ?
            AND a.anio_academico = ?
            AND a.activo = 1
            ORDER BY d.apellidos, d.nombres, c.nombre, asig.nombre
        `, [establecimiento_id, anio]);

        res.json({ success: true, data: asignaciones });
    } catch (error) {
        console.error('Error al obtener asignaciones:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asignaciones' });
    }
});

// POST /api/asignaciones - Crear nueva asignacion (puede ser multiple)
app.post('/api/asignaciones', async (req, res) => {
    const {
        docente_id,
        curso_id,
        asignaturas = [], // Array de IDs de asignaturas
        establecimiento_id = 1,
        anio_academico,
        horas_asignadas = null,
        es_titular = 1,
        usuario_id = null,
        tipo_usuario = 'administrador',
        nombre_usuario = 'Administrador del Sistema'
    } = req.body;

    const anio = anio_academico || new Date().getFullYear();

    if (!docente_id || !curso_id || asignaturas.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Debe seleccionar docente, curso y al menos una asignatura'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const asignacionesCreadas = [];
        const asignacionesExistentes = [];

        for (const asignatura_id of asignaturas) {
            // Verificar si EL CURSO ya tiene asignada esta ASIGNATURA a OTRO docente
            const [ocupado] = await connection.query(`
                SELECT d.nombres, d.apellidos 
                FROM tb_asignaciones a
                JOIN tb_docentes d ON a.docente_id = d.id
                WHERE a.curso_id = ? 
                  AND a.asignatura_id = ? 
                  AND a.anio_academico = ? 
                  AND a.activo = 1
                  AND a.docente_id != ?
            `, [curso_id, asignatura_id, anio, docente_id]);

            if (ocupado.length > 0) {
                await connection.rollback();
                const [asigInfo] = await connection.query('SELECT nombre FROM tb_asignaturas WHERE id = ?', [asignatura_id]);
                const nombreAsig = asigInfo[0]?.nombre || 'Asignatura';
                return res.status(400).json({
                    success: false,
                    error: `El curso ya tiene la asignatura "${nombreAsig}" asignada al docente ${ocupado[0].nombres} ${ocupado[0].apellidos}. Debe liberar esa asignación primero.`
                });
            }

            // Verificar si ya existe la asignacion
            const [existe] = await connection.query(`
                SELECT id, activo FROM tb_asignaciones
                WHERE docente_id = ? AND curso_id = ? AND asignatura_id = ? AND anio_academico = ?
            `, [docente_id, curso_id, asignatura_id, anio]);

            if (existe.length > 0) {
                if (existe[0].activo === 0) {
                    // Reactivar asignacion existente
                    await connection.query(
                        'UPDATE tb_asignaciones SET activo = 1, es_titular = ?, horas_asignadas = ? WHERE id = ?',
                        [es_titular, horas_asignadas, existe[0].id]
                    );
                    asignacionesCreadas.push(asignatura_id);
                } else {
                    asignacionesExistentes.push(asignatura_id);
                }
            } else {
                // Crear nueva asignacion
                await connection.query(`
                    INSERT INTO tb_asignaciones
                    (establecimiento_id, docente_id, curso_id, asignatura_id, anio_academico, horas_asignadas, es_titular, activo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                `, [establecimiento_id, docente_id, curso_id, asignatura_id, anio, horas_asignadas, es_titular]);
                asignacionesCreadas.push(asignatura_id);
            }
        }

        // Registrar en log
        if (asignacionesCreadas.length > 0) {
            // Obtener nombres para el log
            const [docente] = await connection.query(
                'SELECT CONCAT(nombres, " ", apellidos) as nombre FROM tb_docentes WHERE id = ?',
                [docente_id]
            );
            const [curso] = await connection.query(
                'SELECT nombre FROM tb_cursos WHERE id = ?',
                [curso_id]
            );

            const descripcion = `Asignacion creada: ${docente[0]?.nombre || 'Docente'} asignado a ${curso[0]?.nombre || 'Curso'} con ${asignacionesCreadas.length} asignatura(s)`;

            await connection.query(`
                INSERT INTO tb_log_actividades
                (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
                 entidad_tipo, entidad_id, datos_nuevos, establecimiento_id)
                VALUES (?, ?, ?, 'crear', 'asignaciones', ?, 'asignacion', ?, ?, ?)
            `, [usuario_id, tipo_usuario, nombre_usuario, descripcion, docente_id,
                JSON.stringify({ docente_id, curso_id, asignaturas: asignacionesCreadas, anio_academico: anio }),
                establecimiento_id]);
        }

        await connection.commit();

        let mensaje = '';
        if (asignacionesCreadas.length > 0 && asignacionesExistentes.length === 0) {
            mensaje = `Se crearon ${asignacionesCreadas.length} asignacion(es) correctamente`;
        } else if (asignacionesCreadas.length > 0 && asignacionesExistentes.length > 0) {
            mensaje = `Se crearon ${asignacionesCreadas.length} asignacion(es). ${asignacionesExistentes.length} ya existian.`;
        } else {
            mensaje = 'Todas las asignaciones seleccionadas ya existen';
        }

        res.json({
            success: true,
            message: mensaje,
            creadas: asignacionesCreadas.length,
            existentes: asignacionesExistentes.length
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al crear asignacion:', error);
        res.status(500).json({ success: false, error: 'Error al crear asignacion' });
    } finally {
        connection.release();
    }
});

// DELETE /api/asignaciones/:id - Eliminar asignacion (soft delete)
app.delete('/api/asignaciones/:id', async (req, res) => {
    const { id } = req.params;
    const {
        establecimiento_id = 1,
        usuario_id = null,
        tipo_usuario = 'administrador',
        nombre_usuario = 'Administrador del Sistema'
    } = req.body || {};

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Obtener datos de la asignacion para el log
        const [asignacion] = await connection.query(`
            SELECT
                a.id, a.docente_id, a.curso_id, a.asignatura_id,
                CONCAT(d.nombres, ' ', d.apellidos) as docente_nombre,
                c.nombre as curso_nombre,
                asig.nombre as asignatura_nombre
            FROM tb_asignaciones a
            JOIN tb_docentes d ON a.docente_id = d.id
            JOIN tb_cursos c ON a.curso_id = c.id
            JOIN tb_asignaturas asig ON a.asignatura_id = asig.id
            WHERE a.id = ? AND a.establecimiento_id = ?
        `, [id, establecimiento_id]);

        if (asignacion.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Asignacion no encontrada' });
        }

        const asig = asignacion[0];

        // Soft delete
        await connection.query('UPDATE tb_asignaciones SET activo = 0 WHERE id = ?', [id]);

        // Registrar en log
        const descripcion = `Asignacion eliminada: ${asig.docente_nombre} - ${asig.curso_nombre} - ${asig.asignatura_nombre}`;

        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, establecimiento_id)
            VALUES (?, ?, ?, 'eliminar', 'asignaciones', ?, 'asignacion', ?, ?, ?)
        `, [usuario_id, tipo_usuario, nombre_usuario, descripcion, id,
            JSON.stringify(asig), establecimiento_id]);

        await connection.commit();

        res.json({ success: true, message: 'Asignacion eliminada correctamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error al eliminar asignacion:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar asignacion' });
    } finally {
        connection.release();
    }
});

// ============================================
// RUTAS DE NOTAS POR CURSO
// ============================================

// GET /api/asignaturas/por-curso/:cursoId - Obtener asignaturas asignadas a un curso
app.get('/api/asignaturas/por-curso/:cursoId', async (req, res) => {
    const { cursoId } = req.params;
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [asignaturas] = await pool.query(`
            SELECT DISTINCT
                asig.id,
                asig.nombre,
                asig.codigo
            FROM tb_asignaciones a
            JOIN tb_asignaturas asig ON a.asignatura_id = asig.id
            WHERE a.curso_id = ?
            AND a.establecimiento_id = ?
            AND a.anio_academico = ?
            AND a.activo = 1
            AND asig.activo = 1
            ORDER BY asig.nombre
        `, [cursoId, establecimiento_id, anio]);

        res.json({ success: true, data: asignaturas });
    } catch (error) {
        console.error('Error al obtener asignaturas del curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asignaturas del curso' });
    }
});

// GET /api/alumnos/por-curso/:cursoId - Obtener alumnos de un curso específico
app.get('/api/alumnos/por-curso/:cursoId', async (req, res) => {
    const { cursoId } = req.params;
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [alumnos] = await pool.query(`
            SELECT
                a.id,
                a.rut,
                a.nombres,
                a.apellidos,
                CONCAT(a.apellidos, ', ', a.nombres) AS nombre_completo,
                ae.numero_lista
            FROM tb_alumnos a
            JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id
            WHERE ae.curso_id = ?
            AND ae.establecimiento_id = ?
            AND ae.anio_academico = ?
            AND ae.activo = 1
            AND a.activo = 1
            ORDER BY a.apellidos ASC, a.nombres ASC
        `, [cursoId, establecimiento_id, anio]);

        res.json({ success: true, data: alumnos });
    } catch (error) {
        console.error('Error al obtener alumnos del curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener alumnos del curso' });
    }
});

// GET /api/notas/por-curso - Obtener notas filtradas por curso, asignatura y trimestre
app.get('/api/notas/por-curso', async (req, res) => {
    const {
        curso_id,
        asignatura_id,
        trimestre,
        establecimiento_id = 1,
        anio_academico
    } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    if (!curso_id || !asignatura_id) {
        return res.status(400).json({
            success: false,
            error: 'Debe especificar curso_id y asignatura_id'
        });
    }

    try {
        // Primero obtener todos los alumnos del curso
        const [alumnos] = await pool.query(`
            SELECT
                a.id,
                a.rut,
                a.nombres,
                a.apellidos,
                CONCAT(a.apellidos, ', ', a.nombres) AS nombre_completo,
                ae.numero_lista
            FROM tb_alumnos a
            JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id
            WHERE ae.curso_id = ?
            AND ae.establecimiento_id = ?
            AND ae.anio_academico = ?
            AND ae.activo = 1
            AND a.activo = 1
            ORDER BY a.apellidos ASC, a.nombres ASC
        `, [curso_id, establecimiento_id, anio]);

        // Construir query de notas según filtros
        let notasQuery = `
            SELECT
                n.id,
                n.alumno_id,
                n.trimestre,
                n.numero_evaluacion,
                n.nota,
                n.descripcion,
                te.nombre as tipo_evaluacion,
                te.abreviatura as tipo_evaluacion_abrev
            FROM tb_notas n
            LEFT JOIN tb_tipos_evaluacion te ON n.tipo_evaluacion_id = te.id
            WHERE n.curso_id = ?
            AND n.asignatura_id = ?
            AND n.establecimiento_id = ?
            AND n.anio_academico = ?
            AND n.activo = 1
        `;
        const params = [curso_id, asignatura_id, establecimiento_id, anio];

        // Filtrar por trimestre si no es "todas"
        if (trimestre && trimestre !== 'todas') {
            notasQuery += ` AND n.trimestre = ?`;
            params.push(trimestre);
        }

        notasQuery += ` ORDER BY n.trimestre, n.numero_evaluacion`;

        const [notas] = await pool.query(notasQuery, params);

        // Organizar notas por alumno y trimestre
        const notasPorAlumno = {};
        notas.forEach(nota => {
            if (!notasPorAlumno[nota.alumno_id]) {
                notasPorAlumno[nota.alumno_id] = { 1: [], 2: [], 3: [] };
            }
            notasPorAlumno[nota.alumno_id][nota.trimestre].push({
                id: nota.id,
                numero: nota.numero_evaluacion,
                nota: nota.nota,
                descripcion: nota.descripcion,
                tipo: nota.tipo_evaluacion_abrev || nota.tipo_evaluacion
            });
        });

        // Combinar alumnos con sus notas
        const resultado = alumnos.map(alumno => ({
            ...alumno,
            notas: notasPorAlumno[alumno.id] || { 1: [], 2: [], 3: [] }
        }));

        res.json({
            success: true,
            data: resultado,
            trimestres: trimestre === 'todas' ? [1, 2, 3] : [parseInt(trimestre)]
        });
    } catch (error) {
        console.error('Error al obtener notas del curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener notas del curso' });
    }
});

// POST /api/notas - Guardar o actualizar una nota
app.post('/api/notas', async (req, res) => {
    const {
        alumno_id,
        asignatura_id,
        curso_id,
        docente_id,
        tipo_evaluacion_id,
        trimestre,
        numero_evaluacion,
        nota,
        descripcion,
        establecimiento_id = 1,
        anio_academico,
        usuario_id = null,
        tipo_usuario = 'docente',
        nombre_usuario = 'Docente'
    } = req.body;

    const anio = anio_academico || new Date().getFullYear();

    if (!alumno_id || !asignatura_id || !curso_id || !trimestre || nota === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Faltan datos requeridos (alumno, asignatura, curso, trimestre, nota)'
        });
    }

    // Validar rango de nota (1.0 - 7.0)
    const notaNum = parseFloat(nota);
    if (isNaN(notaNum) || notaNum < 1.0 || notaNum > 7.0) {
        return res.status(400).json({
            success: false,
            error: 'La nota debe estar entre 1.0 y 7.0'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Verificar si ya existe una nota para ese alumno/asignatura/trimestre/numero_evaluacion
        const [existente] = await connection.query(`
            SELECT id, nota as nota_anterior
            FROM tb_notas
            WHERE alumno_id = ?
            AND asignatura_id = ?
            AND curso_id = ?
            AND trimestre = ?
            AND numero_evaluacion = ?
            AND establecimiento_id = ?
            AND anio_academico = ?
            AND activo = 1
        `, [alumno_id, asignatura_id, curso_id, trimestre, numero_evaluacion || 1,
            establecimiento_id, anio]);

        let notaId;
        let accion;

        if (existente.length > 0) {
            // Actualizar nota existente
            notaId = existente[0].id;
            accion = 'editar';

            await connection.query(`
                UPDATE tb_notas
                SET nota = ?, descripcion = ?, docente_id = ?, tipo_evaluacion_id = ?,
                    fecha_evaluacion = CURDATE()
                WHERE id = ?
            `, [notaNum, descripcion || null, docente_id || null, tipo_evaluacion_id || null, notaId]);
        } else {
            // Insertar nueva nota
            accion = 'crear';

            const [result] = await connection.query(`
                INSERT INTO tb_notas
                (establecimiento_id, alumno_id, asignatura_id, curso_id, docente_id,
                 tipo_evaluacion_id, anio_academico, trimestre, numero_evaluacion,
                 nota, descripcion, fecha_evaluacion, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 1)
            `, [establecimiento_id, alumno_id, asignatura_id, curso_id, docente_id || null,
                tipo_evaluacion_id || null, anio, trimestre, numero_evaluacion || 1,
                notaNum, descripcion || null]);

            notaId = result.insertId;
        }

        // Registrar en log
        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_nuevos, establecimiento_id)
            VALUES (?, ?, ?, ?, 'notas', ?, 'nota', ?, ?, ?)
        `, [usuario_id, tipo_usuario, nombre_usuario, accion,
            `Nota ${accion === 'crear' ? 'ingresada' : 'editada'}: ${notaNum}`,
            notaId,
            JSON.stringify({ alumno_id, asignatura_id, trimestre, nota: notaNum }),
            establecimiento_id]);

        await connection.commit();

        res.json({
            success: true,
            message: `Nota ${accion === 'crear' ? 'guardada' : 'editada'} correctamente`,
            id: notaId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al guardar nota:', error);
        res.status(500).json({ success: false, error: 'Error al guardar nota' });
    } finally {
        connection.release();
    }
});

// ============================================
// RUTAS DE ASISTENCIA
// ============================================

// GET /api/asistencia - Obtener asistencia por curso y mes
app.get('/api/asistencia', async (req, res) => {
    const { curso_id, mes, anio, establecimiento_id = 1 } = req.query;
    const anioActual = anio || new Date().getFullYear();

    if (!curso_id || mes === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Debe especificar curso_id y mes'
        });
    }

    try {
        // Obtener todos los registros de asistencia del curso para el mes
        const [asistencias] = await pool.query(`
            SELECT
                a.id,
                a.alumno_id,
                a.fecha,
                DAY(a.fecha) as dia,
                a.estado,
                a.hora_llegada,
                a.minutos_atraso,
                a.motivo_ausencia,
                a.observacion,
                a.registrado_por,
                a.fecha_modificacion
            FROM tb_asistencia a
            WHERE a.curso_id = ?
            AND a.establecimiento_id = ?
            AND MONTH(a.fecha) = ?
            AND YEAR(a.fecha) = ?
            AND a.activo = 1
            ORDER BY a.alumno_id, a.fecha
        `, [curso_id, establecimiento_id, parseInt(mes) + 1, anioActual]);

        // Organizar por alumno
        const asistenciaPorAlumno = {};
        asistencias.forEach(registro => {
            if (!asistenciaPorAlumno[registro.alumno_id]) {
                asistenciaPorAlumno[registro.alumno_id] = {};
            }
            asistenciaPorAlumno[registro.alumno_id][registro.dia] = {
                id: registro.id,
                estado: registro.estado,
                hora_llegada: registro.hora_llegada,
                minutos_atraso: registro.minutos_atraso,
                motivo_ausencia: registro.motivo_ausencia,
                observacion: registro.observacion
            };
        });

        res.json({
            success: true,
            data: asistenciaPorAlumno,
            total_registros: asistencias.length
        });
    } catch (error) {
        console.error('Error al obtener asistencia:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asistencia' });
    }
});

// GET /api/asistencia/estadisticas - Obtener estadísticas/KPIs del mes
// GET /api/asistencia/estadisticas - Obtener estadísticas/KPIs del mes o acumulado anual
app.get('/api/asistencia/estadisticas', async (req, res) => {
    const { curso_id, mes, anio, establecimiento_id = 1, modo } = req.query;
    const anioActual = anio || new Date().getFullYear();

    if (!curso_id && modo !== 'anual') {
        // Permitimos sin curso_id solo si es modo anual global o si queremos soportar global por mes
        // El usuario quiere KPIs globales fijos. Así que si no hay curso_id, asumimos global.
    }

    // Validacion original relajada
    if (modo !== 'anual' && mes === undefined && curso_id) {
        return res.status(400).json({
            success: false,
            error: 'Debe especificar mes o usar modo anual'
        });
    }

    try {
        let query = `
            SELECT
                estado,
                COUNT(*) as cantidad
            FROM tb_asistencia
            WHERE establecimiento_id = ?
            AND YEAR(fecha) = ?
            AND activo = 1
        `;

        const params = [establecimiento_id, anioActual];

        // Si hay curso, filtramos
        if (curso_id) {
            query += ` AND curso_id = ?`;
            params.push(curso_id);
        }

        // Si no es anual, filtrar por mes (si viene mes)
        if (modo !== 'anual' && mes !== undefined) {
            query += ` AND MONTH(fecha) = ?`;
            params.push(parseInt(mes) + 1);
        }

        query += ` GROUP BY estado`;

        // Obtener conteo por estado
        const [estadisticas] = await pool.query(query, params);

        // Construir objeto de estadísticas
        const stats = {
            total: 0,
            presente: 0,
            ausente: 0,
            justificado: 0,
            atrasado: 0,
            retirado: 0,
            suspendido: 0
        };

        estadisticas.forEach(e => {
            stats[e.estado] = e.cantidad;
            stats.total += e.cantidad;
        });

        // Calcular porcentaje de asistencia (presentes + atrasados / total)
        const asistenciaReal = stats.presente + stats.atrasado;
        stats.porcentaje_asistencia = stats.total > 0
            ? ((asistenciaReal / stats.total) * 100).toFixed(1)
            : '0.0';

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
});

// GET /api/asistencia/alumnos-bajo-umbral - Alumnos con asistencia bajo 85%
app.get('/api/asistencia/alumnos-bajo-umbral', async (req, res) => {
    const { curso_id, anio, mes, establecimiento_id = 1, umbral = 85 } = req.query;
    const anioActual = anio || new Date().getFullYear();

    try {
        let query = `
            SELECT
                a.alumno_id,
                al.nombres,
                al.apellidos,
                CONCAT(al.apellidos, ', ', al.nombres) as nombre_completo,
                c.nombre as nombre_curso,
                COUNT(*) as total_registros,
                SUM(CASE WHEN a.estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) as asistencias,
                ROUND((SUM(CASE WHEN a.estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) as porcentaje
            FROM tb_asistencia a
            JOIN tb_alumnos al ON a.alumno_id = al.id
            LEFT JOIN tb_matriculas m ON a.alumno_id = m.alumno_id AND m.anio_academico = ? AND m.activo = 1
            LEFT JOIN tb_cursos c ON m.curso_asignado_id = c.id
            WHERE a.establecimiento_id = ?
            AND YEAR(a.fecha) = ?
            AND a.activo = 1
        `;

        const params = [anioActual, establecimiento_id, anioActual];

        if (curso_id) {
            query += ` AND a.curso_id = ?`;
            params.push(curso_id);
        }

        if (mes !== undefined) {
            query += ` AND MONTH(a.fecha) = ?`;
            params.push(parseInt(mes) + 1); // JS 0-11 -> SQL 1-12
        }

        query += `
            GROUP BY a.alumno_id, al.nombres, al.apellidos, c.nombre
            HAVING porcentaje < ?
            ORDER BY porcentaje ASC
        `;
        params.push(umbral);

        const [resultados] = await pool.query(query, params);

        res.json({
            success: true,
            data: resultados,
            cantidad: resultados.length,
            umbral: umbral
        });
    } catch (error) {
        console.error('Error al obtener alumnos bajo umbral:', error);
        res.status(500).json({ success: false, error: 'Error al obtener alumnos bajo umbral' });
    }
});

// POST /api/asistencia - Registrar asistencia de un alumno (individual)
app.post('/api/asistencia', async (req, res) => {
    const {
        alumno_id,
        curso_id,
        fecha,
        estado,
        hora_llegada,
        minutos_atraso,
        motivo_ausencia,
        observacion,
        registrado_por,
        establecimiento_id = 1,
        anio_academico,
        trimestre = 1
    } = req.body;

    // Extraer el año directamente del string de fecha (ej: "2026-01-15" -> 2026)
    const anio = parseInt(fecha.split('-')[0]);

    if (!alumno_id || !curso_id || !fecha || !estado) {
        return res.status(400).json({
            success: false,
            error: 'Faltan datos requeridos (alumno_id, curso_id, fecha, estado)'
        });
    }

    try {
        // Verificar si ya existe registro para ese alumno y fecha
        const [existente] = await pool.query(`
            SELECT id FROM tb_asistencia
            WHERE alumno_id = ? AND fecha = ? AND activo = 1
        `, [alumno_id, fecha]);

        let asistenciaId;

        let estadoAnterior = null;
        if (existente.length > 0) {
            // Obtener estado anterior
            const [previo] = await pool.query('SELECT estado, observacion FROM tb_asistencia WHERE id = ?', [existente[0].id]);
            estadoAnterior = previo.length > 0 ? previo[0] : null;
            // Actualizar registro existente
            await pool.query(`
                UPDATE tb_asistencia
                SET estado = ?, hora_llegada = ?, minutos_atraso = ?,
                    motivo_ausencia = ?, observacion = ?, registrado_por = ?
                WHERE id = ?
            `, [estado, hora_llegada || null, minutos_atraso || 0,
                motivo_ausencia || null, observacion || null, registrado_por || null,
                existente[0].id]);
            asistenciaId = existente[0].id;
        } else {
            // Crear nuevo registro
            const [result] = await pool.query(`
                INSERT INTO tb_asistencia
                (establecimiento_id, alumno_id, curso_id, fecha, anio_academico, trimestre,
                 estado, hora_llegada, minutos_atraso, motivo_ausencia, observacion, registrado_por, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [establecimiento_id, alumno_id, curso_id, fecha, anio, trimestre,
                estado, hora_llegada || null, minutos_atraso || 0,
                motivo_ausencia || null, observacion || null, registrado_por || null]);
            asistenciaId = result.insertId;
        }

        // Registrar en tb_log_actividades
        await pool.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (NULL, 'docente', 'Docente', ?, 'asistencia', ?, 'asistencia', ?, ?, ?, ?)
        `, [
            estadoAnterior ? 'editar' : 'crear',
            `Asistencia ${estadoAnterior ? 'editada' : 'registrada'}: alumno ${alumno_id}, fecha ${fecha}, estado ${estado}`,
            asistenciaId,
            estadoAnterior ? JSON.stringify(estadoAnterior) : null,
            JSON.stringify({ alumno_id, curso_id, fecha, estado }),
            establecimiento_id
        ]);

        res.json({
            success: true,
            message: 'Asistencia registrada correctamente',
            id: asistenciaId
        });
    } catch (error) {
        console.error('Error al registrar asistencia:', error);
        res.status(500).json({ success: false, error: 'Error al registrar asistencia' });
    }
});

// POST /api/asistencia/masivo - Registrar asistencia de todo un curso
app.post('/api/asistencia/masivo', async (req, res) => {
    const {
        curso_id,
        fecha,
        asistencias, // Array de { alumno_id, estado, hora_llegada?, minutos_atraso?, observacion? }
        registrado_por,
        establecimiento_id = 1,
        anio_academico,
        trimestre = 1
    } = req.body;

    // Extraer el año directamente del string de fecha (ej: "2026-01-15" -> 2026)
    const anio = parseInt(fecha.split('-')[0]);

    if (!curso_id || !fecha || !asistencias || asistencias.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Faltan datos requeridos (curso_id, fecha, asistencias)'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        let registrosCreados = 0;
        let registrosActualizados = 0;

        for (const item of asistencias) {
            // Verificar si ya existe
            const [existente] = await connection.query(`
                SELECT id FROM tb_asistencia
                WHERE alumno_id = ? AND fecha = ? AND activo = 1
            `, [item.alumno_id, fecha]);

            if (existente.length > 0) {
                // Actualizar
                await connection.query(`
                    UPDATE tb_asistencia
                    SET estado = ?, hora_llegada = ?, minutos_atraso = ?,
                        observacion = ?, registrado_por = ?
                    WHERE id = ?
                `, [item.estado, item.hora_llegada || null, item.minutos_atraso || 0,
                item.observacion || null, registrado_por || null, existente[0].id]);
                registrosActualizados++;
            } else {
                // Insertar
                await connection.query(`
                    INSERT INTO tb_asistencia
                    (establecimiento_id, alumno_id, curso_id, fecha, anio_academico, trimestre,
                     estado, hora_llegada, minutos_atraso, observacion, registrado_por, activo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                `, [establecimiento_id, item.alumno_id, curso_id, fecha, anio, trimestre,
                    item.estado, item.hora_llegada || null, item.minutos_atraso || 0,
                    item.observacion || null, registrado_por || null]);
                registrosCreados++;
            }
        }

        // Registrar en tb_log_actividades (resumen de la operación masiva)
        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
            VALUES (NULL, 'docente', 'Docente', 'crear', 'asistencia', ?, 'asistencia', NULL, NULL, ?, ?)
        `, [
            `Asistencia masiva: curso ${curso_id}, fecha ${fecha}, ${registrosCreados} nuevos, ${registrosActualizados} actualizados`,
            JSON.stringify({ curso_id, fecha, total_alumnos: asistencias.length, registros_creados: registrosCreados, registros_actualizados: registrosActualizados }),
            establecimiento_id
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: `Asistencia guardada: ${registrosCreados} nuevos, ${registrosActualizados} actualizados`,
            registros_creados: registrosCreados,
            registros_actualizados: registrosActualizados
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar asistencia masiva:', error);
        res.status(500).json({ success: false, error: 'Error al registrar asistencia' });
    } finally {
        connection.release();
    }
});

// PUT /api/asistencia/:id - Actualizar un registro de asistencia (admin)
app.put('/api/asistencia/:id', async (req, res) => {
    const { id } = req.params;
    const {
        estado,
        hora_llegada,
        minutos_atraso,
        motivo_ausencia,
        observacion,
        modificado_por,
        establecimiento_id = 1
    } = req.body;

    if (!estado) {
        return res.status(400).json({
            success: false,
            error: 'El estado es requerido'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Obtener datos anteriores para log
        const [anterior] = await connection.query(
            'SELECT * FROM tb_asistencia WHERE id = ? AND activo = 1',
            [id]
        );

        if (anterior.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Registro no encontrado' });
        }

        const datosAnteriores = anterior[0];

        // Actualizar asistencia
        await connection.query(`
            UPDATE tb_asistencia
            SET estado = ?, hora_llegada = ?, minutos_atraso = ?,
                motivo_ausencia = ?, observacion = ?
            WHERE id = ?
        `, [estado, hora_llegada || null, minutos_atraso || 0,
            motivo_ausencia || null, observacion || null, id]);

        // Registrar en log si cambió el estado
        if (estado !== datosAnteriores.estado) {
            await connection.query(`
                INSERT INTO tb_log_actividades
                (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
                 entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
                VALUES (?, 'administrador', ?, 'editar', 'asistencia', ?, 'asistencia', ?, ?, ?, ?)
            `, [
                modificado_por || null,
                'Administrador',
                `Cambio de asistencia: ${datosAnteriores.estado} → ${estado}`,
                id,
                JSON.stringify({ estado: datosAnteriores.estado }),
                JSON.stringify({ estado }),
                establecimiento_id
            ]);
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Asistencia actualizada correctamente'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar asistencia:', error);
        res.status(500).json({ success: false, error: 'Error al actualizar asistencia' });
    } finally {
        connection.release();
    }
});

// ============================================
// RUTAS DE COMUNICADOS
// ============================================

// GET /api/comunicados - Obtener comunicados (para admin ver historial)
app.get('/api/comunicados', async (req, res) => {
    const { establecimiento_id = 1, limite = 50 } = req.query;

    try {
        const [comunicados] = await pool.query(`
            SELECT
                c.id,
                c.titulo,
                c.mensaje,
                c.tipo,
                c.prioridad,
                c.para_todos_cursos,
                c.fecha_envio,
                c.activo,
                CASE
                    WHEN u.tipo_usuario = 'administrador' THEN (SELECT CONCAT(a.nombres, ' ', a.apellidos) FROM tb_administradores a WHERE a.usuario_id = u.id)
                    WHEN u.tipo_usuario = 'docente' THEN (SELECT CONCAT(d.nombres, ' ', d.apellidos) FROM tb_docentes d WHERE d.usuario_id = u.id)
                    WHEN u.tipo_usuario = 'apoderado' THEN (SELECT CONCAT(ap.nombres, ' ', ap.apellidos) FROM tb_apoderados ap WHERE ap.usuario_id = u.id)
                END as remitente_nombre
            FROM tb_comunicados c
            LEFT JOIN tb_usuarios u ON c.remitente_id = u.id
            WHERE c.establecimiento_id = ?
            AND c.activo = 1
            ORDER BY c.fecha_envio DESC
            LIMIT ?
        `, [establecimiento_id, parseInt(limite)]);

        // Obtener cursos de cada comunicado
        for (let comunicado of comunicados) {
            if (!comunicado.para_todos_cursos) {
                const [cursos] = await pool.query(`
                    SELECT c.id, c.nombre
                    FROM tb_comunicado_curso cc
                    JOIN tb_cursos c ON cc.curso_id = c.id
                    WHERE cc.comunicado_id = ?
                `, [comunicado.id]);
                comunicado.cursos = cursos;
            } else {
                comunicado.cursos = [{ id: 0, nombre: 'Todos los cursos' }];
            }
        }

        res.json({ success: true, data: comunicados });
    } catch (error) {
        console.error('Error al obtener comunicados:', error);
        res.status(500).json({ success: false, error: 'Error al obtener comunicados' });
    }
});

// GET /api/comunicados/apoderado/:apoderadoId - Obtener comunicados para un apoderado
app.get('/api/comunicados/apoderado/:apoderadoId', async (req, res) => {
    const { apoderadoId } = req.params;
    const { establecimiento_id = 1 } = req.query;

    try {
        // Primero obtener los cursos de los pupilos del apoderado
        const [pupilos] = await pool.query(`
            SELECT DISTINCT ae.curso_id
            FROM tb_apoderado_alumno aa
            JOIN tb_alumno_establecimiento ae ON aa.alumno_id = ae.alumno_id AND ae.activo = 1
            WHERE aa.apoderado_id = ? AND aa.activo = 1
        `, [apoderadoId]);

        const cursosIds = pupilos.map(p => p.curso_id);

        if (cursosIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Obtener comunicados para esos cursos o para todos los cursos
        const [comunicados] = await pool.query(`
            SELECT DISTINCT
                c.id,
                c.titulo,
                c.mensaje,
                c.tipo,
                c.prioridad,
                c.para_todos_cursos,
                c.requiere_confirmacion,
                c.permite_respuesta,
                c.fecha_evento,
                c.hora_evento,
                c.lugar_evento,
                c.fecha_envio,
                CASE
                    WHEN u.tipo_usuario = 'administrador' THEN (SELECT CONCAT(a.nombres, ' ', a.apellidos) FROM tb_administradores a WHERE a.usuario_id = u.id)
                    WHEN u.tipo_usuario = 'docente' THEN (SELECT CONCAT(d.nombres, ' ', d.apellidos) FROM tb_docentes d WHERE d.usuario_id = u.id)
                    WHEN u.tipo_usuario = 'apoderado' THEN (SELECT CONCAT(ap.nombres, ' ', ap.apellidos) FROM tb_apoderados ap WHERE ap.usuario_id = u.id)
                END as remitente_nombre,
                cl.id as lectura_id,
                cl.fecha_lectura,
                cl.confirmado,
                cl.fecha_confirmacion
            FROM tb_comunicados c
            LEFT JOIN tb_usuarios u ON c.remitente_id = u.id
            LEFT JOIN tb_comunicado_curso cc ON c.id = cc.comunicado_id
            LEFT JOIN tb_comunicado_leido cl ON c.id = cl.comunicado_id AND cl.usuario_id = ?
            WHERE c.establecimiento_id = ?
            AND c.activo = 1
            AND c.para_apoderados = 1
            AND (c.para_todos_cursos = 1 OR cc.curso_id IN (?))
            ORDER BY c.fecha_envio DESC
        `, [apoderadoId, establecimiento_id, cursosIds]);

        res.json({ success: true, data: comunicados });
    } catch (error) {
        console.error('Error al obtener comunicados del apoderado:', error);
        res.status(500).json({ success: false, error: 'Error al obtener comunicados' });
    }
});

// POST /api/comunicados - Crear/enviar comunicado
app.post('/api/comunicados', async (req, res) => {
    const {
        titulo,
        mensaje,
        tipo = 'informativo',
        prioridad = 'normal',
        para_todos_cursos = false,
        cursos_ids = [], // Array de IDs de cursos
        para_apoderados = true,
        para_docentes = false,
        requiere_confirmacion = false,
        permite_respuesta = false,
        fecha_evento = null,
        hora_evento = null,
        lugar_evento = null,
        remitente_id,
        establecimiento_id = 1
    } = req.body;

    if (!titulo || !mensaje) {
        return res.status(400).json({
            success: false,
            error: 'El título y mensaje son requeridos'
        });
    }

    if (!remitente_id) {
        return res.status(400).json({
            success: false,
            error: 'El remitente es requerido'
        });
    }

    if (!para_todos_cursos && cursos_ids.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Debe seleccionar al menos un curso o marcar "todos los cursos"'
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Insertar comunicado
        const [result] = await connection.query(`
            INSERT INTO tb_comunicados
            (establecimiento_id, remitente_id, titulo, mensaje, tipo, prioridad,
             para_todos_cursos, para_docentes, para_apoderados,
             requiere_confirmacion, permite_respuesta,
             fecha_evento, hora_evento, lugar_evento, enviado, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
        `, [
            establecimiento_id,
            remitente_id,
            titulo,
            mensaje,
            tipo,
            prioridad,
            para_todos_cursos ? 1 : 0,
            para_docentes ? 1 : 0,
            para_apoderados ? 1 : 0,
            requiere_confirmacion ? 1 : 0,
            permite_respuesta ? 1 : 0,
            fecha_evento,
            hora_evento,
            lugar_evento
        ]);

        const comunicadoId = result.insertId;

        // 2. Si no es para todos los cursos, insertar relaciones con cursos
        if (!para_todos_cursos && cursos_ids.length > 0) {
            for (const cursoId of cursos_ids) {
                await connection.query(`
                    INSERT INTO tb_comunicado_curso (comunicado_id, curso_id)
                    VALUES (?, ?)
                `, [comunicadoId, cursoId]);
            }
        }

        // 3. Registrar en log
        await connection.query(`
            INSERT INTO tb_log_actividades
            (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
             entidad_tipo, entidad_id, datos_nuevos, establecimiento_id)
            VALUES (?, 'administrador', 'Administrador', 'crear', 'comunicados', ?, 'comunicado', ?, ?, ?)
        `, [
            remitente_id,
            `Comunicado enviado: ${titulo}`,
            comunicadoId,
            JSON.stringify({ titulo, tipo, para_todos_cursos, cursos_ids }),
            establecimiento_id
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Comunicado enviado correctamente',
            id: comunicadoId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error al enviar comunicado:', error);
        res.status(500).json({ success: false, error: 'Error al enviar comunicado' });
    } finally {
        connection.release();
    }
});

// POST /api/comunicados/:id/marcar-leido - Marcar comunicado como leído
app.post('/api/comunicados/:id/marcar-leido', async (req, res) => {
    const { id } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) {
        return res.status(400).json({
            success: false,
            error: 'El usuario_id es requerido'
        });
    }

    try {
        // Verificar si ya existe registro de lectura
        const [existente] = await pool.query(`
            SELECT id FROM tb_comunicado_leido
            WHERE comunicado_id = ? AND usuario_id = ?
        `, [id, usuario_id]);

        if (existente.length === 0) {
            // Crear registro de lectura
            await pool.query(`
                INSERT INTO tb_comunicado_leido (comunicado_id, usuario_id)
                VALUES (?, ?)
            `, [id, usuario_id]);
        }

        res.json({ success: true, message: 'Comunicado marcado como leído' });
    } catch (error) {
        console.error('Error al marcar comunicado como leído:', error);
        res.status(500).json({ success: false, error: 'Error al marcar como leído' });
    }
});

// POST /api/comunicados/:id/confirmar - Confirmar comunicado (si requiere confirmación)
app.post('/api/comunicados/:id/confirmar', async (req, res) => {
    const { id } = req.params;
    const { usuario_id, respuesta } = req.body;

    if (!usuario_id) {
        return res.status(400).json({
            success: false,
            error: 'El usuario_id es requerido'
        });
    }

    try {
        // Verificar si ya existe registro
        const [existente] = await pool.query(`
            SELECT id FROM tb_comunicado_leido
            WHERE comunicado_id = ? AND usuario_id = ?
        `, [id, usuario_id]);

        if (existente.length > 0) {
            // Actualizar con confirmación
            await pool.query(`
                UPDATE tb_comunicado_leido
                SET confirmado = 1, fecha_confirmacion = NOW(),
                    respuesta = ?, fecha_respuesta = ?
                WHERE id = ?
            `, [respuesta || null, respuesta ? new Date() : null, existente[0].id]);
        } else {
            // Crear registro con confirmación
            await pool.query(`
                INSERT INTO tb_comunicado_leido
                (comunicado_id, usuario_id, confirmado, fecha_confirmacion, respuesta, fecha_respuesta)
                VALUES (?, ?, 1, NOW(), ?, ?)
            `, [id, usuario_id, respuesta || null, respuesta ? new Date() : null]);
        }

        res.json({ success: true, message: 'Comunicado confirmado' });
    } catch (error) {
        console.error('Error al confirmar comunicado:', error);
        res.status(500).json({ success: false, error: 'Error al confirmar comunicado' });
    }
});

// DELETE /api/comunicados/:id - Eliminar comunicado (soft delete)
app.delete('/api/comunicados/:id', async (req, res) => {
    const { id } = req.params;
    const { establecimiento_id = 1 } = req.body || {};

    try {
        // Obtener datos antes de eliminar
        const [comAnterior] = await pool.query(
            'SELECT titulo, tipo, prioridad, remitente_id FROM tb_comunicados WHERE id = ?', [id]
        );

        await pool.query(`
            UPDATE tb_comunicados SET activo = 0 WHERE id = ? AND establecimiento_id = ?
        `, [id, establecimiento_id]);

        // Registrar en tb_log_actividades
        if (comAnterior.length > 0) {
            await pool.query(`
                INSERT INTO tb_log_actividades
                (usuario_id, tipo_usuario, nombre_usuario, accion, modulo, descripcion,
                 entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, establecimiento_id)
                VALUES (NULL, 'administrador', 'Administrador', 'eliminar', 'comunicados', ?, 'comunicado', ?, ?, NULL, ?)
            `, [
                `Comunicado eliminado: ${comAnterior[0].titulo}`,
                id,
                JSON.stringify(comAnterior[0]),
                establecimiento_id
            ]);
        }

        res.json({ success: true, message: 'Comunicado eliminado' });
    } catch (error) {
        console.error('Error al eliminar comunicado:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar comunicado' });
    }
});

// ============================================
// RUTAS DE ESTADÍSTICAS
// ============================================

// GET /api/estadisticas/general - KPIs generales del establecimiento
app.get('/api/estadisticas/general', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        // Promedio general y tasa de aprobación
        const [notasStats] = await pool.query(`
            SELECT
                ROUND(AVG(nota), 1) as promedioGeneral,
                ROUND(SUM(CASE WHEN nota >= 4.0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as tasaAprobacion,
                COUNT(DISTINCT alumno_id) as totalAlumnosConNotas
            FROM tb_notas
            WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL
        `, [establecimiento_id, anio]);

        // Total de alumnos activos
        const [alumnosCount] = await pool.query(`
            SELECT COUNT(DISTINCT a.id) as totalAlumnos
            FROM tb_alumnos a
            INNER JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id
            WHERE ae.establecimiento_id = ? AND ae.anio_academico = ? AND ae.activo = 1 AND a.activo = 1
        `, [establecimiento_id, anio]);

        // Total de docentes activos
        const [docentesCount] = await pool.query(`
            SELECT COUNT(DISTINCT d.id) as totalDocentes
            FROM tb_docentes d
            INNER JOIN tb_docente_establecimiento de ON d.id = de.docente_id
            WHERE de.establecimiento_id = ? AND de.activo = 1 AND d.activo = 1
        `, [establecimiento_id]);

        // Alumnos destacados (promedio >= 6.0) y en riesgo (promedio < 4.0)
        const [alumnosCategoria] = await pool.query(`
            SELECT
                SUM(CASE WHEN promedio >= 6.0 THEN 1 ELSE 0 END) as alumnosDestacados,
                SUM(CASE WHEN promedio < 4.0 THEN 1 ELSE 0 END) as alumnosRiesgo
            FROM (
                SELECT alumno_id, ROUND(AVG(nota), 1) as promedio
                FROM tb_notas
                WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL
                GROUP BY alumno_id
            ) as promedios
        `, [establecimiento_id, anio]);

        // Porcentaje de asistencia general
        const [asistenciaStats] = await pool.query(`
            SELECT
                ROUND(SUM(CASE WHEN estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as asistencia
            FROM tb_asistencia
            WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1
        `, [establecimiento_id, anio]);

        // Tendencia mensual (promedios por mes)
        const [tendencia] = await pool.query(`
            SELECT
                MONTH(fecha_evaluacion) as mes,
                ROUND(AVG(nota), 2) as promedio
            FROM tb_notas
            WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL AND fecha_evaluacion IS NOT NULL
            GROUP BY MONTH(fecha_evaluacion)
            ORDER BY mes
        `, [establecimiento_id, anio]);

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const tendenciaMensual = Array(12).fill(null);
        tendencia.forEach(t => {
            if (t.mes >= 1 && t.mes <= 12) {
                tendenciaMensual[t.mes - 1] = parseFloat(t.promedio);
            }
        });

        res.json({
            success: true,
            data: {
                promedioGeneral: parseFloat(notasStats[0]?.promedioGeneral) || 0,
                tasaAprobacion: parseFloat(notasStats[0]?.tasaAprobacion) || 0,
                totalAlumnos: alumnosCount[0]?.totalAlumnos || 0,
                totalDocentes: docentesCount[0]?.totalDocentes || 0,
                alumnosDestacados: parseInt(alumnosCategoria[0]?.alumnosDestacados) || 0,
                alumnosRiesgo: parseInt(alumnosCategoria[0]?.alumnosRiesgo) || 0,
                asistencia: parseFloat(asistenciaStats[0]?.asistencia) || 0,
                tendenciaMensual: tendenciaMensual.filter(t => t !== null),
                meses: meses
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas generales' });
    }
});

// GET /api/estadisticas/general/asignaturas - Promedio por asignatura
app.get('/api/estadisticas/general/asignaturas', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                asig.nombre as asignatura,
                ROUND(AVG(n.nota), 1) as promedio
            FROM tb_notas n
            INNER JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
            WHERE n.establecimiento_id = ? AND n.anio_academico = ? AND n.activo = 1 AND n.nota IS NOT NULL
            GROUP BY asig.id, asig.nombre
            ORDER BY promedio DESC
        `, [establecimiento_id, anio]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener promedios por asignatura:', error);
        res.status(500).json({ success: false, error: 'Error al obtener promedios por asignatura' });
    }
});

// GET /api/estadisticas/general/ranking-cursos - Top cursos por promedio
app.get('/api/estadisticas/general/ranking-cursos', async (req, res) => {
    const { establecimiento_id = 1, anio_academico, limite = 5 } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                c.nombre as curso,
                c.id as curso_id,
                ROUND(AVG(n.nota), 2) as promedio
            FROM tb_notas n
            INNER JOIN tb_cursos c ON n.curso_id = c.id
            WHERE n.establecimiento_id = ? AND n.anio_academico = ? AND n.activo = 1 AND n.nota IS NOT NULL
            GROUP BY c.id, c.nombre
            ORDER BY promedio DESC
            LIMIT ?
        `, [establecimiento_id, anio, parseInt(limite)]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener ranking de cursos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener ranking de cursos' });
    }
});

// GET /api/estadisticas/general/distribucion - Distribución de alumnos
app.get('/api/estadisticas/general/distribucion', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                SUM(CASE WHEN promedio >= 6.0 THEN 1 ELSE 0 END) as destacados,
                SUM(CASE WHEN promedio >= 4.0 AND promedio < 6.0 THEN 1 ELSE 0 END) as regulares,
                SUM(CASE WHEN promedio < 4.0 THEN 1 ELSE 0 END) as enRiesgo
            FROM (
                SELECT alumno_id, ROUND(AVG(nota), 1) as promedio
                FROM tb_notas
                WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL
                GROUP BY alumno_id
            ) as promedios
        `, [establecimiento_id, anio]);

        res.json({
            success: true,
            data: {
                destacados: parseInt(rows[0]?.destacados) || 0,
                regulares: parseInt(rows[0]?.regulares) || 0,
                enRiesgo: parseInt(rows[0]?.enRiesgo) || 0
            }
        });
    } catch (error) {
        console.error('Error al obtener distribución:', error);
        res.status(500).json({ success: false, error: 'Error al obtener distribución' });
    }
});

// ============================================
// ESTADÍSTICAS POR CURSO
// ============================================

// GET /api/estadisticas/curso/:cursoId - KPIs de un curso específico
app.get('/api/estadisticas/curso/:cursoId', async (req, res) => {
    const { cursoId } = req.params;
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        // Info del curso
        const [cursoInfo] = await pool.query(`
            SELECT id, nombre, codigo, nivel, grado, letra
            FROM tb_cursos WHERE id = ?
        `, [cursoId]);

        if (cursoInfo.length === 0) {
            return res.status(404).json({ success: false, error: 'Curso no encontrado' });
        }

        // Promedio y aprobación del curso
        const [notasStats] = await pool.query(`
            SELECT
                ROUND(AVG(nota), 1) as promedio,
                ROUND(SUM(CASE WHEN nota >= 4.0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as aprobacion
            FROM tb_notas
            WHERE curso_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL
        `, [cursoId, anio]);

        // Total alumnos en el curso
        const [alumnosCount] = await pool.query(`
            SELECT COUNT(DISTINCT a.id) as alumnos
            FROM tb_alumnos a
            INNER JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id
            WHERE ae.curso_id = ? AND ae.anio_academico = ? AND ae.activo = 1 AND a.activo = 1
        `, [cursoId, anio]);

        // Alumnos destacados y en riesgo del curso
        const [alumnosCategoria] = await pool.query(`
            SELECT
                SUM(CASE WHEN promedio >= 6.0 THEN 1 ELSE 0 END) as destacados,
                SUM(CASE WHEN promedio < 4.0 THEN 1 ELSE 0 END) as riesgo
            FROM (
                SELECT alumno_id, ROUND(AVG(nota), 1) as promedio
                FROM tb_notas
                WHERE curso_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL
                GROUP BY alumno_id
            ) as promedios
        `, [cursoId, anio]);

        // Asistencia del curso
        const [asistenciaStats] = await pool.query(`
            SELECT
                ROUND(SUM(CASE WHEN estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as asistencia
            FROM tb_asistencia
            WHERE curso_id = ? AND anio_academico = ? AND activo = 1
        `, [cursoId, anio]);

        // Tendencia mensual del curso
        const [tendencia] = await pool.query(`
            SELECT
                MONTH(fecha_evaluacion) as mes,
                ROUND(AVG(nota), 2) as promedio
            FROM tb_notas
            WHERE curso_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL AND fecha_evaluacion IS NOT NULL
            GROUP BY MONTH(fecha_evaluacion)
            ORDER BY mes
        `, [cursoId, anio]);

        const tendenciaMensual = Array(12).fill(null);
        tendencia.forEach(t => {
            if (t.mes >= 1 && t.mes <= 12) {
                tendenciaMensual[t.mes - 1] = parseFloat(t.promedio);
            }
        });

        res.json({
            success: true,
            data: {
                curso: cursoInfo[0],
                promedio: parseFloat(notasStats[0]?.promedio) || 0,
                aprobacion: parseFloat(notasStats[0]?.aprobacion) || 0,
                alumnos: alumnosCount[0]?.alumnos || 0,
                destacados: parseInt(alumnosCategoria[0]?.destacados) || 0,
                riesgo: parseInt(alumnosCategoria[0]?.riesgo) || 0,
                asistencia: parseFloat(asistenciaStats[0]?.asistencia) || 0,
                tendencia: tendenciaMensual.filter(t => t !== null)
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas del curso' });
    }
});

// GET /api/estadisticas/curso/:cursoId/asignaturas - Promedio por asignatura en el curso
app.get('/api/estadisticas/curso/:cursoId/asignaturas', async (req, res) => {
    const { cursoId } = req.params;
    const { anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                asig.nombre as asignatura,
                asig.id as asignatura_id,
                ROUND(AVG(n.nota), 1) as promedio
            FROM tb_notas n
            INNER JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
            WHERE n.curso_id = ? AND n.anio_academico = ? AND n.activo = 1 AND n.nota IS NOT NULL
            GROUP BY asig.id, asig.nombre
            ORDER BY promedio DESC
        `, [cursoId, anio]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener asignaturas del curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asignaturas del curso' });
    }
});

// GET /api/estadisticas/cursos - Lista de cursos con promedios para el selector
app.get('/api/estadisticas/cursos', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                c.id,
                c.nombre,
                c.codigo,
                c.nivel,
                c.grado,
                ROUND(AVG(n.nota), 2) as promedio
            FROM tb_cursos c
            LEFT JOIN tb_notas n ON c.id = n.curso_id AND n.anio_academico = ? AND n.activo = 1 AND n.nota IS NOT NULL
            WHERE c.establecimiento_id = ? AND c.anio_academico = ? AND c.activo = 1
            GROUP BY c.id, c.nombre, c.codigo, c.nivel, c.grado
            ORDER BY c.nivel, c.grado, c.nombre
        `, [anio, establecimiento_id, anio]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener cursos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener cursos' });
    }
});

// ============================================
// ESTADÍSTICAS POR DOCENTE
// ============================================

// GET /api/estadisticas/docentes - Lista de docentes con sus asignaturas y cursos
app.get('/api/estadisticas/docentes', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                d.id,
                CONCAT(d.apellidos, ', ', d.nombres) as nombre,
                d.especialidad,
                GROUP_CONCAT(DISTINCT asig.nombre ORDER BY asig.nombre SEPARATOR ', ') as asignaturas,
                GROUP_CONCAT(DISTINCT c.nombre ORDER BY c.nombre SEPARATOR ', ') as cursos,
                COUNT(DISTINCT a.asignatura_id) as totalAsignaturas,
                COUNT(DISTINCT a.curso_id) as totalCursos
            FROM tb_docentes d
            INNER JOIN tb_docente_establecimiento de ON d.id = de.docente_id
            LEFT JOIN tb_asignaciones a ON d.id = a.docente_id AND a.anio_academico = ? AND a.activo = 1
            LEFT JOIN tb_asignaturas asig ON a.asignatura_id = asig.id
            LEFT JOIN tb_cursos c ON a.curso_id = c.id
            WHERE de.establecimiento_id = ? AND de.activo = 1 AND d.activo = 1
            GROUP BY d.id, d.apellidos, d.nombres, d.especialidad
            ORDER BY d.apellidos, d.nombres
        `, [anio, establecimiento_id]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener docentes:', error);
        res.status(500).json({ success: false, error: 'Error al obtener docentes' });
    }
});

// GET /api/estadisticas/docente/:docenteId - Info y asignaturas del docente
app.get('/api/estadisticas/docente/:docenteId', async (req, res) => {
    const { docenteId } = req.params;
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        // Info del docente
        const [docenteInfo] = await pool.query(`
            SELECT
                d.id,
                d.nombres,
                d.apellidos,
                CONCAT(d.apellidos, ', ', d.nombres) as nombre,
                d.especialidad
            FROM tb_docentes d
            WHERE d.id = ? AND d.activo = 1
        `, [docenteId]);

        if (docenteInfo.length === 0) {
            return res.status(404).json({ success: false, error: 'Docente no encontrado' });
        }

        // Asignaturas que imparte
        const [asignaturas] = await pool.query(`
            SELECT DISTINCT
                asig.id,
                asig.nombre
            FROM tb_asignaciones a
            INNER JOIN tb_asignaturas asig ON a.asignatura_id = asig.id
            WHERE a.docente_id = ? AND a.anio_academico = ? AND a.activo = 1
            ORDER BY asig.nombre
        `, [docenteId, anio]);

        // Cursos donde enseña
        const [cursos] = await pool.query(`
            SELECT DISTINCT
                c.id,
                c.nombre
            FROM tb_asignaciones a
            INNER JOIN tb_cursos c ON a.curso_id = c.id
            WHERE a.docente_id = ? AND a.anio_academico = ? AND a.activo = 1
            ORDER BY c.nombre
        `, [docenteId, anio]);

        // Total alumnos que tiene
        const [alumnosCount] = await pool.query(`
            SELECT COUNT(DISTINCT n.alumno_id) as totalAlumnos
            FROM tb_notas n
            WHERE n.docente_id = ? AND n.anio_academico = ? AND n.activo = 1
        `, [docenteId, anio]);

        // KPIs de rendimiento (Riesgo y Destacados del docente)
        // Se calcula el promedio de las notas que ha puesto ESTE docente a cada alumno
        const [kpiRendimiento] = await pool.query(`
            SELECT
                COUNT(CASE WHEN promedio >= 6.0 THEN 1 END) as destacados,
                COUNT(CASE WHEN promedio < 4.0 THEN 1 END) as riesgo
            FROM (
                SELECT AVG(nota) as promedio
                FROM tb_notas
                WHERE docente_id = ? 
                AND anio_academico = ? 
                AND activo = 1 
                AND nota IS NOT NULL
                GROUP BY alumno_id
            ) as promedios_alumnos
        `, [docenteId, anio]);

        const destacados = kpiRendimiento[0]?.destacados || 0;
        const riesgo = kpiRendimiento[0]?.riesgo || 0;

        res.json({
            success: true,
            data: {
                docente: docenteInfo[0],
                asignaturas: asignaturas.map(a => a.nombre),
                asignaturasDetalle: asignaturas,
                cursos: cursos.map(c => c.nombre),
                cursosDetalle: cursos,
                totalAlumnos: alumnosCount[0]?.totalAlumnos || 0,
                destacados: destacados,
                riesgo: riesgo,
                regulares: (alumnosCount[0]?.totalAlumnos || 0) - destacados - riesgo
            }
        });
    } catch (error) {
        console.error('Error al obtener info del docente:', error);
        res.status(500).json({ success: false, error: 'Error al obtener info del docente' });
    }
});

// GET /api/estadisticas/docente/:docenteId/asignatura/:asignaturaId - Stats de docente en una asignatura
app.get('/api/estadisticas/docente/:docenteId/asignatura/:asignaturaId', async (req, res) => {
    const { docenteId, asignaturaId } = req.params;
    const { anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        // Promedio y aprobación del docente en esa asignatura
        const [stats] = await pool.query(`
            SELECT
                ROUND(AVG(nota), 1) as promedio,
                ROUND(SUM(CASE WHEN nota >= 4.0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as aprobacion,
                COUNT(DISTINCT alumno_id) as totalAlumnos
            FROM tb_notas
            WHERE docente_id = ? AND asignatura_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL
        `, [docenteId, asignaturaId, anio]);

        // Promedio por curso donde imparte esa asignatura
        const [promediosPorCurso] = await pool.query(`
            SELECT
                c.id as curso_id,
                c.nombre as curso,
                ROUND(AVG(n.nota), 2) as promedio
            FROM tb_notas n
            INNER JOIN tb_cursos c ON n.curso_id = c.id
            WHERE n.docente_id = ? AND n.asignatura_id = ? AND n.anio_academico = ? AND n.activo = 1 AND n.nota IS NOT NULL
            GROUP BY c.id, c.nombre
            ORDER BY promedio DESC
        `, [docenteId, asignaturaId, anio]);

        // Tendencia mensual
        const [tendencia] = await pool.query(`
            SELECT
                MONTH(fecha_evaluacion) as mes,
                ROUND(AVG(nota), 2) as promedio
            FROM tb_notas
            WHERE docente_id = ? AND asignatura_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL AND fecha_evaluacion IS NOT NULL
            GROUP BY MONTH(fecha_evaluacion)
            ORDER BY mes
        `, [docenteId, asignaturaId, anio]);

        const tendenciaMensual = Array(12).fill(null);
        tendencia.forEach(t => {
            if (t.mes >= 1 && t.mes <= 12) {
                tendenciaMensual[t.mes - 1] = parseFloat(t.promedio);
            }
        });

        res.json({
            success: true,
            data: {
                promedio: parseFloat(stats[0]?.promedio) || 0,
                aprobacion: parseFloat(stats[0]?.aprobacion) || 0,
                totalAlumnos: stats[0]?.totalAlumnos || 0,
                promediosPorCurso,
                tendencia: tendenciaMensual.filter(t => t !== null)
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del docente por asignatura:', error);
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas del docente' });
    }
});

// ============================================
// ESTADÍSTICAS POR ASIGNATURA
// ============================================

// GET /api/estadisticas/asignaturas - Lista de asignaturas
app.get('/api/estadisticas/asignaturas', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                asig.id,
                asig.nombre,
                asig.codigo,
                ROUND(AVG(n.nota), 2) as promedio,
                COUNT(DISTINCT n.docente_id) as docentes
            FROM tb_asignaturas asig
            LEFT JOIN tb_notas n ON asig.id = n.asignatura_id AND n.anio_academico = ? AND n.activo = 1 AND n.nota IS NOT NULL
            WHERE asig.establecimiento_id = ? AND asig.activo = 1
            GROUP BY asig.id, asig.nombre, asig.codigo
            ORDER BY asig.nombre
        `, [anio, establecimiento_id]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener asignaturas:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asignaturas' });
    }
});

// GET /api/estadisticas/riesgo-detalle - Listado detallado de alumnos en riesgo
app.get('/api/estadisticas/riesgo-detalle', async (req, res) => {
    const { tipo, id, anio, establecimiento_id = 1 } = req.query;
    const anioActual = anio || new Date().getFullYear();

    try {
        let query = '';
        let params = [];

        if (tipo === 'docente') {
            // Riesgo con un docente específico (Promedio de notas con ese docente < 4.0)
            query = `
                SELECT 
                    a.id as alumno_id,
                    CONCAT(a.apellidos, ', ', a.nombres) as nombre_completo,
                    c.nombre as curso,
                    ROUND(AVG(n.nota), 1) as promedio,
                    GROUP_CONCAT(DISTINCT asig.nombre SEPARATOR ', ') as asignaturas
                FROM tb_notas n
                JOIN tb_alumnos a ON n.alumno_id = a.id
                JOIN tb_cursos c ON n.curso_id = c.id
                JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
                WHERE n.docente_id = ? 
                AND n.anio_academico = ? 
                AND n.activo = 1
                AND n.nota IS NOT NULL
                GROUP BY n.alumno_id, c.nombre
                HAVING promedio < 4.0
                ORDER BY promedio ASC
            `;
            params = [id, anioActual];
        } else if (tipo === 'curso') {
            // Riesgo en un curso específico (Promedio general del alumno en el curso < 4.0)
            query = `
                SELECT 
                    a.id as alumno_id,
                    CONCAT(a.apellidos, ', ', a.nombres) as nombre_completo,
                    c.nombre as curso,
                    ROUND(AVG(n.nota), 1) as promedio,
                    'Promedio General Curso' as asignaturas
                FROM tb_notas n
                JOIN tb_alumnos a ON n.alumno_id = a.id
                JOIN tb_cursos c ON n.curso_id = c.id
                WHERE n.curso_id = ? 
                AND n.anio_academico = ? 
                AND n.activo = 1
                AND n.nota IS NOT NULL
                GROUP BY n.alumno_id, c.nombre
                HAVING promedio < 4.0
                ORDER BY promedio ASC
            `;
            params = [id, anioActual];
        } else {
            // General (Todos los alumnos del colegio con promedio < 4.0)
            query = `
                SELECT 
                    a.id as alumno_id,
                    CONCAT(a.apellidos, ', ', a.nombres) as nombre_completo,
                    c.nombre as curso,
                    ROUND(AVG(n.nota), 1) as promedio,
                    'Promedio General' as asignaturas
                FROM tb_notas n
                JOIN tb_alumnos a ON n.alumno_id = a.id
                JOIN tb_cursos c ON n.curso_id = c.id
                WHERE n.establecimiento_id = ? 
                AND n.anio_academico = ? 
                AND n.activo = 1
                AND n.nota IS NOT NULL
                GROUP BY n.alumno_id, c.nombre
                HAVING promedio < 4.0
                ORDER BY promedio ASC LIMIT 50
            `;
            params = [establecimiento_id, anioActual];
        }

        const [alumnos] = await pool.query(query, params);

        // Enriquecer con asignaturas rojas si es modo curso o general (o si query tipo null que es general)
        if (tipo === 'curso' || !tipo || tipo === 'general') {
            for (let alumno of alumnos) {
                const [rojas] = await pool.query(`
                    SELECT asig.nombre
                    FROM tb_notas n
                    JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
                    WHERE n.alumno_id = ? AND n.anio_academico = ? AND n.activo = 1
                    GROUP BY asig.id
                    HAVING AVG(n.nota) < 4.0
                 `, [alumno.alumno_id, anioActual]);

                if (rojas.length > 0) {
                    alumno.asignaturas = rojas.map(r => r.nombre).join(', ');
                } else {
                    alumno.asignaturas = 'Promedio General Bajo';
                }
            }
        }

        res.json({ success: true, data: alumnos });

    } catch (error) {
        console.error('Error al obtener detalle riesgo:', error);
        res.status(500).json({ success: false, error: 'Error al obtener detalle' });
    }
});

// GET /api/estadisticas/asignatura/:asignaturaId - Stats de una asignatura
app.get('/api/estadisticas/asignatura/:asignaturaId', async (req, res) => {
    const { asignaturaId } = req.params;
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        // Info de la asignatura
        const [asigInfo] = await pool.query(`
            SELECT id, nombre, codigo FROM tb_asignaturas WHERE id = ?
        `, [asignaturaId]);

        if (asigInfo.length === 0) {
            return res.status(404).json({ success: false, error: 'Asignatura no encontrada' });
        }

        // Promedio general y aprobación
        const [stats] = await pool.query(`
            SELECT
                ROUND(AVG(nota), 1) as promedio,
                ROUND(SUM(CASE WHEN nota >= 4.0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as aprobacion
            FROM tb_notas
            WHERE asignatura_id = ? AND establecimiento_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL
        `, [asignaturaId, establecimiento_id, anio]);

        // Mejor y peor curso
        const [cursoStats] = await pool.query(`
            SELECT
                c.nombre as curso,
                ROUND(AVG(n.nota), 2) as promedio
            FROM tb_notas n
            INNER JOIN tb_cursos c ON n.curso_id = c.id
            WHERE n.asignatura_id = ? AND n.establecimiento_id = ? AND n.anio_academico = ? AND n.activo = 1 AND n.nota IS NOT NULL
            GROUP BY c.id, c.nombre
            ORDER BY promedio DESC
        `, [asignaturaId, establecimiento_id, anio]);

        const mejorCurso = cursoStats.length > 0 ? cursoStats[0].curso : '-';
        const peorCurso = cursoStats.length > 0 ? cursoStats[cursoStats.length - 1].curso : '-';

        // Cantidad de docentes que imparten
        const [docentesCount] = await pool.query(`
            SELECT COUNT(DISTINCT docente_id) as docentes
            FROM tb_asignaciones
            WHERE asignatura_id = ? AND establecimiento_id = ? AND anio_academico = ? AND activo = 1
        `, [asignaturaId, establecimiento_id, anio]);

        // Tendencia mensual
        const [tendencia] = await pool.query(`
            SELECT
                MONTH(fecha_evaluacion) as mes,
                ROUND(AVG(nota), 2) as promedio
            FROM tb_notas
            WHERE asignatura_id = ? AND establecimiento_id = ? AND anio_academico = ? AND activo = 1 AND nota IS NOT NULL AND fecha_evaluacion IS NOT NULL
            GROUP BY MONTH(fecha_evaluacion)
            ORDER BY mes
        `, [asignaturaId, establecimiento_id, anio]);

        const tendenciaMensual = Array(12).fill(null);
        tendencia.forEach(t => {
            if (t.mes >= 1 && t.mes <= 12) {
                tendenciaMensual[t.mes - 1] = parseFloat(t.promedio);
            }
        });

        res.json({
            success: true,
            data: {
                asignatura: asigInfo[0],
                promedio: parseFloat(stats[0]?.promedio) || 0,
                aprobacion: parseFloat(stats[0]?.aprobacion) || 0,
                mejorCurso,
                peorCurso,
                docentes: docentesCount[0]?.docentes || 0,
                tendencia: tendenciaMensual.filter(t => t !== null)
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de asignatura:', error);
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas de asignatura' });
    }
});

// GET /api/estadisticas/asignatura/:asignaturaId/por-curso - Promedio de asignatura en cada curso
app.get('/api/estadisticas/asignatura/:asignaturaId/por-curso', async (req, res) => {
    const { asignaturaId } = req.params;
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                c.id as curso_id,
                c.nombre as curso,
                ROUND(AVG(n.nota), 2) as promedio
            FROM tb_notas n
            INNER JOIN tb_cursos c ON n.curso_id = c.id
            WHERE n.asignatura_id = ? AND n.establecimiento_id = ? AND n.anio_academico = ? AND n.activo = 1 AND n.nota IS NOT NULL
            GROUP BY c.id, c.nombre
            ORDER BY promedio DESC
        `, [asignaturaId, establecimiento_id, anio]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener asignatura por curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asignatura por curso' });
    }
});

// ============================================
// ESTADÍSTICAS DE ASISTENCIA
// ============================================

// GET /api/estadisticas/asistencia/general - Asistencia general del establecimiento
app.get('/api/estadisticas/asistencia/general', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        // Stats generales de asistencia
        const [stats] = await pool.query(`
            SELECT
                ROUND(SUM(CASE WHEN estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as promedioAsistencia,
                COUNT(DISTINCT alumno_id) as totalAlumnos
            FROM tb_asistencia
            WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1
        `, [establecimiento_id, anio]);

        // Alumnos con 100% asistencia
        const [asistencia100] = await pool.query(`
            SELECT COUNT(*) as cantidad
            FROM (
                SELECT alumno_id
                FROM tb_asistencia
                WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1
                GROUP BY alumno_id
                HAVING SUM(CASE WHEN estado NOT IN ('presente', 'atrasado') THEN 1 ELSE 0 END) = 0
            ) as perfectos
        `, [establecimiento_id, anio]);

        // Alumnos bajo 85% asistencia
        const [bajoUmbral] = await pool.query(`
            SELECT COUNT(*) as cantidad
            FROM (
                SELECT alumno_id,
                    ROUND(SUM(CASE WHEN estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as porcentaje
                FROM tb_asistencia
                WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1
                GROUP BY alumno_id
                HAVING porcentaje < 85
            ) as bajo_umbral
        `, [establecimiento_id, anio]);

        // Asistencia mensual
        const [mensual] = await pool.query(`
            SELECT
                MONTH(fecha) as mes,
                ROUND(SUM(CASE WHEN estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as porcentaje
            FROM tb_asistencia
            WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1
            GROUP BY MONTH(fecha)
            ORDER BY mes
        `, [establecimiento_id, anio]);

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const asistenciaMensual = {};
        mensual.forEach(m => {
            if (m.mes >= 1 && m.mes <= 12) {
                asistenciaMensual[meses[m.mes - 1]] = parseFloat(m.porcentaje);
            }
        });

        res.json({
            success: true,
            data: {
                promedioAsistencia: parseFloat(stats[0]?.promedioAsistencia) || 0,
                totalAlumnos: stats[0]?.totalAlumnos || 0,
                asistencia100: asistencia100[0]?.cantidad || 0,
                bajoUmbral85: bajoUmbral[0]?.cantidad || 0,
                asistenciaMensual
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de asistencia general:', error);
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas de asistencia' });
    }
});

// GET /api/estadisticas/asistencia/curso/:cursoId - Asistencia de un curso específico
app.get('/api/estadisticas/asistencia/curso/:cursoId', async (req, res) => {
    const { cursoId } = req.params;
    const { anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        // Stats de asistencia del curso
        const [stats] = await pool.query(`
            SELECT
                ROUND(SUM(CASE WHEN estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as promedioAsistencia,
                COUNT(DISTINCT alumno_id) as totalAlumnos
            FROM tb_asistencia
            WHERE curso_id = ? AND anio_academico = ? AND activo = 1
        `, [cursoId, anio]);

        // Alumnos con 100% asistencia en el curso
        const [asistencia100] = await pool.query(`
            SELECT COUNT(*) as cantidad
            FROM (
                SELECT alumno_id
                FROM tb_asistencia
                WHERE curso_id = ? AND anio_academico = ? AND activo = 1
                GROUP BY alumno_id
                HAVING SUM(CASE WHEN estado NOT IN ('presente', 'atrasado') THEN 1 ELSE 0 END) = 0
            ) as perfectos
        `, [cursoId, anio]);

        // Alumnos bajo 85% en el curso
        const [bajoUmbral] = await pool.query(`
            SELECT COUNT(*) as cantidad
            FROM (
                SELECT alumno_id,
                    ROUND(SUM(CASE WHEN estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as porcentaje
                FROM tb_asistencia
                WHERE curso_id = ? AND anio_academico = ? AND activo = 1
                GROUP BY alumno_id
                HAVING porcentaje < 85
            ) as bajo_umbral
        `, [cursoId, anio]);

        // Asistencia mensual del curso
        const [mensual] = await pool.query(`
            SELECT
                MONTH(fecha) as mes,
                ROUND(SUM(CASE WHEN estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as porcentaje
            FROM tb_asistencia
            WHERE curso_id = ? AND anio_academico = ? AND activo = 1
            GROUP BY MONTH(fecha)
            ORDER BY mes
        `, [cursoId, anio]);

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const asistenciaMensual = {};
        mensual.forEach(m => {
            if (m.mes >= 1 && m.mes <= 12) {
                asistenciaMensual[meses[m.mes - 1]] = parseFloat(m.porcentaje);
            }
        });

        res.json({
            success: true,
            data: {
                promedioAsistencia: parseFloat(stats[0]?.promedioAsistencia) || 0,
                totalAlumnos: stats[0]?.totalAlumnos || 0,
                asistencia100: asistencia100[0]?.cantidad || 0,
                bajoUmbral85: bajoUmbral[0]?.cantidad || 0,
                asistenciaMensual
            }
        });
    } catch (error) {
        console.error('Error al obtener asistencia del curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asistencia del curso' });
    }
});

// GET /api/estadisticas/asistencia/por-curso - Asistencia comparativa de todos los cursos
app.get('/api/estadisticas/asistencia/por-curso', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                c.id as curso_id,
                c.nombre as curso,
                ROUND(SUM(CASE WHEN a.estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as promedioAsistencia,
                COUNT(DISTINCT a.alumno_id) as totalAlumnos
            FROM tb_asistencia a
            INNER JOIN tb_cursos c ON a.curso_id = c.id
            WHERE a.establecimiento_id = ? AND a.anio_academico = ? AND a.activo = 1
            GROUP BY c.id, c.nombre
            ORDER BY promedioAsistencia DESC
        `, [establecimiento_id, anio]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener asistencia por curso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener asistencia por curso' });
    }
});

// GET /api/estadisticas/asistencia/ranking - Ranking de asistencia por curso
app.get('/api/estadisticas/asistencia/ranking', async (req, res) => {
    const { establecimiento_id = 1, anio_academico } = req.query;
    const anio = anio_academico || new Date().getFullYear();

    try {
        const [rows] = await pool.query(`
            SELECT
                c.id as curso_id,
                c.nombre as curso,
                ROUND(SUM(CASE WHEN a.estado IN ('presente', 'atrasado') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as promedioAsistencia
            FROM tb_asistencia a
            INNER JOIN tb_cursos c ON a.curso_id = c.id
            WHERE a.establecimiento_id = ? AND a.anio_academico = ? AND a.activo = 1
            GROUP BY c.id, c.nombre
            ORDER BY promedioAsistencia DESC
        `, [establecimiento_id, anio]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener ranking de asistencia:', error);
        res.status(500).json({ success: false, error: 'Error al obtener ranking de asistencia' });
    }
});

// ============================================
// ENDPOINTS PROGRESO DOCENTE
// ============================================

// GET /api/docente/:docenteId/progreso/estadisticas - Obtener estadísticas de progreso para análisis
app.get('/api/docente/:docenteId/progreso/estadisticas', async (req, res) => {
    const { docenteId } = req.params;
    const { establecimiento_id, curso_id, asignatura_id, trimestre } = req.query;

    if (!curso_id || !asignatura_id || !establecimiento_id) {
        return res.status(400).json({
            success: false,
            error: 'Debe especificar establecimiento, curso y asignatura'
        });
    }

    try {
        const anioActual = new Date().getFullYear();

        // 1. Obtener todos los alumnos del curso
        const [alumnosCurso] = await pool.query(`
            SELECT DISTINCT
                a.id as alumno_id,
                a.nombres,
                a.apellidos
            FROM tb_alumnos a
            JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id
            WHERE ae.curso_id = ?
            AND ae.establecimiento_id = ?
            AND ae.activo = 1
            AND a.activo = 1
            ORDER BY a.apellidos ASC, a.nombres ASC
        `, [curso_id, establecimiento_id]);

        const totalAlumnos = alumnosCurso.length;

        if (totalAlumnos === 0) {
            return res.json({
                success: true,
                data: {
                    kpis: {
                        totalAlumnos: 0, alumnosConNotas: 0, aprobados: 0, reprobados: 0,
                        porcentajeAprobados: 0, porcentajeReprobados: 0,
                        promedioCurso: 0, notaMaxima: 0, notaMinima: 0
                    },
                    distribucion: { insuficiente: 0, suficiente: 0, bueno: 0, excelente: 0 },
                    promediosPorTrimestre: { 1: 0, 2: 0, 3: 0 },
                    top5: [],
                    alumnosAtencion: []
                }
            });
        }

        const alumnoIds = alumnosCurso.map(a => a.alumno_id);

        // 2. Obtener todas las notas de esos alumnos en la asignatura
        let notasQuery = `
            SELECT
                n.alumno_id,
                n.trimestre,
                n.nota
            FROM tb_notas n
            WHERE n.docente_id = ?
            AND n.establecimiento_id = ?
            AND n.curso_id = ?
            AND n.asignatura_id = ?
            AND n.alumno_id IN (?)
            AND n.activo = 1
            AND n.nota IS NOT NULL
            AND n.anio_academico = ?
        `;
        const notasParams = [docenteId, establecimiento_id, curso_id, asignatura_id, alumnoIds, anioActual];

        // Si se especifica trimestre, filtrar
        if (trimestre && trimestre !== '') {
            notasQuery += ` AND n.trimestre = ?`;
            notasParams.push(parseInt(trimestre));
        }

        const [todasLasNotas] = await pool.query(notasQuery, notasParams);

        // 3. Calcular promedio por alumno
        const promediosPorAlumno = alumnosCurso.map(alumno => {
            const notasAlumno = todasLasNotas.filter(n => n.alumno_id === alumno.alumno_id);
            if (notasAlumno.length === 0) {
                return { ...alumno, promedio: null, notas: [], cantidadNotas: 0 };
            }
            const suma = notasAlumno.reduce((acc, n) => acc + parseFloat(n.nota), 0);
            const promedio = suma / notasAlumno.length;
            const notasRojas = notasAlumno.filter(n => parseFloat(n.nota) < 4.0).length;
            return {
                ...alumno,
                promedio: promedio,
                notas: notasAlumno,
                cantidadNotas: notasAlumno.length,
                notasRojas: notasRojas
            };
        });

        // Filtrar solo alumnos con notas
        const alumnosConNotas = promediosPorAlumno.filter(p => p.promedio !== null);
        const cantidadConNotas = alumnosConNotas.length;

        if (cantidadConNotas === 0) {
            return res.json({
                success: true,
                data: {
                    kpis: {
                        totalAlumnos, alumnosConNotas: 0, aprobados: 0, reprobados: 0,
                        porcentajeAprobados: 0, porcentajeReprobados: 0,
                        promedioCurso: 0, notaMaxima: 0, notaMinima: 0
                    },
                    distribucion: { insuficiente: 0, suficiente: 0, bueno: 0, excelente: 0 },
                    promediosPorTrimestre: { 1: 0, 2: 0, 3: 0 },
                    top5: [],
                    alumnosAtencion: []
                }
            });
        }

        // 4. Calcular KPIs
        const promedios = alumnosConNotas.map(a => a.promedio);
        const aprobados = alumnosConNotas.filter(a => a.promedio >= 4.0).length;
        const reprobados = cantidadConNotas - aprobados;
        const promedioCurso = promedios.reduce((a, b) => a + b, 0) / promedios.length;
        const notaMaxima = Math.max(...promedios);
        const notaMinima = Math.min(...promedios);
        const porcentajeAprobados = Math.round((aprobados / cantidadConNotas) * 100);
        const porcentajeReprobados = Math.round((reprobados / cantidadConNotas) * 100);

        // 5. Calcular distribución por rangos
        const distribucion = {
            insuficiente: alumnosConNotas.filter(a => a.promedio < 4.0).length,
            suficiente: alumnosConNotas.filter(a => a.promedio >= 4.0 && a.promedio < 5.0).length,
            bueno: alumnosConNotas.filter(a => a.promedio >= 5.0 && a.promedio < 6.0).length,
            excelente: alumnosConNotas.filter(a => a.promedio >= 6.0).length
        };

        // 6. Calcular promedios por trimestre (solo si no se filtró por trimestre específico)
        let promediosPorTrimestre = { 1: 0, 2: 0, 3: 0 };
        if (!trimestre || trimestre === '') {
            for (let t = 1; t <= 3; t++) {
                const notasTrimestre = todasLasNotas.filter(n => n.trimestre === t);
                if (notasTrimestre.length > 0) {
                    const suma = notasTrimestre.reduce((acc, n) => acc + parseFloat(n.nota), 0);
                    promediosPorTrimestre[t] = parseFloat((suma / notasTrimestre.length).toFixed(1));
                }
            }
        } else {
            // Si se filtró por trimestre, solo ese trimestre tendrá valor
            const t = parseInt(trimestre);
            if (todasLasNotas.length > 0) {
                const suma = todasLasNotas.reduce((acc, n) => acc + parseFloat(n.nota), 0);
                promediosPorTrimestre[t] = parseFloat((suma / todasLasNotas.length).toFixed(1));
            }
        }

        // 7. Top 5 mejores promedios
        const top5 = [...alumnosConNotas]
            .sort((a, b) => b.promedio - a.promedio)
            .slice(0, 5)
            .map(a => ({
                nombre: `${a.apellidos.split(' ')[0]}, ${a.nombres.split(' ')[0]}`,
                promedio: parseFloat(a.promedio.toFixed(1))
            }));

        // 8. Alumnos que requieren atención (promedio < 4.0)
        const alumnosAtencion = alumnosConNotas
            .filter(a => a.promedio < 4.0)
            .sort((a, b) => a.promedio - b.promedio)
            .map(a => {
                // Calcular tendencia basada en sus notas
                let tendencia = 'estable';
                if (a.notas.length >= 2) {
                    const notasOrdenadas = [...a.notas].sort((x, y) => {
                        if (x.trimestre !== y.trimestre) return x.trimestre - y.trimestre;
                        return 0;
                    });
                    const mitad = Math.floor(notasOrdenadas.length / 2);
                    const primerasMitad = notasOrdenadas.slice(0, mitad);
                    const segundaMitad = notasOrdenadas.slice(mitad);

                    const promPrimera = primerasMitad.reduce((acc, n) => acc + parseFloat(n.nota), 0) / primerasMitad.length;
                    const promSegunda = segundaMitad.reduce((acc, n) => acc + parseFloat(n.nota), 0) / segundaMitad.length;

                    if (promSegunda > promPrimera + 0.3) tendencia = 'mejorando';
                    else if (promSegunda < promPrimera - 0.3) tendencia = 'empeorando';
                }

                return {
                    alumno_id: a.alumno_id,
                    nombre: `${a.apellidos}, ${a.nombres}`,
                    promedio: parseFloat(a.promedio.toFixed(1)),
                    notasRojas: a.notasRojas,
                    tendencia: tendencia
                };
            });

        res.json({
            success: true,
            data: {
                kpis: {
                    totalAlumnos,
                    alumnosConNotas: cantidadConNotas,
                    aprobados,
                    reprobados,
                    porcentajeAprobados,
                    porcentajeReprobados,
                    promedioCurso: parseFloat(promedioCurso.toFixed(1)),
                    notaMaxima: parseFloat(notaMaxima.toFixed(1)),
                    notaMinima: parseFloat(notaMinima.toFixed(1))
                },
                distribucion,
                promediosPorTrimestre,
                top5,
                alumnosAtencion
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas de progreso:', error);
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas de progreso' });
    }
});

// ============================================
// RUTA DE PRUEBA
// ============================================

app.get('/api/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.json({
        status: 'ok',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor http (con socket.io)
server.listen(PORT, async () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Endpoints disponibles:`);
    console.log(`   -- Autenticación --`);
    console.log(`   POST /api/auth/login    - Iniciar sesión`);
    console.log(`   POST /api/auth/logout   - Cerrar sesión`);
    console.log(`   GET  /api/auth/me       - Verificar sesión`);
    console.log(`   -- Registro --`);
    console.log(`   POST /api/registro/validar-codigo    - Validar código admin`);
    console.log(`   POST /api/registro/validar-docente   - Validar pre-registro docente`);
    console.log(`   POST /api/registro/validar-apoderado - Validar pre-registro apoderado`);
    console.log(`   POST /api/registro/admin      - Registrar administrador`);
    console.log(`   POST /api/registro/docente    - Registrar docente`);
    console.log(`   POST /api/registro/apoderado  - Registrar apoderado`);
    console.log(`   -- General --`);
    console.log(`   GET  /api/health        - Estado del servidor`);
    console.log(`   GET  /api/establecimientos - Listar establecimientos`);
    console.log(`   GET  /api/cursos        - Listar cursos`);
    console.log(`   -- Alumnos --`);
    console.log(`   GET  /api/alumnos       - Listar alumnos`);
    console.log(`   GET  /api/alumnos/por-curso - Alumnos agrupados por curso`);
    console.log(`   POST /api/alumnos       - Crear alumno`);
    console.log(`   PUT  /api/alumnos/:id   - Actualizar alumno`);
    console.log(`   DELETE /api/alumnos/:id - Eliminar alumno\n`);

    // Comentado para modo demo (evitar errores de conexión si no hay DB local)
    // await testConnection();
});
