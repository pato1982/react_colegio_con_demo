import React, { useState, useEffect } from 'react';
import '../styles/registro.css';
import {
  obtenerEstablecimientos,
  obtenerCursos,
  validarCodigoAdmin,
  validarPreRegistroDocente,
  validarPreRegistroApoderado,
  registrarUsuario,
  obtenerDatosAutoLlenado
} from '../services/registroService';

import {
  FormularioDatos,
  FormularioAlumnos,
  FormularioPassword,
  ModalResultado,
  formatRut,
  getTituloRol,
  getSubtituloPaso,
  validarPaso1,
  validarPaso1Admin,
  validarPaso2Alumnos,
  validarPassword
} from './registro';

function RegistroPage({ tipoUsuario, onVolver, onRegistroExitoso }) {
  const [paso, setPaso] = useState(1);
  const [formData, setFormData] = useState({
    nombres: '',
    rut: '',
    telefono: '',
    correo: '',
    establecimiento: '',
    codigo: ''
  });
  const [alumnos, setAlumnos] = useState([
    { nombres: '', apellidos: '', rut: '', curso: '' }
  ]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [modalResultado, setModalResultado] = useState({ visible: false, exito: false, mensaje: '' });
  const [cargando, setCargando] = useState(false);

  // Estado para flujo admin con código
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [datosPreregistro, setDatosPreregistro] = useState(null);
  const [bloqueado, setBloqueado] = useState(false);

  const [establecimientos, setEstablecimientos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [datosAutoLlenado, setDatosAutoLlenado] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const [estabs, cursosData] = await Promise.all([
        obtenerEstablecimientos(),
        obtenerCursos()
      ]);
      setEstablecimientos(estabs);
      setCursos(cursosData);
      setDatosAutoLlenado(obtenerDatosAutoLlenado());
    };
    cargarDatos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value);
    setFormData(prev => ({ ...prev, rut: formatted }));
    setError('');
  };

  const handleAlumnoChange = (index, field, value) => {
    const nuevosAlumnos = [...alumnos];
    nuevosAlumnos[index][field] = field === 'rut' ? formatRut(value) : value;
    setAlumnos(nuevosAlumnos);
    setError('');
  };

  const handleAgregarAlumno = () => {
    setAlumnos([...alumnos, { nombres: '', apellidos: '', rut: '', curso: '' }]);
  };

  const handleEliminarAlumno = (index) => {
    setAlumnos(alumnos.filter((_, i) => i !== index));
  };

  // Auto-llenado funciones
  const autoLlenarPaso1 = () => datosAutoLlenado && setFormData(datosAutoLlenado.paso1);
  const autoLlenarPaso2 = () => datosAutoLlenado && setAlumnos(datosAutoLlenado.paso2Alumnos);
  const autoLlenarPaso3 = () => {
    if (datosAutoLlenado) {
      setPassword(datosAutoLlenado.paso3Password);
      setConfirmPassword(datosAutoLlenado.paso3Password);
    }
  };
  const autoLlenarPaso2Admin = () => {
    if (datosAutoLlenado) {
      setPassword(datosAutoLlenado.paso3Password);
      setConfirmPassword(datosAutoLlenado.paso3Password);
    }
  };

  const handleSiguiente = async () => {
    setError('');
    if (tipoUsuario === 'administrador') {
      if (paso !== 1) return;
      const result = validarPaso1Admin(formData);
      if (!result.valid) { setError(result.error); return; }

      if (bloqueado) {
        setModalResultado({
          visible: true, exito: false,
          mensaje: 'Ha superado el máximo de intentos permitidos. Comuníquese con Portal Estudiantil para obtener asistencia.'
        });
        return;
      }

      // Llamar al backend para validar código + datos
      setCargando(true);
      try {
        const nombreCompleto = formData.nombres ? formData.nombres.trim() : '';
        const ultimoEspacio = nombreCompleto.lastIndexOf(' ');
        const nombres = ultimoEspacio !== -1 ? nombreCompleto.substring(0, ultimoEspacio) : nombreCompleto;
        const apellidos = ultimoEspacio !== -1 ? nombreCompleto.substring(ultimoEspacio + 1) : '.';

        const resultado = await validarCodigoAdmin(formData.codigo.replace(/[\s\-]/g, ''), {
          rut: formData.rut,
          nombres,
          apellidos,
          email: formData.correo,
          telefono: formData.telefono
        });

        if (resultado.success) {
          setDatosPreregistro(resultado.datos);
          setPaso(2);
        } else {
          const nuevosIntentos = intentosFallidos + 1;
          setIntentosFallidos(nuevosIntentos);
          if (nuevosIntentos >= 5) {
            setBloqueado(true);
            setModalResultado({
              visible: true, exito: false,
              mensaje: 'Ha superado el máximo de intentos permitidos. Comuníquese con Portal Estudiantil para obtener asistencia.'
            });
          } else {
            setModalResultado({
              visible: true, exito: false,
              mensaje: resultado.error || 'Los datos ingresados no coinciden con la invitación.',
              intentos: `Intento ${nuevosIntentos} de 5`
            });
          }
        }
      } finally {
        setCargando(false);
      }
    } else if (tipoUsuario === 'docente') {
      const result = validarPaso1(formData);
      if (paso === 1 && result.valid) setPaso(2);
      else if (!result.valid) setError(result.error);
    } else if (tipoUsuario === 'apoderado') {
      if (paso === 1) {
        const result = validarPaso1(formData);
        if (result.valid) setPaso(2);
        else setError(result.error);
      } else if (paso === 2) {
        const result = validarPaso2Alumnos(alumnos);
        if (result.valid) setPaso(3);
        else setError(result.error);
      }
    }
  };

  const handleVolver = () => {
    setError('');
    if (paso > 1) setPaso(paso - 1);
    else onVolver();
  };

  const validarPreRegistroDocenteLocal = async () => {
    const resultado = await validarPreRegistroDocente(formData.rut);
    if (!resultado.success) {
      setModalResultado({ visible: true, exito: false, mensaje: resultado.error });
      return false;
    }
    return true;
  };

  const validarPreRegistroApoderadoLocal = async () => {
    const resultado = await validarPreRegistroApoderado(formData.rut, alumnos);
    if (!resultado.success) {
      setModalResultado({ visible: true, exito: false, mensaje: resultado.error });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pwdResult = validarPassword(password, confirmPassword);
    if (!pwdResult.valid) {
      setError(pwdResult.error);
      return;
    }

    setCargando(true);
    try {
      let valido = false;
      let datosRegistro = { ...formData, password };

      // Adaptar datos para el backend
      datosRegistro.email = formData.correo;

      // Separar nombres y apellidos del campo único "nombres"
      const nombreCompleto = formData.nombres ? formData.nombres.trim() : '';
      const ultimoEspacio = nombreCompleto.lastIndexOf(' ');

      if (ultimoEspacio !== -1) {
        datosRegistro.nombres = nombreCompleto.substring(0, ultimoEspacio);
        datosRegistro.apellidos = nombreCompleto.substring(ultimoEspacio + 1);
      } else {
        datosRegistro.nombres = nombreCompleto;
        datosRegistro.apellidos = '.';
      }

      if (tipoUsuario === 'administrador' && paso === 2) {
        // Ya se validó en paso 1 con el código, enviar codigo en los datos
        datosRegistro.codigo = formData.codigo.replace(/[\s\-]/g, '');
        valido = true;
      } else if (tipoUsuario === 'docente' && paso === 2) {
        valido = await validarPreRegistroDocenteLocal();
      } else if (tipoUsuario === 'apoderado' && paso === 3) {
        valido = await validarPreRegistroApoderadoLocal();
        datosRegistro.alumnos = alumnos;
      }

      if (valido) {
        const resultado = await registrarUsuario(tipoUsuario, datosRegistro);
        setModalResultado({ visible: true, exito: resultado.success, mensaje: resultado.message });
      }
    } finally {
      setCargando(false);
    }
  };

  const cerrarModalResultado = () => {
    if (modalResultado.exito) onRegistroExitoso();
    setModalResultado({ visible: false, exito: false, mensaje: '', intentos: null });
  };

  const esUltimoPaso = () => {
    if (tipoUsuario === 'apoderado') return paso === 3;
    if (tipoUsuario === 'docente' || tipoUsuario === 'administrador') return paso === 2;
    return true;
  };

  return (
    <div className="registro-page">
      <div className="registro-container">
        <div className="registro-box">
          <div className="registro-header">
            <div className="registro-logo"><span>E</span></div>
            <h1>Registro de {getTituloRol(tipoUsuario)}</h1>
            <p>{getSubtituloPaso(tipoUsuario, paso)}</p>
          </div>

          <form onSubmit={handleSubmit} className="registro-form">
            {error && (
              <div className="registro-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
            )}

            {/* Paso 1: Datos personales */}
            {paso === 1 && (
              <FormularioDatos
                formData={formData}
                onChange={handleChange}
                onRutChange={handleRutChange}
                tipoUsuario={tipoUsuario}
                establecimientos={establecimientos}
                datosAutoLlenado={datosAutoLlenado}
                onAutoLlenar={autoLlenarPaso1}
              />
            )}

            {/* Paso 2: Alumnos (solo apoderado) */}
            {tipoUsuario === 'apoderado' && paso === 2 && (
              <FormularioAlumnos
                alumnos={alumnos}
                cursos={cursos}
                onAlumnoChange={handleAlumnoChange}
                onAgregarAlumno={handleAgregarAlumno}
                onEliminarAlumno={handleEliminarAlumno}
                datosAutoLlenado={datosAutoLlenado}
                onAutoLlenar={autoLlenarPaso2}
              />
            )}

            {/* Paso 2: Password (admin y docente) o Paso 3: Password (apoderado) */}
            {((tipoUsuario === 'administrador' && paso === 2) || (tipoUsuario === 'docente' && paso === 2) || (tipoUsuario === 'apoderado' && paso === 3)) && (
              <FormularioPassword
                password={password}
                confirmPassword={confirmPassword}
                showPassword={showPassword}
                showConfirmPassword={showConfirmPassword}
                onPasswordChange={(e) => { setPassword(e.target.value); setError(''); }}
                onConfirmPasswordChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                onTogglePassword={() => setShowPassword(!showPassword)}
                onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
                datosAutoLlenado={datosAutoLlenado}
                onAutoLlenar={(tipoUsuario === 'administrador' && paso === 2) ? autoLlenarPaso2Admin : autoLlenarPaso3}
                establecimiento={tipoUsuario === 'administrador' && datosPreregistro ? datosPreregistro.establecimiento : null}
              />
            )}

            <div className="form-actions">
              <button type="button" className="btn-cancelar" disabled={cargando} onClick={handleVolver}>
                {paso > 1 ? 'Volver' : 'Cancelar'}
              </button>
              {esUltimoPaso() ? (
                <button type="submit" className="btn-registrar" disabled={cargando}>
                  {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              ) : (
                <button type="button" className="btn-registrar" disabled={cargando || bloqueado} onClick={handleSiguiente}>
                  {cargando ? 'Validando...' : 'Siguiente'}
                </button>
              )}
            </div>
          </form>

          <div className="registro-footer">
            <p>Al registrarse, acepta nuestros terminos y condiciones</p>
          </div>
        </div>
      </div>

      <ModalResultado
        visible={modalResultado.visible}
        exito={modalResultado.exito}
        mensaje={modalResultado.mensaje}
        onCerrar={cerrarModalResultado}
        intentos={modalResultado.intentos}
      />
    </div>
  );
}

export default RegistroPage;
