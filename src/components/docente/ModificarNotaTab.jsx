import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import es from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import { useResponsive, useDropdown } from '../../hooks';
import { SelectNativo, SelectMovil, AutocompleteAlumno } from './shared';
import { ordenarCursos } from './shared/utils';
import config from '../../config/env';

// Registrar locale español
registerLocale('es', es);

// Modal de edicion
const ModalEditar = ({ nota, editNota, setEditNota, editTrimestre, setEditTrimestre, editFecha, setEditFecha, editComentario, setEditComentario, editPendiente, setEditPendiente, onGuardar, onCerrar, guardando }) => (
  <div className="modal-overlay" onClick={onCerrar}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Editar Calificacion</h3>
        <button className="modal-close" onClick={onCerrar}>&times;</button>
      </div>
      <form onSubmit={onGuardar}>
        <div className="modal-body">
          <div className="docente-modal-info">
            <div className="docente-info-item"><label>Alumno</label><span>{nota?.alumno_apellidos}, {nota?.alumno_nombres}</span></div>
            <div className="docente-info-item"><label>Curso</label><span>{nota?.curso_nombre}</span></div>
            <div className="docente-info-item"><label>Asignatura</label><span>{nota?.asignatura_nombre}</span></div>
          </div>
          <div className="form-row form-row-nota-trimestre">
            <div className="form-group">
              <label>Nota (1.0 - 7.0)</label>
              <input
                type="number"
                className="form-control"
                min="1.0"
                max="7.0"
                step="0.1"
                value={editNota}
                onChange={(e) => setEditNota(e.target.value)}
                disabled={editPendiente}
                required={!editPendiente}
              />
            </div>
            <div className="form-group">
              <label>Trimestre</label>
              <select className="form-control" value={editTrimestre} onChange={(e) => setEditTrimestre(e.target.value)}>
                <option value="1">1er Trimestre</option>
                <option value="2">2do Trimestre</option>
                <option value="3">3er Trimestre</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" className="form-control" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editPendiente}
                onChange={(e) => {
                  setEditPendiente(e.target.checked);
                  if (e.target.checked) setEditNota('');
                }}
              />
              <span style={{ fontSize: '13px', color: '#475569' }}>Nota pendiente</span>
            </label>
          </div>
          <div className="form-group">
            <label>Comentario</label>
            <textarea className="form-control" rows="3" value={editComentario} onChange={(e) => setEditComentario(e.target.value)} placeholder="Observaciones opcionales..."></textarea>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

// Modal de confirmacion eliminar
const ModalEliminar = ({ nota, onConfirmar, onCerrar, eliminando }) => (
  <div className="modal-overlay" onClick={onCerrar}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header" style={{ background: '#fef2f2' }}>
        <h3 style={{ color: '#dc2626' }}>Eliminar Calificacion</h3>
        <button className="modal-close" onClick={onCerrar}>&times;</button>
      </div>
      <div className="modal-body">
        <div className="docente-alert-danger">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <h4>Confirmar eliminacion</h4>
            <p>Esta a punto de eliminar la nota de <strong>{nota?.alumno_apellidos}, {nota?.alumno_nombres}</strong> en <strong>{nota?.asignatura_nombre}</strong>. Esta accion no se puede deshacer.</p>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onCerrar} disabled={eliminando}>Cancelar</button>
        <button className="btn btn-danger" onClick={onConfirmar} disabled={eliminando}>
          {eliminando ? 'Eliminando...' : 'Eliminar Nota'}
        </button>
      </div>
    </div>
  </div>
);

