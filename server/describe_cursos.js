const mysql = require('mysql2/promise');
require('dotenv').config();

async function describeCursos() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '170.239.87.97',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'EXwCVq87aj0F3f1',
            database: process.env.DB_NAME || 'portal_estudiantil',
            port: process.env.DB_PORT || 3306
        });

        const [columns] = await connection.execute('DESCRIBE tb_cursos');
        console.table(columns);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

describeCursos();
