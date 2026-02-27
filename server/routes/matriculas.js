const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// GET /api/matriculas
router.get('/', async (req, res) => {
    try {
        const { establecimiento_id, anio, curso_id } = req.query;
        let query = `
            SELECT m.*,
                   CONCAT(al.nombres, ' ', al.apellidos) as nombre_alumno,
                   al.rut as rut_alumno,
                   c.nombre as nombre_curso,
                   CONCAT(ap.nombres, ' ', ap.apellidos) as nombre_apoderado
            FROM tb_matriculas m
            LEFT JOIN tb_alumnos al ON m.alumno_id = al.id
            LEFT JOIN tb_cursos c ON m.curso_asignado_id = c.id
            LEFT JOIN tb_apoderados ap ON m.apoderado_id = ap.id
            WHERE m.activo = 1
        `;
        const params = [];
        if (establecimiento_id) { query += ' AND m.establecimiento_id = ?'; params.push(establecimiento_id); }
        if (anio) { query += ' AND m.anio_academico = ?'; params.push(anio); }
        if (curso_id) { query += ' AND m.curso_asignado_id = ?'; params.push(curso_id); }
        query += ' ORDER BY m.fecha_creacion DESC LIMIT 100';
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener matrículas:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// POST /api/matriculas - Crear Matrícula
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        const {
            establecimiento_id,
            alumno_id_existente,
            curso_asignado_id, anio_academico,
            // Datos Alumno
            rut_alumno, nombres_alumno, apellidos_alumno,
            fecha_nacimiento_alumno, sexo_alumno, nacionalidad_alumno,
            direccion_alumno, comuna_alumno, ciudad_alumno, email_alumno, telefono_alumno,
            // Datos Apoderado
            rut_apoderado, nombres_apoderado, apellidos_apoderado,
            email_apoderado, telefono_apoderado, direccion_apoderado,
            parentezco,
            // Antecedentes & Salud
            colegio_procedencia, tiene_nee, detalle_nee, alergias, enfermedades_cronicas,
            contacto_emergencia_nombre, contacto_emergencia_telefono,
            observaciones_apoderado
        } = req.body;

        const estId = establecimiento_id || 1;
        const anio = anio_academico || new Date().getFullYear();

        if (!rut_alumno || !nombres_alumno) {
            await connection.rollback(); connection.release();
            return res.status(400).json({ success: false, error: 'Faltan campos obligatorios del alumno' });
        }
        if (!rut_apoderado || !nombres_apoderado) {
            await connection.rollback(); connection.release();
            return res.status(400).json({ success: false, error: 'Debe ingresar RUT y Nombre del Apoderado' });
        }

        // ─── 1. APODERADO (buscar o crear SIN usuario) ───
        let finalApoderadoId;
        const [apoderadosExist] = await connection.query('SELECT id FROM tb_apoderados WHERE rut = ?', [rut_apoderado]);
        if (apoderadosExist.length > 0) {
            finalApoderadoId = apoderadosExist[0].id;
            // Actualizar datos si vienen nuevos
            await connection.query(`
                UPDATE tb_apoderados SET
                    nombres = COALESCE(?, nombres), apellidos = COALESCE(?, apellidos),
                    email = COALESCE(?, email), telefono = COALESCE(?, telefono),
                    direccion = COALESCE(?, direccion)
                WHERE id = ?
            `, [nombres_apoderado, apellidos_apoderado, email_apoderado, telefono_apoderado, direccion_apoderado, finalApoderadoId]);
        } else {
            // Crear apoderado sin cuenta de usuario (usuario_id = NULL)
            // El usuario se creará cuando el apoderado se registre por su cuenta
            const [nuevoAp] = await connection.query(`
                INSERT INTO tb_apoderados (usuario_id, rut, nombres, apellidos, email, telefono, direccion, activo)
                VALUES (NULL, ?, ?, ?, ?, ?, ?, 1)
            `, [rut_apoderado, nombres_apoderado, apellidos_apoderado || '', email_apoderado || null, telefono_apoderado || null, direccion_apoderado || null]);
            finalApoderadoId = nuevoAp.insertId;
        }

        // ─── 2. PERIODO MATRÍCULA ───
        const [periodos] = await connection.query(
            'SELECT id FROM tb_periodos_matricula WHERE establecimiento_id = ? AND anio_academico = ? AND activo = 1 LIMIT 1',
            [estId, anio]
        );
        let periodoId;
        if (periodos.length > 0) {
            periodoId = periodos[0].id;
        } else {
            const [nuevo] = await connection.query(
                `INSERT INTO tb_periodos_matricula (establecimiento_id, nombre, anio_academico, fecha_inicio, fecha_fin, activo)
                 VALUES (?, ?, ?, CONCAT(?, '-03-01'), CONCAT(?, '-12-31'), 1)`,
                [estId, `Admisión ${anio}`, anio, anio, anio]
            );
            periodoId = nuevo.insertId;
        }

        // ─── 3. ALUMNO (buscar o crear) ───
        let finalAlumnoId = alumno_id_existente || null;
        if (!finalAlumnoId) {
            const [alumnosExist] = await connection.query('SELECT id FROM tb_alumnos WHERE rut = ?', [rut_alumno]);
            if (alumnosExist.length > 0) {
                finalAlumnoId = alumnosExist[0].id;
                // Actualizar datos del alumno
                await connection.query(`
                    UPDATE tb_alumnos SET
                        nombres = ?, apellidos = ?, fecha_nacimiento = ?,
                        sexo = ?, nacionalidad = ?, direccion = ?,
                        comuna = ?, ciudad = ?, email = ?, telefono = ?,
                        alergias = ?, enfermedades_cronicas = ?,
                        contacto_emergencia_nombre = ?, contacto_emergencia_telefono = ?
                    WHERE id = ?
                `, [
                    nombres_alumno, apellidos_alumno, fecha_nacimiento_alumno || null,
                    sexo_alumno || null, nacionalidad_alumno || 'Chilena', direccion_alumno || null,
                    comuna_alumno || null, ciudad_alumno || null, email_alumno || null, telefono_alumno || null,
                    alergias || null, enfermedades_cronicas || null,
                    contacto_emergencia_nombre || null, contacto_emergencia_telefono || null,
                    finalAlumnoId
                ]);
            } else {
                const [nuevoAl] = await connection.query(`
                    INSERT INTO tb_alumnos (rut, nombres, apellidos, fecha_nacimiento, sexo, nacionalidad,
                        direccion, comuna, ciudad, email, telefono,
                        alergias, enfermedades_cronicas, contacto_emergencia_nombre, contacto_emergencia_telefono, activo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                `, [
                    rut_alumno, nombres_alumno, apellidos_alumno,
                    fecha_nacimiento_alumno || null, sexo_alumno || null, nacionalidad_alumno || 'Chilena',
                    direccion_alumno || null, comuna_alumno || null, ciudad_alumno || null,
                    email_alumno || null, telefono_alumno || null,
                    alergias || null, enfermedades_cronicas || null,
                    contacto_emergencia_nombre || null, contacto_emergencia_telefono || null
                ]);
                finalAlumnoId = nuevoAl.insertId;
            }
        }

        // ─── 4. MATRÍCULA ───
        // Verificar que no exista ya una matrícula activa para este alumno en este año
        const [matExistente] = await connection.query(
            'SELECT id FROM tb_matriculas WHERE alumno_id = ? AND anio_academico = ? AND establecimiento_id = ? AND activo = 1',
            [finalAlumnoId, anio, estId]
        );
        if (matExistente.length > 0) {
            await connection.rollback(); connection.release();
            return res.status(400).json({ success: false, error: `El alumno ya tiene una matrícula activa para el año ${anio}` });
        }

        const numMatricula = `${anio}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const [resultMat] = await connection.query(`
            INSERT INTO tb_matriculas (
                establecimiento_id, periodo_matricula_id, alumno_id, apoderado_id,
                anio_academico, numero_matricula, tipo_matricula, estado,
                curso_asignado_id, ncontacto_emergencia_nombre, contacto_emergencia_telefono,
                observaciones_apoderado, activo
            ) VALUES (?, ?, ?, ?, ?, ?, 'nuevo', 'aprobada', ?, ?, ?, ?, 1)
        `, [
            estId, periodoId, finalAlumnoId, finalApoderadoId,
            anio, numMatricula,
            curso_asignado_id || null,
            contacto_emergencia_nombre || null, contacto_emergencia_telefono || null,
            observaciones_apoderado || null
        ]);

        // ─── 5. TABLAS DE RELACIÓN ───

        // 5a. tb_apoderado_alumno
        const parentescoNorm = (parentezco || 'padre').toLowerCase().replace('apoderado', 'tutor_legal');
        const parentescoValido = ['padre','madre','abuelo','abuela','tio','tia','hermano','hermana','tutor_legal','otro'];
        const parentescoFinal = parentescoValido.includes(parentescoNorm) ? parentescoNorm : 'otro';
        await connection.query(`
            INSERT INTO tb_apoderado_alumno (apoderado_id, alumno_id, parentesco, es_apoderado_titular, activo)
            VALUES (?, ?, ?, 1, 1)
            ON DUPLICATE KEY UPDATE parentesco = VALUES(parentesco), activo = 1
        `, [finalApoderadoId, finalAlumnoId, parentescoFinal]);

        // 5b. tb_alumno_establecimiento
        await connection.query(`
            INSERT INTO tb_alumno_establecimiento (alumno_id, establecimiento_id, curso_id, anio_academico, numero_matricula, fecha_ingreso, activo)
            VALUES (?, ?, ?, ?, ?, CURDATE(), 1)
            ON DUPLICATE KEY UPDATE curso_id = VALUES(curso_id), numero_matricula = VALUES(numero_matricula), activo = 1
        `, [finalAlumnoId, estId, curso_asignado_id || null, anio, numMatricula]);

        // 5c. tb_apoderado_establecimiento
        await connection.query(`
            INSERT INTO tb_apoderado_establecimiento (apoderado_id, establecimiento_id, es_apoderado_activo, fecha_registro, activo)
            VALUES (?, ?, 1, CURDATE(), 1)
            ON DUPLICATE KEY UPDATE es_apoderado_activo = 1, activo = 1
        `, [finalApoderadoId, estId]);

        // ─── 6. PREREGISTRO RELACIONES (para auto-registro futuro del apoderado) ───
        const [cursoInfo] = await connection.query('SELECT nombre FROM tb_cursos WHERE id = ?', [curso_asignado_id || 0]);
        const cursoNombre = cursoInfo.length > 0 ? cursoInfo[0].nombre : null;
        await connection.query(`
            INSERT INTO tb_preregistro_relaciones (
                establecimiento_id, rut_apoderado, nombres_apoderado, apellidos_apoderado,
                email_apoderado, telefono_apoderado, rut_alumno, nombres_alumno, apellidos_alumno,
                curso_nombre, parentesco, es_apoderado_titular, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
            ON DUPLICATE KEY UPDATE
                nombres_apoderado = VALUES(nombres_apoderado), apellidos_apoderado = VALUES(apellidos_apoderado),
                email_apoderado = VALUES(email_apoderado), curso_nombre = VALUES(curso_nombre), activo = 1
        `, [
            estId, rut_apoderado, nombres_apoderado, apellidos_apoderado || '',
            email_apoderado || null, telefono_apoderado || null,
            rut_alumno, nombres_alumno, apellidos_alumno,
            cursoNombre, parentescoFinal
        ]);

        await connection.commit();
        connection.release();
        res.json({ success: true, message: 'Matrícula guardada correctamente', id: resultMat.insertId });

    } catch (error) {
        if (connection) { await connection.rollback(); connection.release(); }
        console.error('Error matrículas:', error);
        res.status(500).json({ success: false, error: 'Error al crear matrícula: ' + error.message });
    }
});

// NUEVO: Buscar Apoderado por RUT
router.get('/apoderado/:rut', async (req, res) => {
    try {
        const { rut } = req.params;
        const [rows] = await pool.query('SELECT * FROM tb_apoderados WHERE rut = ?', [rut]);
        if (rows.length > 0) {
            const ap = rows[0];
            res.json({
                success: true,
                data: {
                    rut: ap.rut,
                    nombres: ap.nombres,
                    apellidos: ap.apellidos,
                    email: ap.email,
                    telefono: ap.telefono,
                    direccion: ap.direccion
                }
            });
        } else {
            res.json({ success: false, message: 'No encontrado' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false });
    }
});

// NUEVO: Validar Promoción
router.post('/validar-promocion', async (req, res) => {
    try {
        const { alumno_id, curso_destino_id } = req.body;
        if (!alumno_id) return res.json({ success: true });

        const [cursoDestino] = await pool.query('SELECT nombre FROM tb_cursos WHERE id = ?', [curso_destino_id]);
        if (cursoDestino.length === 0) return res.json({ success: true });
        const nombreDestino = cursoDestino[0].nombre;

        const extraerNivel = (str) => { const match = str.match(/(\d+)/); return match ? parseInt(match[0]) : 0; };
        const nivelDestino = extraerNivel(nombreDestino);

        const [historial] = await pool.query(`
            SELECT m.estado, c.nombre as nombre_anterior
            FROM tb_matriculas m
            LEFT JOIN tb_cursos c ON m.curso_asignado_id = c.id
            WHERE m.alumno_id = ? AND m.activo = 1
            ORDER BY m.anio_academico DESC LIMIT 1
        `, [alumno_id]);

        if (historial.length > 0) {
            const ultimo = historial[0];
            const nivelAnterior = extraerNivel(ultimo.nombre_anterior || '');

            if (ultimo.estado === 'reprobada' && nivelDestino > nivelAnterior) { // Ojo: estado suele ser 'reprobada' o 'reprobado', usaré femenino x consistencia DB
                return res.json({ success: false, titulo: '⛔ Alumno Reprobado', mensaje: `El alumno reprobó ${ultimo.nombre_anterior}. No puede pasar a ${nombreDestino}.` });
            }
            if (ultimo.estado === 'aprobada' && nivelDestino <= nivelAnterior && nivelDestino !== 0) {
                return res.json({ success: false, titulo: '⚠️ Curso Repetido/Inferior', mensaje: `El alumno aprobó ${ultimo.nombre_anterior}. Intenta matricular en ${nombreDestino}.` });
            }
            if (nivelDestino > nivelAnterior + 1 && nivelAnterior > 0) {
                return res.json({ success: false, titulo: '⚠️ Salto de Nivel', mensaje: `Salto de ${ultimo.nombre_anterior} a ${nombreDestino} no es consecutivo.` });
            }
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Error validación:', e);
        res.json({ success: true });
    }
});

module.exports = router;
