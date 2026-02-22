const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function fixAndPopulate() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- LIMPIANDO INTENTOS FALLIDOS Y POBLANDO DATOS REALES ---');

        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        // Limpiar solo datos de alumnos/apoderados para no afectar admin/docentes
        await connection.execute("DELETE FROM tb_usuarios WHERE tipo_usuario = 'apoderado'");
        await connection.execute("TRUNCATE TABLE tb_apoderados");
        await connection.execute("TRUNCATE TABLE tb_alumnos");
        await connection.execute("TRUNCATE TABLE tb_matriculas");
        await connection.execute("TRUNCATE TABLE tb_apoderado_alumno");
        await connection.execute("TRUNCATE TABLE tb_alumno_establecimiento");
        await connection.execute("TRUNCATE TABLE tb_apoderado_establecimiento");
        await connection.execute("TRUNCATE TABLE tb_periodos_matricula");

        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        const estId = 1;
        const anioActual = 2026;
        const password = '123456';
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Periodo de Matricula
        const [periodoRes] = await connection.execute(
            `INSERT INTO tb_periodos_matricula (establecimiento_id, anio_academico, nombre, fecha_inicio, fecha_fin, activo) 
             VALUES (?, ?, 'Proceso Admisión 2026', '2025-10-01', '2026-03-30', 1)`,
            [estId, anioActual]
        );
        const periodoMatId = periodoRes.insertId;

        // 2. Obtener Cursos
        const [cursos] = await connection.execute('SELECT id, nombre FROM tb_cursos');

        const datosPrueba = [
            { nomAlu: 'Florencia', apeAlu: 'Soto', rutAlu: '21.111.111-1', nomApo: 'Juan', apeApo: 'Soto', rutApo: '12.111.111-1', emailApo: 'demo@colegio.cl', parentesco: 'padre' },
            { nomAlu: 'Benjamin', apeAlu: 'Muñoz', rutAlu: '22.222.222-2', nomApo: 'Laura', apeApo: 'Muñoz', rutApo: '13.222.222-2', emailApo: 'apoderado2@demo.cl', parentesco: 'madre' },
            { nomAlu: 'Catalina', apeAlu: 'Rojas', rutAlu: '23.333.333-3', nomApo: 'Pedro', apeApo: 'Rojas', rutApo: '14.333.333-3', emailApo: 'apoderado3@demo.cl', parentesco: 'padre' },
            { nomAlu: 'Elias', apeAlu: 'Figueroa', rutAlu: '24.444.444-4', nomApo: 'Monica', apeApo: 'Lira', rutApo: '15.444.444-4', emailApo: 'demo4@colegio.cl', parentesco: 'madre' },
            { nomAlu: 'Dante', apeAlu: 'Poli', rutAlu: '25.555.555-5', nomApo: 'Jose', apeApo: 'Poli', rutApo: '16.555.555-5', emailApo: 'demo5@colegio.cl', parentesco: 'padre' },
            { nomAlu: 'Sofia', apeAlu: 'Henriquez', rutAlu: '26.666.666-6', nomApo: 'Carmen', apeApo: 'Henriquez', rutApo: '17.666.666-6', emailApo: 'demo6@colegio.cl', parentesco: 'madre' },
            { nomAlu: 'Mateo', apeAlu: 'Vial', rutAlu: '27.777.777-7', nomApo: 'Luis', apeApo: 'Vial', rutApo: '18.777.777-7', emailApo: 'demo7@colegio.cl', parentesco: 'padre' },
            { nomAlu: 'Isabella', apeAlu: 'Prieto', rutAlu: '28.888.888-8', nomApo: 'Ana', apeApo: 'Prieto', rutApo: '19.888.888-8', emailApo: 'demo8@colegio.cl', parentesco: 'madre' },
            { nomAlu: 'Joaquin', apeAlu: 'Lavín', rutAlu: '29.999.999-9', nomApo: 'Diego', apeApo: 'Lavin', rutApo: '10.999.999-9', emailApo: 'demo9@colegio.cl', parentesco: 'padre' },
            { nomAlu: 'Antonia', apeAlu: 'Boric', rutAlu: '20.000.000-0', nomApo: 'Irene', apeApo: 'Boric', rutApo: '11.000.000-0', emailApo: 'demo10@colegio.cl', parentesco: 'madre' },
            { nomAlu: 'Lucas', apeAlu: 'Kast', rutAlu: '19.111.999-1', nomApo: 'Felipe', apeApo: 'Kast', rutApo: '09.111.999-1', emailApo: 'demo11@colegio.cl', parentesco: 'padre' },
            { nomAlu: 'Paz', apeAlu: 'Zapata', rutAlu: '18.222.888-2', nomApo: 'Elena', apeApo: 'Zapata', rutApo: '08.222.888-2', emailApo: 'demo12@colegio.cl', parentesco: 'madre' }
        ];

        for (let i = 0; i < cursos.length; i++) {
            const curso = cursos[i];
            const data = datosPrueba[i];
            console.log(`- Insertando Alumno: ${data.nomAlu} en ${curso.nombre}`);

            // A. Usuario (Login)
            const [uRes] = await connection.execute(
                `INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo, email_verificado) 
                 VALUES (?, ?, 'apoderado', 1, 1)`,
                [data.emailApo, hashedPassword]
            );
            const userId = uRes.insertId;

            // B. Perfil Apoderado
            const [apoRes] = await connection.execute(
                `INSERT INTO tb_apoderados (usuario_id, rut, nombres, apellidos, email, activo) 
                 VALUES (?, ?, ?, ?, ?, 1)`,
                [userId, data.rutApo, data.nomApo, data.apeApo, data.emailApo]
            );
            const apoId = apoRes.insertId;

            // C. Perfil Alumno
            const [aluRes] = await connection.execute(
                `INSERT INTO tb_alumnos (rut, nombres, apellidos, nacionalidad, activo) 
                 VALUES (?, ?, ?, 'Chilena', 1)`,
                [data.rutAlu, data.nomAlu, data.apeAlu]
            );
            const aluId = aluRes.insertId;

            // D. Matricula Histórica
            await connection.execute(
                `INSERT INTO tb_matriculas (
                    establecimiento_id, periodo_matricula_id, alumno_id, apoderado_id, anio_academico, 
                    numero_matricula, tipo_matricula, estado, curso_asignado_id, 
                    nombres_alumno, apellidos_alumno, rut_alumno, activo, parentezco, fecha_aprobacion
                ) VALUES (?, ?, ?, ?, ?, ?, 'nuevo', 'aprobada', ?, ?, ?, ?, 1, ?, NOW())`,
                [estId, periodoMatId, aluId, apoId, anioActual, `MAT2026-${aluId}`, curso.id, data.nomAlu, data.apeAlu, data.rutAlu, data.parentesco]
            );

            // E. Vínculos Operativos
            await connection.execute(`INSERT INTO tb_alumno_establecimiento (alumno_id, establecimiento_id, curso_id, anio_academico, fecha_ingreso, activo) VALUES (?, ?, ?, ?, CURDATE(), 1)`, [aluId, estId, curso.id, anioActual]);
            await connection.execute(`INSERT INTO tb_apoderado_alumno (apoderado_id, alumno_id, parentesco, recibe_notas, activo) VALUES (?, ?, ?, 1, 1)`, [apoId, aluId, data.parentesco]);
            await connection.execute(`INSERT INTO tb_apoderado_establecimiento (apoderado_id, establecimiento_id, es_apoderado_activo, fecha_registro, activo) VALUES (?, ?, 1, CURDATE(), 1)`, [apoId, estId]);
        }

        console.log('\n=============================================');
        console.log('¡POBLACIÓN COMPLETA Y REPARADA!');
        console.log('Login: demo@colegio.cl / 123456');
        console.log('Todos los vínculos establecidos.');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR CRITICO:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixAndPopulate();
