const mysql = require('mysql2/promise');

const dbConfig = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

async function checkDetails() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        console.log('\n--- tb_docente_asignatura ---');
        const [cols1] = await connection.execute('DESCRIBE tb_docente_asignatura');
        console.log(cols1.map(c => c.Field).join(', '));

        console.log('\n--- tb_asignaturas ---');
        const [cols2] = await connection.execute('DESCRIBE tb_asignaturas');
        console.log(cols2.map(c => c.Field).join(', '));

    } catch (error) {
        console.error(error);
    } finally {
        if (connection) await connection.end();
    }
}

checkDetails();
