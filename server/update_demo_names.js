const mysql = require('mysql2/promise');

async function updateDemoData() {
    try {
        const connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- Actualizando nombres para demo ---');

        // Actualizar Apoderado Juan Muñoz a Apoderado Demo
        await connection.execute("UPDATE tb_apoderados SET nombres = 'Apoderado', apellidos = 'Demo' WHERE id = 902");
        console.log('✅ Apoderado 902 actualizado a "Apoderado Demo"');

        // Actualizar Alumna Florencia Soto a Alumno Demo
        await connection.execute("UPDATE tb_alumnos SET nombres = 'Alumno', apellidos = 'Demo' WHERE id = 121");
        console.log('✅ Alumno 121 actualizado a "Alumno Demo"');

        await connection.end();
        console.log('--- Proceso Finalizado ---');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

updateDemoData();
