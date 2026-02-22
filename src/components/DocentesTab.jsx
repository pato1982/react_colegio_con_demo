import React, { useState, useEffect, useMemo } from 'react';
import { useMensaje } from '../contexts';
import { useDropdown, useResponsive } from '../hooks';
import config from '../config/env';

// Modal para editar docente
const ModalEditarDocente = ({ docente, asignaturas, onGuardar, onCerrar }) => {
  const [formEditar, setFormEditar] = useState({
    rut: docente?.rut || '',
    nombres: docente?.nombres || '',
    apellidos: docente?.apellidos || '',
    email: docente?.email || '',
    especialidades: docente?.asignaturas?.map(a => a.id) || []
  });
  const [guardando, setGuardando] = useState(false);

  const handleChange = (e) => {
    setFormEditar({ ...formEditar, [e.target.name]: e.target.value });
  };

  const handleEspecialidadChange = (asignaturaId) => {
    const nuevas = formEditar.especialidades.includes(asignaturaId)
      ? formEditar.especialidades.filter(id => id !== asignaturaId)
      : [...formEditar.especialidades, asignaturaId];
    setFormEditar({ ...formEditar, especialidades: nuevas });
  };

  const handleSubmit = async () => {
    if (!formEditar.rut || !formEditar.nombres || !formEditar.apellidos) {
      alert('Complete todos los campos obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/docentes/${docente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: formEditar.rut,
          nombres: formEditar.nombres,
          apellidos: formEditar.apellidos,
          email: formEditar.email,
          asignaturas: formEditar.especialidades,
          establecimiento_id: 1,
          usuario_id: null,
          tipo_usuario: 'administrador',
          nombre_usuario: 'Administrador del Sistema'
        })
      });

      const data = await response.json();
      if (data.success) {
        onGuardar();
      } else {
        alert(data.error || 'Error al actualizar');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexion');
    } finally {
      setGuardando(false);
    }
  };

  const abreviarNombre = (nombre) => {
    const palabras = nombre.split(' ');
    if (palabras.length >= 2) {
      return palabras.map(p => p.length <= 4 ? p : p.substring(0, 3) + '.').join(' ');
    }
    return nombre;
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Editar Docente</h3>
          <button className="modal-close" onClick={onCerrar}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="form-row form-row-mobile-2col">
            <div className="form-group">
              <label>Nombres</label>
              <input type="text" className="form-control" name="nombres" value={formEditar.nombres} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Apellidos</label>
              <input type="text" className="form-control" name="apellidos" value={formEditar.apellidos} onChange={handleChange} />
            </div>
          </div>
          <style>{`
            @media (max-width: 768px) {
              .form-row-mobile-2col {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 10px !important;
              }
            }
          `}</style>
          <div className="form-row">
            <div className="form-group">
              <label>RUT</label>
              <input type="text" className="form-control" name="rut" value={formEditar.rut} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="form-control" name="email" value={formEditar.email} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Especialidades</label>
            <div className="checkbox-group checkbox-4-columnas especialidades-grid">
              {asignaturas.map(asignatura => (
                <div key={asignatura.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`edit-esp-${asignatura.id}`}
                    checked={formEditar.especialidades.includes(asignatura.id)}
                    onChange={() => handleEspecialidadChange(asignatura.id)}
                  />
                  <label htmlFor={`edit-esp-${asignatura.id}`}>{abreviarNombre(asignatura.nombre)}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

function DocentesTab() {
  const { mostrarMensaje } = useMensaje();
  const [subTab, setSubTab] = useState('agregar');
  const { dropdownAbierto, setDropdownAbierto } = useDropdown();
  const { isMobile } = useResponsive();
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    rut: '',
    email: '',
    especialidades: []
  });
  const [filtros, setFiltros] = useState({ docenteId: '', docenteNombre: '', asignaturaId: '', asignaturaNombre: '' });
  const [modalEditar, setModalEditar] = useState({ visible: false, docente: null });
  const [modalAgregarAsignatura, setModalAgregarAsignatura] = useState(false);
  const [modalEliminarAsignatura, setModalEliminarAsignatura] = useState(false);
  const [nuevaAsignatura, setNuevaAsignatura] = useState('');
  const [asignaturaEliminar, setAsignaturaEliminar] = useState('');

  // Datos de la BD
  const [asignaturasDB, setAsignaturasDB] = useState([]);
  const [docentesDB, setDocentesDB] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    cargarAsignaturas();
    cargarDocentes();
  }, []);

  const cargarAsignaturas = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/asignaturas`);
      const data = await response.json();
      if (data.success) {
        setAsignaturasDB(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando asignaturas:', error);
    }
  };

  const cargarDocentes = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/docentes`);
      const data = await response.json();
      if (data.success) {
        setDocentesDB(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando docentes:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEspecialidadChange = (asignaturaId) => {
    const nuevasEspecialidades = formData.especialidades.includes(asignaturaId)
      ? formData.especialidades.filter(id => id !== asignaturaId)
      : [...formData.especialidades, asignaturaId];
    setFormData({ ...formData, especialidades: nuevasEspecialidades });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.rut || !formData.nombres || !formData.apellidos) {
      mostrarMensaje('Error', 'Complete los campos obligatorios (nombres, apellidos, RUT)', 'error');
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(`${config.apiBaseUrl}/docentes/agregar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rut: formData.rut,
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          email: formData.email,
          asignaturas: formData.especialidades,
          establecimiento_id: 1
        })
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje('Exito', data.message, 'success');
        limpiarFormulario();
        cargarDocentes();
      } else {
        mostrarMensaje('Error', data.error || 'Error al agregar docente', 'error');
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
      nombres: '',
      apellidos: '',
      rut: '',
      email: '',
      especialidades: []
    });
  };

  const eliminarDocente = async (docente) => {
    if (window.confirm(`¿Desea eliminar al docente ${docente.nombre_completo} de este establecimiento?\n\nEsta accion desactivara al docente y sus asignaturas asignadas.`)) {
      try {
        const response = await fetch(`${config.apiBaseUrl}/docentes/${docente.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establecimiento_id: 1,
            usuario_id: null,
            tipo_usuario: 'administrador',
            nombre_usuario: 'Administrador del Sistema'
          })
        });

        const data = await response.json();
        if (data.success) {
          mostrarMensaje('Exito', 'Docente eliminado correctamente', 'success');
          cargarDocentes();
        } else {
          if (data.asignaciones && data.asignaciones.length > 0) {
            const lista = data.asignaciones.map(a => `- ${a.curso} (${a.asignatura})`).join('\n');
            alert(`No se puede eliminar al docente porque tiene cargas académicas activas:\n\n${lista}\n\nDebe reasignar estos cursos a otro docente antes de eliminarlo.\n(Las notas existentes se transferirán automáticamente al nuevo docente).`);
          } else {
            mostrarMensaje('Error', data.error || 'Error al eliminar', 'error');
          }
        }
      } catch (error) {
        mostrarMensaje('Error', 'Error de conexion', 'error');
      }
    }
  };

  const handleGuardarEdicion = () => {
    mostrarMensaje('Exito', 'Docente actualizado correctamente', 'success');
    setModalEditar({ visible: false, docente: null });
    cargarDocentes();
  };

  // Agregar nueva asignatura
  const agregarAsignatura = async () => {
    if (!nuevaAsignatura.trim()) {
      mostrarMensaje('Error', 'Ingrese el nombre de la asignatura', 'error');
      return;
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}/asignaturas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevaAsignatura.trim(),
          establecimiento_id: 1
        })
      });

      const data = await response.json();
      if (data.success) {
        mostrarMensaje('Exito', 'Asignatura agregada correctamente', 'success');
        setNuevaAsignatura('');
        setModalAgregarAsignatura(false);
        cargarAsignaturas();
      } else {
        mostrarMensaje('Error', data.error || 'Error al agregar', 'error');
      }
    } catch (error) {
      mostrarMensaje('Error', 'Error de conexion', 'error');
    }
  };

  // Eliminar asignatura
  const eliminarAsignatura = async () => {
    if (!asignaturaEliminar) {
      mostrarMensaje('Error', 'Seleccione una asignatura', 'error');
      return;
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}/asignaturas/${asignaturaEliminar}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        mostrarMensaje('Exito', 'Asignatura eliminada correctamente', 'success');
        setAsignaturaEliminar('');
        setModalEliminarAsignatura(false);
        cargarAsignaturas();
      } else {
        mostrarMensaje('Error', data.error || 'Error al eliminar', 'error');
      }
    } catch (error) {
      mostrarMensaje('Error', 'Error de conexion', 'error');
    }
  };

  // Obtener asignaturas que tienen al menos un docente asignado
  const asignaturasConDocentes = useMemo(() => {
    const asignaturasIds = new Set();
    docentesDB.forEach(docente => {
      (docente.asignaturas || []).forEach(asig => {
        asignaturasIds.add(asig.id);
      });
    });
    return asignaturasDB.filter(asig => asignaturasIds.has(asig.id));
  }, [docentesDB, asignaturasDB]);

  // Filtrar docentes - filtros independientes o combinados
  const docentesFiltrados = useMemo(() => {
    return docentesDB.filter(docente => {
      // Filtro por docente (si esta seleccionado)
      const matchDocente = !filtros.docenteId ||
        docente.id === parseInt(filtros.docenteId);

      // Filtro por asignatura (si esta seleccionada)
      const matchAsignatura = !filtros.asignaturaId ||
        (docente.asignaturas || []).some(a => a.id === parseInt(filtros.asignaturaId));

      // Ambos filtros deben cumplirse (si estan activos)
      return matchDocente && matchAsignatura;
    });
  }, [docentesDB, filtros]);

  const getEspecialidadesDocente = (docente) => {
    if (!docente.asignaturas || docente.asignaturas.length === 0) {
      return 'Sin especialidades';
    }
    return docente.asignaturas.map(a => abreviarNombre(a.nombre)).join(', ');
  };

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
      <div className="sub-tabs-mobile sub-tabs-docentes">
        <button
          type="button"
          className={`sub-tab-btn ${subTab === 'agregar' ? 'active' : ''}`}
          onClick={() => setSubTab('agregar')}
        >
          Agregar Docente
        </button>
        <button
          type="button"
          className={`sub-tab-btn ${subTab === 'listado' ? 'active' : ''}`}
          onClick={() => setSubTab('listado')}
        >
          Listado Docentes
        </button>
      </div>

      <div className="two-columns">
        {/* Columna Izquierda: Agregar Docente */}
        <div className={`column ${subTab === 'listado' ? 'hidden-mobile' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h3>Agregar Docente</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombres</label>
                    <input
                      type="text"
                      className="form-control"
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleInputChange}
                      placeholder="Ej: Maria Jose"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellidos</label>
                    <input
                      type="text"
                      className="form-control"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleInputChange}
                      placeholder="Ej: Gonzalez Perez"
                      required
                    />
                  </div>
                </div>

                <div className="form-row form-row-rut-email">
                  <div className="form-group">
                    <label>RUT</label>
                    <input
                      type="text"
                      className="form-control"
                      name="rut"
                      value={formData.rut}
                      onChange={handleInputChange}
                      placeholder="Ej: 12.345.678-9"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Correo Electronico</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Ej: docente@correo.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="label-con-boton">
                    <label>Especialidades</label>
                    <div className="botones-asignatura">
                      <button type="button" className="btn-agregar-asignatura" onClick={() => setModalAgregarAsignatura(true)}>
                        <span>+</span> Agregar
                      </button>
                      <button type="button" className="btn-eliminar-asignatura" onClick={() => setModalEliminarAsignatura(true)}>
                        <span>-</span> Eliminar
                      </button>
                    </div>
                  </div>
                  <div className="checkbox-group checkbox-4-columnas especialidades-grid">
                    {asignaturasDB.length > 0 ? (
                      asignaturasDB.map(asignatura => (
                        <div key={asignatura.id} className="checkbox-item">
                          <input
                            type="checkbox"
                            id={`esp-${asignatura.id}`}
                            checked={formData.especialidades.includes(asignatura.id)}
                            onChange={() => handleEspecialidadChange(asignatura.id)}
                          />
                          <label htmlFor={`esp-${asignatura.id}`}>{abreviarNombre(asignatura.nombre)}</label>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#94a3b8', fontSize: '14px' }}>No hay asignaturas. Agregue una usando el boton +</p>
                    )}
                  </div>
                </div>

                <div className="form-actions form-actions-docentes">
                  <button type="button" className="btn btn-secondary" onClick={limpiarFormulario} disabled={cargando}>Limpiar</button>
                  <button type="submit" className="btn btn-primary" disabled={cargando}>
                    {cargando ? 'Agregando...' : 'Agregar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Listado de Docentes */}
        <div className={`column ${subTab === 'agregar' ? 'hidden-mobile' : ''}`}>
          <div className="card">
            <div className="card-header">
              <h3>Listado de Docentes</h3>
            </div>
            <div className="card-body">
              <div className="filtros-docentes">
                <div className="form-row form-row-filtros">
                  <div className="form-group">
                    <label>Docente</label>
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
                  <div className="form-group">
                    <label>Asignatura</label>
                    <div className="custom-select-container">
                      <div
                        className="custom-select-trigger"
                        onClick={() => setDropdownAbierto(dropdownAbierto === 'filtroAsignatura' ? null : 'filtroAsignatura')}
                      >
                        <span>{filtros.asignaturaNombre || 'Todas las asignaturas'}</span>
                        <span className="custom-select-arrow">{dropdownAbierto === 'filtroAsignatura' ? '▲' : '▼'}</span>
                      </div>
                      {dropdownAbierto === 'filtroAsignatura' && (
                        <div className="custom-select-options">
                          <div className="custom-select-option" onClick={() => { setFiltros({ ...filtros, asignaturaId: '', asignaturaNombre: '' }); setDropdownAbierto(null); }}>Todas las asignaturas</div>
                          {asignaturasConDocentes.map(asig => (
                            <div
                              key={asig.id}
                              className={`custom-select-option ${filtros.asignaturaId === String(asig.id) ? 'selected' : ''}`}
                              onClick={() => { setFiltros({ ...filtros, asignaturaId: String(asig.id), asignaturaNombre: abreviarNombre(asig.nombre) }); setDropdownAbierto(null); }}
                            >
                              {abreviarNombre(asig.nombre)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-responsive table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nombre Completo</th>
                      <th>Especialidad</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docentesFiltrados.length > 0 ? (
                      docentesFiltrados.map(docente => (
                        <tr key={docente.id}>
                          <td>
                            {isMobile ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{docente.nombre_completo.split(',')[0]}</div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>{docente.nombre_completo.split(',')[1]?.trim()}</div>
                              </div>
                            ) : docente.nombre_completo}
                          </td>
                          <td>{getEspecialidadesDocente(docente)}</td>
                          <td>
                            <div className="acciones-btns">
                              <button className="btn-icon btn-icon-edit" onClick={() => setModalEditar({ visible: true, docente })} title="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button className="btn-icon btn-icon-delete" onClick={() => eliminarDocente(docente)} title="Eliminar">
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
                        <td colSpan="3" className="text-center text-muted">No hay docentes registrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar Docente */}
      {modalEditar.visible && (
        <ModalEditarDocente
          docente={modalEditar.docente}
          asignaturas={asignaturasDB}
          onGuardar={handleGuardarEdicion}
          onCerrar={() => setModalEditar({ visible: false, docente: null })}
        />
      )}

      {/* Modal Agregar Asignatura */}
      {modalAgregarAsignatura && (
        <div className="modal-overlay" onClick={() => setModalAgregarAsignatura(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Agregar Nueva Asignatura</h3>
              <button className="modal-close" onClick={() => setModalAgregarAsignatura(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre de la Asignatura</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Filosofia"
                  value={nuevaAsignatura}
                  onChange={(e) => setNuevaAsignatura(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalAgregarAsignatura(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={agregarAsignatura}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Asignatura */}
      {modalEliminarAsignatura && (
        <div className="modal-overlay" onClick={() => setModalEliminarAsignatura(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Eliminar Asignatura</h3>
              <button className="modal-close" onClick={() => setModalEliminarAsignatura(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Seleccione la asignatura a eliminar</label>
                <select
                  className="form-control"
                  value={asignaturaEliminar}
                  onChange={(e) => setAsignaturaEliminar(e.target.value)}
                >
                  <option value="">Seleccione una asignatura...</option>
                  {asignaturasDB.map(asig => (
                    <option key={asig.id} value={asig.id}>{asig.nombre}</option>
                  ))}
                </select>
              </div>
              <p style={{ fontSize: '12px', color: '#d97706', marginTop: '10px' }}>
                <strong>Advertencia:</strong> Solo se pueden eliminar asignaturas que no tengan docentes asignados.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalEliminarAsignatura(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={eliminarAsignatura}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocentesTab;
