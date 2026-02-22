
const { pool } = require('./config/database');

async function checkStudents() {
    try {
        const cursoId = 1; // Assuming course ID 1 based on previous output
        console.log(`--- Checking students for curso_asignado_id: ${cursoId} ---`);

        const [rows] = await pool.query(`
            SELECT 
                m.id as matricula_id,
                m.curso_asignado_id,
                a.nombres as alumno_nom, 
                a.activo as alumno_activo,
                ap.nombres as apoderado_nom, 
                ap.activo as apoderado_activo_profile,
                u.activo as usuario_activo
            FROM tb_matriculas m
            JOIN tb_alumnos a ON m.alumno_id = a.id
            JOIN tb_apoderados ap ON m.apoderado_id = ap.id
            LEFT JOIN tb_usuarios u ON ap.usuario_id = u.id
            WHERE m.curso_asignado_id = ?
        `, [cursoId]);

        console.log(`Found ${rows.length} matriculas.`);
        if (rows.length > 0) console.table(rows);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkStudents();
