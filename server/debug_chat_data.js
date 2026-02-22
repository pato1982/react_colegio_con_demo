const { pool } = require('./config/database');

async function checkChatDependencies() {
    try {
        console.log('--- Checking tb_matriculas ---');
        const [matriculas] = await pool.query('SELECT * FROM tb_matriculas LIMIT 5');
        console.log('Matriculas sample:', matriculas);

        console.log('--- Checking tb_asignaciones ---');
        const [asignaciones] = await pool.query('SELECT * FROM tb_asignaciones LIMIT 5');
        console.log('Asignaciones sample:', asignaciones);

        console.log('--- Checking tb_docentes ---');
        const [docentes] = await pool.query('SELECT * FROM tb_docentes LIMIT 5');
        console.log('Docentes sample:', docentes);

        console.log('--- Checking tb_administradores ---');
        const [admins] = await pool.query('SELECT * FROM tb_administradores LIMIT 5');
        console.log('Admins sample:', admins);

        // Let's check a specific apoderado and their pupils
        const [apoderados] = await pool.query('SELECT id, rut, nombres FROM tb_apoderados WHERE activo = 1 LIMIT 1');
        if (apoderados.length > 0) {
            const apoderado = apoderados[0];
            console.log(`--- Checking for Apoderado: ${apoderado.nombres} (ID: ${apoderado.id}) ---`);

            const [pupilos] = await pool.query(`
        SELECT a.id, a.nombres, a.apellidos, ae.establecimiento_id
        FROM tb_apoderado_alumno aa
        JOIN tb_alumnos a ON aa.alumno_id = a.id
        JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id
        WHERE aa.apoderado_id = ?
      `, [apoderado.id]);

            console.log('Pupilos found via tb_apoderado_alumno:', pupilos);

            for (const pupilo of pupilos) {
                console.log(`--- Checking Teachers for Pupilo: ${pupilo.nombres} (ID: ${pupilo.id}) ---`);
                const [teachers] = await pool.query(`
          SELECT 
              d.nombres, d.apellidos, tas.nombre as asignatura
          FROM tb_matriculas mat
          JOIN tb_asignaciones asig ON mat.curso_id = asig.curso_id AND asig.activo = 1
          JOIN tb_asignaturas tas ON asig.asignatura_id = tas.id
          JOIN tb_docentes d ON asig.docente_id = d.id AND d.activo = 1
          WHERE mat.alumno_id = ? AND mat.establecimiento_id = ?
        `, [pupilo.id, pupilo.establecimiento_id]);
                console.log(`Teachers for pupilo ${pupilo.id}:`, teachers);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkChatDependencies();
