const mysql = require('mysql2/promise');

const dbConfig = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

const tablesToCheck = [
    'tb_usuarios',
    'tb_docentes',
    'tb_apoderados',
    'tb_alumnos',
    'tb_cursos',
    'tb_matriculas',
    'tb_relacion_alumno_apoderado', // Guessing name
    'tb_alumnos_apoderados', // Guessing name
    'tb_mensajes',
    'tb_conversaciones',
    'tb_asignaciones_docente' // Guessing connection between teacher and course
];

async function checkSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // First list all tables to find the correct names
        const [allTables] = await connection.execute('SHOW TABLES');
        const tableNames = allTables.map(row => Object.values(row)[0]);
        console.log('All Tables:', tableNames.join(', '));

        for (const table of tableNames) {
            // Filter primarily for tables that might be relevant if exact matches aren't found
            if (table.includes('mensa') || table.includes('chat') || table.includes('alum') || table.includes('apoder') || table.includes('curso') || table.includes('docen') || table.includes('matric')) {
                console.log(`\n--- DESCRIBE ${table} ---`);
                const [columns] = await connection.execute(`DESCRIBE ${table}`);
                console.log(columns.map(c => `${c.Field} (${c.Type})`).join(', '));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkSchema();
