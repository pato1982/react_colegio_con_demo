const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('--- Iniciando Prueba de Conexión ---');
    console.log('Host: 170.239.87.97');
    console.log('Usuario: root');
    console.log('Base de Datos: portal_estudiantil');

    try {
        const connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('\n✅ ¡Conectado con éxito a la base de datos!');

        const [rows] = await connection.execute('SHOW TABLES');
        console.log(`\n📊 Tienes un total de ${rows.length} tablas en la base de datos "portal_estudiantil".`);

        console.log('\nListado de tablas:');
        rows.forEach((row, index) => {
            console.log(`${index + 1}. ${Object.values(row)[0]}`);
        });

        await connection.end();
        console.log('\n--- Prueba Finalizada ---');
    } catch (error) {
        console.error('\n❌ Error al conectar:');
        console.error(error.message);
        if (error.code === 'ETIMEDOUT') {
            console.log('\nNota: Parece que el puerto 3306 está bloqueado por el firewall o la IP no es accesible directamenta.');
        }
    }
}

testConnection();
