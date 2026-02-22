const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración
const DB_CONFIG = {
    host: process.env.DB_HOST || '170.239.87.97',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'EXwCVq87aj0F3f1',
    database: process.env.DB_NAME || 'portal_estudiantil',
    port: process.env.DB_PORT || 3306
};

const ANIO_ACADEMICO = 2026;
const ESTABLECIMIENTO_ID = 1;

// Rangos de trimestres (aproximados)
const TRIMESTRES = [
    { id: 1, start: '2026-03-05', end: '2026-05-31' },
    { id: 2, start: '2026-06-01', end: '2026-08-30' },
    { id: 3, start: '2026-09-01', end: '2026-11-30' }
];

const CANTIDAD_NOTAS_POR_TRIMESTRE = 6;

// IDs de cursos a procesar. Dejar vacío [] para procesar TODOS los cursos activos.
const CURSOS_TARGET_IDS = [7, 8]; // 7mo y 8vo Básico

async function getRandomDate(startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

    // Evitar fines de semana (0 = Domingo, 6 = Sábado)
    const dia = date.getDay();
    if (dia === 0) date.setDate(date.getDate() + 1);
    if (dia === 6) date.setDate(date.getDate() + 2);

    return date.toISOString().split('T')[0];
}

async function poblarNotas() {
    let connection;
    try {
        console.log('--- INICIANDO POBLADO DE NOTAS 2026 (ID 7 y 8) ---');
        connection = await mysql.createConnection(DB_CONFIG);

        // 1. Obtener Tipos de Evaluación
        const [tiposEval] = await connection.execute('SELECT id FROM tb_tipos_evaluacion');
        if (tiposEval.length === 0) throw new Error('No hay tipos de evaluación definidos.');

        // DETERMINAR CURSOS A PROCESAR
        let cursosIds = CURSOS_TARGET_IDS;
        if (cursosIds.length === 0) {
            console.log('Detectando TODOS los cursos activos...');
            const [todosCursos] = await connection.execute('SELECT id FROM tb_cursos WHERE activo = 1 AND anio_academico = ?', [ANIO_ACADEMICO]);
            cursosIds = todosCursos.map(c => c.id);
        }

        // 2. Procesar Cursos
        for (const cursoId of cursosIds) {
            console.log(`\nProcesando Curso ID: ${cursoId}...`);

            // Obtener Alumnos del Curso
            const [alumnos] = await connection.execute(`
                SELECT ae.alumno_id, a.nombres, a.apellidos 
                FROM tb_alumno_establecimiento ae
                JOIN tb_alumnos a ON ae.alumno_id = a.id
                WHERE ae.curso_id = ? AND ae.anio_academico = ? AND ae.activo = 1
            `, [cursoId, ANIO_ACADEMICO]);

            console.log(`- Alumnos encontrados: ${alumnos.length}`);

            // Obtener Asignaciones (Asignatura + Docente) del Curso
            const [asignaciones] = await connection.execute(`
                SELECT asignatura_id, docente_id 
                FROM tb_asignaciones 
                WHERE curso_id = ? AND anio_academico = ? AND activo = 1
            `, [cursoId, ANIO_ACADEMICO]);

            console.log(`- Asignaturas encontradas: ${asignaciones.length}`);

            if (asignaciones.length === 0) {
                console.warn(`⚠️ No hay asignaciones para el curso ${cursoId}. Saltando.`);
                continue;
            }

            // Procesar cada Alumno
            for (let i = 0; i < alumnos.length; i++) {
                const alumno = alumnos[i];

                // LÓGICA DE REPROBACIÓN:
                // Normales para estos 3 cursos salvo indicación contraria
                let esReprobado = false;
                // if (i < 2) { esReprobado = true; } // DESACTIVADO

                console.log(`  > Generando notas normales para: ${alumno.nombres} ${alumno.apellidos}`);


                // Procesar cada Asignatura
                for (const asig of asignaciones) {

                    // Procesar cada Trimestre
                    for (const trim of TRIMESTRES) {

                        // Generar 6 notas
                        for (let n = 1; n <= CANTIDAD_NOTAS_POR_TRIMESTRE; n++) {
                            let notaValor;

                            if (esReprobado) {
                                // Notas entre 2.0 y 4.2 (Promedio tenderá a rojo)
                                notaValor = (Math.random() * (4.2 - 2.0) + 2.0).toFixed(1);
                            } else {
                                // Notas entre 4.0 y 7.0
                                notaValor = (Math.random() * (7.0 - 4.0) + 4.0).toFixed(1);
                            }

                            // Elegir tipo evaluación random
                            const tipoE = tiposEval[Math.floor(Math.random() * tiposEval.length)].id;

                            // Fecha dentro del rango
                            const fecha = await getRandomDate(trim.start, trim.end);

                            // Insertar Nota
                            await connection.execute(`
                                INSERT INTO tb_notas (
                                    establecimiento_id, 
                                    alumno_id, 
                                    asignatura_id, 
                                    curso_id, 
                                    docente_id, 
                                    tipo_evaluacion_id, 
                                    anio_academico, 
                                    trimestre, 
                                    numero_evaluacion, 
                                    nota, 
                                    fecha_evaluacion, 
                                    activo
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                            `, [
                                ESTABLECIMIENTO_ID,
                                alumno.alumno_id,
                                asig.asignatura_id,
                                cursoId,
                                asig.docente_id,
                                tipoE,
                                ANIO_ACADEMICO,
                                trim.id,
                                n,
                                notaValor,
                                fecha
                            ]);
                        }
                    }
                }
            }
        }

        console.log('\n--- POBLADO FINALIZADO EXITOSAMENTE ---');

    } catch (error) {
        console.error('❌ ERROR CRÍTICO:', error);
    } finally {
        if (connection) await connection.end();
    }
}

poblarNotas();