// Componente para filtro de fecha
const FiltroFecha = ({ filtroCurso, fechasConNotas, filtroFecha, onFechaChange, cargandoFechas }) => {
  const highlightDatesWithNotes = (date) => {
    const isHighlighted = fechasConNotas.some(
      f => f.toDateString() === date.toDateString()
    );
    return isHighlighted ? 'fecha-con-notas' : 'fecha-sin-notas';
  };

  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', height: '14px' }}>
        <label style={{ marginBottom: 0, display: 'inline-block' }}>Fecha</label>
        {filtroCurso && fechasConNotas.length > 0 && (
          <div className="tooltip-container">
            <span className="tooltip-icon" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              color: 'white',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'help'
            }}>?</span>
            <div className="tooltip-text">
              Fechas resaltadas tienen notas registradas
            </div>
          </div>
        )}
      </div>
      <DatePicker
        selected={filtroFecha}
        onChange={onFechaChange}
        dateFormat="dd/MM/yyyy"
        locale="es"
        placeholderText={filtroCurso ? "Seleccionar fecha" : "Primero seleccione curso"}
        disabled={!filtroCurso || cargandoFechas}
        isClearable
        className="form-control"
        dayClassName={highlightDatesWithNotes}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        portalId="root"
        popperPlacement="bottom-end"
        popperClassName="datepicker-portal"
      />
    </div>
  );
};

