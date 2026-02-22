
import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function resetPassword() {
    const connection = await createConnection({
        host: '170.239.87.97',
        user: 'root',
        password: 'EXwCVq87aj0F3f1',
        database: 'portal_estudiantil'
    });

    try {
        const email = 'juan.perez@colegio.cl';
        const newPassword = 'password123'; // Contraseña temporal simple
        const saltRounds = 10;

        console.log(`Generando hash para '${newPassword}'...`);
        const hash = await bcrypt.hash(newPassword, saltRounds);
        console.log(`Hash generado: ${hash}`);

        console.log(`Actualizando contraseña para ${email}...`);
        const [result] = await connection.execute(
            'UPDATE tb_usuarios SET password_hash = ? WHERE email = ?',
            [hash, email]
        );

        console.log('Resultado:', result);
        if (result.affectedRows > 0) {
            console.log('✅ Contraseña actualizada correctamente.');
            console.log(`Prueba ingresar con: ${email} / ${newPassword}`);
        } else {
            console.log('❌ No se encontró el usuario para actualizar.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

resetPassword();
