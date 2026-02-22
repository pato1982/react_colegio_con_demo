const mysql = require('mysql2/promise');

async function verifyApoderadoDemo() {
    try {
        const connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- Buscando Apoderado en tb_apoderados con email demo ---');
        const [apoderados] = await connection.execute('SELECT id, nombres, apellidos, email, rut FROM tb_apoderados WHERE email = ?', ['apoderado@demo.cl']);

        if (apoderados.length === 0) {
            console.log('❌ No se encontró apoderado con email apoderado@demo.cl en tb_apoderados');

            // Intentar por RUT si sabemos cual es o buscar por el email del usuario
            const [users] = await connection.execute('SELECT id, email, username FROM tb_usuarios WHERE email = ?', ['apoderado@demo.cl']);
            if (users.length > 0) {
                console.log('✅ Usuario encontrado en tb_usuarios, pero no está en tb_apoderados con ese email.');
                console.log(users[0]);
            }
        } else {
            const apoderado = apoderados[0];
            console.log(`✅ Apoderado encontrado: ${apoderado.nombres} ${apoderado.apellidos} (ID: ${apoderado.id})`);

            console.log('\n--- Buscando Alumnos Vinculados ---');
            const [relaciones] = await connection.execute(`
                SELECT rel.alumno_id, al.nombres, al.apellidos 
                FROM tb_apoderado_alumno rel
                JOIN tb_alumnos al ON rel.alumno_id = al.id
                WHERE rel.apoderado_id = ? AND rel.activo = 1
            `, [apoderado.id]);

            if (relaciones.length === 0) {
                console.log('⚠️ El apoderado demo no tiene alumnos vinculados en tb_apoderado_alumno.');
            } else {
                relaciones.forEach(r => {
                    console.log(`Pupilo: ${r.nombres} ${r.apellidos} (ID: ${r.alumno_id})`);
                });
            }
        }

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyApoderadoDemo();
