import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generarDocumentacion() {
    const dbConfig = {
        host: 'localhost',
        port: 3306,
        user: 'portal_user',
        password: 'Portal@DB2024',
        database: 'portal_estudiantil'
    };

    console.log('Conectando a la base de datos...');
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión exitosa');
    } catch (err) {
        console.warn('⚠️ Error conectando localmente:', err.message);
        console.log('Intentando con credenciales alternativas (190.114.252.5)...');
        try {
            connection = await mysql.createConnection({
                host: '190.114.252.5',
                port: 3306,
                user: 'root',
                password: 'vpsroot123',
                database: 'portal_estudiantil'
            });
            console.log('✅ Conexión exitosa (Remota)');
        } catch (err2) {
            console.error('❌ Error final:', err2.message);
            process.exit(1);
        }
    }

    const [rows] = await connection.execute('SHOW TABLES');
    const tableNames = rows.map(row => Object.values(row)[0]);
    console.log(`Encontradas ${tableNames.length} tablas.`);

    let markdown = `# Estructura de Base de Datos - ${tableNames.length} Tablas\n\n`;
    markdown += `Este documento registra la estructura exacta de las ${tableNames.length} tablas encontradas en la base de datos operativa.\n\n`;
    markdown += `*Generado automáticamente el ${new Date().toLocaleString()}*\n\n---\n\n`;

    // Índice
    markdown += `## Índice de Tablas\n\n`;
    tableNames.forEach((name, i) => {
        markdown += `${i + 1}. [${name}](#${name.toLowerCase().replace(/_/g, '-')})\n`;
    });
    markdown += `\n---\n\n`;

    for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        console.log(`Procesando ${i + 1}/${tableNames.length}: ${tableName}`);

        const [createRows] = await connection.execute(`SHOW CREATE TABLE ${tableName}`);
        const createSql = createRows[0]['Create Table'];

        markdown += `## ${i + 1}. ${tableName}\n\n`;
        markdown += `\`\`\`sql\n${createSql};\n\`\`\`\n\n`;
        markdown += `**Descripción:** Estructura técnica de la tabla \`${tableName}\`.\n\n---\n\n`;
    }

    // Ruta absoluta para evitar confusiones
    const outputPath = path.join('c:', 'Users', 'Telqway', 'Desktop', 'colegio-react', 'docs', 'TABLAS_BASE_DATOS.md');

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, markdown);
    console.log(`✅ Documentación generada en ${outputPath}`);

    await connection.end();
}

generarDocumentacion().catch(console.error);
