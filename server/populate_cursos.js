const mysql = require('mysql2/promise');

async function populateCourses() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        const estId = 1; // ID del establecimiento creado anteriormente
        const anioActual = 2026;

        console.log('--- POBLANDO CURSOS (1ero Básico a 4to Medio) ---');

        const cursos = [
            // Básica
            { nombre: '1ero Básico A', nivel: 'basica', grado: 1, letra: 'A' },
            { nombre: '2do Básico A', nivel: 'basica', grado: 2, letra: 'A' },
            { nombre: '3ero Básico A', nivel: 'basica', grado: 3, letra: 'A' },
            { nombre: '4to Básico A', nivel: 'basica', grado: 4, letra: 'A' },
            { nombre: '5to Básico A', nivel: 'basica', grado: 5, letra: 'A' },
            { nombre: '6to Básico A', nivel: 'basica', grado: 6, letra: 'A' },
            { nombre: '7mo Básico A', nivel: 'basica', grado: 7, letra: 'A' },
            { nombre: '8vo Básico A', nivel: 'basica', grado: 8, letra: 'A' },
            // Media
            { nombre: '1ero Medio A', nivel: 'media', grado: 1, letra: 'A' },
            { nombre: '2do Medio A', nivel: 'media', grado: 2, letra: 'A' },
            { nombre: '3ero Medio A', nivel: 'media', grado: 3, letra: 'A' },
            { nombre: '4to Medio A', nivel: 'media', grado: 4, letra: 'A' }
        ];

        for (const c of cursos) {
            const codigo = `${c.nivel[0].toUpperCase()}${c.grado}${c.letra}-${anioActual}`;

            console.log(`Insertando ${c.nombre} (Código: ${codigo})...`);

            await connection.execute(
                `INSERT INTO tb_cursos (
                    establecimiento_id, nombre, codigo, nivel, grado, 
                    letra, jornada, capacidad_maxima, sala, anio_academico, activo
                ) VALUES (?, ?, ?, ?, ?, ?, 'completa', 40, ?, ?, 1)`,
                [
                    estId,
                    c.nombre,
                    codigo,
                    c.nivel,
                    c.grado,
                    c.letra,
                    `Sala ${c.grado}${c.letra}`,
                    anioActual
                ]
            );
        }

        console.log('\n=============================================');
        console.log(`¡EXITO! Se han creado ${cursos.length} cursos.`);
        console.log('Nivel: 1ero Básico a 4to Medio (Letra A)');
        console.log('Año Académico: 2026');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR AL POBLAR CURSOS:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

populateCourses();
