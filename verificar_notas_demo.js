import mysql from 'mysql2/promise';

async function checkApoderadoNotas() {
    let pool;
    try {
        pool = mysql.createPool({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const email = 'apoderado@demo.cl';
        console.log(`--- VERIFICANDO NOTAS PARA EMAIL: ${email} ---`);

        // 1. Encontrar el usuario
        const [usuarios] = await pool.query('SELECT id, email FROM tb_usuarios WHERE email = ?', [email]);
        if (usuarios.length === 0) {
            console.log(`No se encontró usuario con email ${email}`);
            return;
        }
        const usuario = usuarios[0];
        console.log(`Usuario encontrado (ID: ${usuario.id})`);

        // 2. Encontrar el apoderado
        const [apoderados] = await pool.query('SELECT id, nombres, apellidos FROM tb_apoderados WHERE usuario_id = ?', [usuario.id]);
        if (apoderados.length === 0) {
            console.log(`El usuario no tiene un perfil de apoderado en tb_apoderados`);
            return;
        }
        const apoderado = apoderados[0];
        console.log(`Perfil de apoderado: ${apoderado.nombres} ${apoderado.apellidos} (ID: ${apoderado.id})`);

        // 3. Encontrar pupilos vinculados
        const [relaciones] = await pool.query(`
            SELECT aa.alumno_id, a.nombres, a.apellidos 
            FROM tb_apoderado_alumno aa
            JOIN tb_alumnos a ON aa.alumno_id = a.id
            WHERE aa.apoderado_id = ? AND aa.activo = 1
        `, [apoderado.id]);

        if (relaciones.length === 0) {
            console.log(`No hay pupilos vinculados a este apoderado.`);
            return;
        }

        console.log(`Se encontraron ${relaciones.length} pupilo(s) vinculado(s):`);

        for (const rel of relaciones) {
            console.log(`\n> Pupilo: ${rel.nombres} ${rel.apellidos} (ID: ${rel.alumno_id})`);

            // 4. Ver si tiene notas
            const [notasCount] = await pool.query(`
                SELECT count(*) as total FROM tb_notas 
                WHERE alumno_id = ? AND activo = 1
            `, [rel.alumno_id]);

            console.log(`  Total notas encontradas: ${notasCount[0].total}`);

            if (notasCount[0].total > 0) {
                // Ver detalle por año
                const [anioStats] = await pool.query(`
                    SELECT anio_academico, count(*) as count 
                    FROM tb_notas 
                    WHERE alumno_id = ? AND activo = 1
                    GROUP BY anio_academico
                `, [rel.alumno_id]);
                console.table(anioStats);

                // Ver muestra de las últimas 5 notas
                const [sample] = await pool.query(`
                    SELECT n.nota, n.anio_academico, asig.nombre as asignatura, n.trimestre
                    FROM tb_notas n
                    JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
                    WHERE n.alumno_id = ? AND n.activo = 1
                    ORDER BY n.id DESC LIMIT 5
                `, [rel.alumno_id]);
                console.log('  Muestra de últimas 5 notas:');
                console.table(sample);
            }
        }

    } catch (error) {
        console.error('Error durante la verificación:', error);
    } finally {
        if (pool) await pool.end();
        process.exit();
    }
}

checkApoderadoNotas();
