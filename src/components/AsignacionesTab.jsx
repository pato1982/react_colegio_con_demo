import React, { useState, useEffect, useMemo } from 'react';
import { useMensaje } from '../contexts';
import { useDropdown } from '../hooks';
import { apiFetch } from '../utils/api';

function AsignacionesTab() {
  const { mostrarMensaje } = useMensaje();
  const [subTab, setSubTab] = useState('asignar');
  const { dropdownAbierto, setDropdownAbierto } = useDropdown();

  // Datos del formulario
  const [formData, setFormData] = useState({
    docenteId: '',
    cursoId: '',
    docenteNombre: '',
    cursoNombre: '',
    asignaturas: []
  });

  // Filtros para listado
  const [filtros, setFiltros] = useState({ cursoId: '', docenteId: '', cursoNombre: '', docenteNombre: '' });

  // Datos de la BD
  const [docentesDB, setDocentesDB] = useState([]);
  const [cursosDB, setCursosDB] = useState([]);
  const [asignacionesDB, setAsignacionesDB] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    cargarDocentes();
    cargarCursos();
    cargarAsignaciones();
  }, []);

  const cargarDocentes = async () => {
    try {
      const response = await apiFetch(`/docentes`);
      const data = await response.json();
      if (data.success) {
        setDocentesDB(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando docentes:', error);
    }
  };

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

  const cargarAsignaciones = async () => {
    try {
      const response = await apiFetch(`/asignaciones`);
      const data = await response.json();
      if (data.success) {
        setAsignacionesDB(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando asignaciones:', error);
    }
  };

  // Obtener asignaturas del docente seleccionado
  const asignaturasDelDocente = useMemo(() => {
    if (!formData.docenteId) return [];
    const docente = docentesDB.find(d => d.id === parseInt(formData.docenteId));
    return docente?.asignaturas || [];
  }, [formData.docenteId, docentesDB]);

  // Handlers del formulario
  const handleDocenteChange = (id, nombre) => {
    setFormData({
      ...formData,
      docenteId: id,
      docenteNombre: nombre,
      asignaturas: [] // Limpiar asignaturas al cambiar docente
    });
    setDropdownAbierto(null);
  };

  const handleCursoChange = (id, nombre) => {
    setFormData({
      ...formData,
      cursoId: id,
      cursoNombre: nombre
    });
    setDropdownAbierto(null);
  };

  const handleAsignaturaChange = (asignaturaId) => {
    const nuevasAsignaturas = formData.asignaturas.includes(asignaturaId)
      ? formData.asignaturas.filter(id => id !== asignaturaId)
      : [...formData.asignaturas, asignaturaId];
    setFormData({ ...formData, asignaturas: nuevasAsignaturas });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.docenteId || !formData.cursoId || formData.asignaturas.length === 0) {
      mostrarMensaje('Error', 'Debe seleccionar docente, curso y al menos una asignatura', 'error');
      return;
    }

    setCargando(true);

    try {
      const response = await apiFetch(`/asignaciones`, {
        method: 'POST',

        body: JSON.stringify({
          docente_id: parseInt(formData.docenteId),
          curso_id: parseInt(formData.cursoId),
          asignaturas: formData.asignaturas,
          establecimiento_id: 1,
          usuario_id: null,
          tipo_usuario: 'administrador',
          nombre_usuario: 'Administrador del Sistema'
        })
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje('Exito', data.message, 'success');
        limpiarFormulario();
        cargarAsignaciones();
      } else {
        mostrarMensaje('Error', data.error || 'Error al crear asignacion', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error', 'Error de conexion al servidor', 'error');
    } finally {
      setCargando(false);
    }
  };

  const limpiarFormulario = () => {
    setFormData({
      docenteId: '',
      cursoId: '',
      docenteNombre: '',
      cursoNombre: '',
      asignaturas: []
    });
  };

  const eliminarAsignacion = async (asignacion) => {
    if (window.confirm(`¿Desea eliminar la asignacion de ${asignacion.docente_nombre_completo} - ${asignacion.curso_nombre} - ${asignacion.asignatura_nombre}?`)) {
      try {
        const response = await apiFetch(`/asignaciones/${asignacion.id}`, {
          method: 'DELETE',
  
          body: JSON.stringify({
            establecimiento_id: 1,
            usuario_id: null,
            tipo_usuario: 'administrador',
            nombre_usuario: 'Administrador del Sistema'
          })
        });

        const data = await response.json();
        if (data.success) {
          mostrarMensaje('Exito', 'Asignacion eliminada correctamente', 'success');
          cargarAsignaciones();
        } else {
          mostrarMensaje('Error', data.error || 'Error al eliminar', 'error');
        }
      } catch (error) {
        mostrarMensaje('Error', 'Error de conexion', 'error');
      }
    }
  };

  // Filtrar asignaciones
  const asignacionesFiltradas = useMemo(() => {
    return asignacionesDB.filter(asig => {
      const matchCurso = !filtros.cursoId || asig.curso_id === parseInt(filtros.cursoId);
      const matchDocente = !filtros.docenteId || asig.docente_id === parseInt(filtros.docenteId);
      return matchCurso && matchDocente;
    });
  }, [asignacionesDB, filtros]);

  // Abreviar nombres largos
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

  return (
    <div className="tab-panel active">
      {/* Sub-pestanas para movil */}
      <div className="sub-tabs-mobile sub-tabs-asignaciones">
        <button
          type="button"
          className={`sub-tab-btn ${subTab === 'asignar' ? 'active' : ''}`}
          onClick={() => setSubTab('asignar')}
        >
          Asignar Docente
        </button>
        <button
          type="button"
          className={`sub-tab-btn ${subTab === 'listado' ? 'active' : ''}`}
          onClick={() => setSubTab('listado')}
        >
          Asignaciones Actuales
        </button>
      </div>

      <div className="two-columns">
        {/* Columna Izquierda: Asignar Docente a Curso */}
        <div className={`column ${subTab === 'listado' ? 'hidden-mobile' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h3>Asignar Docente a Curso</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row form-row-filtros filtros-asignaciones-form">
                  <div className="form-group">
                    <label>Docente</label>
                    <div className="custom-select-container">
                      <div
                        className="custom-select-trigger"
                        onClick={() => setDropdownAbierto(dropdownAbierto === 'formDocente' ? null : 'formDocente')}
                      >
                        <span>{formData.docenteNombre || 'Seleccionar docente...'}</span>
                        <span className="custom-select-arrow">{dropdownAbierto === 'formDocente' ? '▲' : '▼'}</span>
                      </div>
                      {dropdownAbierto === 'formDocente' && (
                        <div className="custom-select-options">
                          <div className="custom-select-option" onClick={() => handleDocenteChange('', '')}>Seleccionar docente...</div>
                          {docentesDB.map(docente => (
                            <div
                              key={docente.id}
                              className={`custom-select-option ${formData.docenteId === String(docente.id) ? 'selected' : ''}`}
                              onClick={() => handleDocenteChange(String(docente.id), docente.nombre_completo)}
                            >
                              {docente.nombre_completo}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Curso</label>
                    <div className="custom-select-container">
                      <div
                        className="custom-select-trigger"
                        onClick={() => setDropdownAbierto(dropdownAbierto === 'formCurso' ? null : 'formCurso')}
                      >
                        <span>{formData.cursoNombre || 'Seleccionar curso...'}</span>
                        <span className="custom-select-arrow">{dropdownAbierto === 'formCurso' ? '▲' : '▼'}</span>
                      </div>
                      {dropdownAbierto === 'formCurso' && (
                        <div className="custom-select-options">
                          <div className="custom-select-option" onClick={() => handleCursoChange('', '')}>Seleccionar curso...</div>
                          {cursosDB.map(curso => (
                            <div
                              key={curso.id}
                              className={`custom-select-option ${formData.cursoId === String(curso.id) ? 'selected' : ''}`}
                              onClick={() => handleCursoChange(String(curso.id), curso.nombre)}
                            >
                              {curso.nombre}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Asignaturas del Docente</label>
                  <div className="checkbox-group checkbox-4-columnas especialidades-grid">
                    {formData.docenteId ? (
                      asignaturasDelDocente.length > 0 ? (
                        asignaturasDelDocente.map(asig => (
                          <div key={asig.id} className="checkbox-item">
                            <input
                              type="checkbox"
                              id={`asig-${asig.id}`}
                              checked={formData.asignaturas.includes(asig.id)}
                              onChange={() => handleAsignaturaChange(asig.id)}
                            />
                            <label htmlFor={`asig-${asig.id}`}>{abreviarNombre(asig.nombre)}</label>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted">Este docente no tiene asignaturas asignadas</p>
                      )
                    ) : (
                      <p className="text-muted">Seleccione un docente para ver sus asignaturas</p>
                    )}
                  </div>
                </div>

                <div className="form-actions form-actions-asignaciones">
                  <button type="button" className="btn btn-secondary" onClick={limpiarFormulario} disabled={cargando}>Limpiar</button>
                  <button type="submit" className="btn btn-primary" disabled={cargando}>
                    {cargando ? 'Asignando...' : 'Asignar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Asignaciones Actuales */}
        <div className={`column ${subTab === 'asignar' ? 'hidden-mobile' : ''}`} style={{ alignSelf: 'start' }}>
          <div className="card">
            <div className="card-header">
              <h3>Asignaciones Actuales</h3>
            </div>
            <div className="card-body">
              <div className="filtros-asignaciones">
                <div className="form-row form-row-filtros">
                  <div className="form-group">
                    <label>Filtrar por Curso</label>
                    <div className="custom-select-container">
                      <div
                        className="custom-select-trigger"
                        onClick={() => setDropdownAbierto(dropdownAbierto === 'filtroCurso' ? null : 'filtroCurso')}
                      >
                        <span>{filtros.cursoNombre || 'Todos los cursos'}</span>
                        <span className="custom-select-arrow">{dropdownAbierto === 'filtroCurso' ? '▲' : '▼'}</span>
                      </div>
                      {dropdownAbierto === 'filtroCurso' && (
                        <div className="custom-select-options">
                          <div className="custom-select-option" onClick={() => { setFiltros({ ...filtros, cursoId: '', cursoNombre: '' }); setDropdownAbierto(null); }}>Todos los cursos</div>
                          {cursosDB.map(curso => (
                            <div
                              key={curso.id}
                              className={`custom-select-option ${filtros.cursoId === String(curso.id) ? 'selected' : ''}`}
                              onClick={() => { setFiltros({ ...filtros, cursoId: String(curso.id), cursoNombre: curso.nombre }); setDropdownAbierto(null); }}
                            >
                              {curso.nombre}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Filtrar por Docente</label>
                    <div className="custom-select-container">
                      <div
                        className="custom-select-trigger"
                        onClick={() => setDropdownAbierto(dropdownAbierto === 'filtroDocente' ? null : 'filtroDocente')}
                      >
                        <span>{filtros.docenteNombre || 'Todos los docentes'}</span>
                        <span className="custom-select-arrow">{dropdownAbierto === 'filtroDocente' ? '▲' : '▼'}</span>
                      </div>
                      {dropdownAbierto === 'filtroDocente' && (
                        <div className="custom-select-options">
                          <div className="custom-select-option" onClick={() => { setFiltros({ ...filtros, docenteId: '', docenteNombre: '' }); setDropdownAbierto(null); }}>Todos los docentes</div>
                          {docentesDB.map(docente => (
                            <div
                              key={docente.id}
                              className={`custom-select-option ${filtros.docenteId === String(docente.id) ? 'selected' : ''}`}
                              onClick={() => { setFiltros({ ...filtros, docenteId: String(docente.id), docenteNombre: docente.nombre_completo }); setDropdownAbierto(null); }}
                            >
                              {docente.nombre_completo}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-responsive table-scroll" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="data-table tabla-asignaciones">
                  <thead>
                    <tr>
                      <th><span className="th-desktop">Docente</span><span className="th-mobile">Docente</span></th>
                      <th><span className="th-desktop">Curso</span><span className="th-mobile">Curso</span></th>
                      <th><span className="th-desktop">Asignatura</span><span className="th-mobile">Asig.</span></th>
                      <th><span className="th-desktop">Acciones</span><span className="th-mobile">Acc.</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {asignacionesFiltradas.length > 0 ? (
                      asignacionesFiltradas.map(asig => (
                        <tr key={asig.id}>
                          <td>{asig.docente_nombre_completo}</td>
                          <td>{asig.curso_nombre}</td>
                          <td>{asig.asignatura_nombre}</td>
                          <td>
                            <div className="acciones-btns">
                              <button
                                className="btn-icon btn-icon-delete"
                                onClick={() => eliminarAsignacion(asig)}
                                title="Eliminar"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center text-muted">No hay asignaciones registradas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AsignacionesTab;
