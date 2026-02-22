const mysql = require('mysql2/promise');

async function checkPopulatedData() {
    try {
        const connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- Verificando Cantidad de Datos en Tablas Clave ---');

        const tables = [
            'tb_apoderados',
            'tb_alumnos',
            'tb_apoderado_alumno',
            'tb_notas',
            'tb_asistencia',
            'tb_asignaturas'
        ];

        for (const table of tables) {
            const [rows] = await connection.execute(`SELECT COUNT(*) as total FROM ${table} WHERE activo = 1`);
            console.log(`- ${table}: ${rows[0].total} registros activos`);
        }

        console.log('\n--- Ejemplo de Relación Apoderado-Alumno ---');
        const [relaciones] = await connection.execute(`
            SELECT ap.id as apod_id, ap.nombres as apod_nom, al.id as alu_id, al.nombres as alu_nom
            FROM tb_apoderado_alumno rel
            JOIN tb_apoderados ap ON rel.apoderado_id = ap.id
            JOIN tb_alumnos al ON rel.alumno_id = al.id
            WHERE rel.activo = 1 LIMIT 3
        `);
        relaciones.forEach(r => {
            console.log(`Apoderado: ${r.apod_nom} (ID:${r.apod_id}) -> Alumno: ${r.alu_nom} (ID:${r.alu_id})`);
        });

        console.log('\n--- Ejemplo de Notas (Muestra para KPI) ---');
        const [notas] = await connection.execute(`
            SELECT n.id, n.alumno_id, asig.nombre as asignatura, n.nota, n.anio_academico
            FROM tb_notas n
            JOIN tb_asignaturas asig ON n.asignatura_id = asig.id
            WHERE n.activo = 1 LIMIT 5
        `);
        notas.forEach(n => {
            console.log(`Nota: ${n.nota} en ${n.asignatura} (Alumno ID: ${n.alumno_id}, Año: ${n.anio_academico})`);
        });

        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkPopulatedData();
