const mysql = require('mysql2/promise');

async function checkConditions() {
    try {
        const connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        const tablesToCheck = [
            'tb_apoderado_alumno',
            'tb_notas',
            'tb_asignaturas',
            'tb_asistencia'
        ];

        console.log('--- Verificando Condiciones de Tablas ---');

        for (const table of tablesToCheck) {
            const [columns] = await connection.execute(`DESCRIBE ${table}`);
            console.log(`\nTabla: ${table}`);
            columns.forEach(col => {
                console.log(`- ${col.Field} (${col.Type})`);
            });
        }

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkConditions();
