const mysql = require('mysql2/promise');
require('dotenv').config();

async function describeTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const [rows] = await connection.query('DESCRIBE tb_sesiones');
        console.log('Columns in tb_sesiones:');
        console.table(rows);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

describeTable();
