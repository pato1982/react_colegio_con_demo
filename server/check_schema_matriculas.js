
const { pool } = require('./config/database');

async function checkSchema() {
    try {
        console.log('--- Checking tb_matriculas schema ---');
        const [columns] = await pool.query('DESCRIBE tb_matriculas');
        console.table(columns);

        console.log('--- Checking sample data ---');
        const [sample] = await pool.query('SELECT * FROM tb_matriculas LIMIT 1');
        console.log(sample[0]);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkSchema();
