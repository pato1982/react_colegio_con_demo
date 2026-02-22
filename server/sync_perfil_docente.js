const mysql = require('mysql2/promise');

async function sincronizarPerfilDocentes() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- ACTUALIZANDO PERFIL DE ESPECIALIDADES (MODAL ADMIN) ---');

        // 1. Obtener todas las asignaturas
        const [asignaturas] = await connection.execute('SELECT id, nombre FROM tb_asignaturas');

        // 2. Obtener todos los docentes
        const [docentes] = await connection.execute('SELECT id, nombres, email FROM tb_docentes');

        const docenteMap = {};
        docentes.forEach(d => {
            if (d.email === 'mjvalderramap@gmail.com') docenteMap['MAT_FIS'] = d.id;
            if (d.email === 'abello@demo.cl') docenteMap['LEN_ING'] = d.id;
            if (d.email === 'cbravo@demo.cl') docenteMap['EFI'] = d.id;
            if (d.email === 'gmistral@demo.cl') docenteMap['HIS'] = d.id;
            if (d.email === 'pneruda@demo.cl') docenteMap['ART_MUS_TEC_REL_ORI'] = d.id;
            if (d.email === 'vparra@demo.cl') docenteMap['CIE_QUI_BIO'] = d.id;
        });

        console.log('Poblando tb_docente_asignatura...');

        for (const asig of asignaturas) {
            let docenteId = null;
            const nom = asig.nombre.toLowerCase();

            if (nom.includes('matemática') || nom.includes('física')) docenteId = docenteMap['MAT_FIS'];
            else if (nom.includes('lenguaje') || nom.includes('inglés')) docenteId = docenteMap['LEN_ING'];
            else if (nom.includes('historia')) docenteId = docenteMap['HIS'];
            else if (nom.includes('educación física')) docenteId = docenteMap['EFI'];
            else if (nom.includes('artes') || nom.includes('música') || nom.includes('tecnología') || nom.includes('religión') || nom.includes('orientación')) docenteId = docenteMap['ART_MUS_TEC_REL_ORI'];
            else if (nom.includes('ciencias') || nom.includes('química') || nom.includes('biología')) docenteId = docenteMap['CIE_QUI_BIO'];

            if (docenteId) {
                // Verificar si ya existe el vínculo para evitar duplicados
                const [exists] = await connection.execute(
                    'SELECT id FROM tb_docente_asignatura WHERE docente_id = ? AND asignatura_id = ?',
                    [docenteId, asig.id]
                );

                if (exists.length === 0) {
                    await connection.execute(
                        `INSERT INTO tb_docente_asignatura (docente_id, asignatura_id, es_especialidad_principal, activo) 
                         VALUES (?, ?, 1, 1)`,
                        [docenteId, asig.id]
                    );
                }
            }
        }

        console.log('\n=============================================');
        console.log('¡PERFILES ACTUALIZADOS EXITOSAMENTE!');
        console.log('Ahora el administrador verá las materias marcadas en el modal.');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR AL SINCRONIZAR PERFILES:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

sincronizarPerfilDocentes();
