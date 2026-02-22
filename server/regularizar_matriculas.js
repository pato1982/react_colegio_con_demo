const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración DB
const dbConfig = {
    host: process.env.DB_HOST || '170.239.87.97',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'EXwCVq87aj0F3f1',
    database: process.env.DB_NAME || 'portal_estudiantil',
    port: process.env.DB_PORT || 3306
};

const ESTABLECIMIENTO_ID = 1;
const ANIO_ACADEMICO = 2026;

async function regularizarMatriculas() {
    let connection;
    try {
        console.log('--- REGULARIZANDO MATRÍCULAS FORMALES ---');
        connection = await mysql.createConnection(dbConfig);

        // 1. Obtener Alumnos activos con su Apoderado Titular
        // Usamos LEFT JOIN por si acso, pero deberia haber apoderado
        const queryAlumnos = `
            SELECT 
                a.id as alumno_id, a.rut, a.nombres, a.apellidos, 
                a.fecha_nacimiento, a.sexo, a.direccion, a.comuna, a.ciudad,
                ae.curso_id, ae.numero_matricula, c.nivel, c.grado,
                ap.id as apoderado_id, 
                aa.parentesco
            FROM tb_alumnos a
            JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id
            JOIN tb_cursos c ON ae.curso_id = c.id
            JOIN tb_apoderado_alumno aa ON a.id = aa.alumno_id
            JOIN tb_apoderados ap ON aa.apoderado_id = ap.id
            WHERE ae.anio_academico = ? 
              AND ae.activo = 1 
              AND aa.es_apoderado_titular = 1
        `;

        const [alumnos] = await connection.execute(queryAlumnos, [ANIO_ACADEMICO]);

        console.log(`Encontrados ${alumnos.length} alumnos activos para matricular.`);

        // 2. Crear Periodo de Matrícula "Regular 2026" si no existe
        let periodoId;
        const [periodos] = await connection.execute(
            'SELECT id FROM tb_periodos_matricula WHERE anio_academico = ? AND tipo = "regular" LIMIT 1',
            [ANIO_ACADEMICO]
        );

        if (periodos.length > 0) {
            periodoId = periodos[0].id;
        } else {
            console.log('Creando periodo de matrícula Regular 2026...');
            const [resPeriodo] = await connection.execute(`
                INSERT INTO tb_periodos_matricula (
                    establecimiento_id, anio_academico, nombre, tipo, 
                    fecha_inicio, fecha_fin, fecha_inicio_pago, fecha_limite_pago,
                    cupos_disponibles, cupos_ocupados, 
                    niveles_habilitados, cursos_habilitados,
                    requiere_documentos, requiere_pago, monto_matricula, activo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
                ESTABLECIMIENTO_ID, ANIO_ACADEMICO, 'Matrícula Regular 2026', 'regular',
                '2025-10-01', '2026-03-31', '2025-10-01', '2026-03-31',
                500, alumnos.length,
                'basica,media', 'todos', 1, 1, 150000
            ]);
            periodoId = resPeriodo.insertId;
        }

        // 3. Iternar e insertar Matrículas
        let count = 0;
        for (const alu of alumnos) {
            // Verificar si ya existe matrícula para este alumno este año
            const [existe] = await connection.execute(
                'SELECT id FROM tb_matriculas WHERE alumno_id = ? AND anio_academico = ?',
                [alu.alumno_id, ANIO_ACADEMICO]
            );

            if (existe.length === 0) {
                // Generar numero de matricula si no tiene (formato 2026-ID)
                const numMatricula = alu.numero_matricula || `2026-${alu.alumno_id.toString().padStart(4, '0')}`;

                // Fecha aleatoria entre Dic 2025 y Feb 2026
                const fechaMatricula = '2025-12-15 10:00:00';

                await connection.execute(`
                    INSERT INTO tb_matriculas (
                        establecimiento_id, periodo_matricula_id, alumno_id, apoderado_id, 
                        anio_academico, numero_matricula, tipo_matricula, estado,
                        curso_solicitado_id, curso_asignado_id, 
                        nivel_solicitado, grado_solicitado,
                        nombres_alumno, apellidos_alumno, rut_alumno,
                        fecha_nacimiento_alumno, sexo_alumno, 
                        direccion_alumno, comuna_alumno, ciudad_alumno,
                        fecha_envio, fecha_aprobacion, aprobado_por,
                        activo, parentezco
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                `, [
                    ESTABLECIMIENTO_ID,
                    periodoId,
                    alu.alumno_id,
                    alu.apoderado_id,
                    ANIO_ACADEMICO,
                    numMatricula,
                    'antiguo', // Asumimos antiguos mayoritariamente
                    'aprobada', // ESTADO FINAL APROBADO
                    alu.curso_id, // Solicitado
                    alu.curso_id, // Asignado
                    alu.nivel,
                    alu.grado,
                    alu.nombres,
                    alu.apellidos,
                    alu.rut,
                    alu.fecha_nacimiento,
                    alu.sexo,
                    alu.direccion,
                    alu.comuna || 'Villarrica',
                    alu.ciudad || 'Villarrica',
                    fechaMatricula, // Fecha envio
                    fechaMatricula, // Fecha aprobacion (inmediata para data legacy)
                    1, // Aprobado por Admin ID 1
                    alu.parentesco
                ]);
                count++;
            }
        }

        console.log(`\n¡Éxito! Se generaron ${count} matrículas formales.`);

        // Actualizar contador del periodo
        await connection.execute('UPDATE tb_periodos_matricula SET cupos_ocupados = ? WHERE id = ?', [alumnos.length, periodoId]);


    } catch (error) {
        console.error('❌ ERROR:', error);
    } finally {
        if (connection) await connection.end();
    }
}

regularizarMatriculas();
