const express = require('express');
const cors = require('cors');
const path = require('path');
const { login, requireAuth } = require('./auth');
const monitorRoutes = require('./routes/monitor');
const databaseRoutes = require('./routes/database');
const usuariosRoutes = require('./routes/usuarios');
const contactoRoutes = require('./routes/contacto');
const logsRoutes = require('./routes/logs');
const deployRoutes = require('./routes/deploy');
const registroRoutes = require('./routes/registro');

const app = express();
const PORT = process.env.TECH_PORT || 3002;

// Middlewares
app.use(cors());
app.use(express.json());

// --- Auth endpoint ---
app.post('/api/login', (req, res) => {
  const { user, password } = req.body;
  const result = login(user, password);
  if (result) {
    res.json(result);
  } else {
    res.status(401).json({ error: 'Credenciales incorrectas' });
  }
});

// --- Proteger todas las rutas /api (excepto login) ---
app.use('/api', requireAuth);

// --- Rutas ---
app.use('/api', monitorRoutes);
app.use('/api', databaseRoutes);
app.use('/api', usuariosRoutes);
app.use('/api', contactoRoutes);
app.use('/api', logsRoutes);
app.use('/api', deployRoutes);
app.use('/api', registroRoutes);

// --- Servir frontend estático ---
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: cualquier ruta no-API devuelve index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`[TechPanel] Servidor corriendo en puerto ${PORT}`);
});
