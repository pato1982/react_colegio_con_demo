import React, { useState, useEffect, useMemo } from 'react';
import { useMensaje } from '../contexts';
import { useDropdown } from '../hooks';
import config from '../config/env';

function NotasPorCursoTab() {
  const { mostrarMensaje } = useMensaje();
  const { dropdownAbierto, setDropdownAbierto } = useDropdown();

  // Filtros
  const [filtros, setFiltros] = useState({
    cursoId: '',
    cursoNombre: '',
    asignaturaId: '',
    asignaturaNombre: '',
    trimestre: 'todas',
    trimestreNombre: 'Todas (Ver todos)'
  });

  // Datos de la BD
  const [cursosDB, setCursosDB] = useState([]);
  const [asignaturasDB, setAsignaturasDB] = useState([]);
  const [alumnosConNotas, setAlumnosConNotas] = useState([]);
  const [trimestresActivos, setTrimestresActivos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Trimestres disponibles
  const trimestres = [
    { id: 1, nombre: 'Trimestre 1' },
    { id: 2, nombre: 'Trimestre 2' },
    { id: 3, nombre: 'Trimestre 3' }
  ];

  // Abreviar nombres compuestos de asignaturas
  const abreviarNombre = (nombre) => {
    const palabras = nombre.split(' ');
    if (palabras.length >= 2) {
      return palabras.map(p => {
        if (p.length <= 4) return p;
        return p.substring(0, 3) + '.';
      }).join(' ');
    }
    return nombre;
  };

  // Cargar cursos al montar
  useEffect(() => {
    cargarCursos();
  }, []);

  // Cargar asignaturas cuando cambia el curso
  useEffect(() => {
    if (filtros.cursoId) {
      cargarAsignaturasPorCurso(filtros.cursoId);
    } else {
      setAsignaturasDB([]);
      setFiltros(prev => ({ ...prev, asignaturaId: '', asignaturaNombre: '', trimestre: 'todas', trimestreNombre: 'Todas (Ver todos)' }));
    }
  }, [filtros.cursoId]);

  // Cargar notas cuando cambia asignatura o trimestre
  useEffect(() => {
    if (filtros.cursoId && filtros.asignaturaId && filtros.trimestre) {
      cargarNotas();
    } else {
      setAlumnosConNotas([]);
      setTrimestresActivos([]);
    }
  }, [filtros.cursoId, filtros.asignaturaId, filtros.trimestre]);

  const cargarCursos = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/cursos`);
      const data = await response.json();
      if (data.success) {
        setCursosDB(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando cursos:', error);
    }
  };

  const cargarAsignaturasPorCurso = async (cursoId) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/asignaturas/por-curso/${cursoId}`);
      const data = await response.json();
      if (data.success) {
        setAsignaturasDB(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando asignaturas del curso:', error);
      setAsignaturasDB([]);
    }
  };

  const cargarNotas = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({
        curso_id: filtros.cursoId,
        asignatura_id: filtros.asignaturaId,
        trimestre: filtros.trimestre
      });

      const response = await fetch(`${config.apiBaseUrl}/notas/por-curso?${params}`);
      const data = await response.json();

      if (data.success) {
        setAlumnosConNotas(data.data || []);
        setTrimestresActivos(data.trimestres || []);
      }
    } catch (error) {
      console.error('Error cargando notas:', error);
      mostrarMensaje('Error', 'Error al cargar notas', 'error');
    } finally {
      setCargando(false);
    }
  };

  // Handlers de filtros
  const handleCursoSelect = (id, nombre) => {
    setFiltros({
      cursoId: id,
      cursoNombre: nombre,
      asignaturaId: '',
      asignaturaNombre: '',
      trimestre: 'todas',
      trimestreNombre: 'Todas (Ver todos)'
    });
    setDropdownAbierto(null);
  };

  const handleAsignaturaSelect = (id, nombre) => {
    setFiltros({
      ...filtros,
      asignaturaId: id,
      asignaturaNombre: nombre,
      trimestre: 'todas',
      trimestreNombre: 'Todas (Ver todos)'
    });
    setDropdownAbierto(null);
  };

  const handleTrimestreSelect = (id, nombre) => {
    setFiltros({
      ...filtros,
      trimestre: id,
      trimestreNombre: nombre
    });
    setDropdownAbierto(null);
  };

  // Calcular promedio de notas
  const calcularPromedio = (notas) => {
    if (!notas || notas.length === 0) return null;
    const notasValidas = notas.filter(n => n.nota !== null && n.nota !== undefined);
    if (notasValidas.length === 0) return null;
    const suma = notasValidas.reduce((acc, n) => acc + parseFloat(n.nota), 0);
    return (suma / notasValidas.length).toFixed(1);
  };

  // Abreviar nombre de alumno
  const abreviarNombreAlumno = (nombreCompleto) => {
    const partes = nombreCompleto.trim().split(' ');
    if (partes.length >= 4) {
      const nombre1 = partes[0];
      const nombre2Inicial = partes[1].charAt(0) + '.';
      const apellido1 = partes[2];
      const apellido2Inicial = partes[3].charAt(0) + '.';
      return `${nombre1} ${nombre2Inicial} ${apellido1} ${apellido2Inicial}`;
    } else if (partes.length === 3) {
      const apellido2Inicial = partes[2].charAt(0) + '.';
      return `${partes[0]} ${partes[1]} ${apellido2Inicial}`;
    }
    return nombreCompleto;
  };

  // Verificar si hay datos para mostrar
  const hayDatos = filtros.cursoId && filtros.asignaturaId && filtros.trimestre;
  const mostrarTodas = filtros.trimestre === 'todas';

  // Obtener el número máximo de notas por trimestre (para columnas)
  const maxNotasPorTrimestre = useMemo(() => {
    if (!alumnosConNotas.length) return 8;
    let max = 0;
    alumnosConNotas.forEach(alumno => {
      trimestresActivos.forEach(trim => {
        const cantidadNotas = alumno.notas[trim]?.length || 0;
        if (cantidadNotas > max) max = cantidadNotas;
      });
    });
    return Math.max(max, 8); // Mínimo 8 columnas
  }, [alumnosConNotas, trimestresActivos]);

  return (
    <div className="tab-panel active">
      <div className="card">
        <div className="card-header">
          <h3>Notas por Curso y Asignatura</h3>
        </div>
        <div className="card-body">
          <div className="form-row form-row-filtros form-row-tres filtros-notas-curso">
            <div className="form-group">
              <label>Curso</label>
              <div className="custom-select-container">
                <div
                  className="custom-select-trigger"
                  onClick={() => setDropdownAbierto(dropdownAbierto === 'curso' ? null : 'curso')}
                >
                  <span>{filtros.cursoNombre || 'Todos los cursos'}</span>
                  <span className="custom-select-arrow">▼</span>
                </div>
                {dropdownAbierto === 'curso' && (
                  <div className="custom-select-options">
                    <div
                      className={`custom-select-option ${!filtros.cursoId ? 'selected' : ''}`}
                      onClick={() => handleCursoSelect('', '')}
                    >
                      Todos los cursos
                    </div>
                    {cursosDB.map(curso => (
                      <div
                        key={curso.id}
                        className={`custom-select-option ${filtros.cursoId === String(curso.id) ? 'selected' : ''}`}
                        onClick={() => handleCursoSelect(String(curso.id), curso.nombre)}
                      >
                        {curso.nombre}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Asignatura</label>
              <div className={`custom-select-container ${!filtros.cursoId ? 'disabled' : ''}`}>
                <div
                  className="custom-select-trigger"
                  onClick={() => filtros.cursoId && setDropdownAbierto(dropdownAbierto === 'asignatura' ? null : 'asignatura')}
                >
                  <span>{filtros.asignaturaNombre || 'Todas las asignaturas'}</span>
                  <span className="custom-select-arrow">▼</span>
                </div>
                {dropdownAbierto === 'asignatura' && (
                  <div className="custom-select-options">
                    <div
                      className={`custom-select-option ${!filtros.asignaturaId ? 'selected' : ''}`}
                      onClick={() => handleAsignaturaSelect('', '')}
                    >
                      Todas las asignaturas
                    </div>
                    {asignaturasDB.map(asig => (
                      <div
                        key={asig.id}
                        className={`custom-select-option ${filtros.asignaturaId === String(asig.id) ? 'selected' : ''}`}
                        onClick={() => handleAsignaturaSelect(String(asig.id), abreviarNombre(asig.nombre))}
                      >
                        {abreviarNombre(asig.nombre)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Trimestre</label>
              <div className={`custom-select-container ${!filtros.asignaturaId ? 'disabled' : ''}`}>
                <div
                  className="custom-select-trigger"
                  onClick={() => filtros.asignaturaId && setDropdownAbierto(dropdownAbierto === 'trimestre' ? null : 'trimestre')}
                >
                  <span>{filtros.trimestreNombre}</span>
                  <span className="custom-select-arrow">▼</span>
                </div>
                {dropdownAbierto === 'trimestre' && (
                  <div className="custom-select-options">
                    <div
                      className={`custom-select-option ${filtros.trimestre === 'todas' ? 'selected' : ''}`}
                      onClick={() => handleTrimestreSelect('todas', 'Todas (Ver todos)')}
                    >
                      Todas (Ver todos)
                    </div>
                    {trimestres.map(trim => (
                      <div
                        key={trim.id}
                        className={`custom-select-option ${filtros.trimestre === String(trim.id) ? 'selected' : ''}`}
                        onClick={() => handleTrimestreSelect(String(trim.id), trim.nombre)}
                      >
                        {trim.nombre}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {cargando ? (
            <div className="text-center text-muted" style={{ padding: '40px' }}>
              Cargando notas...
            </div>
          ) : hayDatos ? (
            <div className="tabla-notas-curso-container">
              <div className="table-responsive table-scroll">
                {mostrarTodas ? (
                  /* Tabla con TODAS las notas de todos los trimestres */
                  <table className="data-table tabla-notas-amplia">
                    <thead>
                      <tr>
                        <th rowSpan="2" className="th-nombre">Alumno</th>
                        {trimestres.map(trim => (
                          <th key={trim.id} colSpan={maxNotasPorTrimestre + 1} className="th-trimestre">
                            T{trim.id}
                          </th>
                        ))}
                        <th rowSpan="2" className="th-promedio-final">P.F.</th>
                      </tr>
                      <tr>
                        {trimestres.map(trim => (
                          <React.Fragment key={`notas-header-${trim.id}`}>
                            {Array.from({ length: maxNotasPorTrimestre }, (_, i) => (
                              <th key={`h-${trim.id}-${i}`} className="th-nota">{i + 1}</th>
                            ))}
                            <th className="th-prom-trim">P</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alumnosConNotas.length > 0 ? (
                        alumnosConNotas.map(alumno => {
                          const promediosTrimestre = trimestres.map(trim =>
                            calcularPromedio(alumno.notas[trim.id] || [])
                          );
                          const promediosValidos = promediosTrimestre.filter(p => p !== null);
                          const promedioFinal = promediosValidos.length > 0
                            ? (promediosValidos.reduce((a, b) => a + parseFloat(b), 0) / promediosValidos.length).toFixed(1)
                            : null;

                          return (
                            <tr key={alumno.id}>
                              <td className="celda-nombre">{abreviarNombreAlumno(alumno.nombre_completo)}</td>
                              {trimestres.map((trim, trimIdx) => {
                                const notasTrim = alumno.notas[trim.id] || [];
                                const promTrim = promediosTrimestre[trimIdx];

                                return (
                                  <React.Fragment key={`notas-${alumno.id}-${trim.id}`}>
                                    {Array.from({ length: maxNotasPorTrimestre }, (_, i) => {
                                      const notaObj = notasTrim.find(n => n.numero === i + 1);
                                      return (
                                        <td key={`n-${trim.id}-${i}`} className="celda-nota">
                                          {notaObj ? (
                                            <span className={`nota-valor ${parseFloat(notaObj.nota) >= 4.0 ? 'nota-aprobada' : 'nota-reprobada'}`}>
                                              {parseFloat(notaObj.nota).toFixed(1)}
                                            </span>
                                          ) : (
                                            <span className="nota-vacia">-</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td className={`celda-promedio-trim ${promTrim ? (parseFloat(promTrim) >= 4.0 ? 'promedio-aprobado' : 'promedio-reprobado') : ''}`}>
                                      {promTrim || '-'}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                              <td className={`celda-promedio-final ${promedioFinal ? (parseFloat(promedioFinal) >= 4.0 ? 'promedio-aprobado' : 'promedio-reprobado') : ''}`}>
                                {promedioFinal || '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={2 + (trimestres.length * (maxNotasPorTrimestre + 1))} className="text-center text-muted">
                            No hay alumnos en este curso
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  /* Tabla de un solo trimestre */
                  <table className="data-table tabla-notas-amplia">
                    <thead>
                      <tr>
                        <th className="th-nombre">Alumno</th>
                        {Array.from({ length: maxNotasPorTrimestre }, (_, i) => (
                          <th key={`h-${i}`} className="th-nota">{i + 1}</th>
                        ))}
                        <th className="th-promedio-final">Prom.</th>
                        <th className="th-estado">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnosConNotas.length > 0 ? (
                        alumnosConNotas.map(alumno => {
                          const trimestreActual = parseInt(filtros.trimestre);
                          const notasTrim = alumno.notas[trimestreActual] || [];
                          const promedio = calcularPromedio(notasTrim);
                          const aprobado = promedio && parseFloat(promedio) >= 4.0;

                          return (
                            <tr key={alumno.id}>
                              <td className="celda-nombre">{abreviarNombreAlumno(alumno.nombre_completo)}</td>
                              {Array.from({ length: maxNotasPorTrimestre }, (_, i) => {
                                const notaObj = notasTrim.find(n => n.numero === i + 1);
                                return (
                                  <td key={`n-${i}`} className="celda-nota">
                                    {notaObj ? (
                                      <span className={`nota-valor ${parseFloat(notaObj.nota) >= 4.0 ? 'nota-aprobada' : 'nota-reprobada'}`}>
                                        {parseFloat(notaObj.nota).toFixed(1)}
                                      </span>
                                    ) : (
                                      <span className="nota-vacia">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className={`celda-promedio-final ${promedio ? (aprobado ? 'promedio-aprobado' : 'promedio-reprobado') : ''}`}>
                                {promedio || '-'}
                              </td>
                              <td className={`celda-estado ${promedio ? (aprobado ? 'estado-aprobado' : 'estado-reprobado') : ''}`}>
                                {promedio ? (aprobado ? 'Aprobado' : 'Reprobado') : '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={maxNotasPorTrimestre + 3} className="text-center text-muted">
                            No hay alumnos en este curso
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Leyenda */}
              <div className="leyenda-notas" style={{ marginTop: '15px', fontSize: '0.85rem' }}>
                <span style={{ marginRight: '20px' }}>
                  <span className="promedio-aprobado" style={{ padding: '2px 8px', borderRadius: '3px' }}>Aprobado</span>
                  <span style={{ marginLeft: '5px' }}>(Nota &gt;= 4.0)</span>
                </span>
                <span>
                  <span className="promedio-reprobado" style={{ padding: '2px 8px', borderRadius: '3px' }}>Reprobado</span>
                  <span style={{ marginLeft: '5px' }}>(Nota &lt; 4.0)</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted" style={{ padding: '40px' }}>
              {!filtros.cursoId
                ? 'Seleccione un curso para comenzar'
                : !filtros.asignaturaId
                  ? 'Seleccione una asignatura'
                  : 'Seleccione un trimestre para ver las notas'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotasPorCursoTab;
