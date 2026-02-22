const mysql = require('mysql2/promise');

const dbConfig = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

async function addColumn() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Check if column exists first to avoid error
        const [columns] = await connection.execute("SHOW COLUMNS FROM tb_chat_conversaciones LIKE 'respuesta_habilitada'");
        if (columns.length > 0) {
            console.log("Column 'respuesta_habilitada' already exists.");
        } else {
            await connection.execute("ALTER TABLE tb_chat_conversaciones ADD COLUMN respuesta_habilitada TINYINT(1) DEFAULT 0");
            console.log("Column 'respuesta_habilitada' added successfully.");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

addColumn();
