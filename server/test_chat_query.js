const { pool } = require('./config/database');

async function testQuery() {
    try {
        // Data for testing (from debug script output)
        const usuario_id = 10; // apoderado1@demo.cl
        const establecimiento_id = 1;
        const alumno_id = 1;

        console.log(`Testing query for Apoderado User ID: ${usuario_id}, Estab: ${establecimiento_id}, Alumno: ${alumno_id}`);

        const queryUnificada = `
            (
                SELECT 
                    u.id AS usuario_id,
                    d.id AS entidad_id,
                    CONCAT(d.nombres, ' ', d.apellidos) AS nombre_completo,
                    d.foto_url,
                    'docente' AS tipo,
                    0 AS es_admin,
                    GROUP_CONCAT(DISTINCT tas.nombre SEPARATOR ', ') as asignaturas,
                    (SELECT COUNT(*) FROM tb_chat_mensajes m 
                     JOIN tb_chat_conversaciones c ON m.conversacion_id = c.id 
                     WHERE c.establecimiento_id = ? AND ((c.usuario1_id = ? AND c.usuario2_id = u.id) OR (c.usuario2_id = ? AND c.usuario1_id = u.id)) 
                     AND m.remitente_id = u.id AND m.leido = 0 AND m.eliminado_destinatario = 0) AS mensajes_no_leidos
                FROM tb_alumno_establecimiento ae
                JOIN tb_apoderado_alumno aa ON ae.alumno_id = aa.alumno_id
                JOIN tb_apoderados ap ON aa.apoderado_id = ap.id
                JOIN tb_asignaciones asig ON ae.curso_id = asig.curso_id AND asig.activo = 1
                JOIN tb_asignaturas tas ON asig.asignatura_id = tas.id
                JOIN tb_docentes d ON asig.docente_id = d.id AND d.activo = 1
                JOIN tb_usuarios u ON d.usuario_id = u.id AND u.activo = 1
                WHERE ap.usuario_id = ? AND ae.establecimiento_id = ? AND ae.activo = 1
                AND ae.alumno_id = ?
                GROUP BY u.id, d.id, d.nombres, d.apellidos, d.foto_url
            )
            UNION
            (
                SELECT 
                    u.id AS usuario_id,
                    a.id AS entidad_id,
                    CONCAT(a.nombres, ' ', a.apellidos) AS nombre_completo,
                    a.foto_url,
                    'administrador' AS tipo,
                    1 AS es_admin,
                    'Administración' as asignaturas,
                    (SELECT COUNT(*) FROM tb_chat_mensajes m 
                     JOIN tb_chat_conversaciones c ON m.conversacion_id = c.id 
                     WHERE c.establecimiento_id = ? AND ((c.usuario1_id = ? AND c.usuario2_id = u.id) OR (c.usuario2_id = ? AND c.usuario1_id = u.id)) 
                     AND m.remitente_id = u.id AND m.leido = 0 AND m.eliminado_destinatario = 0) AS mensajes_no_leidos
                FROM tb_administradores a
                JOIN tb_administrador_establecimiento ae ON a.id = ae.administrador_id AND ae.activo = 1
                JOIN tb_usuarios u ON a.usuario_id = u.id AND u.activo = 1
                WHERE ae.establecimiento_id = ?
            )
            ORDER BY es_admin DESC, nombre_completo ASC
        `;

        const parametros = [
            // Parte 1
            establecimiento_id, usuario_id, usuario_id,
            usuario_id, establecimiento_id, alumno_id,
            // Parte 2
            establecimiento_id, usuario_id, usuario_id, establecimiento_id
        ];

        const [results] = await pool.query(queryUnificada, parametros);
        console.log(`Results: ${results.length} contacts found`);
        results.forEach(r => console.log(`- ${r.nombre_completo} (${r.tipo})`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testQuery();
