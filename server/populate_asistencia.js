const mysql = require('mysql2/promise');

async function populateAsistencia() {
    const connection = await mysql.createConnection({
        host: '170.239.87.97',
        user: 'root',
        password: 'EXwCVq87aj0F3f1',
        database: 'portal_estudiantil',
        port: 3306
    });

    try {
        console.log('Iniciando población de asistencia...');

        // 1. Obtener establecimiento base
        const [[est]] = await connection.execute('SELECT id FROM tb_establecimientos LIMIT 1');
        if (!est) throw new Error('No hay establecimientos');
        const estId = est.id;

        // 2. Obtener alumnos matriculados y sus cursos actuales
        const [matriculas] = await connection.execute(`
            SELECT alumno_id, curso_asignado_id 
            FROM tb_matriculas 
            WHERE establecimiento_id = ? AND activo = 1 AND estado = 'aprobada'
        `, [estId]);

        console.log(`Encontrados ${matriculas.length} alumnos matriculados.`);

        // 3. Definir rango de fechas (últimos 30 días hábiles aprox)
        const hoy = new Date();
        const diasARegistrar = 30;
        const anioActual = 2026;
        const trimestreActual = 1;

        let registrosTotales = 0;

        for (let i = 0; i < diasARegistrar; i++) {
            const fecha = new Date();
            fecha.setDate(hoy.getDate() - i);

            // Saltarse fines de semana
            const diaSemana = fecha.getDay();
            if (diaSemana === 0 || diaSemana === 6) continue;

            const fechaStr = fecha.toISOString().split('T')[0];
            console.log(`Procesando fecha: ${fechaStr}...`);

            for (const mat of matriculas) {
                // Probabilidad de asistencia (92% presente, 3% atraso, 5% ausente)
                const rand = Math.random();
                let estado = 'presente';
                let horaLlegada = '08:00:00';
                let minutosAtraso = 0;

                if (rand > 0.97) {
                    estado = 'ausente';
                    horaLlegada = null;
                } else if (rand > 0.92) {
                    estado = 'atrasado';
                    minutosAtraso = Math.floor(Math.random() * 20) + 5;
                    horaLlegada = `08:${minutosAtraso.toString().padStart(2, '0')}:00`;
                }

                await connection.execute(
                    `INSERT INTO tb_asistencia (
                        establecimiento_id, alumno_id, curso_id, fecha, 
                        anio_academico, trimestre, estado, hora_llegada, 
                        minutos_atraso, activo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [estId, mat.alumno_id, mat.curso_asignado_id, fechaStr,
                        anioActual, trimestreActual, estado, horaLlegada, minutosAtraso]
                );
                registrosTotales++;
            }
        }

        console.log(`✅ Asistencia poblada con éxito. Total registros: ${registrosTotales}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

populateAsistencia();
