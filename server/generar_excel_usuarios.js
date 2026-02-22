const mysql = require('mysql2/promise');
const XLSX = require('xlsx');
const fs = require('fs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || '170.239.87.97',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'EXwCVq87aj0F3f1',
    database: process.env.DB_NAME || 'portal_estudiantil',
    port: process.env.DB_PORT || 3306
};

async function generarReporteCredenciales() {
    let connection;
    try {
        console.log('--- GENERANDO REPORTE DE CREDENCIALES ---');
        connection = await mysql.createConnection(dbConfig);

        // 1. Obtener Administradores
        const [admins] = await connection.execute(`
            SELECT 
                'ADMINISTRADOR' as Rol,
                a.nombres, a.apellidos, a.rut,
                u.email, 'Pmmj8282.' as password_generica
            FROM tb_administradores a
            JOIN tb_usuarios u ON a.usuario_id = u.id
            WHERE u.activo = 1
        `);

        // 2. Obtener Docentes
        const [docentes] = await connection.execute(`
            SELECT 
                'DOCENTE' as Rol,
                d.nombres, d.apellidos, d.rut,
                u.email, 'Pmmj8282.' as password_generica
            FROM tb_docentes d
            JOIN tb_usuarios u ON d.usuario_id = u.id
            WHERE u.activo = 1
        `);

        // 3. Obtener Apoderados (Familias)
        const [apoderados] = await connection.execute(`
            SELECT 
                'APODERADO' as Rol,
                a.nombres, a.apellidos, a.rut,
                u.email, 'Pmmj8282.' as password_generica
            FROM tb_apoderados a
            JOIN tb_usuarios u ON a.usuario_id = u.id
            WHERE u.activo = 1
        `);

        // 4. Consolidar Datos
        const data = [...admins, ...docentes, ...apoderados];
        console.log(`Total usuarios encontrados: ${data.length}`);

        // 5. Crear Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Ajustar ancho de columnas
        const wscols = [
            { wch: 15 }, // Rol
            { wch: 20 }, // Nombres
            { wch: 20 }, // Apellidos
            { wch: 15 }, // RUT
            { wch: 30 }, // Email
            { wch: 15 }  // Pasword
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Credenciales");

        const fileName = 'Credenciales_Usuarios_2026.xlsx';
        XLSX.writeFile(wb, fileName);

        console.log(`✅ Archivo generado exitosamente: ${fileName}`);

    } catch (error) {
        console.error('❌ ERROR:', error);
    } finally {
        if (connection) await connection.end();
    }
}

generarReporteCredenciales();
