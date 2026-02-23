import React, { useState, useEffect, useMemo } from 'react';
import { useResponsive, useDropdown } from '../../hooks';
import { SelectNativo, SelectMovil } from './shared';
import { ordenarCursos } from './shared/utils';

import { apiFetch } from '../../utils/api';
// Demo import removed

// Componente radio para asistencia
const AsistenciaRadio = ({ alumnoId, estado, estadoActual, onChange, disabled }) => (
  <td style={{ textAlign: 'center' }}>
    <label className="asistencia-radio">
      <input
        type="radio"
        name={`asistencia-${alumnoId}`}
        checked={estadoActual === estado}
        onChange={() => onChange(alumnoId, estado)}
        disabled={disabled}
      />
      <span className={`asistencia-circle ${estado}`}></span>
    </label>
  </td>
);

// Modal para justificacion
const ModalJustificacion = ({ isOpen, onClose, onConfirm, alumnoNombre }) => {
  const [comentario, setComentario] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!comentario.trim()) {
      alert('Debe ingresar un comentario para la justificacion');
      return;
    }
    onConfirm(comentario);
    setComentario('');
  };

  const handleClose = () => {
    setComentario('');
    onClose();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1e293b' }}>
          Justificar Asistencia
        </h3>
        <p style={{ color: '#64748b', marginBottom: '16px' }}>
          Alumno: <strong>{alumnoNombre}</strong>
        </p>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Motivo de la justificacion:
          </label>
          <textarea
            className="form-control"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Ingrese el motivo de la justificacion..."
            rows={4}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

function AsistenciaTab({ docenteId, establecimientoId, usuarioId }) {
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [cursoNombre, setCursoNombre] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [asistencia, setAsistencia] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [asistenciaExistente, setAsistenciaExistente] = useState(false);

  // Modal de justificacion
  const [modalJustificacion, setModalJustificacion] = useState({
    isOpen: false,
    alumnoId: null,
    alumnoNombre: ''
  });

  const { isMobile } = useResponsive();
  const { dropdownAbierto, setDropdownAbierto } = useDropdown();

  // Fecha de hoy (formato local YYYY-MM-DD para evitar desfase UTC)
  const getFechaLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const fechaHoy = getFechaLocal();

  // Cargar cursos del docente
  useEffect(() => {
    const cargarCursos = async () => {
      try {
        const response = await apiFetch(`/docente/${docenteId}/cursos?establecimiento_id=${establecimientoId}`);
        const data = await response.json();
        if (data.success) {
          setCursos(ordenarCursos(data.data || []));
        }
      } catch (error) {
        console.error('Error cargando cursos:', error);
      } finally {
        setCargandoCursos(false);
      }
    };

    if (docenteId) cargarCursos();
  }, [docenteId, establecimientoId]);

  const handleCursoChange = (cursoId, nombre = '') => {
    setCursoSeleccionado(cursoId);
    setCursoNombre(nombre);
    setMostrarLista(false);
    setAsistencia({});
    setAsistenciaExistente(false);
  };

  const handleCargarLista = async () => {
    if (!cursoSeleccionado) {
      alert('Seleccione un curso');
      return;
    }

    setCargandoAlumnos(true);

    try {
      // Cargar alumnos del curso
      const respAlumnos = await apiFetch(`/curso/${cursoSeleccionado}/alumnos`);
      const dataAlumnos = await respAlumnos.json();
      const listaAlumnos = dataAlumnos.success ? (dataAlumnos.data || []) : [];
      setAlumnos(listaAlumnos);

      // Verificar si ya existe asistencia para hoy
      const respAsist = await apiFetch(`/asistencia/verificar/${cursoSeleccionado}/${fechaHoy}`);
      const dataAsist = await respAsist.json();

      if (dataAsist.success && dataAsist.existe && dataAsist.data) {
        setAsistencia(dataAsist.data);
        setAsistenciaExistente(true);
        setModoEdicion(false);
      } else {
        // Marcar todos como presente por defecto
        const asistenciaInicial = {};
        listaAlumnos.forEach(a => { asistenciaInicial[a.id] = { estado: 'presente', observacion: '' }; });
        setAsistencia(asistenciaInicial);
        setAsistenciaExistente(false);
        setModoEdicion(true);
      }

      setMostrarLista(true);
    } catch (error) {
      console.error('Error cargando lista:', error);
    } finally {
      setCargandoAlumnos(false);
    }
  };

  const handleAsistenciaChange = (alumnoId, estado) => {
    if (estado === 'justificado') {
      // Abrir modal para ingresar comentario
      const alumno = alumnos.find(a => a.id === alumnoId);
      setModalJustificacion({
        isOpen: true,
        alumnoId,
        alumnoNombre: `${alumno.nombres} ${alumno.apellidos}`
      });
    } else {
      setAsistencia(prev => ({
        ...prev,
        [alumnoId]: {
          estado,
          observacion: ''
        }
      }));
    }
  };

  const handleConfirmarJustificacion = (comentario) => {
    const { alumnoId } = modalJustificacion;
    setAsistencia(prev => ({
      ...prev,
      [alumnoId]: {
        estado: 'justificado',
        observacion: comentario
      }
    }));
    setModalJustificacion({ isOpen: false, alumnoId: null, alumnoNombre: '' });
  };

  const handleGuardarAsistencia = async () => {
    if (Object.keys(asistencia).length === 0) {
      alert('No hay asistencia para guardar');
      return;
    }

    setGuardando(true);

    try {
      const response = await apiFetch('/asistencia/registrar', {
        method: 'POST',
        body: JSON.stringify({
          establecimiento_id: establecimientoId,
          curso_id: parseInt(cursoSeleccionado),
          fecha: fechaHoy,
          asistencia,
          registrado_por: usuarioId,
          docente_id: docenteId
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Asistencia guardada exitosamente');
        setAsistenciaExistente(true);
        setModoEdicion(false);
      } else {
        alert(data.error || 'Error al guardar asistencia');
      }
    } catch (error) {
      console.error('Error al guardar asistencia:', error);
      alert('Error al guardar asistencia');
    } finally {
      setGuardando(false);
    }
  };

  const handleModificarAsistencia = () => {
    setModoEdicion(true);
  };

  const limpiarFiltros = () => {
    setCursoSeleccionado('');
    setCursoNombre('');
    setMostrarLista(false);
    setAsistencia({});
    setAlumnos([]);
    setModoEdicion(false);
    setAsistenciaExistente(false);
  };

  const formatearNombreAlumno = (alumno) => {
    const primerNombre = alumno.nombres.split(' ')[0];
    const nombre = `${alumno.apellidos} ${primerNombre}`;
    if (isMobile) {
      return nombre.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
    return nombre.toUpperCase();
  };

  const formatearFechaLarga = (fecha) => {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const conteo = useMemo(() => {
    const c = { presente: 0, ausente: 0, tardio: 0, justificado: 0 };
    Object.values(asistencia).forEach(({ estado }) => {
      if (c[estado] !== undefined) c[estado]++;
    });
    return c;
  }, [asistencia]);

  const estados = ['presente', 'ausente', 'tardio', 'justificado'];

  return (
    <div className="tab-panel active">
      <div className="card" style={{ overflow: 'visible' }}>
        <div className="card-header"><h3>Registro de Asistencia</h3></div>
        <div className="card-body" style={{ overflow: 'visible' }}>
          <div className="docente-asistencia-filtros" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', gap: '15px' }}>
            {/* Contenedor Curso y Fecha lado a lado en móvil */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '15px', flex: isMobile ? 'auto' : '0 0 auto', width: isMobile ? '100%' : 'auto', alignItems: 'flex-end' }}>
              {/* Grupo Curso */}
              <div style={{ flex: isMobile ? 1 : '0 0 250px' }}>
                {cargandoCursos ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '13px', marginBottom: '5px' }}>Curso</label>
                    <div style={{ padding: '4px 8px', fontSize: '13px', border: '1px solid #ced4da', borderRadius: '4px', height: '30px' }}>Cargando...</div>
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
                    containerStyle={{ marginBottom: 0 }}
                  />
                )}
              </div>

              {/* Grupo Fecha */}
              <div style={{ flex: isMobile ? 1 : '0 0 150px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaHoy}
                    disabled
                    style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', height: '30px', fontSize: '13px', padding: '0 8px', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Botones a la derecha */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingBottom: '15px' }}>
              <button className="btn btn-secondary" onClick={limpiarFiltros} style={{ height: '30px', fontSize: '13px', padding: '0 15px', display: 'flex', alignItems: 'center' }}>Limpiar</button>
              <button
                className="btn btn-primary"
                onClick={handleCargarLista}
                disabled={cargandoAlumnos || !cursoSeleccionado}
                style={{ height: '30px', fontSize: '13px', padding: '0 15px', display: 'flex', alignItems: 'center' }}
              >
                {cargandoAlumnos ? 'Cargando...' : 'Cargar Lista'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mostrarLista && (
        <div className="card" style={{ marginTop: '20px' }}>
          {!isMobile && (
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px' }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>
                {formatearFechaLarga(fechaHoy)}
                {asistenciaExistente && !modoEdicion && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#10b981' }}>(Guardada)</span>}
                {modoEdicion && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#f59e0b' }}>(Editando)</span>}
              </h3>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                <span style={{ color: '#10b981' }}>P: {conteo.presente}</span>
                <span style={{ color: '#ef4444' }}>A: {conteo.ausente}</span>
                <span style={{ color: '#f59e0b' }}>T: {conteo.tardio}</span>
                <span style={{ color: '#3b82f6' }}>J: {conteo.justificado}</span>
              </div>
            </div>
          )}

          <div className="card-body" style={{ padding: '0' }}>
            {/* Leyenda de siglas - Solo en móvil */}
            {isMobile && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                justifyItems: 'center',
                gap: '6px 15px',
                padding: '12px 10px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '800' }}>P = Presente</span>
                <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: '800' }}>A = Ausente</span>
                <span style={{ fontSize: '14px', color: '#f59e0b', fontWeight: '800' }}>T = Tardio</span>
                <span style={{ fontSize: '14px', color: '#3b82f6', fontWeight: '800' }}>J = Justificado</span>
              </div>
            )}
            <div className="table-container-scroll" style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
              <table className="data-table docente-tabla-asistencia" style={{ width: '100%', marginBottom: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <tr>
                    <th style={{ width: '30px', textAlign: 'center', padding: '6px 8px', fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>N</th>
                    <th style={{ minWidth: isMobile ? '100px' : '200px', padding: '6px 8px', fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>Alumno</th>
                    <th style={{ width: isMobile ? '40px' : '80px', textAlign: 'center', padding: '6px 8px', fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{isMobile ? 'P' : 'Presente'}</th>
                    <th style={{ width: isMobile ? '40px' : '80px', textAlign: 'center', padding: '6px 8px', fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{isMobile ? 'A' : 'Ausente'}</th>
                    <th style={{ width: isMobile ? '40px' : '80px', textAlign: 'center', padding: '6px 8px', fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{isMobile ? 'T' : 'Tardio'}</th>
                    <th style={{ width: isMobile ? '40px' : '80px', textAlign: 'center', padding: '6px 8px', fontSize: '12px', color: '#1e293b', fontWeight: '600' }}>{isMobile ? 'J' : 'Justificado'}</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnos.map((alumno, index) => (
                    <tr key={alumno.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'center', padding: '4px 8px', fontSize: '13px' }}>{index + 1}</td>
                      <td style={{ padding: '4px 8px', fontSize: isMobile ? '11px' : '13px' }}>
                        {formatearNombreAlumno(alumno)}
                        {asistencia[alumno.id]?.estado === 'justificado' && asistencia[alumno.id]?.observacion && (
                          <span title={asistencia[alumno.id].observacion} style={{ marginLeft: '6px', color: '#3b82f6', cursor: 'help' }}>(i)</span>
                        )}
                      </td>
                      {estados.map(estado => (
                        <AsistenciaRadio
                          key={estado}
                          alumnoId={alumno.id}
                          estado={estado}
                          estadoActual={asistencia[alumno.id]?.estado}
                          onChange={handleAsistenciaChange}
                          disabled={!modoEdicion}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="docente-asistencia-acciones" style={{ padding: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              {asistenciaExistente && !modoEdicion && (
                <button className="btn btn-secondary" onClick={handleModificarAsistencia} style={{ height: '30px', fontSize: '13px', display: 'flex', alignItems: 'center', padding: '0 15px' }}>
                  {isMobile ? 'Modificar' : 'Modificar Asistencia'}
                </button>
              )}
              {modoEdicion && (
                <button
                  className="btn btn-primary"
                  onClick={handleGuardarAsistencia}
                  disabled={guardando}
                  style={{ height: '30px', fontSize: '13px', display: 'flex', alignItems: 'center', padding: '0 15px' }}
                >
                  {guardando ? 'Guardando...' : (asistenciaExistente ? 'Actualizar' : 'Guardar')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Justificacion */}
      <ModalJustificacion
        isOpen={modalJustificacion.isOpen}
        onClose={() => setModalJustificacion({ isOpen: false, alumnoId: null, alumnoNombre: '' })}
        onConfirm={handleConfirmarJustificacion}
        alumnoNombre={modalJustificacion.alumnoNombre}
      />
    </div>
  );
}

export default AsistenciaTab;
