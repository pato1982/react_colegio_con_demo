
import { createConnection } from 'mysql2/promise';

const config = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

/*
  Script para poblar datos completos de un alumno (Florencia, ID 121)
  - Notas (tb_notas)
  - Asistencia (tb_asistencia)
  - Anotaciones (tb_observaciones_alumno)
  - Comunicados (tb_comunicados)
*/

async function poblarDatos() {
    let connection;
    try {
        connection = await createConnection(config);
        console.log('Conectado a la BD...');

        const alumnoId = 121; // Florencia Soto
        const cursoId = 1;    // 1° Básico A
        const establecimientoId = 1;
        const anio = 2026;

        // 1. Obtener Asignaturas
        const [asignaturas] = await connection.query(`
            SELECT id, nombre FROM tb_asignaturas 
            WHERE activo = 1 
            AND establecimiento_id = ?
            LIMIT 5
        `, [establecimientoId]);

        if (asignaturas.length === 0) {
            console.log("No se encontraron asignaturas. Usando IDs manuales 1,2,3,4.");
            asignaturas.push({ id: 1, nombre: 'Matemática' }, { id: 2, nombre: 'Lenguaje' });
        }

        console.log(`Usando ${asignaturas.length} asignaturas para generar notas.`);

        // Obtener un usuario ID válido para usar como docente/remitente y evitar errores de FK
        const [usuarios] = await connection.query("SELECT id FROM tb_usuarios WHERE activo = 1 LIMIT 1");
        if (usuarios.length === 0) {
            console.error("No se encontró ningún usuario activo en tb_usuarios.");
            return;
        }
        const usuarioGenericoId = usuarios[0].id;
        console.log(`Usando usuario ID ${usuarioGenericoId} como docente/remitente genérico.`);

        // 2. Insertar NOTAS
        console.log('--- Generando Notas ---');
        await connection.query('DELETE FROM tb_notas WHERE alumno_id = ?', [alumnoId]);

        const trimestres = [1, 2, 3];

        for (const asig of asignaturas) {
            for (const tri of trimestres) {
                for (let i = 0; i < 3; i++) {
                    const nota = (Math.random() * (7.0 - 4.0) + 4.0).toFixed(1);
                    const notaFinal = Math.random() > 0.9 ? (Math.random() * (3.9 - 2.0) + 2.0).toFixed(1) : nota;
                    const fecha = `${anio}-0${tri + 2}-${10 + i}`;

                    // Estructura tb_notas: alumno_id, asignatura_id, curso_id, docente_id, establecimiento_id, trimestre, nota, fecha_evaluacion, tipo_evaluacion_id, activo
                    await connection.query(`
                        INSERT INTO tb_notas 
                        (alumno_id, asignatura_id, curso_id, docente_id, establecimiento_id, trimestre, nota, fecha_evaluacion, tipo_evaluacion_id, activo, anio_academico)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
                    `, [alumnoId, asig.id, cursoId, usuarioGenericoId, establecimientoId, tri, notaFinal, fecha, anio]);
                }
            }
        }
        console.log('Notas generadas en tb_notas.');

        // 3. Insertar ASISTENCIA
        console.log('--- Generando Asistencia ---');
        await connection.query('DELETE FROM tb_asistencia WHERE alumno_id = ?', [alumnoId]);

        for (let dia = 1; dia <= 20; dia++) {
            if (dia % 7 === 6 || dia % 7 === 0) continue;

            const estadoRand = Math.random();
            let estado = 'presente';
            if (estadoRand > 0.90) estado = 'ausente';
            else if (estadoRand > 0.85) estado = 'atrasado'; // Enum en SQL dice 'atrasado', no 'tardio'

            const fecha = `${anio}-03-${String(dia).padStart(2, '0')}`;

            // Estructura tb_asistencia: alumno_id, curso_id, establecimiento_id, fecha, estado, activo
            await connection.query(`
                INSERT INTO tb_asistencia
                (alumno_id, curso_id, establecimiento_id, fecha, estado, activo, anio_academico, trimestre)
                VALUES (?, ?, ?, ?, ?, 1, ?, 1)
            `, [alumnoId, cursoId, establecimientoId, fecha, estado, anio]);
        }
        console.log('Asistencia generada en tb_asistencia.');

        // 4. Insertar ANOTACIONES (tb_observaciones_alumno)
        console.log('--- Generando Observaciones/Anotaciones ---');
        await connection.query('DELETE FROM tb_observaciones_alumno WHERE alumno_id = ?', [alumnoId]);

        // Estructura tb_observaciones_alumno: alumno_id, establecimiento_id, curso_id, docente_id, anio_academico, trimestre, fecha, tipo, categoria, titulo, descripcion, activo
        await connection.query(`
            INSERT INTO tb_observaciones_alumno 
            (alumno_id, establecimiento_id, curso_id, docente_id, anio_academico, trimestre, fecha, tipo, categoria, titulo, descripcion, activo)
            VALUES (?, ?, ?, ?, ?, 1, NOW(), 'positiva', 'conductual', 'Buena participación', 'Participa activamente en clases.', 1)
        `, [alumnoId, establecimientoId, cursoId, usuarioGenericoId, anio]);

        await connection.query(`
            INSERT INTO tb_observaciones_alumno 
            (alumno_id, establecimiento_id, curso_id, docente_id, anio_academico, trimestre, fecha, tipo, categoria, titulo, descripcion, activo)
            VALUES (?, ?, ?, ?, ?, 1, DATE_SUB(NOW(), INTERVAL 2 DAY), 'negativa', 'responsabilidad', 'Materiales olvidados', 'Olvida sus materiales de trabajo.', 1)
        `, [alumnoId, establecimientoId, cursoId, usuarioGenericoId, anio]);
        console.log('Observaciones generadas en tb_observaciones_alumno.');

        // 5. Insertar COMUNICADOS
        console.log('--- Generando Comunicados ---');
        // Usar remitente_id=1 (Admin por defecto)
        /* 
           OJO: tb_comunicados vincula con tb_comunicado_curso para destinatarios tipo 'curso'.
           Pero primero creamos el comunicado.
        */
        const [resCom1] = await connection.query(`
            INSERT INTO tb_comunicados (titulo, mensaje, tipo, remitente_id, establecimiento_id, fecha_envio, activo)
            VALUES ('Reunión de Apoderados', 'Se cita a reunión de apoderados para el día Viernes a las 19:00 hrs.', 'informativo', ?, ?, NOW(), 1)
        `, [usuarioGenericoId, establecimientoId]);

        // Vincular al curso
        await connection.query('INSERT INTO tb_comunicado_curso (comunicado_id, curso_id) VALUES (?, ?)', [resCom1.insertId, cursoId]);

        const [resCom2] = await connection.query(`
            INSERT INTO tb_comunicados (titulo, mensaje, tipo, remitente_id, establecimiento_id, fecha_envio, activo)
            VALUES ('Feria Científica', 'Recordar traer materiales para la feria científica.', 'academico', ?, ?, DATE_SUB(NOW(), INTERVAL 5 DAY), 1)
        `, [usuarioGenericoId, establecimientoId]);

        await connection.query('INSERT INTO tb_comunicado_curso (comunicado_id, curso_id) VALUES (?, ?)', [resCom2.insertId, cursoId]);

        console.log('Comunicados generados y vinculados.');

        console.log('=========================================');
        console.log(' Datos Completos Generados Correctamente ');
        console.log('=========================================');

    } catch (error) {
        console.error('Error detallado:', error);
    } finally {
        if (connection) await connection.end();
    }
}

poblarDatos();
