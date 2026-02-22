const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const mockData = require('../data/mockDataFull');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'portal_estudiantil_secret_key_2024';
const JWT_EXPIRES_IN = '24h';

// ============================================
// Función auxiliar para registrar intentos de login fallidos
// ============================================
const registrarLoginFallido = async (emailIngresado, tipoUsuario, motivoFallo, req, establecimientoId = null) => {
    try {
        await pool.query(`
            INSERT INTO tb_intentos_login_fallidos
            (email_ingresado, tipo_usuario_intentado, establecimiento_id, motivo_fallo, ip_address, user_agent, fecha_intento)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [emailIngresado, tipoUsuario, establecimientoId, motivoFallo, req.ip, req.headers['user-agent']]);
    } catch (error) {
        console.error('Error al registrar intento de login fallido:', error);
    }
};

// ============================================
// POST /api/auth/login - Iniciar sesión
// ============================================
router.post('/login', async (req, res) => {
    const { email, password, tipo } = req.body;

    // --- MOCK DEMO LOGIN ---
    if (password === '123456' && email && email.endsWith('@demo.com')) {
        let userMock = null;
        if (email === 'admin@demo.com' && (tipo === 'admin' || tipo === 'administrador')) userMock = mockData.users.admin;
        else if (email === 'docente@demo.com' && tipo === 'docente') userMock = mockData.users.docente;
        else if (email === 'apoderado@demo.com' && tipo === 'apoderado') userMock = mockData.users.apoderado;

        if (userMock) {
            const token = jwt.sign(
                { id: userMock.id, email: userMock.email, tipo, tipo_usuario: userMock.role, isDemo: true },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({
                success: true,
                token,
                usuario: { ...userMock, tipo }
            });
        }
    }
    // --- END MOCK DEMO ---

    // Mapear tipo del frontend al tipo de la base de datos
    const tipoMap = {
        'admin': 'administrador',
        'docente': 'docente',
        'apoderado': 'apoderado'
    };
    const tipoDb = tipoMap[tipo] || tipo;

    if (!email || !password || !tipo) {
        return res.status(400).json({
            success: false,
            message: 'Email, contraseña y tipo de usuario son requeridos'
        });
    }

    const fs = require('fs');
    const path = require('path');

    try {
        const logPath = path.join(__dirname, '../../debug_auth.log');
        const logMsg = (msg) => fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);

        logMsg(`LOGIN ATTEMPT: Email=${email}, Tipo=${tipo}`);

        // Buscar usuario por email (incluir inactivos para saber el motivo exacto)
        const [usuarios] = await pool.query(
            'SELECT * FROM tb_usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            logMsg('RESULT: Usuario no encontrado en DB');
            // Registrar intento fallido: email no existe
            await registrarLoginFallido(email, tipoDb, 'email_no_existe', req);
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        const usuario = usuarios[0];
        logMsg(`USER FOUND: ID=${usuario.id}, TipoDB=${usuario.tipo_usuario}, Activo=${usuario.activo}`);

        // Verificar si la cuenta está inactiva
        if (usuario.activo !== 1) {
            logMsg('RESULT: Usuario inactivo');
            await registrarLoginFallido(email, tipoDb, 'cuenta_inactiva', req);
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Verificar si está bloqueado
        if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
            logMsg('RESULT: Usuario bloqueado');
            await registrarLoginFallido(email, tipoDb, 'cuenta_bloqueada', req);
            return res.status(403).json({
                success: false,
                message: 'Cuenta bloqueada temporalmente. Intente más tarde.'
            });
        }

        // Verificar tipo de usuario
        if (usuario.tipo_usuario !== tipoDb) {
            logMsg(`RESULT: Tipo incorrecto. Esperaba ${tipoDb}, tiene ${usuario.tipo_usuario}`);
            await registrarLoginFallido(email, tipoDb, 'otro', req); // tipo incorrecto
            return res.status(401).json({
                success: false,
                message: 'Tipo de usuario incorrecto'
            });
        }

        // Verificar contraseña
        logMsg(`CHECKING PASS: Hash length=${usuario.password_hash ? usuario.password_hash.length : 0}`);
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        logMsg(`PASS VALID: ${passwordValida}`);

        if (!passwordValida) {
            logMsg('RESULT: Password invalida');
            // Registrar intento fallido: password incorrecta
            await registrarLoginFallido(email, tipoDb, 'password_incorrecta', req);

            // Incrementar intentos fallidos
            await pool.query(
                'UPDATE tb_usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?',
                [usuario.id]
            );

            // Bloquear después de 5 intentos
            if (usuario.intentos_fallidos >= 4) {
                const bloqueoHasta = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
                await pool.query(
                    'UPDATE tb_usuarios SET bloqueado_hasta = ? WHERE id = ?',
                    [bloqueoHasta, usuario.id]
                );
            }

            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Login exitoso - resetear intentos fallidos
        await pool.query(
            'UPDATE tb_usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW() WHERE id = ?',
            [usuario.id]
        );

        // Obtener datos adicionales según tipo de usuario
        let datosAdicionales = {};

        if (tipoDb === 'administrador') {
            const [admin] = await pool.query(`
                SELECT a.*, e.nombre as establecimiento, ae.establecimiento_id
                FROM tb_administradores a
                LEFT JOIN tb_administrador_establecimiento ae ON a.id = ae.administrador_id AND ae.activo = 1
                LEFT JOIN tb_establecimientos e ON ae.establecimiento_id = e.id
                WHERE a.usuario_id = ?
            `, [usuario.id]);

            if (admin.length > 0) {
                datosAdicionales = {
                    admin_id: admin[0].id,
                    nombres: admin[0].nombres,
                    apellidos: admin[0].apellidos,
                    establecimiento: admin[0].establecimiento,
                    establecimiento_id: admin[0].establecimiento_id
                };
            }
        } else if (tipoDb === 'docente') {
            const [docente] = await pool.query(`
                SELECT d.*, e.nombre as establecimiento, de.establecimiento_id
                FROM tb_docentes d
                LEFT JOIN tb_docente_establecimiento de ON d.id = de.docente_id AND de.activo = 1
                LEFT JOIN tb_establecimientos e ON de.establecimiento_id = e.id
                WHERE d.usuario_id = ?
            `, [usuario.id]);

            if (docente.length > 0) {
                datosAdicionales = {
                    docente_id: docente[0].id,
                    nombres: docente[0].nombres,
                    apellidos: docente[0].apellidos,
                    iniciales: `${docente[0].nombres?.charAt(0) || ''}${docente[0].apellidos?.charAt(0) || ''}`,
                    establecimiento: docente[0].establecimiento,
                    establecimiento_id: docente[0].establecimiento_id
                };
            }
        } else if (tipoDb === 'apoderado') {
            const [apoderado] = await pool.query(`
                SELECT ap.* FROM tb_apoderados ap WHERE ap.usuario_id = ?
            `, [usuario.id]);

            if (apoderado.length > 0) {
                // Obtener pupilos
                const [pupilos] = await pool.query(`
                    SELECT a.id, a.nombres, a.apellidos, c.nombre as curso, ae.establecimiento_id
                    FROM tb_apoderado_alumno aa
                    JOIN tb_alumnos a ON aa.alumno_id = a.id
                    LEFT JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id AND ae.activo = 1
                    LEFT JOIN tb_cursos c ON ae.curso_id = c.id
                    WHERE aa.apoderado_id = ? AND aa.activo = 1
                `, [apoderado[0].id]);

                datosAdicionales = {
                    apoderado_id: apoderado[0].id,
                    rut: apoderado[0].rut,
                    nombres: apoderado[0].nombres,
                    apellidos: apoderado[0].apellidos,
                    telefono: apoderado[0].telefono,
                    direccion: apoderado[0].direccion,
                    pupilos: pupilos.map(p => ({
                        id: p.id,
                        nombres: p.nombres,
                        apellidos: p.apellidos,
                        curso: p.curso
                    })),
                    establecimiento_id: pupilos.length > 0 ? pupilos[0].establecimiento_id : null
                };
            }
        }

        // Crear token JWT
        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                tipo: tipo,
                tipo_usuario: tipoDb
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Registrar sesión en la base de datos
        await pool.query(`
            INSERT INTO tb_sesiones (usuario_id, establecimiento_id, tipo_usuario, token_sesion, ip_address, user_agent, fecha_expiracion)
            VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
        `, [usuario.id, datosAdicionales.establecimiento_id || null, tipoDb, token, req.ip, req.headers['user-agent']]);

        // Respuesta exitosa
        res.json({
            success: true,
            token,
            usuario: {
                id: usuario.id,
                email: usuario.email,
                tipo: tipo,
                ...datosAdicionales
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// ============================================
// POST /api/auth/logout - Cerrar sesión
// ============================================
router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.json({ success: true, message: 'Sesión cerrada' });
    }

    try {
        // Invalidar sesión en la base de datos
        await pool.query(
            'UPDATE tb_sesiones SET activa = 0, fecha_logout = NOW() WHERE token_sesion = ?',
            [token]
        );

        res.json({ success: true, message: 'Sesión cerrada correctamente' });
    } catch (error) {
        console.error('Error en logout:', error);
        res.json({ success: true, message: 'Sesión cerrada' });
    }
});

// ============================================
// GET /api/auth/me - Verificar sesión actual
// ============================================
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token no proporcionado'
        });
    }

    try {
        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET);

        // --- MOCK DEMO CHECK ---
        if (decoded.isDemo) {
            let userMock = null;
            if (decoded.email === 'admin@demo.com') userMock = mockData.users.admin;
            else if (decoded.email === 'docente@demo.com') userMock = mockData.users.docente;
            else if (decoded.email === 'apoderado@demo.com') userMock = mockData.users.apoderado;

            if (userMock) {
                return res.json({
                    success: true,
                    usuario: { ...userMock, tipo: decoded.tipo }
                });
            }
        }
        // --- END MOCK DEMO ---

        // Verificar que la sesión esté activa en la base de datos
        const [sesiones] = await pool.query(
            'SELECT * FROM tb_sesiones WHERE token_sesion = ? AND activa = 1 AND fecha_expiracion > NOW()',
            [token]
        );

        if (sesiones.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Sesión expirada o inválida'
            });
        }

        // Obtener datos del usuario
        const [usuarios] = await pool.query(
            'SELECT id, email, tipo_usuario FROM tb_usuarios WHERE id = ? AND activo = 1',
            [decoded.id]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const usuario = usuarios[0];
        let datosAdicionales = {};

        // Obtener datos adicionales según tipo
        if (usuario.tipo_usuario === 'administrador') {
            const [admin] = await pool.query(`
                SELECT a.*, e.nombre as establecimiento
                FROM tb_administradores a
                LEFT JOIN tb_administrador_establecimiento ae ON a.id = ae.administrador_id AND ae.activo = 1
                LEFT JOIN tb_establecimientos e ON ae.establecimiento_id = e.id
                WHERE a.usuario_id = ?
            `, [usuario.id]);

            if (admin.length > 0) {
                datosAdicionales = {
                    admin_id: admin[0].id,
                    nombres: admin[0].nombres,
                    apellidos: admin[0].apellidos,
                    establecimiento: admin[0].establecimiento
                };
            }
        } else if (usuario.tipo_usuario === 'docente') {
            const [docente] = await pool.query(`
                SELECT d.* FROM tb_docentes d WHERE d.usuario_id = ?
            `, [usuario.id]);

            if (docente.length > 0) {
                datosAdicionales = {
                    docente_id: docente[0].id,
                    nombres: docente[0].nombres,
                    apellidos: docente[0].apellidos,
                    iniciales: `${docente[0].nombres?.charAt(0) || ''}${docente[0].apellidos?.charAt(0) || ''}`
                };
            }
        } else if (usuario.tipo_usuario === 'apoderado') {
            const [apoderado] = await pool.query(`
                SELECT ap.* FROM tb_apoderados ap WHERE ap.usuario_id = ?
            `, [usuario.id]);

            if (apoderado.length > 0) {
                const [pupilos] = await pool.query(`
                    SELECT a.id, a.nombres, a.apellidos, c.nombre as curso
                    FROM tb_apoderado_alumno aa
                    JOIN tb_alumnos a ON aa.alumno_id = a.id
                    LEFT JOIN tb_alumno_establecimiento ae ON a.id = ae.alumno_id AND ae.activo = 1
                    LEFT JOIN tb_cursos c ON ae.curso_id = c.id
                    WHERE aa.apoderado_id = ? AND aa.activo = 1
                `, [apoderado[0].id]);

                datosAdicionales = {
                    apoderado_id: apoderado[0].id,
                    rut: apoderado[0].rut,
                    nombres: apoderado[0].nombres,
                    apellidos: apoderado[0].apellidos,
                    telefono: apoderado[0].telefono,
                    direccion: apoderado[0].direccion,
                    pupilos: pupilos
                };
            }
        }

        res.json({
            success: true,
            usuario: {
                id: usuario.id,
                email: usuario.email,
                tipo: decoded.tipo,
                ...datosAdicionales
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }
        console.error('Error verificando sesión:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
