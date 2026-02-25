/**
 * Servicio de Registro
 *
 * En modo demo usa datos mock locales
 * En modo producción conecta a la API real
 */

import config from '../config/env';
import {
  preRegistroApoderados,
  preRegistroDocentes,
  codigosPortal,
  establecimientos,
  cursos,
  datosAutoLlenado
} from '../mock/registroMockData';

/**
 * Obtiene la lista de establecimientos disponibles
 * @returns {Promise<string[]>}
 */
export const obtenerEstablecimientos = async () => {
  if (config.isDemoMode()) {
    return establecimientos;
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/establecimientos`);
    const data = await response.json();
    return data.establecimientos || [];
  } catch (error) {
    console.error('Error obteniendo establecimientos:', error);
    return [];
  }
};

/**
 * Obtiene la lista de cursos disponibles
 * @returns {Promise<string[]>}
 */
export const obtenerCursos = async () => {
  if (config.isDemoMode()) {
    return cursos;
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/cursos`);
    const data = await response.json();
    return data.cursos || [];
  } catch (error) {
    console.error('Error obteniendo cursos:', error);
    return [];
  }
};

/**
 * Valida el código de 12 dígitos + datos personales contra el preregistro de admin
 * @param {string} codigo - Código de 12 dígitos
 * @param {Object} datos - { rut, nombres, apellidos, email, telefono }
 * @returns {Promise<Object>} { success, datos: { establecimiento, establecimiento_id }, error }
 */
export const validarCodigoAdmin = async (codigo, datos) => {
  if (config.isDemoMode()) {
    return { success: true, datos: { establecimiento: 'Establecimiento Demo', establecimiento_id: 1 }, error: null };
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/registro/validar-codigo-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, ...datos }),
    });

    const data = await response.json();
    return {
      success: response.ok,
      datos: data.datos || null,
      error: data.message || null
    };
  } catch (error) {
    console.error('Error validando código admin:', error);
    return { success: false, datos: null, error: 'Error de conexión' };
  }
};

/**
 * Valida el pre-registro de un administrador
 * @param {string} rut - RUT del administrador
 * @param {string} [email] - Email del administrador
 * @returns {Promise<Object>}
 */
export const validarPreRegistroAdmin = async (rut, email) => {
  if (config.isDemoMode()) {
    return { success: true, error: null }; // Mock simple para demo
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/registro/validar-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rut, email }),
    });

    const data = await response.json();
    return {
      success: response.ok,
      error: data.message || null
    };
  } catch (error) {
    console.error('Error validando admin:', error);
    return { success: false, error: 'Error de conexión' };
  }
};

/**
 * Valida el pre-registro de un docente
 * @param {string} rut - RUT del docente
 * @returns {Promise<Object>}
 */
export const validarPreRegistroDocente = async (rut) => {
  if (config.isDemoMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));

    const esValido = preRegistroDocentes.includes(rut);
    return {
      success: esValido,
      error: esValido ? null : 'El RUT ingresado no coincide con el registrado por el establecimiento. Por favor, comuníquese con ellos para verificar o corregir sus datos.'
    };
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/registro/validar-docente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rut }),
    });

    const data = await response.json();
    return {
      success: response.ok,
      error: data.message || null
    };
  } catch (error) {
    console.error('Error validando docente:', error);
    return { success: false, error: 'Error de conexión' };
  }
};

/**
 * Valida el pre-registro de un apoderado y sus alumnos
 * @param {string} rutApoderado - RUT del apoderado
 * @param {Array} alumnos - Lista de alumnos con sus RUTs
 * @returns {Promise<Object>}
 */
export const validarPreRegistroApoderado = async (rutApoderado, alumnos) => {
  if (config.isDemoMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Buscar el apoderado en el pre-registro
    const preRegistro = preRegistroApoderados.find(pr => pr.rutApoderado === rutApoderado);

    if (!preRegistro) {
      return {
        success: false,
        error: 'El RUT del apoderado ingresado no coincide con el registrado en el establecimiento. Por favor, comuníquese con el establecimiento para verificar sus datos.'
      };
    }

    // Validar cada alumno
    const alumnosNoCoinciden = [];
    alumnos.forEach((alumno, index) => {
      if (!preRegistro.alumnosAsociados.includes(alumno.rut)) {
        alumnosNoCoinciden.push(index + 1);
      }
    });

    if (alumnosNoCoinciden.length > 0) {
      const alumnoTexto = alumnosNoCoinciden.length === 1
        ? `El RUT del Alumno ${alumnosNoCoinciden[0]}`
        : `Los RUT de los Alumnos ${alumnosNoCoinciden.join(', ')}`;

      return {
        success: false,
        error: `${alumnoTexto} no coincide con los registrados en el establecimiento para este apoderado. Por favor, comuníquese con el establecimiento para verificar los datos.`
      };
    }

    return { success: true, error: null };
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/registro/validar-apoderado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rutApoderado, alumnos }),
    });

    const data = await response.json();
    return {
      success: response.ok,
      error: data.message || null
    };
  } catch (error) {
    console.error('Error validando apoderado:', error);
    return { success: false, error: 'Error de conexión' };
  }
};

/**
 * Registra un nuevo usuario
 * @param {string} tipo - Tipo de usuario
 * @param {Object} datos - Datos del registro
 * @returns {Promise<Object>}
 */
export const registrarUsuario = async (tipo, datos) => {
  if (config.isDemoMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));

    // En modo demo, simular registro exitoso
    const mensajes = {
      admin: 'Cuenta de administrador creada con éxito. Ya puede iniciar sesión con su RUT y la contraseña que acaba de crear.',
      docente: 'Cuenta creada con éxito. Ya puede iniciar sesión con su RUT y la contraseña que acaba de crear.',
      apoderado: 'Registro realizado con éxito. Ya puede iniciar sesión con su RUT y la contraseña que acaba de crear.'
    };

    return {
      success: true,
      message: mensajes[tipo] || 'Registro exitoso'
    };
  }

  try {
    // Mapear tipos si es necesario
    const tipoRuta = tipo === 'administrador' ? 'admin' : tipo;

    const response = await fetch(`${config.apiBaseUrl}/registro/${tipoRuta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });

    const data = await response.json();
    return {
      success: response.ok,
      message: data.message || (response.ok ? 'Registro exitoso' : 'Error en el registro')
    };
  } catch (error) {
    console.error('Error en registro:', error);
    return { success: false, message: 'Error de conexión' };
  }
};

/**
 * Obtiene datos de auto-llenado (solo en modo demo)
 * @returns {Object|null}
 */
export const obtenerDatosAutoLlenado = () => {
  if (!config.isDemoMode()) {
    return null;
  }
  return datosAutoLlenado;
};

/**
 * Verifica si estamos en modo demo
 * @returns {boolean}
 */
export const esModoDemo = () => config.isDemoMode();

export default {
  obtenerEstablecimientos,
  obtenerCursos,
  validarCodigoAdmin,
  validarPreRegistroAdmin,
  validarPreRegistroDocente,
  validarPreRegistroApoderado,
  registrarUsuario,
  obtenerDatosAutoLlenado,
  esModoDemo,
};
