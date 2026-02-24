const express = require('express');
const { pool } = require('../config/database');
const { enviarEmailConsulta } = require('../services/emailService');

const router = express.Router();

// ============================================
// POST /api/contacto - Guardar consulta de contacto
// ============================================
router.post('/', async (req, res) => {
    const { nombre, establecimiento, telefono, correo, consulta } = req.body;

    // Validar campos requeridos
    if (!nombre || !establecimiento || !telefono || !correo || !consulta) {
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son requeridos'
        });
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
        return res.status(400).json({
            success: false,
            message: 'El formato del correo electrónico no es válido'
        });
    }

    try {
        // Insertar consulta en la base de datos
        const [result] = await pool.query(`
            INSERT INTO tb_consultas_contacto
            (nombre_solicitante, establecimiento, telefono, correo, consulta, estado, ip_address, user_agent, fecha_envio)
            VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, NOW())
        `, [
            nombre,
            establecimiento,
            telefono,
            correo,
            consulta,
            req.ip,
            req.headers['user-agent']
        ]);

        // Enviar email de notificación (no bloquea la respuesta)
        enviarEmailConsulta({ nombre, establecimiento, telefono, correo, consulta })
            .catch(err => console.error('Error al enviar email de consulta:', err));

        res.json({
            success: true,
            message: 'Consulta enviada correctamente. Nos pondremos en contacto pronto.',
            id: result.insertId
        });

    } catch (error) {
        console.error('Error al guardar consulta de contacto:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar la consulta. Por favor, intente nuevamente.'
        });
    }
});

// ============================================
// GET /api/contacto - Obtener consultas (para admin)
// ============================================
router.get('/', async (req, res) => {
    const { estado, limit = 50, offset = 0 } = req.query;

    try {
        let query = `
            SELECT * FROM tb_consultas_contacto
            WHERE activo = 1
        `;
        const params = [];

        if (estado) {
            query += ' AND estado = ?';
            params.push(estado);
        }

        query += ' ORDER BY fecha_envio DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [consultas] = await pool.query(query, params);

        // Contar total
        let countQuery = 'SELECT COUNT(*) as total FROM tb_consultas_contacto WHERE activo = 1';
        const countParams = [];
        if (estado) {
            countQuery += ' AND estado = ?';
            countParams.push(estado);
        }
        const [countResult] = await pool.query(countQuery, countParams);

        res.json({
            success: true,
            data: consultas,
            total: countResult[0].total
        });

    } catch (error) {
        console.error('Error al obtener consultas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las consultas'
        });
    }
});

// ============================================
// PUT /api/contacto/:id/responder - Responder consulta
// ============================================
router.put('/:id/responder', async (req, res) => {
    const { id } = req.params;
    const { respuesta, respondido_por } = req.body;

    if (!respuesta) {
        return res.status(400).json({
            success: false,
            message: 'La respuesta es requerida'
        });
    }

    try {
        await pool.query(`
            UPDATE tb_consultas_contacto
            SET estado = 'respondida',
                respuesta = ?,
                respondido_por = ?,
                fecha_respuesta = NOW()
            WHERE id = ?
        `, [respuesta, respondido_por, id]);

        res.json({
            success: true,
            message: 'Respuesta guardada correctamente'
        });

    } catch (error) {
        console.error('Error al responder consulta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar la respuesta'
        });
    }
});

// ============================================
// PUT /api/contacto/:id/estado - Cambiar estado
// ============================================
router.put('/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ['pendiente', 'en_proceso', 'respondida', 'cerrada'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
            success: false,
            message: 'Estado no válido'
        });
    }

    try {
        await pool.query(`
            UPDATE tb_consultas_contacto SET estado = ? WHERE id = ?
        `, [estado, id]);

        res.json({
            success: true,
            message: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado'
        });
    }
});

module.exports = router;
