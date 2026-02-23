import React, { useState, useEffect, useMemo } from 'react';
import { useResponsive, useDropdown } from '../../hooks';
import { SelectNativo, SelectMovil, AutocompleteAlumno } from './shared';
import { ordenarCursos } from './shared/utils';
import { apiFetch } from '../../utils/api';

// Simple Error Boundary
class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error en VerNotasTab:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', border: '1px solid red' }}>
          <h3>Error al cargar las notas</h3>
          <p>{this.state.error && this.state.error.toString()}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Función para obtener clase de nota según valor
const getNotaClass = (nota) => {
  if (nota === null || nota === undefined) return '';
  return Number(nota) >= 4.0 ? 'nota-aprobada' : 'nota-reprobada';
};

// Renderizar celdas de notas para un trimestre (8 notas máximo)
const renderNotasCeldas = (notas) => {
  const celdas = [];
  for (let i = 0; i < 8; i++) {
    const notaObj = notas[i];
    let valor = '-';
    let clase = '';

    if (notaObj) {
      if (notaObj.es_pendiente) {
        valor = 'P';
        clase = 'nota-pendiente';
      } else if (notaObj.nota !== null) {
        // CORRECCION CRITICA: Convertir a Number antes de toFixed
        valor = Number(notaObj.nota).toFixed(1);
        clase = getNotaClass(notaObj.nota);
      }
    }

    celdas.push(
      <td key={i} className={clase}>
        {valor}
      </td>
    );
  }
  return celdas;
};

// Encabezados de notas para un trimestre
const NotasHeaders = () => (
  <>
    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
      <th key={n} className="th-sub">N{n}</th>
    ))}
    <th className="th-sub th-prom">Prom</th>
  </>
);

