const mysql = require('mysql2/promise');

const dbConfig = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

async function findRelTables() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(r => Object.values(r)[0]);

        console.log('Tables matching pattern:');
        tableNames.forEach(t => {
            if (t.includes('asign') || t.includes('imparte') || t.includes('clase') || t.includes('plan')) {
                console.log(t);
            }
        });

        // Also check tb_cursos columns for teacher ref
        console.log('\n--- tb_cursos columns ---');
        const [cols] = await connection.execute('DESCRIBE tb_cursos');
        console.log(cols.map(c => c.Field).join(', '));

    } catch (error) {
        console.error(error);
    } finally {
        if (connection) await connection.end();
    }
}

findRelTables();
