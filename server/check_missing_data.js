const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '170.239.87.97',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'EXwCVq87aj0F3f1',
    database: process.env.DB_NAME || 'portal_estudiantil',
    port: process.env.DB_PORT || 3306
};

async function checkMissingAreas() {
    let connection;
    try {
        console.log('--- ANÁLISIS DE ÁREAS PENDIENTES ---');
        connection = await mysql.createConnection(dbConfig);

        const queries = [
            { area: 'Matrículas Formales', query: 'SELECT COUNT(*) as c FROM tb_matriculas' },
            { area: 'Observaciones/Anotaciones', query: 'SELECT COUNT(*) as c FROM tb_observaciones_alumno' },
            { area: 'Chat: Conversaciones', query: 'SELECT COUNT(*) as c FROM tb_chat_conversaciones' },
            { area: 'Chat: Mensajes', query: 'SELECT COUNT(*) as c FROM tb_chat_mensajes' },
            { area: 'Notificaciones', query: 'SELECT COUNT(*) as c FROM tb_notificaciones' },
            { area: 'Pagos', query: 'SELECT COUNT(*) as c FROM tb_pagos_matricula' },
            { area: 'Documentos Matrícula', query: 'SELECT COUNT(*) as c FROM tb_documentos_matricula' }
        ];

        const results = [];
        for (const q of queries) {
            try {
                const [rows] = await connection.execute(q.query);
                results.push({ Área: q.area, Registros: rows[0].c, Estado: rows[0].c > 0 ? '✅ Poblado' : '⚠️ VACÍO' });
            } catch (e) {
                results.push({ Área: q.area, Registros: 'ERROR', Estado: 'Tabla no existe o error' });
            }
        }

        console.table(results);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkMissingAreas();
