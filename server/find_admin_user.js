const mysql = require('mysql2/promise');

async function findAdmin() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil'
        });

        const [rows] = await connection.execute(
            `SELECT id, email, tipo_usuario FROM tb_usuarios WHERE tipo_usuario = 'administrador' LIMIT 5`
        );

        if (rows.length > 0) {
            console.log('--- Administradores Encontrados ---');
            rows.forEach(u => console.log(`Email: ${u.email}`));
            console.log('Contraseña común posible: 123456 (hash: $2a$10$X/h.wq...)');
        } else {
            console.log('No se encontraron administradores.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (connection) await connection.end();
    }
}

findAdmin();
