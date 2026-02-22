const { pool } = require('./config/database');

async function test() {
    try {
        const [rows] = await pool.query(`
            SELECT 
                a.alumno_id, 
                al.nombres, 
                al.apellidos, 
                a.curso_id, 
                c.nombre as nombre_curso 
            FROM tb_asistencia a 
            JOIN tb_alumnos al ON a.alumno_id = al.id 
            LEFT JOIN tb_cursos c ON a.curso_id = c.id 
            WHERE al.apellidos LIKE 'Perez%' 
               OR al.apellidos LIKE 'Pacheco%' 
               OR al.apellidos LIKE 'Espinoza%' 
            LIMIT 10
        `);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
