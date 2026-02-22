const mysql = require('mysql2/promise');

const dbConfig = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

async function checkSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const [tables] = await connection.execute('SHOW TABLES');

        for (const row of tables) {
            const tableName = Object.values(row)[0];
            console.log(`\nTable: ${tableName}`);
            const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
            console.log(columns.map(c => `${c.Field} (${c.Type})`).join(', '));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkSchema();
