
const { pool } = require('./config/database');

async function checkStructure() {
    try {
        console.log('--- tb_alumnos structure ---');
        const [cols] = await pool.query('DESCRIBE tb_alumnos');
        const cursoCol = cols.find(c => c.Field.includes('curso'));
        if (cursoCol) console.log('Found course column in students:', cursoCol);
        else console.log('No course column in tb_alumnos');

        console.log('--- tb_alumno_establecimiento structure ---');
        const [aeCols] = await pool.query('DESCRIBE tb_alumno_establecimiento');
        console.table(aeCols);

        console.log('--- Checking for other students in course 1 via other tables ---');
        // Check tb_alumno_establecimiento
        const [aeRows] = await pool.query('SELECT * FROM tb_alumno_establecimiento WHERE curso_id = 1');
        console.log(`Found ${aeRows.length} in tb_alumno_establecimiento for curso 1`);

    } catch (e) { console.error(e); }
    process.exit();
}
checkStructure();
