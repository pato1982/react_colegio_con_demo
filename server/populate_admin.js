const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function populateAdmin() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '170.239.87.97',
            user: 'root',
            password: 'EXwCVq87aj0F3f1',
            database: 'portal_estudiantil',
            port: 3306
        });

        console.log('--- POBLANDO ADMINISTRADOR MAESTRO ---');

        const email = 'patcorher@gmail.com';
        const password = '123456';
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Insertar Usuario
        console.log('Insertando en tb_usuarios...');
        const [userResult] = await connection.execute(
            `INSERT INTO tb_usuarios (email, password_hash, tipo_usuario, activo, email_verificado, debe_cambiar_password) 
             VALUES (?, ?, 'administrador', 1, 1, 0)`,
            [email, hashedPassword]
        );
        const userId = userResult.insertId;

        // 2. Insertar Administrador (Poblando TODOS los campos)
        console.log('Insertando en tb_administradores...');
        const [adminResult] = await connection.execute(
            `INSERT INTO tb_administradores (
                usuario_id, rut, nombres, apellidos, telefono, 
                fecha_nacimiento, sexo, direccion, foto_url, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                '12.345.678-9',
                'Patricio',
                'Correa Herrera',
                '+56 9 8765 4321',
                '1985-05-15',
                'Masculino',
                'Calle Principal 123, Santiago',
                'https://ui-avatars.com/api/?name=Patricio+Correa&background=0D8ABC&color=fff',
                1
            ]
        );
        const adminId = adminResult.insertId;

        // 3. Crear un Establecimiento base para que el admin tenga donde trabajar
        console.log('Insertando en tb_establecimientos...');
        const [estData] = await connection.execute(
            `INSERT INTO tb_establecimientos (
                nombre, rbd, direccion, comuna, ciudad, region, 
                telefono, email, sitio_web, tipo_establecimiento, nivel_educativo, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'Colegio San Patricio',
                '12345-6',
                'Av. Las Torres 456',
                'Santiago',
                'Santiago',
                'Metropolitana',
                '+56 2 2233 4455',
                'contacto@colegiosanpatricio.cl',
                'www.colegiosanpatricio.cl',
                'particular_subvencionado',
                'basica,media',
                1
            ]
        );
        const estId = estData.insertId;

        // 4. Vincular Administrador con el Establecimiento
        console.log('Vinculando Administrador con Establecimiento...');
        await connection.execute(
            `INSERT INTO tb_administrador_establecimiento (
                administrador_id, establecimiento_id, es_principal, cargo, fecha_asignacion, activo
            ) VALUES (?, ?, 1, 'Administrador General', CURDATE(), 1)`,
            [adminId, estId]
        );

        console.log('\n=============================================');
        console.log('¡ADMINISTRADOR CREADO EXITOSAMENTE!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`ID Usuario: ${userId}`);
        console.log(`ID Administrador: ${adminId}`);
        console.log(`ID Establecimiento: ${estId}`);
        console.log('=============================================');

    } catch (error) {
        console.error('❌ ERROR AL POBLAR:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

populateAdmin();
