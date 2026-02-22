const mysql = require('mysql2/promise');

async function completarFichasDetalladas() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- COMPLETANDO TODOS LOS CAMPOS DE ALUMNOS Y APODERADOS ---');

        // 1. Obtener todos los alumnos y apoderados creados
        const [alumnos] = await connection.execute('SELECT id, nombres FROM tb_alumnos');
        const [apoderados] = await connection.execute('SELECT id, nombres FROM tb_apoderados');

        console.log(`Llenando fichas para ${alumnos.length} alumnos...`);

        // Actualizar Alumnos con datos de salud y contacto
        for (let i = 0; i < alumnos.length; i++) {
            const aluId = alumnos[i].id;
            await connection.execute(
                `UPDATE tb_alumnos SET 
                    fecha_nacimiento = ?, 
                    sexo = ?, 
                    direccion = ?, 
                    comuna = ?, 
                    ciudad = ?, 
                    alergias = ?, 
                    enfermedades_cronicas = ?, 
                    contacto_emergencia_nombre = ?, 
                    contacto_emergencia_telefono = ?,
                    foto_url = ?
                WHERE id = ?`,
                [
                    `201${9 - i}-05-20`, // Fechas variadas para edades realistas
                    i % 2 === 0 ? 'Femenino' : 'Masculino',
                    'Calle Las Camelias ' + (100 + i),
                    'Santiago',
                    'Santiago',
                    i % 3 === 0 ? 'Polen, Lactosa' : 'Ninguna',
                    i % 4 === 0 ? 'Asma' : 'Ninguna conocida',
                    'Familiar de Emergencia ' + i,
                    '+56 9 1122 3344',
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${aluId}`,
                    aluId
                ]
            );
        }

        console.log(`Llenando fichas para ${apoderados.length} apoderados...`);

        // Actualizar Apoderados con datos laborales y de contacto
        for (let i = 0; i < apoderados.length; i++) {
            const apoId = apoderados[i].id;
            await connection.execute(
                `UPDATE tb_apoderados SET 
                    telefono = ?, 
                    telefono_emergencia = ?, 
                    direccion = ?, 
                    comuna = ?, 
                    ciudad = ?, 
                    ocupacion = ?, 
                    lugar_trabajo = ?,
                    fecha_nacimiento = ?,
                    sexo = ?
                WHERE id = ?`,
                [
                    '+56 9 8877 6655',
                    '+56 2 2233 4455',
                    'Pasaje Los Olivos ' + (50 + i),
                    'Santiago',
                    'Santiago',
                    'Ingeniero / Profesional',
                    'Empresa Nacional de Servicios',
                    '1980-08-12',
                    i % 2 === 0 ? 'Masculino' : 'Femenino',
                    apoId
                ]
            );
        }

        console.log('\n=============================================');
        console.log('¡DATOS ACTUALIZADOS EXITOSAMENTE!');
        console.log('Ahora todos los ítems de la pestaña "Información"');
        console.log('en el portal del apoderado mostrarán datos reales.');
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR AL COMPLETAR DATOS:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

completarFichasDetalladas();
