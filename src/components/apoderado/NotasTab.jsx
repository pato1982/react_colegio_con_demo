import React, { useMemo, useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

function NotasTab({ pupilo, notas: notasProp }) {
  const [notas, setNotas] = useState(notasProp || []);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [notaSeleccionada, setNotaSeleccionada] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Actualizar notas si cambian las props (ej: filtro en padre)
  useEffect(() => {
    if (notasProp) {
      setNotas(notasProp);
    }
  }, [notasProp]);

  // Cargar notas desde API solo si NO se proveen por props
  useEffect(() => {
    // Si tenemos notas por props (incluso array vacio si es intencional, pero aqui asumimos que si se pasa es para usarlo)
    // Para ser robustos: si notasProp no es undefined, usamos eso.
    if (notasProp !== undefined) return;

    const cargarNotas = async () => {
      if (!pupilo?.id) {
        setNotas([]);
        return;
      }

      setCargando(true);
      setError('');

      try {
        const url = `/apoderado/pupilo/${pupilo.id}/notas`;
        const response = await apiFetch(url);
        const data = await response.json();

        if (data.success) {
          setNotas(data.data || []);
        } else {
          setError(data.error || 'Error al cargar notas');
        }
      } catch (err) {
        console.error('Error cargando notas:', err);
        setError('Error de conexion');
      } finally {
        setCargando(false);
      }
    };

    cargarNotas();
  }, [pupilo?.id, notasProp]);

  // Obtener asignaturas unicas
  const asignaturas = useMemo(() => {
    const unicas = [...new Set(notas.map(n => n.asignatura))];
    return unicas.sort();
  }, [notas]);

  // Organizar notas por asignatura y trimestre (guardando objeto completo)
  // Usa numero_evaluacion como indice para ubicar cada nota en su columna correcta
  const notasOrganizadas = useMemo(() => {
    const organizadas = {};

    asignaturas.forEach(asig => {
      organizadas[asig] = {
        1: Array(8).fill(undefined), // Trimestre 1 - 8 columnas
        2: Array(8).fill(undefined), // Trimestre 2 - 8 columnas
        3: Array(8).fill(undefined)  // Trimestre 3 - 8 columnas
      };
    });

    notas.forEach(nota => {
      if (organizadas[nota.asignatura] && organizadas[nota.asignatura][nota.trimestre]) {
        // Usar numero_evaluacion - 1 como indice (0-based)
        const idx = (nota.numero_evaluacion || 1) - 1;
        if (idx >= 0 && idx < 8) {
          organizadas[nota.asignatura][nota.trimestre][idx] = nota;
        }
      }
    });

    return organizadas;
  }, [notas, asignaturas]);

  // Calcular promedios por asignatura y trimestre
  const promediosPorAsignaturaTrimestre = useMemo(() => {
    const promedios = {};
    asignaturas.forEach(asig => {
      promedios[asig] = {};
      [1, 2, 3].forEach(trim => {
        // Filtrar: debe existir (no undefined), tener nota y no ser pendiente
        const notasTrim = notasOrganizadas[asig][trim].filter(n => n && n.nota !== null && !n.es_pendiente);
        if (notasTrim.length > 0) {
          const suma = notasTrim.reduce((acc, n) => acc + parseFloat(n.nota), 0);
          promedios[asig][trim] = suma / notasTrim.length;
        } else {
          promedios[asig][trim] = null;
        }
      });
    });
    return promedios;
  }, [asignaturas, notasOrganizadas]);

  // Calcular promedio final (promedio de los tres trimestres)
  const promediosPorAsignatura = useMemo(() => {
    const promedios = {};
    asignaturas.forEach(asig => {
      const promediosTrim = [1, 2, 3]
        .map(trim => promediosPorAsignaturaTrimestre[asig][trim])
        .filter(p => p !== null);
      if (promediosTrim.length > 0) {
        const suma = promediosTrim.reduce((acc, n) => acc + n, 0);
        promedios[asig] = (suma / promediosTrim.length).toFixed(1);
      } else {
        promedios[asig] = '-';
      }
    });
    return promedios;
  }, [asignaturas, promediosPorAsignaturaTrimestre]);

  // Calcular promedio general
  const promedioGeneral = useMemo(() => {
    const notasValidas = notas.filter(n => n.nota !== null && !n.es_pendiente);
    if (notasValidas.length > 0) {
      const suma = notasValidas.reduce((acc, n) => acc + parseFloat(n.nota), 0);
      return (suma / notasValidas.length).toFixed(1);
    }
    return '-';
  }, [notas]);

  const getNotaClass = (nota) => {
    if (nota < 4.0) return 'nota-roja';
    if (nota < 5.0) return 'nota-amarilla';
    return 'nota-azul';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleNotaClick = (nota, event) => {
    event.stopPropagation();
    const rect = event.target.getBoundingClientRect();
    setPopupPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 5
    });
    setNotaSeleccionada(nota);
  };

  const cerrarPopup = () => {
    setNotaSeleccionada(null);
  };

  // Generar array de 8 columnas por trimestre
  const columnasNotas = Array.from({ length: 8 }, (_, i) => i + 1);

  // Si no hay pupilo seleccionado
  if (!pupilo) {
    return (
      <div className="tab-panel active">
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#64748b', padding: '40px 0' }}>
              No hay pupilo seleccionado. Seleccione un pupilo para ver sus notas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si está cargando
  if (cargando) {
    return (
      <div className="tab-panel active">
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#64748b', padding: '40px 0' }}>
              Cargando notas...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si hay error
  if (error) {
    return (
      <div className="tab-panel active">
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#ef4444', padding: '40px 0' }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay notas
  if (notas.length === 0) {
    return (
      <div className="tab-panel active">
        <div className="card">
          <div className="card-header">
            <h3>Libro de Calificaciones</h3>
          </div>
          <div className="card-body text-center">
            <p style={{ color: '#64748b', padding: '40px 0' }}>
              No hay notas registradas para {pupilo.nombres} {pupilo.apellidos}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel active" onClick={cerrarPopup}>
      <style>{`
        @media (max-width: 699px) {
          .card-header h3 {
            font-size: 12px !important;
          }
          .asignatura-nombre {
            font-size: 11px !important;
            padding: 4px 1px !important;
            white-space: normal !important; /* Permitir saltos de línea si es necesario */
            line-height: 1.1 !important;
            max-width: 80px; /* Limitar ancho para forzar quiebre si es muy largo */
          }
          .nota-valor {
            font-size: 9px !important;
          }
          .asignatura-header {
            text-align: center !important;
            vertical-align: middle !important;
          }
        }
      `}</style>
      <div className="card">
        <div className="card-header">
          <h3>Libro de Calificaciones</h3>
          <span className="promedio-badge">
            Promedio General: {promedioGeneral}
          </span>
        </div>
        <div className="card-body">
          <div className="tabla-notas-container">
            <table className="tabla-notas-anual">
              <thead>
                <tr className="trimestre-header">
                  <th rowSpan="2" className="asignatura-header">Asignatura</th>
                  <th colSpan="9" className="trimestre-col trimestre-1">1er Trimestre</th>
                  <th colSpan="9" className="trimestre-col trimestre-2">2do Trimestre</th>
                  <th colSpan="9" className="trimestre-col trimestre-3">3er Trimestre</th>
                  <th rowSpan="2" className="promedio-header promedio-final-header">Prom. Final</th>
                </tr>
                <tr className="notas-header">
                  {/* Trimestre 1 */}
                  {columnasNotas.map(num => (
                    <th key={`t1-${num}`} className="nota-col trimestre-1">N{num}</th>
                  ))}
                  <th className="nota-col promedio-trim-header trimestre-1">PT1</th>
                  {/* Trimestre 2 */}
                  {columnasNotas.map(num => (
                    <th key={`t2-${num}`} className="nota-col trimestre-2">N{num}</th>
                  ))}
                  <th className="nota-col promedio-trim-header trimestre-2">PT2</th>
                  {/* Trimestre 3 */}
                  {columnasNotas.map(num => (
                    <th key={`t3-${num}`} className="nota-col trimestre-3">N{num}</th>
                  ))}
                  <th className="nota-col promedio-trim-header trimestre-3">PT3</th>
                </tr>
              </thead>
              <tbody>
                {asignaturas.map(asig => {
                  const promT1 = promediosPorAsignaturaTrimestre[asig][1];
                  const promT2 = promediosPorAsignaturaTrimestre[asig][2];
                  const promT3 = promediosPorAsignaturaTrimestre[asig][3];
                  return (
                    <tr key={asig}>
                      <td className="asignatura-nombre">{asig}</td>
                      {/* Notas Trimestre 1 */}
                      {columnasNotas.map((_, idx) => {
                        const notaObj = notasOrganizadas[asig][1][idx];
                        return (
                          <td key={`t1-${idx}`} className="nota-celda trimestre-1">
                            {notaObj !== undefined ? (
                              notaObj.es_pendiente ? (
                                <span className="nota-valor nota-pendiente">P</span>
                              ) : (
                                <span
                                  className={`nota-valor nota-clickable ${getNotaClass(parseFloat(notaObj.nota))}`}
                                  onClick={(e) => handleNotaClick(notaObj, e)}
                                >
                                  {parseFloat(notaObj.nota).toFixed(1)}
                                </span>
                              )
                            ) : (
                              <span className="nota-vacia">-</span>
                            )}
                          </td>
                        );
                      })}
                      {/* Promedio Trimestre 1 */}
                      <td className="nota-celda promedio-trim-celda trimestre-1">
                        {promT1 !== null ? (
                          <span className={`nota-valor promedio-trim ${getNotaClass(promT1)}`}>
                            {promT1.toFixed(1)}
                          </span>
                        ) : (
                          <span className="nota-vacia">-</span>
                        )}
                      </td>
                      {/* Notas Trimestre 2 */}
                      {columnasNotas.map((_, idx) => {
                        const notaObj = notasOrganizadas[asig][2][idx];
                        return (
                          <td key={`t2-${idx}`} className="nota-celda trimestre-2">
                            {notaObj !== undefined ? (
                              notaObj.es_pendiente ? (
                                <span className="nota-valor nota-pendiente">P</span>
                              ) : (
                                <span
                                  className={`nota-valor nota-clickable ${getNotaClass(parseFloat(notaObj.nota))}`}
                                  onClick={(e) => handleNotaClick(notaObj, e)}
                                >
                                  {parseFloat(notaObj.nota).toFixed(1)}
                                </span>
                              )
                            ) : (
                              <span className="nota-vacia">-</span>
                            )}
                          </td>
                        );
                      })}
                      {/* Promedio Trimestre 2 */}
                      <td className="nota-celda promedio-trim-celda trimestre-2">
                        {promT2 !== null ? (
                          <span className={`nota-valor promedio-trim ${getNotaClass(promT2)}`}>
                            {promT2.toFixed(1)}
                          </span>
                        ) : (
                          <span className="nota-vacia">-</span>
                        )}
                      </td>
                      {/* Notas Trimestre 3 */}
                      {columnasNotas.map((_, idx) => {
                        const notaObj = notasOrganizadas[asig][3][idx];
                        return (
                          <td key={`t3-${idx}`} className="nota-celda trimestre-3">
                            {notaObj !== undefined ? (
                              notaObj.es_pendiente ? (
                                <span className="nota-valor nota-pendiente">P</span>
                              ) : (
                                <span
                                  className={`nota-valor nota-clickable ${getNotaClass(parseFloat(notaObj.nota))}`}
                                  onClick={(e) => handleNotaClick(notaObj, e)}
                                >
                                  {parseFloat(notaObj.nota).toFixed(1)}
                                </span>
                              )
                            ) : (
                              <span className="nota-vacia">-</span>
                            )}
                          </td>
                        );
                      })}
                      {/* Promedio Trimestre 3 */}
                      <td className="nota-celda promedio-trim-celda trimestre-3">
                        {promT3 !== null ? (
                          <span className={`nota-valor promedio-trim ${getNotaClass(promT3)}`}>
                            {promT3.toFixed(1)}
                          </span>
                        ) : (
                          <span className="nota-vacia">-</span>
                        )}
                      </td>
                      {/* Promedio Final */}
                      <td className="promedio-celda promedio-final-celda">
                        <span className={`nota-valor promedio-final ${promediosPorAsignatura[asig] !== '-' ? getNotaClass(parseFloat(promediosPorAsignatura[asig])) : ''}`}>
                          {promediosPorAsignatura[asig]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Popup de detalle de nota */}
      {notaSeleccionada && (
        <div
          className="nota-popup"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="nota-popup-header">
            <span className={`nota-popup-valor ${getNotaClass(parseFloat(notaSeleccionada.nota))}`}>
              {parseFloat(notaSeleccionada.nota).toFixed(1)}
            </span>
            <span className="nota-popup-asignatura">{notaSeleccionada.asignatura}</span>
          </div>
          <div className="nota-popup-body">
            <div className="nota-popup-fecha">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatearFecha(notaSeleccionada.fecha)}
            </div>
            {notaSeleccionada.comentario && (
              <div className="nota-popup-comentario">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {notaSeleccionada.comentario}
              </div>
            )}
            {!notaSeleccionada.comentario && (
              <div className="nota-popup-sin-comentario">No hay comentarios</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotasTab;
