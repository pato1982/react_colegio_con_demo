// Configuración de conexión a MySQL
const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexiones (más eficiente que conexiones individuales)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'portal_user',
    password: process.env.DB_PASSWORD || 'Portal@DB2024',
    database: process.env.DB_NAME || 'portal_estudiantil',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Función para probar la conexión
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión a MySQL exitosa');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error de conexión a MySQL:', error.message);
        return false;
    }
}

module.exports = { pool, testConnection };
