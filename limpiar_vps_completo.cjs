const mysql = require('mysql2/promise');
require('dotenv').config();

async function limpiarBaseDeDatos() {
    let connection;
    try {
        console.log('--- LIMPIEZA TOTAL DE BASE DE DATOS (VPS) ---');
        console.log('--- MODO: TRUNCATE ALL (Reinicio de IDs) ---');

        // Conexión
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '9Il2cmw4PgSQ10V',
            database: process.env.DB_NAME || 'portal_estudiantil'
        });

        console.log('🧹 Eliminando registros y reiniciando contadores...');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        // Orden inverso de dependencias para minimizar conflictos aunque FK esté desactivado
        const tables = [
            'tb_notas', 'tb_asistencia', 'tb_asignaciones', 'tb_docente_asignatura',
            'tb_docente_establecimiento', 'tb_alumno_establecimiento', 'tb_apoderado_alumno',
            'tb_apoderado_establecimiento', 'tb_administrador_establecimiento',
            'tb_alumnos', 'tb_apoderados', 'tb_docentes', 'tb_administradores',
            'tb_usuarios', 'tb_cursos', 'tb_asignaturas', 'tb_periodos_academicos',
            'tb_tipos_evaluacion', 'tb_configuracion_establecimiento', 'tb_establecimientos',
            'tb_mensajes', 'tb_conversaciones', 'tb_consultas_contacto', 'tb_intentos_registro_fallidos'
        ];

        for (const table of tables) {
            try {
                // TRUNCATE vacía la tabla y reinicia el AUTO_INCREMENT a 1
                await connection.execute(`TRUNCATE TABLE ${table}`);
                console.log(`   - Tabla ${table} vaciada.`);
            } catch (err) {
                console.log(`   * Tabla ${table} no existe o error: ${err.message}`);
            }
        }

        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n✅ ¡BASE DE DATOS TOTALMENTE LIMPIA!');
        console.log('No quedan registros. Los IDs comenzarán desde 1 en la próxima inserción.');

    } catch (error) {
        console.error('❌ ERROR AL LIMPIAR:', error);
    } finally {
        if (connection) await connection.end();
    }
}

limpiarBaseDeDatos();