function VerNotasTabInternal({ docenteId, establecimientoId }) {
  // Estados para datos de API
  const [cursos, setCursos] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [datosNotas, setDatosNotas] = useState([]);

  // Estados de filtros
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [cursoNombre, setCursoNombre] = useState('');
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState('');
  const [asignaturaNombre, setAsignaturaNombre] = useState('');
  const [filtroAlumno, setFiltroAlumno] = useState('');
  const [filtroAlumnoId, setFiltroAlumnoId] = useState('');

  // Estados de carga
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [cargandoAsignaturas, setCargandoAsignaturas] = useState(false);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [consultado, setConsultado] = useState(false);

  const { isMobile, isTablet } = useResponsive();
  const showMobile = isMobile;
  const isNormalSize = !isMobile;
  const { dropdownAbierto, setDropdownAbierto } = useDropdown();

  // Cargar cursos del docente
  useEffect(() => {
    const cargarCursos = async () => {
      if (!docenteId || !establecimientoId) {
        setCargandoCursos(false);
        return;
      }

      try {
        const response = await apiFetch(
          `/docente/${docenteId}/cursos?establecimiento_id=${establecimientoId}`
        );
        const data = await response.json();
        if (data.success) {
          setCursos(ordenarCursos(data.data || []));
        }
      } catch (error) {
        console.error('Error al cargar cursos:', error);
      } finally {
        setCargandoCursos(false);
      }
    };

    cargarCursos();
  }, [docenteId, establecimientoId]);

  // Cargar asignaturas cuando se selecciona curso
  useEffect(() => {
    const cargarAsignaturas = async () => {
      if (!cursoSeleccionado || !docenteId || !establecimientoId) {
        setAsignaturas([]);
        return;
      }

      setCargandoAsignaturas(true);
      try {
        const response = await apiFetch(
          `/docente/${docenteId}/asignaturas-por-curso/${cursoSeleccionado}?establecimiento_id=${establecimientoId}`
        );
        const data = await response.json();
        if (data.success) {
          setAsignaturas(data.data || []);
        }
      } catch (error) {
        console.error('Error al cargar asignaturas:', error);
      } finally {
        setCargandoAsignaturas(false);
      }
    };

    cargarAsignaturas();
  }, [cursoSeleccionado, docenteId, establecimientoId]);

  // Cargar alumnos cuando se selecciona curso
  useEffect(() => {
    const cargarAlumnos = async () => {
      if (!cursoSeleccionado) {
        setAlumnos([]);
        return;
      }

      setCargandoAlumnos(true);
      try {
        const response = await apiFetch(`/curso/${cursoSeleccionado}/alumnos`);
        const data = await response.json();
        if (data.success) {
          setAlumnos(data.data || []);
        }
      } catch (error) {
        console.error('Error al cargar alumnos:', error);
      } finally {
        setCargandoAlumnos(false);
      }
    };

    cargarAlumnos();
  }, [cursoSeleccionado]);

  const handleCursoChange = (cursoId, nombre = '') => {
    setCursoSeleccionado(cursoId);
    setCursoNombre(nombre);
    setAsignaturaSeleccionada('');
    setAsignaturaNombre('');
    setFiltroAlumno('');
    setFiltroAlumnoId('');
    setConsultado(false);
    setDatosNotas([]);
  };

  // Agregar opcion "Todos" a la lista de alumnos
  const alumnosConTodos = useMemo(() => {
    if (alumnos.length === 0) return [];
    return [{ id: '', nombres: 'Todos', apellidos: ' ' }, ...alumnos];
  }, [alumnos]);

  const handleSeleccionarAlumno = (alumno) => {
    if (alumno && alumno.id !== '') {
      setFiltroAlumnoId(alumno.id);
      setFiltroAlumno(`${alumno.apellidos}, ${alumno.nombres}`);
    } else {
      // Si selecciona Todos o limpia
      setFiltroAlumnoId('');
      setFiltroAlumno('');
    }
  };

  const consultar = async () => {
    if (!cursoSeleccionado || !asignaturaSeleccionada) {
      alert('Seleccione curso y asignatura');
      return;
    }

    setConsultando(true);
    try {
      let url = `/docente/${docenteId}/notas/por-asignatura?establecimiento_id=${establecimientoId}&curso_id=${cursoSeleccionado}&asignatura_id=${asignaturaSeleccionada}`;

      if (filtroAlumnoId) {
        url += `&alumno_id=${filtroAlumnoId}`;
      }

      const response = await apiFetch(url);
      const data = await response.json();

      if (data.success) {
        setDatosNotas(data.data || []);
      } else {
        alert(data.error || 'Error al consultar notas');
      }
    } catch (error) {
      console.error('Error al consultar notas:', error);
      alert('Error al consultar notas');
    } finally {
      setConsultando(false);
      setConsultado(true);
    }
  };

  const limpiarFiltros = () => {
    setCursoSeleccionado('');
    setCursoNombre('');
    setAsignaturaSeleccionada('');
    setAsignaturaNombre('');
    setFiltroAlumno('');
    setFiltroAlumnoId('');
    setConsultado(false);
    setDatosNotas([]);
  };

  // Calcular promedios y datos de tabla
  const datosTabla = useMemo(() => {
    return datosNotas.map(alumno => {
      // Calcular promedio de un trimestre
      const calcularPromedio = (notas) => {
        const notasValidas = notas
          .filter(n => !n.es_pendiente && n.nota !== null)
          .map(n => Number(n.nota)); // asegurar number
        if (notasValidas.length === 0) return null;
        return notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length;
      };

      const promedioT1 = calcularPromedio(alumno.notas_t1);
      const promedioT2 = calcularPromedio(alumno.notas_t2);
      const promedioT3 = calcularPromedio(alumno.notas_t3);

      // Calcular promedio final
      const promediosTrimestre = [promedioT1, promedioT2, promedioT3].filter(p => p !== null);
      const promedioFinal = promediosTrimestre.length > 0
        ? promediosTrimestre.reduce((a, b) => a + b, 0) / promediosTrimestre.length
        : null;

      // Estado de aprobación
      const estado = promedioFinal !== null
        ? (promedioFinal >= 4.0 ? 'Aprobado' : 'Reprobado')
        : '-';

      return {
        ...alumno,
        promedioT1,
        promedioT2,
        promedioT3,
        promedioFinal,
        estado
      };
    });
  }, [datosNotas]);

  const formatearNota = (nota) => {
    if (nota === null || nota === undefined) return '-';
    return Number(nota).toFixed(1);
  };

  const formatearNombreAlumno = (nombres, apellidos) => {
    const nombresArr = nombres.split(' ');
    const apellidosArr = apellidos.split(' ');
    const primerApellido = apellidosArr[0] || '';
    const segundoApellido = apellidosArr[1] || '';
    const inicialPrimerNombre = nombresArr[0] ? `${nombresArr[0].charAt(0)}.` : '';
    return `${primerApellido} ${segundoApellido} ${inicialPrimerNombre}`.replace(/\s+/g, ' ').trim();
  };

  return (
    <div className="tab-panel active">
      {/* Fix para Autocomplete Dropdown z-index y scroll */}
      <style>{`
        .autocomplete-suggestions {
            z-index: 1500 !important;
            max-height: 200px !important;
            overflow-y: auto !important;
            border: 1px solid #cbd5e1;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        /* Asegurar que el input del alumno tenga posicion relativa para el dropdown */
        .autocomplete-container {
            position: relative;
            z-index: 1100; /* Mayor que otros inputs */
        }
        /* Overrides para uniformidad en Filtros */
        .docente-filtros-row .form-group {
          margin-bottom: 0 !important;
          min-width: 0;
        }
        .docente-filtros-row .form-control,
        .docente-filtros-row .docente-autocomplete-container input {
          height: 30px !important;
          min-height: 30px !important;
          padding: 0 10px !important;
          font-size: 13px !important;
        }
        .docente-filtros-row label {
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          margin-bottom: 5px !important;
          display: block !important;
          height: 14px;
        }
        /* SelectMovil dropdown sobre contenido */
        .custom-select-options {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 2000 !important;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-height: 200px;
          overflow-y: auto;
        }
        .custom-select-container {
          position: relative;
        }
      `}</style>

      <div className="card" style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
        <div className="card-header"><h3>Buscar Nota</h3></div>
        <div className="card-body" style={{ overflow: 'visible' }}>
          {showMobile ? (
            <>
              <div className="form-row-movil" style={{
                position: 'relative',
                zIndex: (dropdownAbierto === 'curso' || dropdownAbierto === 'asignatura') ? 1002 : 100
              }}>
                {cargandoCursos ? (
                  <div className="form-group">
                    <label>Curso</label>
                    <div style={{ padding: '8px', color: '#64748b' }}>Cargando...</div>
                  </div>
                ) : (
                  <SelectMovil
                    label="Curso"
                    value={cursoSeleccionado}
                    valueName={cursoNombre}
                    onChange={handleCursoChange}
                    options={cursos}
                    placeholder="Seleccionar..."
                    isOpen={dropdownAbierto === 'curso'}
                    onToggle={() => setDropdownAbierto(prev => prev === 'curso' ? null : 'curso')}
                    onClose={() => setDropdownAbierto(null)}
                  />
                )}
                <SelectMovil
                  label="Asignatura"
                  value={asignaturaSeleccionada}
                  valueName={asignaturaNombre}
                  onChange={(id, nombre) => { setAsignaturaSeleccionada(id); setAsignaturaNombre(nombre); }}
                  options={asignaturas}
                  placeholder={cargandoAsignaturas ? 'Cargando...' : (cursoSeleccionado ? 'Seleccionar...' : 'Seleccione curso')}
                  disabled={!cursoSeleccionado || cargandoAsignaturas}
                  isOpen={dropdownAbierto === 'asignatura'}
                  onToggle={() => setDropdownAbierto(prev => prev === 'asignatura' ? null : 'asignatura')}
                  onClose={() => setDropdownAbierto(null)}
                />
              </div>
              <div style={{ position: 'relative', zIndex: 1001 }}>
                <AutocompleteAlumno
                  alumnos={alumnosConTodos}
                  alumnoSeleccionado={filtroAlumnoId}
                  busqueda={filtroAlumno}
                  onBusquedaChange={(val) => { setFiltroAlumno(val); setFiltroAlumnoId(''); }}
                  onSeleccionar={handleSeleccionarAlumno}
                  disabled={!cursoSeleccionado || cargandoAlumnos}
                  placeholder={cargandoAlumnos ? 'Cargando...' : 'Todos'}
                  onDropdownOpen={() => setDropdownAbierto(null)}
                />
              </div>
              <div className="form-actions form-actions-movil">
                <button className="btn btn-secondary" onClick={limpiarFiltros}>Limpiar</button>
                <button className="btn btn-primary" onClick={consultar} disabled={consultando || !cursoSeleccionado || !asignaturaSeleccionada}>
                  {consultando ? 'Consultando...' : 'Consultar'}
                </button>
              </div>
            </>
          ) : (
            // Layout para Tablet y Desktop (Normal)
            <div className="docente-filtros-row" style={{
              gridTemplateColumns: isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr)) auto',
              gap: '15px',
              overflow: 'visible',
              position: 'relative',
              zIndex: 10,
              alignItems: 'end'
            }}>
              {cargandoCursos ? (
                <div className="form-group">
                  <label>Curso</label>
                  <div style={{ padding: '8px', color: '#64748b' }}>Cargando cursos...</div>
                </div>
              ) : (
                <SelectNativo
                  label="Curso"
                  value={cursoSeleccionado}
                  onChange={(e) => {
                    const curso = cursos.find(c => c.id.toString() === e.target.value);
                    handleCursoChange(e.target.value, curso?.nombre || '');
                  }}
                  options={cursos}
                  placeholder="Seleccionar"
                  containerStyle={{ zIndex: 1005, position: 'relative' }}
                />
              )}
              <SelectNativo
                label="Asignatura"
                value={asignaturaSeleccionada}
                onChange={(e) => {
                  const asig = asignaturas.find(a => a.id.toString() === e.target.value);
                  setAsignaturaSeleccionada(e.target.value);
                  setAsignaturaNombre(asig?.nombre || '');
                }}
                options={asignaturas}
                placeholder={cargandoAsignaturas ? 'Cargando...' : (cursoSeleccionado ? 'Seleccionar' : 'Primero seleccione curso')}
                disabled={!cursoSeleccionado || cargandoAsignaturas}
              />
              <div className="autocomplete-container" style={{ position: 'relative', zIndex: 100 }}>
                <AutocompleteAlumno
                  alumnos={alumnosConTodos}
                  alumnoSeleccionado={filtroAlumnoId}
                  busqueda={filtroAlumno}
                  onBusquedaChange={(val) => { setFiltroAlumno(val); setFiltroAlumnoId(''); }}
                  onSeleccionar={handleSeleccionarAlumno}
                  disabled={!cursoSeleccionado || cargandoAlumnos}
                  placeholder={cargandoAlumnos ? 'Cargando...' : (cursoSeleccionado ? 'Todos los alumnos' : 'Primero seleccione curso')}
                />
              </div>
              <div className="docente-filtros-actions" style={{ gridColumn: isTablet ? '1 / -1' : 'auto', justifyContent: isTablet ? 'center' : 'flex-end', marginTop: isTablet ? '10px' : '0', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={limpiarFiltros} style={{ height: '30px', fontSize: '11px', padding: '0 15px', textTransform: 'uppercase', fontWeight: '600' }}>Limpiar</button>
                <button className="btn btn-primary" onClick={consultar} disabled={consultando || !cursoSeleccionado || !asignaturaSeleccionada} style={{ height: '30px', fontSize: '11px', padding: '0 15px', textTransform: 'uppercase', fontWeight: '600' }}>
                  {consultando ? 'Consultando...' : 'Consultar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px', position: 'relative', zIndex: 1 }}>
        <div className="card-header">
          <h3>Calificaciones del Curso {consultado && asignaturaNombre && `- ${asignaturaNombre}`}</h3>
        </div>
        <div className="card-body">
          <div className="docente-tabla-trimestres-container">
            <table className="docente-tabla docente-tabla-trimestres">
              <thead>
                <tr>
                  <th rowSpan="2" className="th-fixed">N</th>
                  <th rowSpan="2" className="th-fixed th-alumno">Alumno</th>
                  <th colSpan="9" className="th-trimestre">Trimestre 1</th>
                  <th colSpan="9" className="th-trimestre">Trimestre 2</th>
                  <th colSpan="9" className="th-trimestre">Trimestre 3</th>
                  <th rowSpan="2" className="th-fixed th-final" style={{ width: '45px' }}>PROM</th>
                  <th rowSpan="2" className="th-fixed" style={{ width: '40px' }}>APR</th>
                </tr>
                <tr>
                  <NotasHeaders />
                  <NotasHeaders />
                  <NotasHeaders />
                </tr>
              </thead>
              <tbody>
                {consultando ? (
                  <tr>
                    <td colSpan="31" className="text-center text-muted">Consultando...</td>
                  </tr>
                ) : datosTabla.length > 0 ? (
                  datosTabla.map((row, index) => (
                    <tr key={row.alumno_id}>
                      <td>{index + 1}</td>
                      <td className="td-alumno">{formatearNombreAlumno(row.alumno_nombres, row.alumno_apellidos)}</td>
                      {renderNotasCeldas(row.notas_t1)}
                      <td className={`td-prom ${getNotaClass(row.promedioT1)}`}>{formatearNota(row.promedioT1)}</td>
                      {renderNotasCeldas(row.notas_t2)}
                      <td className={`td-prom ${getNotaClass(row.promedioT2)}`}>{formatearNota(row.promedioT2)}</td>
                      {renderNotasCeldas(row.notas_t3)}
                      <td className={`td-prom ${getNotaClass(row.promedioT3)}`}>{formatearNota(row.promedioT3)}</td>
                      <td className={`td-final ${getNotaClass(row.promedioFinal)}`}>{formatearNota(row.promedioFinal)}</td>
                      <td
                        className={row.estado === 'Aprobado' ? 'estado-aprobado' : row.estado === 'Reprobado' ? 'estado-reprobado' : ''}
                        style={{ textAlign: 'center', fontSize: '10px', fontWeight: '600' }}
                      >
                        {row.estado === 'Aprobado' ? 'APR' : row.estado === 'Reprobado' ? 'REP' : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="31" className="text-center text-muted">
                      {consultado ? 'No hay datos para mostrar' : 'Seleccione curso y asignatura, luego presione Consultar'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  );
}

// Export default wrapper
function VerNotasTab(props) {
  return (
    <ComponentErrorBoundary>
      <VerNotasTabInternal {...props} />
    </ComponentErrorBoundary>
  );
}

export default VerNotasTab;
