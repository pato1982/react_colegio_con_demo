const mysql = require('mysql2/promise');
require('dotenv').config();

async function listarCursos() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '170.239.87.97',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'EXwCVq87aj0F3f1',
            database: process.env.DB_NAME || 'portal_estudiantil',
            port: process.env.DB_PORT || 3306
        });

        const [cursos] = await connection.execute('SELECT id, nombre, codigo, nivel, grado, letra FROM tb_cursos WHERE anio_academico = 2026 ORDER BY grado, letra');
        console.table(cursos);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

listarCursos();
