import React, { useState, useMemo, useEffect } from 'react';
import { useDropdown } from '../hooks';
import { useMensaje } from '../contexts';
import { apiFetch } from '../utils/api';

function AsistenciaTab() {
  const { mostrarMensaje } = useMensaje();
  const [filtros, setFiltros] = useState({
    curso: '',
    cursoId: null
  });
  // Año escolar: marzo (2) a diciembre (11)
  const [mesSeleccionado, setMesSeleccionado] = useState(2); // Marzo por defecto
  const [mesNombre, setMesNombre] = useState('Marzo');
  const anioActual = new Date().getFullYear();

  // Estados para datos de la API
  const [cursosDB, setCursosDB] = useState([]);
  const [alumnosDelCurso, setAlumnosDelCurso] = useState([]);
  const [asistenciaData, setAsistenciaData] = useState({});
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    presente: 0,
    ausente: 0,
    justificado: 0,
    atrasado: 0,
    porcentaje_asistencia: '0.0'
  });
  const [alumnosBajoUmbral, setAlumnosBajoUmbral] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Hook personalizado para dropdowns
  const { dropdownAbierto, setDropdownAbierto } = useDropdown();

  // Estado para el popup de edición
  const [popup, setPopup] = useState({
    visible: false,
    alumno: null,
    diaInfo: null,
    registroId: null,
    estadoActual: '',
    estadoNuevo: '',
    observacion: '',
    guardando: false
  });

  // Estado para el popup de alumnos bajo 85% (Global)
  const [popupBajoUmbral, setPopupBajoUmbral] = useState({
    visible: false,
    alumnos: []
  });

  // Estado para Stats Mensuales (Curso + Mes)
  const [statsMensuales, setStatsMensuales] = useState({
    total: 0, presente: 0, ausente: 0, justificado: 0, atrasado: 0, porcentaje_asistencia: '0.0'
  });
  const [riesgoMensual, setRiesgoMensual] = useState([]);
  const [popupRiesgoMensual, setPopupRiesgoMensual] = useState({
    visible: false,
    alumnos: []
  });

  // Meses del año escolar chileno (marzo a diciembre)
  const mesesEscolares = [
    { indice: 2, nombre: 'Marzo' },
    { indice: 3, nombre: 'Abril' },
    { indice: 4, nombre: 'Mayo' },
    { indice: 5, nombre: 'Junio' },
    { indice: 6, nombre: 'Julio' },
    { indice: 7, nombre: 'Agosto' },
    { indice: 8, nombre: 'Septiembre' },
    { indice: 9, nombre: 'Octubre' },
    { indice: 10, nombre: 'Noviembre' },
    { indice: 11, nombre: 'Diciembre' }
  ];

  // Nombres de los meses
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Nombres completos de los días
  const nombresDias = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes'
  };

  // Feriados Chile 2024/2025 que caen en días de semana
  const feriadosChile = [
    '2-29',  // 29 marzo - Viernes Santo
    '4-1',   // 1 mayo - Día del Trabajo
    '4-21',  // 21 mayo - Glorias Navales
    '5-20',  // 20 junio - Día Nacional de los Pueblos Indígenas
    '6-16',  // 16 julio - Virgen del Carmen
    '7-15',  // 15 agosto - Asunción de la Virgen
    '8-18',  // 18 septiembre - Independencia Nacional
    '8-19',  // 19 septiembre - Glorias del Ejército
    '8-20',  // 20 septiembre - Feriado adicional Fiestas Patrias
    '9-31',  // 31 octubre - Día Iglesias Evangélicas
    '10-1',  // 1 noviembre - Todos los Santos
    '11-25', // 25 diciembre - Navidad
  ];

  // Verificar si una fecha es feriado
  const esFeriado = (mes, dia) => {
    return feriadosChile.includes(`${mes}-${dia}`);
  };

  // Iniciales de los días de la semana
  const inicialesDias = {
    1: 'L',
    2: 'M',
    3: 'Mi',
    4: 'J',
    5: 'V'
  };

  // Cargar cursos y estadísticas globales al montar
  useEffect(() => {
    cargarCursos();
    cargarEstadisticas(null);
    cargarAlumnosBajoUmbral(null);
  }, []);

  // Cargar datos mensuales (Tabla Asistencia + Stats Mensuales)
  useEffect(() => {
    if (filtros.cursoId) {
      cargarAsistencia(filtros.cursoId, mesSeleccionado);
      cargarDatosMensuales(filtros.cursoId, mesSeleccionado);
    } else {
      // Reset stats mensuales si no hay curso
      setStatsMensuales({ total: 0, presente: 0, ausente: 0, justificado: 0, atrasado: 0, porcentaje_asistencia: '0.0' });
      setRiesgoMensual([]);
    }
  }, [filtros.cursoId, mesSeleccionado]);

  // Cargar lista de alumnos cuando cambia el curso
  useEffect(() => {
    if (filtros.cursoId) {
      cargarAlumnosDelCurso(filtros.cursoId);
    } else {
      setAlumnosDelCurso([]);
      setAsistenciaData({});
    }
  }, [filtros.cursoId]);

  const cargarCursos = async () => {
    try {
      const response = await apiFetch(`/cursos`);
      const data = await response.json();
      if (data.success) {
        setCursosDB(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando cursos:', error);
    }
  };

  const cargarAlumnosDelCurso = async (cursoId) => {
    try {
      const response = await apiFetch(`/alumnos?curso_id=${cursoId}`);
      const data = await response.json();
      if (data.success) {
        setAlumnosDelCurso(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando alumnos del curso:', error);
    }
  };

  const cargarAsistencia = async (cursoId, mes) => {
    setCargando(true);
    try {
      const response = await apiFetch(`/asistencia?curso_id=${cursoId}&mes=${mes}&anio=${anioActual}`);
      const data = await response.json();
      if (data.success) {
        setAsistenciaData(data.data || {});
      }
    } catch (error) {
      console.error('Error cargando asistencia:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarEstadisticas = async (cursoId) => {
    try {
      let url = `/asistencia/estadisticas?modo=anual&anio=${anioActual}`;
      if (cursoId) url += `&curso_id=${cursoId}`;
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.success) {
        setEstadisticas(data.data || {
          total: 0, presente: 0, ausente: 0, justificado: 0, atrasado: 0, porcentaje_asistencia: '0.0'
        });
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const cargarAlumnosBajoUmbral = async (cursoId) => {
    try {
      let url = `/asistencia/alumnos-bajo-umbral?anio=${anioActual}`;
      if (cursoId) url += `&curso_id=${cursoId}`;
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.success) {
        setAlumnosBajoUmbral(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando alumnos bajo umbral:', error);
    }
  };

  const cargarDatosMensuales = async (cursoId, mes) => {
    try {
      // Stats mensuales del curso
      const statsRes = await apiFetch(`/asistencia/estadisticas?curso_id=${cursoId}&mes=${mes}&anio=${anioActual}`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStatsMensuales(statsData.data || {
          total: 0, presente: 0, ausente: 0, justificado: 0, atrasado: 0, porcentaje_asistencia: '0.0'
        });
      }

      // Alumnos en riesgo mensual del curso
      const riesgoRes = await apiFetch(`/asistencia/alumnos-bajo-umbral?curso_id=${cursoId}&mes=${mes}&anio=${anioActual}`);
      const riesgoData = await riesgoRes.json();
      if (riesgoData.success) {
        setRiesgoMensual(riesgoData.data || []);
      }
    } catch (error) {
      console.error('Error cargando datos mensuales:', error);
    }
  };

  // Generar días del mes seleccionado (excluyendo solo fines de semana)
  const diasDelMes = useMemo(() => {
    const dias = [];
    const ultimoDiaMes = new Date(anioActual, mesSeleccionado + 1, 0).getDate();
    // En diciembre las clases terminan el 20
    const ultimoDiaClases = mesSeleccionado === 11 ? 20 : ultimoDiaMes;

    for (let d = 1; d <= ultimoDiaClases; d++) {
      const fecha = new Date(anioActual, mesSeleccionado, d);
      const diaSemana = fecha.getDay();
      // Excluir solo sábados (6) y domingos (0)
      if (diaSemana !== 0 && diaSemana !== 6) {
        dias.push({
          dia: d,
          fecha: fecha,
          diaSemana: diaSemana,
          inicial: inicialesDias[diaSemana],
          nombreDia: nombresDias[diaSemana],
          esFeriado: esFeriado(mesSeleccionado, d)
        });
      }
    }
    return dias;
  }, [mesSeleccionado, anioActual]);

  // Obtener asistencia de un alumno para un día específico
  const getAsistenciaDia = (alumnoId, dia) => {
    const asistenciaAlumno = asistenciaData[alumnoId];
    if (asistenciaAlumno && asistenciaAlumno[dia]) {
      return asistenciaAlumno[dia];
    }
    return null;
  };

  const handleCursoChange = (cursoId) => {
    const curso = cursosDB.find(c => c.id === parseInt(cursoId));
    setFiltros({
      ...filtros,
      curso: curso?.nombre || '',
      cursoId: cursoId ? parseInt(cursoId) : null
    });
  };

  // Formatear nombre
  const formatearNombre = (nombreCompleto) => {
    if (!nombreCompleto) return '';
    const partes = nombreCompleto.trim().split(' ');
    if (partes.length >= 4) {
      const nombre1 = partes[0];
      const nombre2Inicial = partes[1].charAt(0) + '.';
      const apellido1 = partes[2];
      const apellido2Inicial = partes[3].charAt(0) + '.';
      return `${nombre1} ${nombre2Inicial} ${apellido1} ${apellido2Inicial}`;
    } else if (partes.length === 3) {
      const nombre = partes[0];
      const apellido1 = partes[1];
      const apellido2Inicial = partes[2].charAt(0) + '.';
      return `${nombre} ${apellido1} ${apellido2Inicial}`;
    }
    return nombreCompleto;
  };

  // Abrir popup para editar asistencia
  const abrirPopup = (alumno, diaInfo, asistenciaActual) => {
    const estado = asistenciaActual?.estado || '';
    setPopup({
      visible: true,
      alumno: alumno,
      diaInfo: diaInfo,
      registroId: asistenciaActual?.id || null,
      estadoActual: estado,
      estadoNuevo: estado,
      observacion: asistenciaActual?.observacion || '',
      guardando: false
    });
  };

  // Cerrar popup
  const cerrarPopup = () => {
    setPopup({
      visible: false,
      alumno: null,
      diaInfo: null,
      registroId: null,
      estadoActual: '',
      estadoNuevo: '',
      observacion: '',
      guardando: false
    });
  };

  // Guardar cambio de asistencia
  const guardarAsistencia = async () => {
    if (!popup.estadoNuevo) {
      mostrarMensaje('Error', 'Debe seleccionar un estado', 'error');
      return;
    }

    setPopup(prev => ({ ...prev, guardando: true }));

    try {
      // Construir fecha YYYY-MM-DD
      const mesReal = mesSeleccionado + 1; // JS 0-indexed → SQL 1-indexed
      const fechaStr = `${anioActual}-${String(mesReal).padStart(2, '0')}-${String(popup.diaInfo.dia).padStart(2, '0')}`;

      const response = await apiFetch(`/asistencia`, {
        method: 'POST',
        body: JSON.stringify({
          alumno_id: popup.alumno.id,
          curso_id: filtros.cursoId,
          fecha: fechaStr,
          estado: popup.estadoNuevo,
          observacion: popup.observacion || null,
          establecimiento_id: 1
        })
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje('Exito', 'Asistencia registrada correctamente', 'success');

        // Actualizar localmente para reflejar el cambio en la UI
        setAsistenciaData(prev => {
          const newData = { ...prev };
          if (!newData[popup.alumno.id]) newData[popup.alumno.id] = {};
          newData[popup.alumno.id][popup.diaInfo.dia] = {
            id: data.id || popup.registroId,
            estado: popup.estadoNuevo,
            observacion: popup.observacion
          };
          return newData;
        });

        cerrarPopup();
      } else {
        mostrarMensaje('Error', data.error || 'Error al guardar asistencia', 'error');
        setPopup(prev => ({ ...prev, guardando: false }));
      }
    } catch (error) {
      console.error('Error guardando asistencia:', error);
      mostrarMensaje('Error', 'Error de conexión al guardar asistencia', 'error');
      setPopup(prev => ({ ...prev, guardando: false }));
    }
  };

  // Renderizar icono de asistencia
  const renderIconoAsistencia = (asistencia) => {
    if (!asistencia) {
      return <span className="asistencia-icono asistencia-vacio">-</span>;
    }
    switch (asistencia.estado) {
      case 'presente':
        return <span className="asistencia-icono asistencia-presente">✓</span>;
      case 'ausente':
        return <span className="asistencia-icono asistencia-ausente">✗</span>;
      case 'atrasado':
        return <span className="asistencia-icono asistencia-tardanza">T</span>;
      case 'justificado':
        return <span className="asistencia-icono asistencia-justificado">J</span>;
      case 'retirado':
        return <span className="asistencia-icono asistencia-retirado">R</span>;
      case 'suspendido':
        return <span className="asistencia-icono asistencia-suspendido">S</span>;
      default:
        return <span className="asistencia-icono asistencia-vacio">-</span>;
    }
  };

  // Obtener etiqueta del estado
  const getEtiquetaEstado = (estado) => {
    switch (estado) {
      case 'presente': return 'Presente';
      case 'ausente': return 'Ausente';
      case 'atrasado': return 'Atrasado';
      case 'justificado': return 'Justificado';
      case 'retirado': return 'Retirado';
      case 'suspendido': return 'Suspendido';
      default: return 'Sin registro';
    }
  };

  // Abrir popup de alumnos bajo 85%
  const abrirPopupBajoUmbral = () => {
    if (alumnosBajoUmbral.length > 0) {
      setPopupBajoUmbral({
        visible: true,
        alumnos: alumnosBajoUmbral
      });
    }
  };

  // Cerrar popup de alumnos bajo 85%
  const cerrarPopupBajoUmbral = () => {
    setPopupBajoUmbral({
      visible: false,
      alumnos: []
    });
  };

  const abrirPopupRiesgoMensual = () => {
    if (riesgoMensual.length > 0) {
      setPopupRiesgoMensual({ visible: true, alumnos: riesgoMensual });
    }
  };

  const cerrarPopupRiesgoMensual = () => {
    setPopupRiesgoMensual({ visible: false, alumnos: [] });
  };

  return (
    <div className="tab-panel active">
      <div className="card">
        <div className="card-header">
          <h3>Control de Asistencia</h3>
        </div>
        <div className="card-body">
          {/* Estadisticas Anuales - Movidas Arriba y siempre visibles */}
          <h4 className="titulo-asistencia-global" style={{ margin: '0 0 15px', color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Asistencia Global Acumulada (Establecimiento)
          </h4>
          <div className="asistencia-stats" style={{ marginBottom: '25px' }}>
            <div className="stat-item stat-total">
              <span className="stat-numero">{estadisticas.total}</span>
              <span className="stat-label">Total Registros</span>
            </div>
            <div className="stat-item stat-presentes">
              <span className="stat-numero">{estadisticas.presente}</span>
              <span className="stat-label">Presentes</span>
            </div>
            <div className="stat-item stat-porcentaje">
              <span className="stat-numero">{estadisticas.porcentaje_asistencia}%</span>
              <span className="stat-label">% Asistencia</span>
            </div>
            <div className="stat-item stat-ausentes">
              <span className="stat-numero">{estadisticas.ausente}</span>
              <span className="stat-label">Ausentes</span>
            </div>
            <div className="stat-item stat-justificados">
              <span className="stat-numero">{estadisticas.justificado}</span>
              <span className="stat-label">Justificados</span>
            </div>
            <div
              className={`stat-item stat-bajo-umbral ${alumnosBajoUmbral.length > 0 ? 'clickable' : ''}`}
              onClick={abrirPopupBajoUmbral}
              style={{ position: 'relative', cursor: alumnosBajoUmbral.length > 0 ? 'pointer' : 'default' }}
            >
              {alumnosBajoUmbral.length > 0 && (
                <div style={{ position: 'absolute', top: '5px', right: '5px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                  </svg>
                </div>
              )}
              <span className="stat-numero">{alumnosBajoUmbral.length}</span>
              <span className="stat-label">Bajo 85%</span>
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '0 0 25px' }} />

          {/* Filtros */}
          <div className="filtros-asistencia">
            <div className="form-row form-row-filtros">
              <div className="form-group">
                <label>Curso</label>
                <div className="custom-select-container">
                  <div
                    className="custom-select-trigger"
                    onClick={() => setDropdownAbierto(dropdownAbierto === 'curso' ? null : 'curso')}
                  >
                    <span>{filtros.curso || 'Seleccionar curso...'}</span>
                    <span className="custom-select-arrow">{dropdownAbierto === 'curso' ? '▲' : '▼'}</span>
                  </div>
                  {dropdownAbierto === 'curso' && (
                    <div className="custom-select-options custom-select-scroll">
                      <div
                        className="custom-select-option"
                        onClick={() => {
                          handleCursoChange('');
                          setDropdownAbierto(null);
                        }}
                      >
                        Seleccionar curso...
                      </div>
                      {cursosDB.map(curso => (
                        <div
                          key={curso.id}
                          className={`custom-select-option ${filtros.cursoId === curso.id ? 'selected' : ''}`}
                          onClick={() => {
                            handleCursoChange(curso.id);
                            setDropdownAbierto(null);
                          }}
                        >
                          {curso.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Mes</label>
                <div className="custom-select-container">
                  <div
                    className="custom-select-trigger"
                    onClick={() => setDropdownAbierto(dropdownAbierto === 'mes' ? null : 'mes')}
                  >
                    <span>{mesNombre}</span>
                    <span className="custom-select-arrow">{dropdownAbierto === 'mes' ? '▲' : '▼'}</span>
                  </div>
                  {dropdownAbierto === 'mes' && (
                    <div className="custom-select-options custom-select-scroll">
                      {mesesEscolares.map((mes) => (
                        <div
                          key={mes.indice}
                          className={`custom-select-option ${mesSeleccionado === mes.indice ? 'selected' : ''}`}
                          onClick={() => {
                            setMesSeleccionado(mes.indice);
                            setMesNombre(mes.nombre);
                            setDropdownAbierto(null);
                          }}
                        >
                          {mes.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Leyenda */}
          {filtros.cursoId && (
            <div className="asistencia-leyenda">
              <div className="leyenda-item">
                <span className="asistencia-icono asistencia-presente">✓</span>
                <span>Presente</span>
              </div>
              <div className="leyenda-item">
                <span className="asistencia-icono asistencia-ausente">✗</span>
                <span>Ausente</span>
              </div>
              <div className="leyenda-item">
                <span className="asistencia-icono asistencia-tardanza">T</span>
                <span>Atrasado</span>
              </div>
              <div className="leyenda-item">
                <span className="asistencia-icono asistencia-justificado">J</span>
                <span>Justificado</span>
              </div>
            </div>
          )}

          {/* Estilos específicos para móvil para reducir el tamaño de los números KPI */}
          <style>{`
            @media (max-width: 699px) {
              .titulo-asistencia-global {
                font-size: 9px !important;
                margin: 0 0 8px !important;
                letter-spacing: 0.02em !important;
              }
            }
            @media (max-width: 480px) {
              .asistencia-stats {
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 8px !important;
              }
              .asistencia-stats .stat-numero {
                font-size: 14px !important;
              }
              .asistencia-stats .stat-item {
                min-width: auto !important;
                padding: 10px 4px !important;
              }
              .asistencia-stats .stat-label {
                font-size: 9px !important;
              }
            }
          `}</style>

          {/* KPIs Mensuales (Curso + Mes) */}
          {filtros.cursoId && (
            <>
              <h4 className="asistencia-titulo-periodo" style={{ margin: '10px 0 15px', color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Estadísticas del Periodo ({mesNombre} - {filtros.curso})
              </h4>
              <div className="asistencia-stats" style={{ marginBottom: '25px' }}>
                <div className="stat-item stat-total">
                  <span className="stat-numero">{statsMensuales.total}</span>
                  <span className="stat-label">Registros Mes</span>
                </div>
                <div className="stat-item stat-presentes">
                  <span className="stat-numero">{statsMensuales.presente}</span>
                  <span className="stat-label">Presentes</span>
                </div>
                <div className="stat-item stat-porcentaje">
                  <span className="stat-numero">{statsMensuales.porcentaje_asistencia}%</span>
                  <span className="stat-label">% Asistencia</span>
                </div>
                <div className="stat-item stat-ausentes">
                  <span className="stat-numero">{statsMensuales.ausente}</span>
                  <span className="stat-label">Ausentes</span>
                </div>
                <div className="stat-item stat-justificados">
                  <span className="stat-numero">{statsMensuales.justificado}</span>
                  <span className="stat-label">Justificados</span>
                </div>
                <div
                  className={`stat-item stat-bajo-umbral ${riesgoMensual.length > 0 ? 'clickable' : ''}`}
                  onClick={abrirPopupRiesgoMensual}
                  style={{ position: 'relative', cursor: riesgoMensual.length > 0 ? 'pointer' : 'default' }}
                >
                  {riesgoMensual.length > 0 && (
                    <div style={{ position: 'absolute', top: '5px', right: '5px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                        <line x1="7" y1="17" x2="17" y2="7"></line>
                        <polyline points="7 7 17 7 17 17"></polyline>
                      </svg>
                    </div>
                  )}
                  <span className="stat-numero">{riesgoMensual.length}</span>
                  <span className="stat-label">Riesgo Mes</span>
                </div>
              </div>
            </>
          )}

          {/* Tabla de asistencia con scroll */}
          {filtros.cursoId ? (
            <div className="tabla-asistencia-calendario">
              {cargando && (
                <div className="loading-overlay">
                  <span>Cargando...</span>
                </div>
              )}
              <div className="tabla-asistencia-wrapper">
                <table className="tabla-asistencia-unica">
                  <thead>
                    <tr className="fila-mes">
                      <th className="th-espaciador" colSpan="2"></th>
                      <th colSpan={diasDelMes.length} className="th-mes">
                        {nombresMeses[mesSeleccionado]} {anioActual}
                      </th>
                    </tr>
                    <tr className="fila-dias">
                      <th className="th-numero">N°</th>
                      <th className="th-alumno">Alumno</th>
                      {diasDelMes.map((diaInfo, index) => (
                        <th
                          key={diaInfo.dia}
                          className={`th-dia ${diaInfo.diaSemana === 1 && index > 0 ? 'inicio-semana' : ''} ${diaInfo.esFeriado ? 'dia-feriado' : ''}`}
                        >
                          <span className="dia-inicial">{diaInfo.inicial}</span>
                          <span className="dia-numero">{diaInfo.dia}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosDelCurso.length > 0 ? (
                      alumnosDelCurso.map((alumno, index) => (
                        <tr key={alumno.id}>
                          <td className="td-numero">{index + 1}</td>
                          <td className="td-alumno">{formatearNombre(alumno.nombre_completo)}</td>
                          {diasDelMes.map((diaInfo, dIndex) => {
                            const asistenciaDia = getAsistenciaDia(alumno.id, diaInfo.dia);
                            return (
                              <td
                                key={diaInfo.dia}
                                className={`td-dia ${diaInfo.esFeriado ? 'dia-feriado' : 'td-dia-clickable'} ${diaInfo.diaSemana === 1 && dIndex > 0 ? 'inicio-semana' : ''}`}
                                onClick={() => !diaInfo.esFeriado && abrirPopup(alumno, diaInfo, asistenciaDia)}
                              >
                                {diaInfo.esFeriado ? <span className="asistencia-feriado">Fer</span> : renderIconoAsistencia(asistenciaDia)}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2 + diasDelMes.length} className="text-center text-muted">
                          No hay alumnos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: '40px' }}>
              Seleccione un curso para ver la asistencia
            </div>
          )}
        </div>
      </div>

      {/* Popup de edición de asistencia */}
      {popup.visible && (
        <div className="popup-overlay" onClick={cerrarPopup}>
          <div className="popup-asistencia" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h4>Editar Asistencia</h4>
              <button className="popup-close" onClick={cerrarPopup}>&times;</button>
            </div>
            <div className="popup-body">
              <div className="popup-info">
                <div className="popup-alumno">{popup.alumno?.nombre_completo}</div>
                <div className="popup-fecha">
                  <span className="popup-dia">{popup.diaInfo?.nombreDia}</span>
                  <span className="popup-fecha-completa">
                    {popup.diaInfo?.dia} de {nombresMeses[mesSeleccionado]} {anioActual}
                  </span>
                </div>
              </div>

              <div className="popup-estado-actual">
                <span className="popup-label">Estado actual:</span>
                {renderIconoAsistencia({ estado: popup.estadoActual })}
                <span>{getEtiquetaEstado(popup.estadoActual)}</span>
              </div>

              <div className="popup-opciones">
                <span className="popup-label">Cambiar a:</span>
                <div className="popup-estados">
                  <button
                    type="button"
                    className={`btn-estado btn-presente ${popup.estadoNuevo === 'presente' ? 'activo' : ''}`}
                    onClick={() => setPopup({ ...popup, estadoNuevo: 'presente' })}
                  >
                    <span className="asistencia-icono asistencia-presente">✓</span>
                    Presente
                  </button>
                  <button
                    type="button"
                    className={`btn-estado btn-ausente ${popup.estadoNuevo === 'ausente' ? 'activo' : ''}`}
                    onClick={() => setPopup({ ...popup, estadoNuevo: 'ausente' })}
                  >
                    <span className="asistencia-icono asistencia-ausente">✗</span>
                    Ausente
                  </button>
                  <button
                    type="button"
                    className={`btn-estado btn-tardanza ${popup.estadoNuevo === 'atrasado' ? 'activo' : ''}`}
                    onClick={() => setPopup({ ...popup, estadoNuevo: 'atrasado' })}
                  >
                    <span className="asistencia-icono asistencia-tardanza">T</span>
                    Atrasado
                  </button>
                  <button
                    type="button"
                    className={`btn-estado btn-justificado ${popup.estadoNuevo === 'justificado' ? 'activo' : ''}`}
                    onClick={() => setPopup({ ...popup, estadoNuevo: 'justificado' })}
                  >
                    <span className="asistencia-icono asistencia-justificado">J</span>
                    Justificado
                  </button>
                </div>
              </div>

              <div className="popup-observacion">
                <label className="popup-label">Observación (opcional):</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={popup.observacion}
                  onChange={(e) => setPopup({ ...popup, observacion: e.target.value })}
                  placeholder="Agregar observación..."
                />
              </div>
            </div>
            <div className="popup-footer">
              <button type="button" className="btn btn-secondary" onClick={cerrarPopup} disabled={popup.guardando}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={guardarAsistencia} disabled={popup.guardando}>
                {popup.guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de alumnos bajo 85% */}
      {popupBajoUmbral.visible && (
        <div className="popup-overlay" onClick={cerrarPopupBajoUmbral} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div className="popup-bajo-umbral" onClick={(e) => e.stopPropagation()} style={{
            background: 'white', padding: '0', borderRadius: '8px', width: '90%', maxWidth: '500px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '80vh'
          }}>
            <div className="popup-header" style={{
              padding: '16px 20px', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: '#dc2626', borderRadius: '8px 8px 0 0'
            }}>
              <h4 style={{ margin: 0, color: '#ffffff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span> Alumnos en Riesgo (Bajo 85%)
              </h4>
              <button className="popup-close" onClick={cerrarPopupBajoUmbral} style={{
                background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#ffffff', lineHeight: 1
              }}>&times;</button>
            </div>
            <div className="popup-body" style={{ padding: '20px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '15px', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '14px', color: '#64748b' }}>
                <strong>Ámbito:</strong> Establecimiento Global<br />
                <strong>Año Escolar:</strong> {anioActual}
              </div>
              <p className="popup-nota" style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', fontStyle: 'italic' }}>
                * Calculado sobre la asistencia acumulada anual hasta la fecha en todo el establecimiento.
              </p>

              {popupBajoUmbral.alumnos.length > 0 ? (
                <ul className="lista-bajo-umbral" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{
                    display: 'grid', gridTemplateColumns: 'minmax(30px, auto) 1.5fr 1fr minmax(60px, auto)',
                    gap: '15px', padding: '10px 12px', borderBottom: '2px solid #f1f5f9',
                    fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold'
                  }}>
                    <span>#</span>
                    <span>Alumno</span>
                    <span style={{ textAlign: 'center' }}>Curso</span>
                    <span style={{ textAlign: 'center' }}>Asistencia</span>
                  </li>
                  {popupBajoUmbral.alumnos.map((alumno, index) => (
                    <li key={alumno.alumno_id} style={{
                      padding: '12px', borderBottom: '1px solid #f1f5f9'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(30px, auto) 1.5fr 1fr minmax(60px, auto)', gap: '15px', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{index + 1}.</span>
                        <div style={{ fontWeight: '600', color: '#334155', fontSize: '14px' }}>{alumno.nombre_completo}</div>
                        <div style={{
                          fontSize: '12px', color: '#3b82f6', textAlign: 'center', fontWeight: '500',
                          background: '#eff6ff', padding: '4px 8px', borderRadius: '6px'
                        }}>
                          {alumno.nombre_curso || 'N/A'}
                        </div>
                        <div style={{
                          background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '12px',
                          fontWeight: 'bold', fontSize: '13px', textAlign: 'center'
                        }}>
                          {alumno.porcentaje}%
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No hay alumnos bajo el 85% de asistencia.</p>
              )}
            </div>
            <div className="popup-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button type="button" className="btn btn-secondary" onClick={cerrarPopupBajoUmbral} style={{
                padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer'
              }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Alumnos Riesgo Mensual */}
      {popupRiesgoMensual.visible && (
        <div className="popup-overlay" onClick={cerrarPopupRiesgoMensual} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()} style={{
            background: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h4 style={{ marginTop: 0, color: '#ef4444' }}>Alumnos En Riesgo ({mesNombre})</h4>
            <p style={{ fontSize: '14px', color: '#666' }}>Asistencia inferior al 85% durante este mes para el curso seleccionado.</p>

            <table style={{ width: '100%', marginTop: '15px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', color: '#666' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Alumno</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>% Mes</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Ausencias</th>
                </tr>
              </thead>
              <tbody>
                {popupRiesgoMensual.alumnos.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: '600' }}>{a.nombre_completo}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{a.nombre_curso || 'Sin curso asignado'}</div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{a.porcentaje}%</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{a.total_registros - a.asistencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={cerrarPopupRiesgoMensual} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
// Fin componente AsistenciaTab

export default AsistenciaTab;
