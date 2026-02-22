const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); // Asegurarnos de usar bcryptjs
require('dotenv').config();

async function poblarDatosDemo() {
    let connection;
    try {
        console.log('--- POBLANDO DATOS DE DEMOSTRACIÓN (123456) ---');

        // 1. Conexión con variables de entorno del servidor
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '9Il2cmw4PgSQ10V',
            database: process.env.DB_NAME || 'portal_estudiantil'
        });

        console.log('🧹 Limpiando base de datos...');
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        const tables = [
            'tb_notas', 'tb_asistencia', 'tb_asignaciones', 'tb_docente_asignatura',
            'tb_docente_establecimiento', 'tb_alumno_establecimiento', 'tb_apoderado_alumno',
            'tb_apoderado_establecimiento', 'tb_administrador_establecimiento',
            'tb_alumnos', 'tb_apoderados', 'tb_docentes', 'tb_administradores',
            'tb_usuarios', 'tb_cursos', 'tb_asignaturas', 'tb_configuracion_establecimiento',
            'tb_establecimientos'
        ];
        for (const table of tables) {
            try {
                await connection.execute(`TRUNCATE TABLE ${table}`);
            } catch (err) {
                // Si la tabla no existe no importa
            }
        }
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        // 2. Hash COMÚN para todos (123456)
        const hashedPassword = await bcrypt.hash('123456', 10);
        console.log('🔐 Hash generado para "123456":', hashedPassword);

        // 3. Crear ESTABLECIMIENTO
        console.log('🏫 Creando Establecimiento...');
        const [estRes] = await connection.execute(`
            INSERT INTO tb_establecimientos (nombre, rbd, direccion, comuna, email)
            VALUES ('Colegio Demo VPS', '101', 'Av. VPS 123', 'Santiago', 'contacto@colegiodemo.cl')
        `);
        const estId = estRes.insertId;

        // 4. Configurar Establecimiento
        await connection.execute(`
            INSERT INTO tb_configuracion_establecimiento (establecimiento_id, color_primario, nota_aprobacion, chat_habilitado)
            VALUES (?, '#1976d2', 4.0, 1) ON DUPLICATE KEY UPDATE chat_habilitado=1
        `, [estId]);

        // 4.1. Periodos Académicos
        console.log('📅 Creando Periodo Académico 2026...');
        await connection.execute(`
            INSERT INTO tb_periodos_academicos (
                establecimiento_id, anio, nombre, fecha_inicio, fecha_fin, 
                trimestre_1_inicio, trimestre_1_fin,
                trimestre_2_inicio, trimestre_2_fin,
                trimestre_3_inicio, trimestre_3_fin,
                activo
            ) VALUES (?, 2026, 'Año 2026', '2026-03-01', '2026-12-31',
                '2026-03-01', '2026-05-31',
                '2026-06-01', '2026-09-30',
                '2026-10-01', '2026-12-31',
                1)
        `, [estId]);

        // 4.2. Tipos de Evaluación
        console.log('📝 Creando Tipos de Evaluación...');
        await connection.execute(`
            INSERT INTO tb_tipos_evaluacion (establecimiento_id, nombre, abreviatura, ponderacion_default, es_sumativa, activo)
            VALUES 
            (?, 'Prueba', 'PRU', 30, 1, 1),
            (?, 'Trabajo', 'TRB', 20, 1, 1),
            (?, 'Control', 'CTR', 15, 1, 1)
        `, [estId, estId, estId]);

        // 5. Crear USUARIO ADMIN
        console.log('👨‍💼 Creando Administrador (admin.demo@colegio.cl)...');
        const [admUser] = await connection.execute(`
            INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo)
            VALUES ('admin.demo@colegio.cl', ?, 'administrador', 1)
        `, [hashedPassword]);
        const admUserId = admUser.insertId;

        // Perfil Admin
        await connection.execute(`
            INSERT INTO tb_administradores (usuario_id, rut, nombres, apellidos)
            VALUES (?, '11111111-1', 'Admin', 'Demo')
        `, [admUserId]);

        // Relación Admin-Establedicimiento
        // OJO: Primero asegurarnos que tb_administradores existe y obtener su ID (autoincrement)
        const [admProfile] = await connection.execute('SELECT id FROM tb_administradores WHERE usuario_id = ?', [admUserId]);
        await connection.execute(`
            INSERT INTO tb_administrador_establecimiento (administrador_id, establecimiento_id, cargo, fecha_asignacion)
            VALUES (?, ?, 'Director', CURDATE())
        `, [admProfile[0].id, estId]);


        // 6. Crear DOCENTE
        console.log('👩‍🏫 Creando Docente (docente.demo@colegio.cl)...');
        const [docUser] = await connection.execute(`
            INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo)
            VALUES ('docente.demo@colegio.cl', ?, 'docente', 1)
        `, [hashedPassword]);
        const docUserId = docUser.insertId;

        // Perfil Docente
        await connection.execute(`
            INSERT INTO tb_docentes (usuario_id, rut, nombres, apellidos, especialidad)
            VALUES (?, '22222222-2', 'Profesor', 'Demo', 'Matemáticas')
        `, [docUserId]);

        // Relación Docente-Establecimiento
        const [docProfile] = await connection.execute('SELECT id FROM tb_docentes WHERE usuario_id = ?', [docUserId]);
        const docId = docProfile[0].id;

        await connection.execute(`
            INSERT INTO tb_docente_establecimiento (docente_id, establecimiento_id, cargo, fecha_ingreso)
            VALUES (?, ?, 'titular', CURDATE())
        `, [docId, estId]);


        // 7. Crear ALUMNO (con RUT de prueba)
        console.log('students... (Alumno Demo)');
        const [alumRes] = await connection.execute(`
            INSERT INTO tb_alumnos (rut, nombres, apellidos, fecha_nacimiento, direccion)
            VALUES ('33333333-3', 'Alumno', 'Demo', '2015-01-01', 'Calle Falsa 123')
        `);
        const alumId = alumRes.insertId;


        // 8. Crear USUARIO APODERADO
        console.log('👪 Creando Apoderado (apoderado.demo@colegio.cl)...');
        const [apoUser] = await connection.execute(`
            INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo)
            VALUES ('apoderado.demo@colegio.cl', ?, 'apoderado', 1)
        `, [hashedPassword]);
        const apoUserId = apoUser.insertId;

        // Perfil Apoderado
        await connection.execute(`
            INSERT INTO tb_apoderados (usuario_id, rut, nombres, apellidos)
            VALUES (?, '44444444-4', 'Padre', 'Demo')
        `, [apoUserId]);

        // Relación Apoderado-Establecimiento
        const [apoProfile] = await connection.execute('SELECT id FROM tb_apoderados WHERE usuario_id = ?', [apoUserId]);
        const apoId = apoProfile[0].id;

        await connection.execute(`
            INSERT INTO tb_apoderado_establecimiento (apoderado_id, establecimiento_id, fecha_registro)
            VALUES (?, ?, CURDATE())
        `, [apoId, estId]);

        // 9. VINCULAR APODERADO - ALUMNO
        console.log('🔗 Vinculando Apoderado con Alumno...');
        await connection.execute(`
            INSERT INTO tb_apoderado_alumno (apoderado_id, alumno_id, parentesco, es_apoderado_titular)
            VALUES (?, ?, 'padre', 1)
        `, [apoId, alumId]);


        // 10. Crear CURSO Y MATRICULAR ALUMNO
        console.log('📚 Asignando Curso (1º Básico A)...');
        const [cursoRes] = await connection.execute(`
            INSERT INTO tb_cursos (establecimiento_id, nombre, codigo, nivel, anio_academico, letra)
            VALUES (?, 'Primero Básico A', '1BA-2026', 'basica', 2026, 'A')
        `, [estId]);
        const cursoId = cursoRes.insertId;

        // Matricular al alumno en ese curso
        await connection.execute(`
            INSERT INTO tb_alumno_establecimiento (alumno_id, establecimiento_id, curso_id, anio_academico, fecha_ingreso)
            VALUES (?, ?, ?, 2026, CURDATE())
        `, [alumId, estId, cursoId]);


        // 11. ASIGNAR ASIGNATURA AL DOCENTE EN ESE CURSO
        console.log('📘 Asignando Matemáticas al Docente...');
        const [asigRes] = await connection.execute(`
            INSERT INTO tb_asignaturas (establecimiento_id, nombre, codigo, nivel)
            VALUES (?, 'Matemáticas', 'MAT-1', 'basica')
        `, [estId]);
        const asigMatId = asigRes.insertId;

        // Asignación Docente -> Curso -> Asignatura
        await connection.execute(`
            INSERT INTO tb_asignaciones (establecimiento_id, docente_id, curso_id, asignatura_id, anio_academico)
            VALUES (?, ?, ?, ?, 2026)
        `, [estId, docId, cursoId, asigMatId]);

        // 12. INSERTAR ALGUNAS NOTAS DE EJEMPLO
        // (Asumiendo que tb_notas existe y tiene estructura compatible)
        /*
        console.log('📝 Poniendo notas de ejemplo...');
        // (Opcional, requiere tb_periodos_academicos y tb_tipos_evaluacion primero)
        */

        console.log('\n✅ ¡DATOS DE PRUEBA INSERTADOS EXITOSAMENTE!');
        console.log('Credenciales para todos: 123456');

    } catch (error) {
        console.error('❌ ERROR GRAVE:', error);
    } finally {
        if (connection) await connection.end();
    }
}

poblarDatosDemo();
