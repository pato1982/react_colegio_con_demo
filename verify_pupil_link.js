import mysql from 'mysql2/promise';

async function verifyPupiloId() {
    let pool;
    try {
        pool = mysql.createPool({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
        });

        const email = 'apoderado@demo.cl';

        // Find user
        const [users] = await pool.query('SELECT id FROM tb_usuarios WHERE email = ?', [email]);
        const userId = users[0].id;

        // Find apoderado
        const [apods] = await pool.query('SELECT id FROM tb_apoderados WHERE usuario_id = ?', [userId]);
        const apodId = apods[0].id;

        // Find linked pupils
        const [rels] = await pool.query(`
            SELECT aa.alumno_id, a.nombres, a.apellidos 
            FROM tb_apoderado_alumno aa
            JOIN tb_alumnos a ON aa.alumno_id = a.id
            WHERE aa.apoderado_id = ? AND aa.activo = 1
        `, [apodId]);

        console.log('Linked pupils for apoderado@demo.cl:');
        console.table(rels);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (pool) await pool.end();
        process.exit();
    }
}

verifyPupiloId();
