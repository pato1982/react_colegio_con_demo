const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function generateTableStructures() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('Conectado a la base de datos...');

        // 1. Obtener lista de todas las tablas
        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        console.log(`Encontradas ${tableNames.length} tablas. Extrayendo estructuras...`);

        let output = `==========================================================\n`;
        output += `ESTRUCTURA DE LAS ${tableNames.length} TABLAS - PORTAL ESTUDIANTIL\n`;
        output += `Generado el: ${new Date().toLocaleString()}\n`;
        output += `==========================================================\n\n`;

        for (let i = 0; i < tableNames.length; i++) {
            const tableName = tableNames[i];
            console.log(`[${i + 1}/${tableNames.length}] Procesando ${tableName}...`);

            output += `----------------------------------------------------------\n`;
            output += `TABLA #${i + 1}: ${tableName}\n`;
            output += `----------------------------------------------------------\n`;

            const [columns] = await connection.execute(`DESCRIBE ${tableName}`);

            // Formatear columnas como tabla de texto
            output += String('CAMPO').padEnd(25) + String('TIPO').padEnd(20) + String('NULL').padEnd(10) + String('KEY').padEnd(10) + String('DEFAULT').padEnd(15) + '\n';
            output += '-'.repeat(80) + '\n';

            columns.forEach(col => {
                output += String(col.Field || '').padEnd(25) +
                    String(col.Type || '').padEnd(20) +
                    String(col.Null || '').padEnd(10) +
                    String(col.Key || '').padEnd(10) +
                    String(col.Default || 'NULL').padEnd(15) + '\n';
            });

            output += '\n\n';
        }

        const filePath = path.join('c:', 'Users', 'Telqway', 'Desktop', 'colegio-react', '54tb');
        fs.writeFileSync(filePath, output);

        console.log(`✅ Archivo generado exitosamente en: ${filePath}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

generateTableStructures();
