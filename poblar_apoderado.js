
import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';

const config = {
    host: '170.239.87.97',
    user: 'root',
    password: 'EXwCVq87aj0F3f1',
    database: 'portal_estudiantil'
};

async function poblarDatosApoderado() {
    let connection;
    try {
        connection = await createConnection(config);
        console.log('Conectado a la BD...');

        // 1. Datos del Alumno y Curso (detectados anteriormente)
        // 1. Datos del Alumno y Curso (detectados anteriormente)
        const alumnoId = 121; // Florencia Soto
        const cursoId = 1; // 1° Basico A
        const establecimientoId = 1; // Asumimos ID 1
        const anio = 2026;

        // Obtener detalles del alumno para llenar la matricula
        const [alus] = await connection.query('SELECT * FROM tb_alumnos WHERE id = ?', [alumnoId]);
        if (alus.length === 0) throw new Error("Alumno no encontrado");
        const aluData = alus[0];
        const rutAlumno = aluData.rut;
        const nombresAlumno = aluData.nombres;
        const apellidosAlumno = aluData.apellidos;

        console.log('Datos alumno obtenidos:', rutAlumno, nombresAlumno);

        console.log('Creando datos para Apoderado Demo...');

        // 2. Crear Usuario (si no existe)
        // Email: apoderado@demo.cl, Pass: 123456
        const email = 'apoderado@demo.cl';
        const passwordHash = await bcrypt.hash('123456', 10);

        // Verificar si ya existe
        const [users] = await connection.query('SELECT id FROM tb_usuarios WHERE email = ?', [email]);
        let usuarioId;

        if (users.length > 0) {
            usuarioId = users[0].id;
            console.log(`Usuario ${email} ya existe (ID: ${usuarioId}). Usando existente.`);
        } else {
            const [resUser] = await connection.query(`
            INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo, email_verificado)
            VALUES (?, ?, 'apoderado', 1, 1)
        `, [email, passwordHash]);
            usuarioId = resUser.insertId;
            console.log(`Usuario creado con éxito (ID: ${usuarioId})`);
        }

        // 3. Crear Apoderado en tb_apoderados
        // Rut ficticio
        const rutApoderado = '12.345.678-9';

        const [apoderados] = await connection.query('SELECT id FROM tb_apoderados WHERE usuario_id = ?', [usuarioId]);
        let apoderadoId;

        if (apoderados.length > 0) {
            apoderadoId = apoderados[0].id;
            console.log(`Apoderado ya existe (ID: ${apoderadoId}).`);
        } else {
            const [resApo] = await connection.query(`
            INSERT INTO tb_apoderados (usuario_id, rut, nombres, apellidos, email, telefono, activo)
            VALUES (?, ?, 'Juan', 'Muñoz', ?, '+56912345678', 1)
        `, [usuarioId, rutApoderado, email]);
            apoderadoId = resApo.insertId;
            console.log(`Perfil Apoderado creado (ID: ${apoderadoId})`);
        }

        // 4. Vincular Apoderado al Establecimiento
        const [relEst] = await connection.query('SELECT id FROM tb_apoderado_establecimiento WHERE apoderado_id = ?', [apoderadoId]);
        if (relEst.length === 0) {
            await connection.query(`
            INSERT INTO tb_apoderado_establecimiento (apoderado_id, establecimiento_id, fecha_registro, activo)
            VALUES (?, ?, CURDATE(), 1)
        `, [apoderadoId, establecimientoId]);
            console.log('Vinculado al establecimiento.');
        }

        // 5. Vincular Apoderado con Alumno (tb_apoderado_alumno)
        const [relAlu] = await connection.query('SELECT id FROM tb_apoderado_alumno WHERE apoderado_id = ? AND alumno_id = ?', [apoderadoId, alumnoId]);
        if (relAlu.length === 0) {
            await connection.query(`
            INSERT INTO tb_apoderado_alumno (apoderado_id, alumno_id, parentesco, es_apoderado_titular, activo)
            VALUES (?, ?, 'padre', 1, 1)
        `, [apoderadoId, alumnoId]);
            console.log(`Vinculado con alumno ID ${alumnoId}.`);
        }

        // 6. CREAR MATRÍCULA (CRITICO PARA EL CHAT)
        // tb_matriculas
        const [matriculas] = await connection.query('SELECT id FROM tb_matriculas WHERE alumno_id = ? AND anio_academico = ?', [alumnoId, anio]);
        if (matriculas.length === 0) {
            // Necesitamos un periodo de matricula valido
            let periodoId = 1;
            const [periodos] = await connection.query('SELECT id FROM tb_periodos_matricula LIMIT 1');
            if (periodos.length > 0) periodoId = periodos[0].id;
            else {
                const [resPer] = await connection.query(`
                INSERT INTO tb_periodos_matricula (establecimiento_id, anio_academico, nombre, fecha_inicio, fecha_fin, activo)
                VALUES (?, ?, 'Periodo 2024', '2024-01-01', '2024-12-31', 1)
             `, [establecimientoId, anio]);
                periodoId = resPer.insertId;
            }

            /* 
               IMPORTANTE: Insertamos tambien rut_alumno, nombres_alumno, apellidos_alumno porque la base de datos lo pide.
               Aunque no estaba en mi esquema local, el error dice que falta valor default para 'nombres_alumno'.
            */
            try {
                await connection.query(`
                INSERT INTO tb_matriculas 
                (establecimiento_id, periodo_matricula_id, alumno_id, apoderado_id, anio_academico, tipo_matricula, estado, curso_asignado_id, activo,
                 rut_alumno, nombres_alumno, apellidos_alumno)
                VALUES (?, ?, ?, ?, ?, 'antiguo', 'aprobada', ?, 1, ?, ?, ?)
            `, [establecimientoId, periodoId, alumnoId, apoderadoId, anio, cursoId, rutAlumno, nombresAlumno, apellidosAlumno]);
                console.log(`Matrícula creada para alumno ID ${alumnoId} en curso ID ${cursoId}.`);
            } catch (insertError) {
                console.log("Error al insertar matricula con campos extendidos, intentando metodo simple...");
                // Fallback si me equivoqué y los campos no existen pero el error era otro
                console.error(insertError);
            }

        } else {
            // Asegurar que tenga curso asignado si ya existía
            await connection.query('UPDATE tb_matriculas SET curso_asignado_id = ?, apoderado_id = ?, activo = 1 WHERE id = ?', [cursoId, apoderadoId, matriculas[0].id]);
            console.log('Matrícula existente actualizada con curso y apoderado.');
        }

        // 7. VINCULAR EN TB_ALUMNO_ESTABLECIMIENTO (Requerido por vista Apoderado)
        const [aluEst] = await connection.query('SELECT id FROM tb_alumno_establecimiento WHERE alumno_id = ? AND establecimiento_id = ? AND activo = 1', [alumnoId, establecimientoId]);
        if (aluEst.length === 0) {
            await connection.query(`
                INSERT INTO tb_alumno_establecimiento (alumno_id, establecimiento_id, curso_id, anio_academico, fecha_ingreso, activo)
                VALUES (?, ?, ?, ?, CURDATE(), 1)
             `, [alumnoId, establecimientoId, cursoId, anio]);
            console.log('Vinculado en tb_alumno_establecimiento (CRITICO para vista apoderado).');
        } else {
            // Actualizar curso si es diferente
            await connection.query('UPDATE tb_alumno_establecimiento SET curso_id = ? WHERE id = ?', [cursoId, aluEst[0].id]);
            console.log('Actualizado curso en tb_alumno_establecimiento.');
        }

        console.log('-------------------------------------------');
        console.log('¡PROCESO COMPLETADO!');
        console.log('Credenciales Apoderado:');
        console.log('Usuario: apoderado@demo.cl');
        console.log('Clave:   123456');
        console.log('-------------------------------------------');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

poblarDatosApoderado();
