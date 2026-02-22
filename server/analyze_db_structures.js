const mysql = require('mysql2/promise');

async function analyzeAllTables() {
    try {
        const connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        const analysis = {};

        for (const tableName of tableNames) {
            const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
            analysis[tableName] = columns;
        }

        // Guardamos el análisis en un archivo local para tenerlo como referencia rápida sin saturar la consola
        const fs = require('fs');
        fs.writeFileSync('db_structure_analysis.json', JSON.stringify(analysis, null, 2));

        console.log('OK: Análisis de estructuras completado y guardado en db_structure_analysis.json');

        await connection.end();
    } catch (error) {
        console.error('Error durante el análisis:', error.message);
    }
}

analyzeAllTables();
