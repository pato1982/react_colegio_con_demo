const mysql = require('mysql2/promise');
require('dotenv').config();

// Ajustar credenciales si estamos en local vs server
const dbConfig = {
    host: process.env.DB_HOST || '170.239.87.97',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'EXwCVq87aj0F3f1',
    database: process.env.DB_NAME || 'portal_estudiantil',
    port: process.env.DB_PORT || 3306
};

async function checkPopulatedTables() {
    let connection;
    try {
        console.log('--- REVISIÓN DE TABLAS POBLADAS ---');
        connection = await mysql.createConnection(dbConfig);

        // Lista de tablas clave que hemos tocado
        const TABLES_TO_CHECK = [
            'tb_usuarios',
            'tb_alumnos',
            'tb_apoderados',
            'tb_apoderado_alumno',
            'tb_matriculas',
            'tb_alumno_establecimiento',
            'tb_notas',
            'tb_asistencia',
            'tb_tipos_evaluacion'
        ];

        console.table([
            { Tabla: '--- INFRAESTRUCTURA (Fix) ---', Count: '' },
            { Tabla: 'tb_cursos', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_cursos'))[0][0].c },
            { Tabla: 'tb_docentes', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_docentes'))[0][0].c },
            { Tabla: 'tb_asignaciones', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_asignaciones'))[0][0].c },

            { Tabla: '--- POBLADO SESIÓN 27 ENERO ---', Count: '' },
            { Tabla: 'tb_alumnos (Total)', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_alumnos'))[0][0].c },
            { Tabla: 'tb_apoderados', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_apoderados'))[0][0].c },
            { Tabla: 'tb_matriculas', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_matriculas'))[0][0].c },
            { Tabla: 'tb_apoderado_alumno (Relaciones)', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_apoderado_alumno'))[0][0].c },
            { Tabla: 'tb_asistencia (Total 2026)', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_asistencia'))[0][0].c },

            { Tabla: '--- GENERADO AHORA (Notas) ---', Count: '' },
            { Tabla: 'tb_tipos_evaluacion', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_tipos_evaluacion'))[0][0].c },
            { Tabla: 'tb_notas (Total)', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_notas'))[0][0].c },
            { Tabla: '  > Reprobados (Nota < 4.0)', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_notas WHERE nota < 4.0'))[0][0].c },
            { Tabla: '  > Aprobados (Nota >= 4.0)', Count: (await connection.execute('SELECT COUNT(*) as c FROM tb_notas WHERE nota >= 4.0'))[0][0].c },
        ]);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkPopulatedTables();
