/**
 * Servicio de Autenticación
 *
 * Modo Producción (Sin mocks)
 */

import config from '../config/env';

/**
 * Restablece la contraseña usuando el token
 * @param {string} token 
 * @param {string} password 
 */
export const restablecerPassword = async (token, password) => {
  try {
    const response = await fetch(`${config.apiBaseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Error de conexión' };
  }
};

/**
 * Solicita recuperación de contraseña
 * @param {string} email
 */
export const solicitarRecuperacion = async (email) => {
  try {
    const response = await fetch(`${config.apiBaseUrl}/auth/recuperar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Error de conexión' };
  }
};

/**
 * Valida las credenciales de login
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @param {string} tipo - Tipo de usuario
 * @returns {Promise<Object>} Resultado de la validación
 */
export const login = async (email, password, tipo) => {
  try {
    const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, tipo }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Error al iniciar sesión' };
    }

    // Guardar token en localStorage
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }

    return { success: true, usuario: data.usuario };
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, error: 'Error de conexión. Intente nuevamente.' };
  }
};

/**
 * Cierra la sesión del usuario
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      await fetch(`${config.apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('Error en logout:', error);
  } finally {
    localStorage.removeItem('auth_token');
  }
};

/**
 * Verifica si hay una sesión activa
 * @returns {Promise<Object|null>} Usuario actual o null
 */
export const verificarSesion = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    const response = await fetch(`${config.apiBaseUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem('auth_token');
      return null;
    }

    const data = await response.json();
    return data.usuario;
  } catch (error) {
    console.error('Error verificando sesión:', error);
    return null;
  }
};

/**
 * Verifica si estamos en modo demo
 * @returns {boolean}
 */
export const esModoDemo = () => false; // Siempre falso en modo producción limpio

export default {
  login,
  logout,
  verificarSesion,
  esModoDemo,
  restablecerPassword,
  solicitarRecuperacion,
};
