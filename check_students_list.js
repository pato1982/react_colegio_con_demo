
import { createConnection } from 'mysql2/promise';

const config = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

async function checkStudents() {
    let connection;
    try {
        connection = await createConnection(config);
        const [rows] = await connection.query('SELECT id, nombres, apellidos, rut FROM tb_alumnos LIMIT 5');
        console.log('Students found:', rows);

        const [courses] = await connection.query('SELECT id, nombre, anio_academico FROM tb_cursos LIMIT 5');
        console.log('Courses found:', courses);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkStudents();
