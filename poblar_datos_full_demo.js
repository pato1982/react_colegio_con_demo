const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Configuración DB VPS
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'H4lcon$9.2024',
    database: process.env.DB_NAME || 'portal_estudiantil',
    multipleStatements: true
};

const PASSWORD_DEMO = '123456';
const EMAILS = {
    ADMIN: 'admin@demo.com',
    DOCENTE: 'docente@demo.com',
    APODERADO: 'apoderado@demo.com'
};

const ANIO_ACADEMICO = 2026;

async function poblarDatos() {
    let connection;
    try {
        console.log('Conectando a la base de datos...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Conectado.');

        const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);

        // 1. Crear Establecimiento
        console.log('Creando Establecimiento Demo...');
        // Clean previous demo establishment if likely
        const [estRes] = await connection.execute("SELECT id FROM tb_establecimientos WHERE nombre = 'Colegio Demo Full'");
        let estId;
        if (estRes.length > 0) estId = estRes[0].id;
        else {
            const [res] = await connection.execute(
                "INSERT INTO tb_establecimientos (nombre, rbd, direccion, comuna, email) VALUES ('Colegio Demo Full', '99999', 'Av. Demo 123', 'Santiago', 'demo@colegio.com')"
            );
            estId = res.insertId;

            // Config
            await connection.execute(
                "INSERT INTO tb_configuracion_establecimiento (establecimiento_id, color_primario, nota_aprobacion, chat_habilitado) VALUES (?, '#1976d2', 4.0, 1)",
                [estId]
            );

            // Periodo
            await connection.execute(`
                INSERT INTO tb_periodos_academicos (
                    establecimiento_id, anio, nombre, fecha_inicio, fecha_fin, 
                    trimestre_1_inicio, trimestre_1_fin,
                    trimestre_2_inicio, trimestre_2_fin,
                    trimestre_3_inicio, trimestre_3_fin,
                    activo
                ) VALUES (?, ?, ?, '2026-03-01', '2026-12-31',
                    '2026-03-01', '2026-05-31',
                    '2026-06-01', '2026-09-30',
                    '2026-10-01', '2026-12-31',
                    1)
            `, [estId, ANIO_ACADEMICO, `Año ${ANIO_ACADEMICO}`]);
        }

        // Tipos Eval
        // Check if types exist for this establishment
        const [teRes] = await connection.execute("SELECT id FROM tb_tipos_evaluacion WHERE establecimiento_id = ?", [estId]);
        let tipoEvalIds = teRes.map(r => r.id);
        if (tipoEvalIds.length === 0) {
            await connection.execute(
                "INSERT INTO tb_tipos_evaluacion (establecimiento_id, nombre, abreviatura, ponderacion_default, es_sumativa, activo) VALUES (?, 'Prueba', 'PRU', 30, 1, 1), (?, 'Trabajo', 'TRB', 20, 1, 1), (?, 'Control', 'CTR', 15, 1, 1)",
                [estId, estId, estId]
            );
            const [teResNew] = await connection.execute("SELECT id FROM tb_tipos_evaluacion WHERE establecimiento_id = ?", [estId]);
            tipoEvalIds = teResNew.map(r => r.id);
        }


        // 2. Usuarios
        async function crearUsuario(email, tipo, rut, nombres, apellidos) {
            const [uRes] = await connection.execute("SELECT id FROM tb_usuarios WHERE email = ?", [email]);
            let uid;
            if (uRes.length > 0) {
                uid = uRes[0].id;
                await connection.execute("UPDATE tb_usuarios SET password_hash = ? WHERE id = ?", [passwordHash, uid]);
            } else {
                const [res] = await connection.execute(
                    "INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo) VALUES (?, ?, ?, 1)",
                    [email, passwordHash, tipo]
                );
                uid = res.insertId;
            }
            return uid;
        }

        console.log('Creando usuarios...');
        const adminUid = await crearUsuario(EMAILS.ADMIN, 'administrador', '11.111.111-1', 'Admin', 'Demo');
        const docUid = await crearUsuario(EMAILS.DOCENTE, 'docente', '22.222.222-2', 'Docente', 'Demo');
        const apoUid = await crearUsuario(EMAILS.APODERADO, 'apoderado', '33.333.333-3', 'Apoderado', 'Demo');

        // Perfiles
        async function vincularPerfil(table, uid, rut, nombres, apellidos, extra = {}) {
            const [pRes] = await connection.execute(`SELECT id FROM ${table} WHERE usuario_id = ?`, [uid]);
            let pid;
            if (pRes.length > 0) pid = pRes[0].id;
            else {
                let fields = 'usuario_id, rut, nombres, apellidos';
                let values = '?, ?, ?, ?';
                let params = [uid, rut, nombres, apellidos];

                if (extra.field) {
                    fields += `, ${extra.field}`;
                    values += `, ?`;
                    params.push(extra.value);
                }

                const [res] = await connection.execute(`INSERT INTO ${table} (${fields}) VALUES (${values})`, params);
                pid = res.insertId;
            }
            return pid;
        }

        const adminId = await vincularPerfil('tb_administradores', adminUid, '11.111.111-1', 'Admin', 'Demo');
        const docId = await vincularPerfil('tb_docentes', docUid, '22.222.222-2', 'Docente', 'Demo', { field: 'especialidad', value: 'General' });
        const apoId = await vincularPerfil('tb_apoderados', apoUid, '33.333.333-3', 'Apoderado', 'Demo');

        // Vincular a Establecimiento
        await connection.execute("INSERT IGNORE INTO tb_administrador_establecimiento (administrador_id, establecimiento_id, cargo, fecha_asignacion) VALUES (?, ?, 'Director', CURDATE())", [adminId, estId]);
        await connection.execute("INSERT IGNORE INTO tb_docente_establecimiento (docente_id, establecimiento_id, cargo, fecha_ingreso) VALUES (?, ?, 'Titular', CURDATE())", [docId, estId]);
        await connection.execute("INSERT IGNORE INTO tb_apoderado_establecimiento (apoderado_id, establecimiento_id, fecha_registro) VALUES (?, ?, CURDATE())", [apoId, estId]);


        // 3. Cursos
        console.log('Creando Cursos...');
        const cursosList = ['1° Básico A', '2° Básico A', '3° Básico A', '4° Básico A'];
        const cursoIds = [];

        for (const nombre of cursosList) {
            const [cRes] = await connection.execute("SELECT id FROM tb_cursos WHERE establecimiento_id = ? AND nombre = ?", [estId, nombre]);
            let cid;
            if (cRes.length > 0) cid = cRes[0].id;
            else {
                const [res] = await connection.execute(
                    "INSERT INTO tb_cursos (establecimiento_id, nombre, codigo, nivel, anio_academico, letra) VALUES (?, ?, ?, 'basica', ?, ?)",
                    [estId, nombre, nombre.substring(0, 5), ANIO_ACADEMICO, nombre.slice(-1)]
                );
                cid = res.insertId;
            }
            cursoIds.push(cid);
        }

        // 4. Asignaturas y Asignaciones
        console.log('Creando Asignaturas...');
        const asignaturasNames = ['Lenguaje', 'Matemática', 'Historia', 'Ciencias', 'Inglés', 'Artes', 'Ed. Física', 'Tecnología'];
        const asignaturasMap = []; // {cursoId, asigId}

        for (const asigName of asignaturasNames) {
            // Asignatura global en establecimiento? O por curso? 
            // Modelo usual: Asignatura es catálogo, asignación vincula. 
            // Pero en poblar_datos_demo.cjs, insertaban tb_asignaturas sin curso_id, solo est_id. 
            // Y luego tb_asignaciones vinculaba docente, curso y asignatura.

            const [aRes] = await connection.execute("SELECT id FROM tb_asignaturas WHERE establecimiento_id = ? AND nombre = ?", [estId, asigName]);
            let aid;
            if (aRes.length > 0) aid = aRes[0].id;
            else {
                const [res] = await connection.execute("INSERT INTO tb_asignaturas (establecimiento_id, nombre, codigo, nivel) VALUES (?, ?, ?, 'basica')", [estId, asigName, asigName.substring(0, 3).toUpperCase()]);
                aid = res.insertId;
            }

            // Asignar a todos los cursos y al docente
            for (const cid of cursoIds) {
                await connection.execute(
                    "INSERT IGNORE INTO tb_asignaciones (establecimiento_id, docente_id, curso_id, asignatura_id, anio_academico) VALUES (?, ?, ?, ?, ?)",
                    [estId, docId, cid, aid, ANIO_ACADEMICO]
                );
                asignaturasMap.push({ cursoId: cid, asigId: aid });
            }
        }

        // 5. Alumnos (40)
        console.log('Creando Alumnos...');
        const alumnosIds = [];
        const alumnosPorCurso = {}; // cid -> [alid]

        let count = 1;
        for (const cid of cursoIds) {
            alumnosPorCurso[cid] = [];
            for (let i = 0; i < 10; i++) {
                const rut = `${count}0.000.000-${count}`;
                const [alRes] = await connection.execute("SELECT id FROM tb_alumnos WHERE rut = ?", [rut]);
                let alid;
                if (alRes.length > 0) alid = alRes[0].id;
                else {
                    const [res] = await connection.execute(
                        "INSERT INTO tb_alumnos (rut, nombres, apellidos, fecha_nacimiento, direccion) VALUES (?, ?, ?, '2015-01-01', 'Calle Demo')",
                        [rut, `Alumno ${count}`, 'Demo']
                    );
                    alid = res.insertId;
                }

                // Matrícula
                await connection.execute(
                    "INSERT IGNORE INTO tb_alumno_establecimiento (alumno_id, establecimiento_id, curso_id, anio_academico, fecha_ingreso) VALUES (?, ?, ?, ?, CURDATE())",
                    [alid, estId, cid, ANIO_ACADEMICO]
                );

                alumnosIds.push(alid);
                alumnosPorCurso[cid].push(alid);
                count++;
            }
        }

        // 6. Vincular Apoderado a 2 alumnos
        console.log('Vinculando Apoderado...');
        if (alumnosIds.length >= 11) { // Al menos un alumno en curso 1 (0-9) y curso 2 (10-19)
            const al1 = alumnosIds[0];
            const al2 = alumnosIds[10];
            await connection.execute("INSERT IGNORE INTO tb_apoderado_alumno (apoderado_id, alumno_id, parentesco, es_apoderado_titular) VALUES (?, ?, 'Apoderado', 1)", [apoId, al1]);
            await connection.execute("INSERT IGNORE INTO tb_apoderado_alumno (apoderado_id, alumno_id, parentesco, es_apoderado_titular) VALUES (?, ?, 'Apoderado', 1)", [apoId, al2]);
        }

        // 7. Notas y Asistencia
        console.log('Insertando Notas y Asistencia...');
        const notasValues = [];
        const asisValues = [];

        // Obtener el periodo ID
        const [perRes] = await connection.execute("SELECT id FROM tb_periodos_academicos WHERE establecimiento_id = ? AND anio = ?", [estId, ANIO_ACADEMICO]);
        const periodoId = perRes.length > 0 ? perRes[0].id : 1; // Fallback

        for (const map of asignaturasMap) { // {cursoId, asigId}
            const alumnos = alumnosPorCurso[map.cursoId];
            for (const alid of alumnos) {
                // Notas: 3 trimestres, 8 notas
                for (let tri = 1; tri <= 3; tri++) {
                    for (let n = 1; n <= 8; n++) {
                        const nota = (Math.random() * 3 + 4).toFixed(1);
                        const tipo = tipoEvalIds[n % tipoEvalIds.length];
                        const fecha = `${ANIO_ACADEMICO}-0${2 + tri}-${10 + n}`;
                        // Tabla tb_notas: alumno_id, asignatura_id, periodo_academico_id, docente_id, valor, tipo_evaluacion_id, fecha
                        // Revisar orden columnas en INSERT abajo
                        notasValues.push([alid, map.asigId, periodoId, docId, nota, tipo, fecha]);
                    }
                }
            }
        }

        // Asistencia
        for (const cid of cursoIds) {
            const alumnos = alumnosPorCurso[cid];
            for (let mes = 3; mes <= 12; mes++) {
                for (let dia = 1; dia <= 20; dia++) {
                    const fecha = `${ANIO_ACADEMICO}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    for (const alid of alumnos) {
                        const estado = Math.random() > 0.1 ? 'presente' : 'ausente';
                        asisValues.push([alid, cid, fecha, estado]);
                    }
                }
            }
        }

        // Bulk Inserts
        if (notasValues.length > 0) {
            const chunkSize = 5000;
            for (let i = 0; i < notasValues.length; i += chunkSize) {
                const chunk = notasValues.slice(i, i + chunkSize);
                // Asumo columnas: alumno_id o estudiante_id? tb_notas tenía alumno_id?
                // En el script viejo usaban TRUNCATE tb_notas. No insertaban.
                // Asumiré alumno_id.
                // Si falla, probaré estudiante_id.
                // Schema más probable: id, alumno_id, asignatura_id, ...

                // Intento query generica. Si falla en server, leo el error y corrijo.
                // Es arriesgado.
                // Mejor intento LEER las columnas de tb_notas antes.
                const [cols] = await connection.execute("SHOW COLUMNS FROM tb_notas");
                const colNames = cols.map(c => c.Field);
                let colAlumno = colNames.includes('alumno_id') ? 'alumno_id' : 'estudiante_id';
                let colNota = colNames.includes('nota') ? 'nota' : (colNames.includes('valor') ? 'valor' : 'calificacion');
                let colFecha = colNames.includes('fecha') ? 'fecha' : 'fecha_calificacion';

                console.log(`Columnas detectadas tb_notas: ${colAlumno}, ${colNota}, ${colFecha}`);

                const sql = `INSERT INTO tb_notas (${colAlumno}, asignatura_id, periodo_academico_id, docente_id, ${colNota}, tipo_evaluacion_id, ${colFecha}) VALUES ?`;
                await connection.query(sql, [chunk]);
            }
        }

        if (asisValues.length > 0) {
            const chunkSize = 5000;
            for (let i = 0; i < asisValues.length; i += chunkSize) {
                const chunk = asisValues.slice(i, i + chunkSize);
                // Detectar columnas asistencia
                const [cols] = await connection.execute("SHOW COLUMNS FROM tb_asistencia");
                const colNames = cols.map(c => c.Field);
                let colAlumno = colNames.includes('alumno_id') ? 'alumno_id' : 'estudiante_id';

                const sql = `INSERT IGNORE INTO tb_asistencia (${colAlumno}, curso_id, fecha, estado) VALUES ?`;
                await connection.query(sql, [chunk]);
            }
        }

        console.log('✅ Población Completa.');
        console.log('Credenciales: 123456');

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        if (connection) await connection.end();
    }
}

poblarDatos();
