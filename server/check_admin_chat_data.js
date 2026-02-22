
const { pool } = require('./config/database');

async function checkData() {
    try {
        console.log('--- VERIFICANDO DATOS PARA CHAT ADMIN ---');

        // 1. Obtener un administrador, su usuario_id y su establecimiento
        const [admins] = await pool.query(`
            SELECT a.id, a.nombres, a.usuario_id, ae.establecimiento_id
            FROM tb_administradores a
            JOIN tb_administrador_establecimiento ae ON a.id = ae.administrador_id
            WHERE ae.activo = 1
            LIMIT 1
        `);

        if (admins.length === 0) {
            console.log('NO se encontraron administradores con establecimiento activo.');
        } else {
            const admin = admins[0];
            console.log('Administrador encontrado:', admin);

            // 2. Verificar usuario en tb_usuarios
            const [users] = await pool.query('SELECT * FROM tb_usuarios WHERE id = ?', [admin.usuario_id]);
            console.log('Usuario asociado:', users[0]);

            // 3. Simular query de cursos para este admin (La que modifique en chat.js)
            console.log(`\nProbando consulta de cursos para establecimiento_id: ${admin.establecimiento_id}`);

            const [cursos] = await pool.query(`
                SELECT id, nombre, grado, letra, nivel, establecimiento_id, activo
                FROM tb_cursos
                WHERE establecimiento_id = ? AND activo = 1
                ORDER BY nivel, grado, letra
            `, [admin.establecimiento_id]);

            console.log(`Cursos encontrados (${cursos.length}):`);
            if (cursos.length > 0) {
                console.table(cursos.map(c => ({ id: c.id, nombre: c.nombre, activa: c.activo })));
            } else {
                console.log('0 cursos encontrados para este establecimiento.');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkData();
