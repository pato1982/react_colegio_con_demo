const mysql = require('mysql2/promise');

async function populateAsignaturas() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        const estId = 1;

        console.log('--- POBLANDO ASIGNATURAS (1ero Básico a 4to Medio) ---');

        const asignaturas = [
            { nombre: 'Lenguaje y Comunicación', codigo: 'LEN', color: '#448AFF', nivel: 'basica,media' },
            { nombre: 'Matemática', codigo: 'MAT', color: '#F44336', nivel: 'basica,media' },
            { nombre: 'Inglés', codigo: 'ING', color: '#9C27B0', nivel: 'basica,media' },
            { nombre: 'Ciencias Naturales', codigo: 'CNA', color: '#4CAF50', nivel: 'basica' },
            { nombre: 'Biología', codigo: 'BIO', color: '#8BC34A', nivel: 'media' },
            { nombre: 'Química', codigo: 'QUI', color: '#FF9800', nivel: 'media' },
            { nombre: 'Física', codigo: 'FIS', color: '#00BCD4', nivel: 'media' },
            { nombre: 'Historia, Geografía y C.S.', codigo: 'HIS', color: '#795548', nivel: 'basica,media' },
            { nombre: 'Educación Física y Salud', codigo: 'EFI', color: '#FF5722', nivel: 'basica,media' },
            { nombre: 'Artes Visuales', codigo: 'ART', color: '#E91E63', nivel: 'basica,media' },
            { nombre: 'Música', codigo: 'MUS', color: '#673AB7', nivel: 'basica,media' },
            { nombre: 'Tecnología', codigo: 'TEC', color: '#607D8B', nivel: 'basica,media' },
            { nombre: 'Orientación', codigo: 'ORI', color: '#FFC107', nivel: 'basica,media' },
            { nombre: 'Religión', codigo: 'REL', color: '#009688', nivel: 'basica,media' },
            { nombre: 'Filosofía', codigo: 'FIL', color: '#3F51B5', nivel: 'media' },
            { nombre: 'Educación Ciudadana', codigo: 'ECI', color: '#CDDC39', nivel: 'media' }
        ];

        for (let i = 0; i < asignaturas.length; i++) {
            const a = asignaturas[i];
            console.log(`Insertando asignatura: ${a.nombre}...`);

            await connection.execute(
                `INSERT INTO tb_asignaturas (
                    establecimiento_id, nombre, codigo, nivel, 
                    horas_semanales, es_electivo, es_taller, color, orden, activo
                ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, 1)`,
                [
                    estId,
                    a.nombre,
                    a.codigo,
                    a.nivel,
                    4, // Horas estándar
                    a.color,
                    i + 1 // Orden correlativo
                ]
            );
        }

        console.log('\n=============================================');
        console.log(`¡ÉXITO! Se han creado ${asignaturas.length} asignaturas.`);
        console.log('Se incluyeron materias para Básica y Media.');
        console.log('Inglés configurado según lo solicitado.');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR AL POBLAR ASIGNATURAS:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

populateAsignaturas();
