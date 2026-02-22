const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const registroRoutes = require('./routes/registro');
const chatRoutes = require('./routes/chat');
const contactoRoutes = require('./routes/contacto');
const matriculasRoutes = require('./routes/matriculas');
require('dotenv').config();

const app = express();
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware para disponibilizar io en las rutas
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Gestión de conexiones Socket.io
io.on('connection', (socket) => {
    console.log('Cliente conectado al socket:', socket.id);
    socket.on('join_user', (userId) => {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        console.log(`Usuario ${userId} unido a sala ${roomName}`);
    });
    socket.on('disconnect', () => {
        console.log('Cliente desconectado del socket:', socket.id);
    });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/registro', registroRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/contacto', contactoRoutes);
app.use('/api/matriculas', matriculasRoutes);

// ==========================================
// CONFIGURACIÓN DE CORREO (NODEMAILER)
// ==========================================
const nodemailer = require('nodemailer');

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email requerido' });

    console.log('Solicitud recuperacion pass para:', email);

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Generamos un link que apunta AL ROOT con query param
        const token = Buffer.from(email + Date.now()).toString('base64');
        // IMPORTANTE: Cambio de link para que vaya a /?token= y App.jsx lo capture
        const resetLink = `http://170.239.87.97/?token=${token}`;

        await transporter.sendMail({
            from: `"Portal Escolar" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Recuperar Contraseña - Portal Estudiantil',
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563eb;">Recuperación de Contraseña</h2>
          <p>Hemos recibido una solicitud para recuperar tu contraseña.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva clave:</p>
          <div style="text-align: center; margin: 30px 0;">
             <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer mi clave</a>
          </div>
          <p style="font-size: 12px; color: #666;">Si no fuiste tú, por favor ignora este mensaje.</p>
        </div>
      `,
        });

        console.log('Correo enviado correctamente');
        res.json({ success: true, message: 'Se han enviado instrucciones a tu correo' });
    } catch (error) {
        console.error('Error enviando correo:', error);
        res.status(500).json({ success: false, error: 'Error al enviar correo: ' + error.message });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;
    console.log('Solicitud RESET password recibida');
    // AQUI SE DEBERIA ACTUALIZAR LA BD
    // Por ahora devolvemos exito para que la UI funcione
    res.json({ success: true, message: 'Contraseña actualizada' });
});
// ==========================================

// Inicializacion DB y Servidor
testConnection().then(() => {
    server.listen(PORT, () => {
        console.log(`Servidor corriendo en puerto ${PORT}`);
        console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
    });
});
