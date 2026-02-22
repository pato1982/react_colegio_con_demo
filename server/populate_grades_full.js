const mysql = require('mysql2/promise');

async function populateFullGradesV2() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- REINTENTANDO CARGA MASIVA DE CALIFICACIONES ---');

        const estId = 1;
        const anioActual = 2026;
        const trimestre = 1;

        // 1. Obtener alumnos y tipos
        const [alumnos] = await connection.execute('SELECT id, nombres FROM tb_alumnos');
        const [tiposEval] = await connection.execute('SELECT id FROM tb_tipos_evaluacion');
        const [asignaciones] = await connection.execute('SELECT * FROM tb_asignaciones WHERE activo = 1');

        for (const alu of alumnos) {
            console.log(`- Cargando historial para: ${alu.nombres}`);

            const [estLink] = await connection.execute(
                'SELECT curso_id FROM tb_alumno_establecimiento WHERE alumno_id = ? AND anio_academico = ?',
                [alu.id, anioActual]
            );

            if (estLink.length === 0) continue;
            const cursoId = estLink[0].curso_id;
            const cursoAsigs = asignaciones.filter(a => a.curso_id === cursoId);

            for (const asig of cursoAsigs) {
                for (let n = 1; n <= 4; n++) {
                    const notaValor = (Math.random() * (7.0 - 4.0) + 4.0).toFixed(1); // Notas de aprobación para la demo
                    const tipoE = tiposEval[Math.floor(Math.random() * tiposEval.length)].id;
                    const fecha = `2026-03-${10 + n}`; // Fechas en Marzo para ver datos pronto

                    await connection.execute(
                        `INSERT INTO tb_notas (
                            establecimiento_id, alumno_id, asignatura_id, curso_id, 
                            docente_id, tipo_evaluacion_id, anio_academico, trimestre, 
                            numero_evaluacion, nota, fecha_evaluacion, activo
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                        [estId, alu.id, asig.asignatura_id, cursoId, asig.docente_id, tipoE, anioActual, trimestre, n, notaValor, fecha]
                    );
                }
            }

            // Notificación (Corregida con ENUM válido)
            const [apoLink] = await connection.execute('SELECT apoderado_id FROM tb_apoderado_alumno WHERE alumno_id = ?', [alu.id]);
            if (apoLink.length > 0) {
                const [apoData] = await connection.execute('SELECT usuario_id FROM tb_apoderados WHERE id = ?', [apoLink[0].apoderado_id]);
                if (apoData.length > 0) {
                    await connection.execute(
                        `INSERT INTO tb_notificaciones (
                            establecimiento_id, usuario_id, titulo, mensaje, tipo, leida, fecha_creacion
                        ) VALUES (?, ?, 'Nuevas Notas', ?, 'nota_nueva', 0, NOW())`,
                        [estId, apoData[0].usuario_id, `Se han publicado las notas de ${alu.nombres}.`]
                    );
                }
            }
        }

        console.log('\n=============================================');
        console.log('¡PROCESO FINALIZADO CON EXITO!');
        console.log('Gráficos de promedios: HABILITADOS');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

populateFullGradesV2();
