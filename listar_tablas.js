import mysql from 'mysql2/promise';
import fs from 'fs';

async function listarTablas() {
    const connection = await mysql.createConnection({
        host: '190.114.252.5',
        port: 3306,
        user: 'root',
        password: 'vpsroot123',
        database: 'portal_estudiantil'
    });

    console.log('===========================================');
    console.log('LISTADO DE TABLAS - portal_estudiantil');
    console.log('===========================================\n');
    console.log('✓ Conexión exitosa a la base de datos\n');

    const [rows] = await connection.execute('SHOW TABLES');

    const tablas = [];
    rows.forEach((row, index) => {
        const tabla = Object.values(row)[0];
        tablas.push(tabla);
        console.log(`${index + 1}. ${tabla}`);
    });

    console.log('\n===========================================');
    console.log(`TOTAL DE TABLAS: ${tablas.length}`);
    console.log('===========================================\n');

    // Guardar en archivo JSON
    fs.writeFileSync('tablas_bd.json', JSON.stringify(tablas, null, 2));
    console.log('✓ Lista guardada en: tablas_bd.json\n');

    // Tablas documentadas en el archivo SQL
    const tablasDocumentadas = [
        'tb_administrador_establecimiento',
        'tb_administradores',
        'tb_alumno_establecimiento',
        'tb_alumnos',
        'tb_apoderado_alumno',
        'tb_apoderado_establecimiento',
        'tb_apoderados',
        'tb_asignaciones',
        'tb_asignaturas',
        'tb_chat_conversaciones',
        'tb_chat_mensajes',
        'tb_claves_provisorias',
        'tb_codigos_validacion',
        'tb_comunicado_curso',
        'tb_comunicado_leido',
        'tb_comunicados',
        'tb_configuracion_establecimiento',
        'tb_cursos',
        'tb_docente_asignatura',
        'tb_docente_establecimiento',
        'tb_docentes',
        'tb_documentos_matricula',
        'tb_documentos_requeridos',
        'tb_establecimientos',
        'tb_facturas',
        'tb_historial_suscripciones',
        'tb_horarios',
        'tb_intentos_login_fallidos',
        'tb_intentos_registro_fallidos_admin',
        'tb_intentos_registro_fallidos_docentes',
        'tb_log_actividades',
        'tb_matriculas',
        'tb_notas',
        'tb_notificaciones',
        'tb_observaciones_alumno',
        'tb_pagos',
        'tb_periodos_academicos',
        'tb_pagos_matricula',
        'tb_periodos_matricula',
        'tb_plan_funcionalidades',
        'tb_planes',
        'tb_preregistro_administradores',
        'tb_preregistro_docentes',
        'tb_preregistro_relaciones',
        'tb_promociones',
        'tb_sesiones',
        'tb_suscripcion_promocion',
        'tb_suscripciones',
        'tb_tipos_evaluacion',
        'tb_usuarios'
    ];

    // Encontrar tablas faltantes
    const tablasFaltantes = tablas.filter(t => !tablasDocumentadas.includes(t));

    if (tablasFaltantes.length > 0) {
        console.log('⚠️  TABLAS FALTANTES EN EL ARCHIVO SQL:');
        console.log('===========================================');
        tablasFaltantes.forEach((tabla, index) => {
            console.log(`${index + 1}. ${tabla}`);
        });
        console.log(`\nTotal faltantes: ${tablasFaltantes.length}\n`);

        // Guardar tablas faltantes
        fs.writeFileSync('tablas_faltantes.json', JSON.stringify(tablasFaltantes, null, 2));
        console.log('✓ Tablas faltantes guardadas en: tablas_faltantes.json\n');
    } else {
        console.log('✓ Todas las tablas están documentadas\n');
    }

    await connection.end();
}

listarTablas().catch(console.error);
