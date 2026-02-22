const mysql = require('mysql2/promise');

const dbConfig = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

async function checkAsignaciones() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('\n--- tb_asignaciones ---');
        const [cols] = await connection.execute('DESCRIBE tb_asignaciones');
        console.log(cols.map(c => c.Field).join(', '));
    } catch (error) {
        console.error(error);
    } finally {
        if (connection) await connection.end();
    }
}

checkAsignaciones();
