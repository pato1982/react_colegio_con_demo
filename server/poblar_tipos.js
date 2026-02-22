const mysql = require('mysql2/promise');
require('dotenv').config();

const TIPOS = [
    { nombre: 'Prueba Escrita', peso: 30 },
    { nombre: 'Trabajo Práctico', peso: 20 },
    { nombre: 'Disertación', peso: 20 },
    { nombre: 'Control', peso: 15 },
    { nombre: 'Autoevaluación', peso: 10 },
    { nombre: 'Tarea', peso: 5 }
];

async function poblarTipos() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '170.239.87.97',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'EXwCVq87aj0F3f1',
            database: process.env.DB_NAME || 'portal_estudiantil',
            port: process.env.DB_PORT || 3306
        });

        console.log('Insertando tipos de evaluación...');

        // Limpiar primero para evitar duplicados si hay basura parcial
        // await connection.execute('TRUNCATE TABLE tb_tipos_evaluacion'); // Mejor no truncate por FKs, solo insert ignore

        for (const tipo of TIPOS) {
            // Verificar si existe por nombre
            const [existe] = await connection.execute('SELECT id FROM tb_tipos_evaluacion WHERE nombre = ?', [tipo.nombre]);

            if (existe.length === 0) {
                await connection.execute(
                    'INSERT INTO tb_tipos_evaluacion (nombre, establecimiento_id, activo) VALUES (?, 1, 1)',
                    [tipo.nombre]
                );
                console.log(`+ Insertado: ${tipo.nombre}`);
            } else {
                console.log(`= Ya existe: ${tipo.nombre}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

poblarTipos();
