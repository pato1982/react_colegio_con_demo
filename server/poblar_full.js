require('dotenv').config();
const { pool } = require('./config/database');

const NOMBRES = ["Agustín", "Benjamín", "Vicente", "Martín", "Matías", "Joaquín", "Sofía", "Emilia", "Isidora", "Trinidad", "Florencia", "Maite", "Josefa", "Lucas", "Mateo"];
const APELLIDOS = ["González", "Muñoz", "Rojas", "Díaz", "Pérez", "Soto", "Contreras", "Silva", "Martínez", "Sepúlveda", "Morales", "Rodríguez", "López", "Fuentes", "Hernández"];
const CALLES = ["Calle Falsa", "Av. Principal", "Pasaje Los Quillayes", "El Roble", "San Martín"];

const genRut = () => `${Math.floor(Math.random() * 20000000) + 5000000}-${Math.floor(Math.random() * 9)}`;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const passHash = '$2a$10$X/h.wq.F.e1';

async function poblar() {
    console.log('🌱 POBLANDO BASE DE DATOS (FINAL REAL V2)...');

    const conn = await pool.getConnection();
    try {
        const [cursos] = await conn.query('SELECT id, nombre FROM tb_cursos');

        for (const curso of cursos) {
            console.log(`   > Curso: ${curso.nombre}`);
            for (let i = 0; i < 15; i++) {
                const rutAp = genRut(); const nomAp = pick(NOMBRES); const apeAp = pick(APELLIDOS);
                const emailAp = `${nomAp}.${apeAp}.${Math.random().toString(36).substring(7)}@demo.com`;

                try {
                    // 1. APODERADO
                    const [resUserAp] = await conn.query(`INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo) VALUES (?, ?, 'apoderado', 1)`, [emailAp, passHash]);
                    const [resAp] = await conn.query(`INSERT INTO tb_apoderados (usuario_id, rut, nombres, apellidos, email, telefono, direccion) VALUES (?, ?, ?, ?, ?, ?, ?)`, [resUserAp.insertId, rutAp, nomAp, apeAp, emailAp, '+56912345678', `${pick(CALLES)} 123`]);
                    const idAp = resAp.insertId;

                    // 2. ALUMNO (Sin curso_actual_id)
                    const rutAl = genRut(); const nomAl = pick(NOMBRES); const apeAl = pick(APELLIDOS);
                    const emailAl = `${nomAl}.${apeAl}.${Math.random().toString(36).substring(7)}@student.com`;
                    let idAl = null;

                    try {
                        const [resAl] = await conn.query(`INSERT INTO tb_alumnos (rut, nombres, apellidos, fecha_nacimiento, sexo, direccion, comuna, ciudad, email) VALUES (?, ?, ?, '2016-01-01', 'Masculino', ?, 'Santiago', 'Santiago', ?)`, [rutAl, nomAl, apeAl, 'Misma', emailAl]);
                        idAl = resAl.insertId;
                    } catch (eAl) {
                        const [resUserAl] = await conn.query(`INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo) VALUES (?, ?, 'apoderado', 1)`, [emailAl, passHash]);
                        const [resAl2] = await conn.query(`INSERT INTO tb_alumnos (usuario_id, rut, nombres, apellidos, fecha_nacimiento, sexo, direccion, comuna, ciudad, email) VALUES (?, ?, ?, ?, '2016-01-01', 'Masculino', ?, 'Santiago', 'Santiago', ?)`, [resUserAl.insertId, rutAl, nomAl, apeAl, 'Misma', emailAl]);
                        idAl = resAl2.insertId;
                    }

                    // 3. MATRICULA
                    if (idAl && idAp) {
                        const numMat = `2026-${curso.id}-${i}`;
                        await conn.query(`INSERT INTO tb_matriculas (establecimiento_id, alumno_id, apoderado_id, curso_asignado_id, anio_academico, numero_matricula, tipo_matricula, estado, nombres_alumno, apellidos_alumno, rut_alumno, fecha_nacimiento_alumno, sexo_alumno, nacionalidad_alumno, rut_apoderado, nombres_apoderado, apellidos_apoderado, email_apoderado, telefono_apoderado, parentezco, fecha_creacion, activo) VALUES (1, ?, ?, ?, 2026, ?, 'nuevo', 'aprobada', ?, ?, ?, '2016-01-01', 'Masculino', 'Chilena', ?, ?, ?, ?, '+56900000000', 'Padre', NOW(), 1)`, [idAl, idAp, curso.id, numMat, nomAl, apeAl, rutAl, rutAp, nomAp, apeAp, emailAp]);
                    }
                } catch (err) { console.error('     x Error ficha:', err.message); }
            }
        }
        console.log('✅ POBLADO COMPLETADO.');
        process.exit(0);
    } catch (e) { console.error('Error', e); process.exit(1); } finally { conn.release(); }
}
poblar();
