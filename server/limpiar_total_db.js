const mysql = require('mysql2/promise');

async function limpiarBaseDatos() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- INICIANDO LIMPIEZA TOTAL DE BASE DE DATOS ---');

        // 1. Desactivar validación de llaves foráneas para permitir el truncado masivo
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        console.log('⚠️ Validación de llaves foráneas desactivada.');

        // 2. Obtener todas las tablas dinámicamente
        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        console.log(`Encontradas ${tableNames.length} tablas para limpiar.`);

        // 3. Truncar cada tabla (borra datos y reinicia contadores ID)
        for (const tableName of tableNames) {
            console.log(`Limpiando tabla: ${tableName}...`);
            await connection.execute(`TRUNCATE TABLE ${tableName}`);
        }

        // 4. Reactivar validación de llaves foráneas
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ Validación de llaves foráneas reactivada.');

        console.log('\n=============================================');
        console.log('¡ÉXITO! Las 54 tablas han sido truncadas.');
        console.log('Todos los contadores de ID han vuelto a 1.');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR CRÍTICO DURANTE LA LIMPIEZA:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

limpiarBaseDatos();
