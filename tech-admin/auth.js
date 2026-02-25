const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.TECH_JWT_SECRET || 'techpanel_secret_2026_k8s!';
const TECH_USER = process.env.TECH_ADMIN_USER || 'admin';
const TECH_PASS = process.env.TECH_ADMIN_PASS || 'TechAdmin2026!';
const JWT_TTL = '8h';

function login(user, password) {
  if (user === TECH_USER && password === TECH_PASS) {
    const token = jwt.sign({ user, role: 'tech_admin' }, JWT_SECRET, { expiresIn: JWT_TTL });
    return { token, user };
  }
  return null;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.techUser = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { login, requireAuth };
