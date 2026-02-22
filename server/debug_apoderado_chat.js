const { pool } = require('./config/database');

async function debugApoderadoContacts() {
    try {
        console.log("--- DEBUG APODERADO CHAT CONTACTS ---");

        // 1. Get a sample apoderado that has a user account
        const [users] = await pool.query("SELECT id, email, tipo_usuario FROM tb_usuarios WHERE tipo_usuario = 'apoderado' AND activo = 1 LIMIT 5");

        if (users.length === 0) {
            console.log("No active apoderado users found in tb_usuarios");
            // Check if there are ANY apoderados in tb_apoderados
            const [aps] = await pool.query("SELECT id, nombres, usuario_id FROM tb_apoderados LIMIT 5");
            console.log("Apoderados in tb_apoderados:", aps);
            process.exit(0);
        }

        for (const user of users) {
            console.log(`\n--- Processing User: ${user.email} (ID: ${user.id}) ---`);

            // 2. Check tb_apoderados record for this user
            const [apRecords] = await pool.query("SELECT id, nombres, usuario_id FROM tb_apoderados WHERE usuario_id = ?", [user.id]);
            if (apRecords.length === 0) {
                console.log(`Warning: User ${user.id} has type 'apoderado' but no matching record in tb_apoderados`);
                continue;
            }

            const apId = apRecords[0].id;
            console.log(`Found Apoderado Profile: ${apRecords[0].nombres} (ID: ${apId})`);

            // 3. Check pupilos
            const [pupilos] = await pool.query(`
                SELECT aa.alumno_id, a.nombres, a.apellidos
                FROM tb_apoderado_alumno aa
                JOIN tb_alumnos a ON aa.alumno_id = a.id
                WHERE aa.apoderado_id = ?
            `, [apId]);
            console.log(`Pupilos Linked: ${pupilos.length}`);

            if (pupilos.length > 0) {
                for (const pup of pupilos) {
                    console.log(`  > Pupilo: ${pup.nombres} ${pup.apellidos} (ID: ${pup.alumno_id})`);

                    const [ae] = await pool.query("SELECT * FROM tb_alumno_establecimiento WHERE alumno_id = ? AND activo = 1", [pup.alumno_id]);
                    if (ae.length === 0) {
                        console.log(`    ! No active entry in tb_alumno_establecimiento for this pupilo`);
                        continue;
                    }

                    const cursoId = ae[0].curso_id;
                    const estabId = ae[0].establecimiento_id;
                    console.log(`    Location: Establishment ${estabId}, Course ${cursoId}`);

                    // 4. Check teachers for this course
                    const [teachers] = await pool.query(`
                        SELECT d.nombres, d.apellidos, tas.nombre as asignatura, d.activo as docente_activo, u.id as user_id, u.activo as user_active
                        FROM tb_asignaciones asig
                        JOIN tb_asignaturas tas ON asig.asignatura_id = tas.id
                        JOIN tb_docentes d ON asig.docente_id = d.id
                        JOIN tb_usuarios u ON d.usuario_id = u.id
                        WHERE asig.curso_id = ? AND asig.activo = 1
                    `, [cursoId]);

                    if (teachers.length === 0) {
                        console.log(`    ! No active teachers assigned to course ${cursoId}`);
                    } else {
                        teachers.forEach(t => {
                            console.log(`    - Teacher: ${t.nombres} ${t.apellidos} [${t.asignatura}] (Docente Active: ${t.docente_activo}, User Active: ${t.user_active}, User ID: ${t.user_id})`);
                        });
                    }
                }
            } else {
                console.log("  ! No pupilos found for this apoderado in tb_apoderado_alumno");
            }

            // 5. Check admins for establishment
            // Let's assume establishment 1 for now if not found
            const [estabIds] = await pool.query("SELECT DISTINCT establecimiento_id FROM tb_alumno_establecimiento ae JOIN tb_apoderado_alumno aa ON ae.alumno_id = aa.alumno_id WHERE aa.apoderado_id = ?", [apId]);
            const targetEstab = estabIds.length > 0 ? estabIds[0].establecimiento_id : 1;

            const [admins] = await pool.query(`
                SELECT a.nombres, a.apellidos, u.id as user_id, u.activo as user_active
                FROM tb_administradores a
                JOIN tb_administrador_establecimiento ae ON a.id = ae.administrador_id
                JOIN tb_usuarios u ON a.usuario_id = u.id
                WHERE ae.establecimiento_id = ? AND ae.activo = 1
            `, [targetEstab]);

            console.log(`Admins for Establishment ${targetEstab}: ${admins.length}`);
            admins.forEach(ad => {
                console.log(`  - Admin: ${ad.nombres} ${ad.apellidos} (User Active: ${ad.user_active}, User ID: ${ad.user_id})`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error("Debug failed:", err);
        process.exit(1);
    }
}

debugApoderadoContacts();
