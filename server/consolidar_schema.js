require('dotenv').config();
const { pool } = require('./config/database');

async function consolidarSchema() {
    console.log('🏗️  CONSOLIDANDO ESQUEMA DE BASE DE DATOS (ARQUITECTURA ROBUSTA)...');

    const connection = await pool.getConnection();
    try {
        // 1. Verificar y Agregar usuario_id a tb_apoderados
        console.log('   > Revisando tb_apoderados...');
        try {
            // Intentamos agregarla. Si falla porque existe, el catch lo atrapa.
            await connection.query(`
                ALTER TABLE tb_apoderados 
                ADD COLUMN usuario_id INT NULL,
                ADD CONSTRAINT fk_apoderado_usuario FOREIGN KEY (usuario_id) REFERENCES tb_usuarios(id) ON DELETE SET NULL
            `);
            console.log('     ✅ Columna usuario_id agregada a tb_apoderados.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('     ℹ️  La columna usuario_id ya existe en tb_apoderados.');
            else if (e.code === 'ER_DUP_KEYNAME') console.log('     ℹ️  La FK ya existe.');
            else console.log('     ⚠️  Nota:', e.message);
        }

        // 2. Verificar y Agregar usuario_id a tb_alumnos
        console.log('   > Revisando tb_alumnos...');
        try {
            await connection.query(`
                ALTER TABLE tb_alumnos 
                ADD COLUMN usuario_id INT NULL,
                ADD CONSTRAINT fk_alumno_usuario FOREIGN KEY (usuario_id) REFERENCES tb_usuarios(id) ON DELETE SET NULL
            `);
            console.log('     ✅ Columna usuario_id agregada a tb_alumnos.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('     ℹ️  La columna usuario_id ya existe en tb_alumnos.');
            else if (e.code === 'ER_DUP_KEYNAME') console.log('     ℹ️  La FK ya existe.');
            else console.log('     ⚠️  Nota:', e.message);
        }

        // 3. Estandarizar nombres de columnas (Corrección sexo vs genero)
        console.log('   > Estandarizando columnas (sexo/genero)...');
        try {
            // Verificamos si existe 'genero' y la renombramos a 'sexo' para estandarizar con el sistema
            const [cols] = await connection.query("SHOW COLUMNS FROM tb_alumnos LIKE 'genero'");
            if (cols.length > 0) {
                await connection.query("ALTER TABLE tb_alumnos CHANGE COLUMN genero sexo VARCHAR(20)");
                console.log('     ✅ Columna "genero" renombrada a "sexo" en tb_alumnos.');
            } else {
                console.log('     ℹ️  La columna "genero" no existe o ya se llama "sexo".');
            }
        } catch (e) { console.log('     ⚠️ Error renombrando:', e.message); }

        console.log('✅ ESQUEMA CONSOLIDADO. Ahora soporta Login Centralizado.');
        process.exit(0);

    } catch (error) {
        console.error('❌ ERROR FATAL:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

consolidarSchema();
