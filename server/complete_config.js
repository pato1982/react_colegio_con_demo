const mysql = require('mysql2/promise');

async function completarConfiguracionSistema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- COMPLETANDO CONFIGURACIÓN MAESTRA DEL SISTEMA ---');

        const estId = 1;
        const anioActual = 2026;

        // 1. Configuración del Establecimiento (Solucionado posibles conflictos de inserción previa)
        console.log('Configurando parámetros del colegio (Notas, Colores, Chat)...');
        await connection.execute(`
            INSERT INTO tb_configuracion_establecimiento (
                establecimiento_id, color_primario, color_secundario, 
                nota_minima, nota_maxima, nota_aprobacion, 
                decimales_notas, permite_nota_pendiente, chat_habilitado
            ) VALUES (?, '#1976d2', '#424242', 1.0, 7.0, 4.0, 1, 1, 1)
            ON DUPLICATE KEY UPDATE color_primario='#1976d2', nota_aprobacion=4.0`,
            [estId]
        );

        // 2. Definir Periodos Académicos (Basado en la estructura REAL de la tabla)
        console.log('Definiendo periodos académicos (Estructura Anual)...');
        // La tabla tb_periodos_academicos usa 'anio' en lugar de 'anio_academico' 
        // y tiene columnas específicas por trimestre.
        await connection.execute(`
            INSERT INTO tb_periodos_academicos (
                establecimiento_id, anio, nombre, 
                fecha_inicio, fecha_fin, 
                trimestre_1_inicio, trimestre_1_fin,
                trimestre_2_inicio, trimestre_2_fin,
                trimestre_3_inicio, trimestre_3_fin,
                activo, cerrado
            ) VALUES (?, ?, 'Año Académico 2026', 
                '2026-03-01', '2026-12-15',
                '2026-03-01', '2026-05-31',
                '2026-06-01', '2026-08-31',
                '2026-09-01', '2026-12-15',
                1, 0
            )`,
            [estId, anioActual]
        );

        // 3. Tipos de Evaluación (Necesario para que el docente ponga notas)
        console.log('Creando tipos de evaluación (Pruebas, Trabajos, Controles)...');
        const tiposEval = [
            { nombre: 'Prueba Sumativa', abrev: 'PRU', ponderacion: 40 },
            { nombre: 'Control Parcial', abrev: 'CTR', ponderacion: 20 },
            { nombre: 'Trabajo Práctico', abrev: 'TRA', ponderacion: 20 },
            { nombre: 'Nota de Participación', abrev: 'PAR', ponderacion: 20 }
        ];

        for (const t of tiposEval) {
            await connection.execute(`
                INSERT INTO tb_tipos_evaluacion (
                    establecimiento_id, nombre, abreviatura, 
                    ponderacion_default, es_sumativa, activo
                ) VALUES (?, ?, ?, ?, 1, 1)`,
                [estId, t.nombre, t.abrev, t.ponderacion]
            );
        }

        console.log('\n=============================================');
        console.log('¡SISTEMA CONFIGURADO COMPLETAMENTE!');
        console.log('Configuraciones de Notas: LISTO');
        console.log('Calendario de Trimestres 2026: LISTO');
        console.log('Categorías de Evaluación: LISTO');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR AL COMPLETAR CONFIGURACIÓN:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

completarConfiguracionSistema();
