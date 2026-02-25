// Formatear RUT chileno
export const formatRut = (value) => {
  let rut = value.replace(/[^0-9kK]/g, '');
  if (rut.length > 1) {
    rut = rut.slice(0, -1) + '-' + rut.slice(-1);
  }
  if (rut.length > 5) {
    rut = rut.slice(0, -5) + '.' + rut.slice(-5);
  }
  if (rut.length > 9) {
    rut = rut.slice(0, -9) + '.' + rut.slice(-9);
  }
  return rut;
};

// Obtener titulo segun rol
export const getTituloRol = (tipoUsuario) => {
  switch (tipoUsuario) {
    case 'administrador': return 'Administrador';
    case 'docente': return 'Docente';
    case 'apoderado': return 'Apoderado';
    default: return 'Usuario';
  }
};

// Obtener subtitulo segun paso y tipo de usuario
export const getSubtituloPaso = (tipoUsuario, paso) => {
  if (tipoUsuario === 'administrador') {
    switch (paso) {
      case 1: return 'Paso 1: Datos y código de registro';
      case 2: return 'Paso 2: Establecimiento y contraseña';
      default: return '';
    }
  }
  if (tipoUsuario === 'docente') {
    switch (paso) {
      case 1: return 'Paso 1: Datos del docente';
      case 2: return 'Paso 2: Crear contrasena';
      default: return '';
    }
  }
  if (tipoUsuario === 'apoderado') {
    switch (paso) {
      case 1: return 'Paso 1: Datos del apoderado';
      case 2: return 'Paso 2: Datos del alumno';
      case 3: return 'Paso 3: Crear contrasena';
      default: return '';
    }
  }
  return '';
};

// Validaciones
export const validarPaso1 = (formData) => {
  if (!formData.nombres || !formData.rut || !formData.telefono || !formData.correo) {
    return { valid: false, error: 'Por favor complete todos los campos' };
  }
  return { valid: true };
};

export const validarPaso1Admin = (formData) => {
  if (!formData.nombres || !formData.rut || !formData.telefono || !formData.correo || !formData.codigo) {
    return { valid: false, error: 'Por favor complete todos los campos' };
  }
  return { valid: true };
};

export const validarPaso2Alumnos = (alumnos) => {
  for (let i = 0; i < alumnos.length; i++) {
    const alumno = alumnos[i];
    if (!alumno.nombres || !alumno.apellidos || !alumno.rut || !alumno.curso) {
      return { valid: false, error: `Por favor complete todos los datos del alumno ${i + 1}` };
    }
  }
  return { valid: true };
};

export const validarPassword = (password, confirmPassword) => {
  if (password.length < 6) {
    return { valid: false, error: 'La contrasena debe tener al menos 6 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'La contrasena debe tener al menos una letra mayuscula' };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: 'Las contrasenas no coinciden' };
  }
  return { valid: true };
};
