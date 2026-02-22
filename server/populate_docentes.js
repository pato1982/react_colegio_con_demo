const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function populateDocentes() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- POBLANDO DOCENTES ---');

        const estId = 1;
        const password = '123456';
        const hashedPassword = await bcrypt.hash(password, 10);

        const docentesData = [
            {
                nombres: 'María José',
                apellidos: 'Valderrama Palma',
                email: 'mjvalderramap@gmail.com',
                rut: '15.678.901-2',
                especialidad: 'Matemática y Física',
                titulo: 'Profesor de Educación Media en Matemática'
            },
            {
                nombres: 'Andrés',
                apellidos: 'Bello López',
                email: 'abello@demo.cl',
                rut: '10.222.333-4',
                especialidad: 'Lenguaje y Comunicación',
                titulo: 'Licenciado en Letras'
            },
            {
                nombres: 'Claudio',
                apellidos: 'Bravo Muñoz',
                email: 'cbravo@demo.cl',
                rut: '12.444.555-6',
                especialidad: 'Educación Física',
                titulo: 'Profesor de Educación Física'
            },
            {
                nombres: 'Gabriela',
                apellidos: 'Mistral Rojas',
                email: 'gmistral@demo.cl',
                rut: '11.666.777-8',
                especialidad: 'Historia y Geografía',
                titulo: 'Profesora de Historia'
            },
            {
                nombres: 'Pablo',
                apellidos: 'Neruda Godoy',
                email: 'pneruda@demo.cl',
                rut: '13.888.999-0',
                especialidad: 'Artes y Música',
                titulo: 'Profesor de Artes Visuales'
            },
            {
                nombres: 'Violeta',
                apellidos: 'Parra Sandoval',
                email: 'vparra@demo.cl',
                rut: '14.111.000-1',
                especialidad: 'Ciencias Naturales y Química',
                titulo: 'Profesora de Ciencias'
            }
        ];

        for (const d of docentesData) {
            console.log(`Procesando docente: ${d.nombres} ${d.apellidos}...`);

            // 1. Crear Usuario
            const [userResult] = await connection.execute(
                `INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo, email_verificado) 
                 VALUES (?, ?, 'docente', 1, 1)`,
                [d.email, hashedPassword]
            );
            const userId = userResult.insertId;

            // 2. Crear Docente
            const [docResult] = await connection.execute(
                `INSERT INTO tb_docentes (
                    usuario_id, rut, nombres, apellidos, email, 
                    especialidad, titulo_profesional, activo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                [userId, d.rut, d.nombres, d.apellidos, d.email, d.especialidad, d.titulo]
            );
            const docenteId = docResult.insertId;

            // 3. Vincular con Establecimiento
            await connection.execute(
                `INSERT INTO tb_docente_establecimiento (
                    docente_id, establecimiento_id, cargo, fecha_ingreso, activo
                ) VALUES (?, ?, 'titular', CURDATE(), 1)`,
                [docenteId, estId]
            );
        }

        console.log('\n=============================================');
        console.log(`¡ÉXITO! Se han creado ${docentesData.length} docentes.`);
        console.log('Docente principal: mjvalderramap@gmail.com');
        console.log('Password para todos: 123456');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR AL POBLAR DOCENTES:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

populateDocentes();
