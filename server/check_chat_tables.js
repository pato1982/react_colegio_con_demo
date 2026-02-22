const mysql = require('mysql2/promise');

const dbConfig = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

async function checkSpecificTables() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const tables = ['tb_chat_conversaciones', 'tb_matriculas', 'tb_cursos', 'tb_alumnos', 'tb_apoderados', 'tb_relacion_alumno_apoderado'];

        for (const t of tables) {
            try {
                console.log(`\n--- ${t} ---`);
                const [cols] = await connection.execute(`DESCRIBE ${t}`);
                console.log(cols.map(c => `${c.Field} (${c.Type})`).join(', '));
            } catch (e) {
                console.log(`Table ${t} does not exist or error: ${e.message}`);
            }
        }

    } catch (error) {
        console.error(error);
    } finally {
        if (connection) await connection.end();
    }
}

checkSpecificTables();
