const mysql = require('mysql2/promise');

async function populateAsistenciaCompleta() {
    const connection = await mysql.createConnection({
        host: '170.239.87.97',
        user: 'root',
        password: 'EXwCVq87aj0F3f1',
        database: 'portal_estudiantil',
        port: 3306
    });

    try {
        console.log('--- INICIANDO POBLACIÓN MASIVA DE ASISTENCIA 2026 ---');

        // 1. Obtener todos los alumnos con matrícula activa
        const [matriculas] = await connection.execute(`
            SELECT m.alumno_id, m.curso_asignado_id, m.establecimiento_id
            FROM tb_matriculas m
            WHERE m.anio_academico = 2026 AND m.activo = 1
        `);

        if (matriculas.length === 0) {
            console.log('No se encontraron matrículas activas en 2026.');
            return;
        }

        console.log(`Poblando asistencia para ${matriculas.length} alumnos...`);

        // 2. Limpiar asistencia previa del 2026 para evitar duplicados
        console.log('Limpiando registros previos del 2026...');
        await connection.execute('DELETE FROM tb_asistencia WHERE anio_academico = 2026');

        const anio = 2026;
        // Meses escolares: Marzo (2) a Diciembre (11) -> 0-indexed: 2=Marzo, 11=Diciembre
        const meses = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

        let registrosTotales = 0;

        for (const mes of meses) {
            // Determinar trimestre
            let trimestre = 1;
            if (mes >= 5 && mes <= 7) trimestre = 2; // Jun, Jul, Ago (aprox)
            if (mes >= 8) trimestre = 3; // Sep, Oct, Nov, Dic

            const primerDia = new Date(anio, mes, 1);
            const ultimoDia = new Date(anio, mes + 1, 0);

            console.log(`Procesando mes: ${primerDia.toLocaleString('es-CL', { month: 'long' })}...`);

            for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
                const fecha = new Date(anio, mes, dia);
                const diaSemana = fecha.getDay();

                // Solo Lunes a Viernes (1-5)
                if (diaSemana === 0 || diaSemana === 6) continue;

                // Vacaciones de invierno (ej: 2 semanas en Julio, mes 6 en 0-indexed)
                if (mes === 6 && dia >= 10 && dia <= 25) continue;

                const fechaStr = fecha.toISOString().split('T')[0];

                // Preparar inserción múltiple para rendimiento
                const values = [];
                for (const mat of matriculas) {
                    const rand = Math.random();
                    let estado = 'presente';
                    let horaLlegada = '08:00:00';
                    let minutosAtraso = 0;

                    if (rand > 0.96) {
                        estado = 'ausente';
                        horaLlegada = null;
                        minutosAtraso = 0;
                    } else if (rand > 0.90) {
                        estado = 'atrasado';
                        minutosAtraso = Math.floor(Math.random() * 25) + 5;
                        horaLlegada = `08:${minutosAtraso.toString().padStart(2, '0')}:00`;
                    } else if (rand > 0.88) {
                        estado = 'justificado';
                        horaLlegada = null;
                        minutosAtraso = 0;
                    }

                    values.push([
                        mat.establecimiento_id, mat.alumno_id, mat.curso_asignado_id,
                        fechaStr, anio, trimestre, estado, horaLlegada, minutosAtraso, 1
                    ]);
                }

                // Insertar por lotes (batch insert)
                const query = `
                    INSERT INTO tb_asistencia (
                        establecimiento_id, alumno_id, curso_id, fecha, 
                        anio_academico, trimestre, estado, hora_llegada, 
                        minutos_atraso, activo
                    ) VALUES ?
                `;

                await connection.query(query, [values]);
                registrosTotales += values.length;
            }
        }

        console.log(`\n✅ POBLACIÓN COMPLETADA`);
        console.log(`Total de registros creados: ${registrosTotales}`);
        console.log(`Alumnos procesados: ${matriculas.length}`);
        console.log(`Rango: Marzo 2026 - Diciembre 2026`);

    } catch (error) {
        console.error('❌ Error durante la población:', error);
    } finally {
        await connection.end();
    }
}

populateAsistenciaCompleta();