function ModificarNotaTab({ docenteId, establecimientoId }) {
  // Estados para datos de API
  const [cursos, setCursos] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [fechasConNotas, setFechasConNotas] = useState([]);
  const [resultados, setResultados] = useState([]);

  // Estados de filtros
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroCursoNombre, setFiltroCursoNombre] = useState('');
  const [filtroAsignatura, setFiltroAsignatura] = useState('');
  const [filtroAsignaturaNombre, setFiltroAsignaturaNombre] = useState('');
  const [filtroAlumno, setFiltroAlumno] = useState('');
  const [filtroAlumnoId, setFiltroAlumnoId] = useState('');
  const [filtroFecha, setFiltroFecha] = useState(null);

  // Estados de carga
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [cargandoAsignaturas, setCargandoAsignaturas] = useState(false);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [cargandoFechas, setCargandoFechas] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  // Estados modales
  const [modalEditar, setModalEditar] = useState(false);
  const [notaEditando, setNotaEditando] = useState(null);
  const [editNota, setEditNota] = useState('');
  const [editTrimestre, setEditTrimestre] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editComentario, setEditComentario] = useState('');
  const [editPendiente, setEditPendiente] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalEliminar, setModalEliminar] = useState(false);
  const [notaEliminar, setNotaEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

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
        const response = await fetch(
          `${config.apiBaseUrl}/docente/${docenteId}/cursos?establecimiento_id=${establecimientoId}`
        );
        const data = await response.json();
        if (data.success) {
          setCursos(ordenarCursos(data.data));
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
      if (!filtroCurso || !docenteId || !establecimientoId) {
        setAsignaturas([]);
        return;
      }

      setCargandoAsignaturas(true);
      try {
        const response = await fetch(
          `${config.apiBaseUrl}/docente/${docenteId}/asignaturas-por-curso/${filtroCurso}?establecimiento_id=${establecimientoId}`
        );
        const data = await response.json();
        if (data.success) {
          setAsignaturas(data.data);
        }
      } catch (error) {
        console.error('Error al cargar asignaturas:', error);
      } finally {
        setCargandoAsignaturas(false);
      }
    };

    cargarAsignaturas();
  }, [filtroCurso, docenteId, establecimientoId]);

  // Cargar alumnos cuando se selecciona curso
  useEffect(() => {
    const cargarAlumnos = async () => {
      if (!filtroCurso) {
        setAlumnos([]);
        return;
      }

      setCargandoAlumnos(true);
      try {
        const response = await fetch(`${config.apiBaseUrl}/curso/${filtroCurso}/alumnos`);
        const data = await response.json();
        if (data.success) {
          setAlumnos(data.data);
        }
      } catch (error) {
        console.error('Error al cargar alumnos:', error);
      } finally {
        setCargandoAlumnos(false);
      }
    };

    cargarAlumnos();
  }, [filtroCurso]);

  // Cargar fechas con notas cuando se selecciona curso o cambian filtros
  useEffect(() => {
    const cargarFechasConNotas = async () => {
      if (!filtroCurso || !docenteId || !establecimientoId) {
        setFechasConNotas([]);
        return;
      }

      setCargandoFechas(true);
      try {
        let url = `${config.apiBaseUrl}/docente/${docenteId}/fechas-con-notas?establecimiento_id=${establecimientoId}&curso_id=${filtroCurso}`;

        if (filtroAsignatura) url += `&asignatura_id=${filtroAsignatura}`;
        if (filtroAlumnoId) url += `&alumno_id=${filtroAlumnoId}`;

        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          // Convertir strings a objetos Date y ajustar zona horaria
          const fechas = data.data.map(f => new Date(f + 'T00:00:00'));
          setFechasConNotas(fechas);
        }
      } catch (error) {
        console.error('Error al cargar fechas con notas:', error);
      } finally {
        setCargandoFechas(false);
      }
    };

    cargarFechasConNotas();
  }, [filtroCurso, filtroAsignatura, filtroAlumnoId, docenteId, establecimientoId]);

  const handleCursoChange = (cursoId, nombre = '') => {
    setFiltroCurso(cursoId);
    setFiltroCursoNombre(nombre);
    setFiltroAsignatura('');
    setFiltroAsignaturaNombre('');
    setFiltroAlumno('');
    setFiltroAlumnoId('');
    setFiltroFecha(null);
    setBuscado(false);
    setResultados([]);
  };

  const handleSeleccionarAlumno = (alumno) => {
    if (alumno) {
      setFiltroAlumno(`${alumno.apellidos}, ${alumno.nombres}`);
      setFiltroAlumnoId(alumno.id);
    } else {
      setFiltroAlumno('');
      setFiltroAlumnoId('');
    }
  };

  const limpiarBusqueda = () => {
    setFiltroCurso('');
    setFiltroCursoNombre('');
    setFiltroAsignatura('');
    setFiltroAsignaturaNombre('');
    setFiltroAlumno('');
    setFiltroAlumnoId('');
    setFiltroFecha(null);
    setBuscado(false);
    setResultados([]);
  };

  const buscarNotas = async () => {
    if (!filtroCurso) {
      alert('Debe seleccionar un curso');
      return;
    }

    setBuscando(true);
    try {
      let url = `${config.apiBaseUrl}/docente/${docenteId}/notas/buscar?establecimiento_id=${establecimientoId}&curso_id=${filtroCurso}`;

      if (filtroAsignatura) url += `&asignatura_id=${filtroAsignatura}`;
      if (filtroAlumnoId) url += `&alumno_id=${filtroAlumnoId}`;
      if (filtroFecha) {
        const year = filtroFecha.getFullYear();
        const month = String(filtroFecha.getMonth() + 1).padStart(2, '0');
        const day = String(filtroFecha.getDate()).padStart(2, '0');
        const fechaStr = `${year}-${month}-${day}`;
        url += `&fecha=${fechaStr}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setResultados(data.data);
      } else {
        alert(data.error || 'Error al buscar notas');
      }
    } catch (error) {
      console.error('Error al buscar notas:', error);
      alert('Error al buscar notas');
    } finally {
      setBuscando(false);
      setBuscado(true);
    }
  };

  const abrirModalEditar = (nota) => {
    setNotaEditando(nota);
    setEditNota(nota.nota !== null ? nota.nota.toString() : '');
    setEditTrimestre(nota.trimestre.toString());
    setEditFecha(nota.fecha_evaluacion ? nota.fecha_evaluacion.split('T')[0] : '');
    setEditComentario(nota.comentario || '');
    setEditPendiente(nota.es_pendiente === 1);
    setModalEditar(true);
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();

    if (!editPendiente && !editNota) {
      alert('Debe ingresar una nota o marcar como pendiente');
      return;
    }

    if (!editPendiente && (parseFloat(editNota) < 1.0 || parseFloat(editNota) > 7.0)) {
      alert('La nota debe estar entre 1.0 y 7.0');
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/notas/${notaEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nota: editPendiente ? null : parseFloat(editNota),
          trimestre: parseInt(editTrimestre),
          fecha_evaluacion: editFecha || null,
          comentario: editComentario || null,
          es_pendiente: editPendiente
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Nota actualizada exitosamente');
        setModalEditar(false);
        // Recargar resultados
        buscarNotas();
      } else {
        alert(data.error || 'Error al actualizar nota');
      }
    } catch (error) {
      console.error('Error al actualizar nota:', error);
      alert('Error al actualizar nota');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    setEliminando(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/notas/${notaEliminar.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Nota eliminada exitosamente');
        setModalEliminar(false);
        // Recargar resultados
        buscarNotas();
      } else {
        alert(data.error || 'Error al eliminar nota');
      }
    } catch (error) {
      console.error('Error al eliminar nota:', error);
      alert('Error al eliminar nota');
    } finally {
      setEliminando(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL');
  };

  const getNotaClass = (nota, esPendiente) => {
    if (esPendiente) return 'nota-pendiente';
    if (nota === null) return '';
    return nota >= 4.0 ? 'nota-aprobada' : 'nota-reprobada';
  };



  return (
    <div className="tab-panel active">
      {/* Estilos para el calendario y tooltips */}
      <style>{`
        .fecha-con-notas {
          background-color: #3b82f6 !important;
          color: white !important;
          border-radius: 50%;
          font-weight: 600;
        }
        .fecha-con-notas:hover {
          background-color: #2563eb !important;
        }
        .fecha-sin-notas {
          color: #cbd5e1 !important;
        }
        .fecha-sin-notas:hover {
          background-color: #f1f5f9 !important;
          color: #64748b !important;
        }
        .react-datepicker__day--selected {
          background-color: #1e40af !important;
        }
        .react-datepicker__day--today {
          font-weight: bold;
          border: 2px solid #3b82f6;
        }
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 2000 !important; /* Asegurar que el calendario esté arriba */
        }
        .react-datepicker-popper {
          z-index: 2000 !important;
        }
        .react-datepicker__header {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .react-datepicker__current-month {
          color: #1e293b;
          font-weight: 600;
        }
        .react-datepicker__day-name {
          color: #64748b;
        }
        /* Estilos Tooltip */
        .tooltip-container {
            position: relative;
            display: inline-block;
        }
        .tooltip-text {
            visibility: hidden;
            width: 140px;
            background-color: #333;
            color: #fff;
            text-align: center;
            border-radius: 4px;
            padding: 5px;
            position: absolute;
            z-index: 3000;
            bottom: 125%;
            left: 50%;
            margin-left: -70px;
            opacity: 0;
            transition: opacity 0.3s;
            font-size: 11px;
            pointer-events: none;
        }
        .tooltip-text::after {
            content: "";
            position: absolute;
            top: 100%;
            left: 50%;
            margin-left: -5px;
            border-width: 5px;
            border-style: solid;
            border-color: #333 transparent transparent transparent;
        }
        .tooltip-container:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }
        /* Fix para Autocomplete Dropdown z-index y scroll */
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
            z-index: 1100; /* Mayor que otros inputs pero menor que modal */
        }
        /* Overrides para uniformidad en Filtros */
        .docente-filtros-row .form-group {
          margin-bottom: 0 !important;
          min-width: 0;
        }
        .docente-filtros-row .form-control,
        .docente-filtros-row .docente-autocomplete-container input,
        .docente-filtros-row .react-datepicker-wrapper input {
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
      `}</style>

      <div className="card" style={{ overflow: 'visible' }}>
        <div className="card-header"><h3>Buscar Nota</h3></div>
        <div className="card-body" style={{ overflow: 'visible' }}>
          {/* Añadir overflow visible a las filas de filtros y mayor z-index */}
          {showMobile ? (
            <>
              <div className="form-row-movil" style={{
                position: 'relative',
                zIndex: (dropdownAbierto === 'curso' || dropdownAbierto === 'asignatura') ? 1002 : 10
              }}>
                {cargandoCursos ? (
                  <div className="form-group">
                    <label>Curso</label>
                    <div style={{ padding: '8px', color: '#64748b' }}>Cargando...</div>
                  </div>
                ) : (
                  <SelectMovil
                    label="Curso"
                    value={filtroCurso}
                    valueName={filtroCursoNombre}
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
                  value={filtroAsignatura}
                  valueName={filtroAsignaturaNombre}
                  onChange={(id, nombre) => { setFiltroAsignatura(id); setFiltroAsignaturaNombre(nombre); }}
                  options={asignaturas}
                  placeholder={cargandoAsignaturas ? 'Cargando...' : 'Todas'}
                  disabled={!filtroCurso || cargandoAsignaturas}
                  isOpen={dropdownAbierto === 'asignatura'}
                  onToggle={() => setDropdownAbierto(prev => prev === 'asignatura' ? null : 'asignatura')}
                  onClose={() => setDropdownAbierto(null)}
                />
              </div>
              <div className="form-row-movil" style={{
                position: 'relative',
                zIndex: (dropdownAbierto === 'alumno' || !dropdownAbierto) ? 1000 : 1
              }}>
                {/* Wrapper para asegurar que el dropdown se vea */}
                <div style={{ position: 'relative', zIndex: 1001 }}>
                  <AutocompleteAlumno
                    alumnos={alumnos}
                    alumnoSeleccionado={filtroAlumnoId}
                    busqueda={filtroAlumno}
                    onBusquedaChange={(val) => { setFiltroAlumno(val); setFiltroAlumnoId(''); }}
                    onSeleccionar={handleSeleccionarAlumno}
                    disabled={!filtroCurso || cargandoAlumnos}
                    placeholder={cargandoAlumnos ? 'Cargando...' : 'Todos'}
                    onDropdownOpen={() => setDropdownAbierto(null)}
                  />
                </div>
                <FiltroFecha
                  filtroCurso={filtroCurso}
                  fechasConNotas={fechasConNotas}
                  filtroFecha={filtroFecha}
                  onFechaChange={(date) => setFiltroFecha(date)}
                  cargandoFechas={cargandoFechas}
                />
              </div>
              <div className="form-actions form-actions-movil">
                <button type="button" className="btn btn-secondary" onClick={limpiarBusqueda}>Limpiar</button>
                <button type="button" className="btn btn-primary" onClick={buscarNotas} disabled={buscando || !filtroCurso}>
                  {buscando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </>
          ) : (
            // Layout para Tablet y Desktop (Normal)
            <div className="docente-filtros-row" style={{
              gridTemplateColumns: isTablet ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr)) auto',
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
                  value={filtroCurso}
                  onChange={(e) => {
                    const curso = cursos.find(c => c.id.toString() === e.target.value);
                    handleCursoChange(e.target.value, curso?.nombre || '');
                  }}
                  options={cursos}
                  placeholder="Seleccionar curso"
                  containerStyle={{ zIndex: 1005, position: 'relative' }}
                />
              )}
              <SelectNativo
                label="Asignatura"
                value={filtroAsignatura}
                onChange={(e) => {
                  const asig = asignaturas.find(a => a.id.toString() === e.target.value);
                  setFiltroAsignatura(e.target.value);
                  setFiltroAsignaturaNombre(asig?.nombre || '');
                }}
                options={asignaturas}
                placeholder={cargandoAsignaturas ? 'Cargando...' : (filtroCurso ? 'Todas las asignaturas' : 'Primero seleccione curso')}
                disabled={!filtroCurso || cargandoAsignaturas}
              />

              {/* Wrapper con z-index alto para el alumno */}
              <div className="autocomplete-container" style={{ position: 'relative', zIndex: 100 }}>
                <AutocompleteAlumno
                  alumnos={alumnos}
                  alumnoSeleccionado={filtroAlumnoId}
                  busqueda={filtroAlumno}
                  onBusquedaChange={(val) => { setFiltroAlumno(val); setFiltroAlumnoId(''); }}
                  onSeleccionar={handleSeleccionarAlumno}
                  disabled={!filtroCurso || cargandoAlumnos}
                  placeholder={cargandoAlumnos ? 'Cargando...' : (filtroCurso ? 'Todos los alumnos' : 'Primero seleccione curso')}
                />
              </div>

              <FiltroFecha
                filtroCurso={filtroCurso}
                fechasConNotas={fechasConNotas}
                filtroFecha={filtroFecha}
                onFechaChange={(date) => setFiltroFecha(date)}
                cargandoFechas={cargandoFechas}
              />

              <div className="docente-filtros-actions" style={{ gridColumn: isTablet ? '1 / -1' : 'auto', justifyContent: isTablet ? 'center' : 'flex-end', marginTop: isTablet ? '10px' : '0', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={limpiarBusqueda} style={{ height: '30px', fontSize: '11px', padding: '0 15px', textTransform: 'uppercase', fontWeight: '600' }}>Limpiar</button>
                <button type="button" className="btn btn-primary" onClick={buscarNotas} disabled={buscando || !filtroCurso} style={{ height: '30px', fontSize: '11px', padding: '0 15px', textTransform: 'uppercase', fontWeight: '600' }}>
                  {buscando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px', zIndex: 1 }}>
        <div className="card-header">
          <h3>Resultados {buscado && `(${resultados.length})`}</h3>
        </div>
        <div className="card-body">
          <div className="table-responsive table-scroll">
            <table className={`data-table ${showMobile ? 'tabla-compacta-movil' : ''}`}>
              <thead>
                <tr>
                  <th>Alumno</th>
                  {isNormalSize && <th>Asignatura</th>}
                  <th>Nota</th>
                  <th>Trim.</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {buscando ? (
                  <tr><td colSpan={isNormalSize ? 6 : 5} className="text-center text-muted">Buscando...</td></tr>
                ) : resultados.length > 0 ? resultados.map(nota => (
                  <tr key={nota.id}>
                    <td>
                      {nota.alumno_apellidos}, {isNormalSize ? nota.alumno_nombres : nota.alumno_nombres?.split(' ')[0]}
                      {!isNormalSize && <div style={{ fontSize: '11px', color: '#64748b' }}>{nota.asignatura_nombre}</div>}
                    </td>
                    {isNormalSize && <td>{nota.asignatura_nombre}</td>}
                    <td>
                      <span className={`docente-nota-badge ${getNotaClass(nota.nota, nota.es_pendiente)}`}>
                        {nota.es_pendiente ? 'Pend.' : (nota.nota !== null ? Number(nota.nota).toFixed(1) : '-')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{nota.trimestre}°</td>
                    <td>{formatearFecha(nota.fecha_evaluacion)}</td>
                    <td>
                      <div className="acciones-btns">
                        <button className="btn-icon btn-icon-edit" onClick={() => abrirModalEditar(nota)} title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="btn-icon btn-icon-delete" onClick={() => { setNotaEliminar(nota); setModalEliminar(true); }} title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={isNormalSize ? 6 : 5} className="text-center text-muted">
                      {buscado ? 'No se encontraron notas con los filtros seleccionados' : 'Seleccione un curso y presione Buscar'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {
        modalEditar && (
          <ModalEditar
            nota={notaEditando}
            editNota={editNota}
            setEditNota={setEditNota}
            editTrimestre={editTrimestre}
            setEditTrimestre={setEditTrimestre}
            editFecha={editFecha}
            setEditFecha={setEditFecha}
            editComentario={editComentario}
            setEditComentario={setEditComentario}
            editPendiente={editPendiente}
            setEditPendiente={setEditPendiente}
            onGuardar={guardarEdicion}
            onCerrar={() => setModalEditar(false)}
            guardando={guardando}
          />
        )
      }
      {
        modalEliminar && (
          <ModalEliminar
            nota={notaEliminar}
            onConfirmar={confirmarEliminar}
            onCerrar={() => setModalEliminar(false)}
            eliminando={eliminando}
          />
        )
      }
    </div >
  );
}

export default ModificarNotaTab;
