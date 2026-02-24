import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useResponsive, useDropdown } from '../hooks';
import { useMensaje } from '../contexts';
import { apiFetch } from '../utils/api';

// Componente Select para movil
const SelectMovilLocal = ({ label, value, valueName, onChange, options, placeholder, isOpen, onToggle }) => (
  <div className="form-group">
    <label>{label}</label>
    <div className="custom-select-container">
      <div className="custom-select-trigger" onClick={onToggle}>
        <span>{valueName || placeholder}</span>
        <span className="custom-select-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div className="custom-select-options">
          <div className="custom-select-option" onClick={() => onChange('', '')}>{placeholder}</div>
          {options.map(opt => (
            <div key={opt.id} className={`custom-select-option ${value === String(opt.id) || value === opt.nombre ? 'selected' : ''}`} onClick={() => onChange(opt.id || opt.nombre, opt.nombre)}>
              {opt.nombre}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// Modal de edicion COMPLETO CON PESTAÑAS
const ModalEditarAlumno = ({ alumno: alumnoInicial, cursos, onGuardar, onCerrar }) => {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('alumno'); // 'alumno' | 'apoderado'
  const [loading, setLoading] = useState(true);
  const [datosCompletos, setDatosCompletos] = useState(null);

  // Formulario editable del alumno (+ Salud)
  const [formAlumno, setFormAlumno] = useState({
    curso_id: '',
    rut: '',
    nombres: '',
    apellidos: '',
    direccion: '',
    sexo: '',
    alergias: '',
    enfermedades_cronicas: '',
    tiene_nee: '0',
    detalle_nee: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: ''
  });

  // Formulario editable del apoderado
  const [formApoderado, setFormApoderado] = useState({
    rut: '',
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    direccion: '',
    parentesco: ''
  });

  const [guardando, setGuardando] = useState(false);

  // Cargar datos completos al abrir
  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        const res = await apiFetch(`/alumnos/${alumnoInicial.id}/detalle`);
        const json = await res.json();
        if (json.success) {
          setDatosCompletos(json.data);
          // Pre-llenar formulario alumno
          const al = json.data.alumno;
          setFormAlumno({
            curso_id: al.curso_id || '',
            rut: al.rut || '',
            nombres: al.nombres || '',
            apellidos: al.apellidos || '',
            direccion: al.direccion || '',
            sexo: al.sexo || '',
            alergias: al.alergias || '',
            enfermedades_cronicas: al.enfermedades_cronicas || '',
            tiene_nee: al.tiene_nee ? '1' : '0',
            detalle_nee: al.detalle_nee || '',
            contacto_emergencia_nombre: al.contacto_emergencia_nombre || '',
            contacto_emergencia_telefono: al.contacto_emergencia_telefono || ''
          });
          // Pre-llenar formulario apoderado
          const ap = json.data.apoderado;
          if (ap) {
            setFormApoderado({
              rut: ap.rut || '',
              nombres: ap.nombres || '',
              apellidos: ap.apellidos || '',
              email: ap.email || '',
              telefono: ap.telefono || '',
              direccion: ap.direccion || '',
              parentesco: ap.parentezco || ''
            });
          }
        } else {
          alert("Error cargando ficha");
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchDetalle();
  }, [alumnoInicial]);

  const handleChange = (e) => {
    setFormAlumno({ ...formAlumno, [e.target.name]: e.target.value });
  };

  const handleChangeApoderado = (e) => {
    setFormApoderado({ ...formApoderado, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setGuardando(true);
    try {
      if (activeTab === 'alumno') {
        const response = await apiFetch(`/alumnos/${alumnoInicial.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...formAlumno,
            curso_id: formAlumno.curso_id ? parseInt(formAlumno.curso_id) : null,
            tiene_nee: formAlumno.tiene_nee === '1' ? 1 : 0,
            usuario_modificacion: 'Administrador'
          })
        });
        const data = await response.json();
        if (data.success) {
          onGuardar();
        } else {
          alert(data.error || 'Error al actualizar alumno');
        }
      } else {
        const response = await apiFetch(`/alumnos/${alumnoInicial.id}/apoderado`, {
          method: 'PUT',
          body: JSON.stringify(formApoderado)
        });
        const data = await response.json();
        if (data.success) {
          onGuardar();
        } else {
          alert(data.error || 'Error al actualizar apoderado');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 15px', border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }}></div>
        Cargando ficha del alumno...
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ficha del Alumno: {datosCompletos?.alumno?.nombres} {datosCompletos?.alumno?.apellidos}</h3>
          <button className="modal-close" onClick={onCerrar}>&times;</button>
        </div>

        <div className="modal-tabs">
          <button type="button" className={`modal-tab-btn ${activeTab === 'alumno' ? 'active' : ''}`} onClick={() => setActiveTab('alumno')}>Datos Alumno</button>
          <button type="button" className={`modal-tab-btn ${activeTab === 'apoderado' ? 'active' : ''}`} onClick={() => setActiveTab('apoderado')}>Apoderado</button>
        </div>

        <div className="modal-body">
          {activeTab === 'alumno' && (
            <>
              <div className="ficha-grid">
                <div className="form-group">
                  <label>{isMobile ? 'Curso' : 'Curso Actual'}</label>
                  <select className="form-control" name="curso_id" value={formAlumno.curso_id} onChange={handleChange}>
                    <option value="">{isMobile ? 'Pendiente' : 'Sin Curso (Pendiente Matricula)'}</option>
                    {cursos.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label>RUT</label>
                  <input type="text" className="form-control" name="rut" value={formAlumno.rut} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Nombres</label>
                  <input type="text" className="form-control" name="nombres" value={formAlumno.nombres} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Apellidos</label>
                  <input type="text" className="form-control" name="apellidos" value={formAlumno.apellidos} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input type="text" className="form-control" name="direccion" value={formAlumno.direccion} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Sexo</label>
                  <select className="form-control" name="sexo" value={formAlumno.sexo} onChange={handleChange}>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="section-divider fg-full">{isMobile ? 'Salud / Emerg.' : 'Salud y Emergencia'}</div>
                <div className="form-group fg-full">
                  <label>Alergias</label>
                  <input type="text" className="form-control" name="alergias" value={formAlumno.alergias} onChange={handleChange} placeholder="Ninguna" />
                </div>
                <div className="form-group">
                  <label title="Enfermedades Crónicas">{isMobile ? 'Enf. Crónicas' : 'Enf. Crónicas'}</label>
                  <input type="text" className="form-control" name="enfermedades_cronicas" value={formAlumno.enfermedades_cronicas} onChange={handleChange} placeholder="Ninguna" />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <label style={{ margin: 0 }} title="Necesidades Educativas Especiales">{isMobile ? 'Nec. Edu. Esp.' : 'Nec. Esp. (NEE)'}</label>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); alert('Necesidades Educativas Especiales'); }}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </button>
                  </div>
                  <select className="form-control" name="tiene_nee" value={formAlumno.tiene_nee} onChange={handleChange}>
                    <option value="0">No</option>
                    <option value="1">Sí</option>
                  </select>
                </div>
                {formAlumno.tiene_nee === '1' && (
                  <div className="form-group fg-full">
                    <label>Detalle NEE</label>
                    <input type="text" className="form-control" name="detalle_nee" value={formAlumno.detalle_nee} onChange={handleChange} placeholder="Especifique..." />
                  </div>
                )}
                <div className="form-group">
                  <label>{isMobile ? 'Contacto Emerg.' : 'Cont. Emergencia'}</label>
                  <input type="text" className="form-control" name="contacto_emergencia_nombre" value={formAlumno.contacto_emergencia_nombre} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>{isMobile ? 'Tel. Emerg.' : 'Tel. Emergencia'}</label>
                  <input type="text" className="form-control" name="contacto_emergencia_telefono" value={formAlumno.contacto_emergencia_telefono} onChange={handleChange} />
                </div>
              </div>

              {datosCompletos.alumno.matricula_id && (
                <div className="matricula-badge">
                  ✅ Matrícula Activa {datosCompletos.alumno.anio_academico} (ID: {datosCompletos.alumno.matricula_id})
                </div>
              )}
            </>
          )}

          {activeTab === 'apoderado' && (
            datosCompletos.apoderado ? (
              <div className="ficha-grid">
                <div className="form-group">
                  <label>RUT</label>
                  <input type="text" className="form-control" name="rut" value={formApoderado.rut} onChange={handleChangeApoderado} />
                </div>
                <div className="form-group">
                  <label>Parentesco</label>
                  <select className="form-control" name="parentesco" value={formApoderado.parentesco} onChange={handleChangeApoderado}>
                    <option value="">Seleccionar...</option>
                    <option value="padre">Padre</option>
                    <option value="madre">Madre</option>
                    <option value="abuelo">Abuelo</option>
                    <option value="abuela">Abuela</option>
                    <option value="tio">Tío</option>
                    <option value="tia">Tía</option>
                    <option value="hermano">Hermano</option>
                    <option value="hermana">Hermana</option>
                    <option value="tutor_legal">Tutor Legal</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombres</label>
                  <input type="text" className="form-control" name="nombres" value={formApoderado.nombres} onChange={handleChangeApoderado} />
                </div>
                <div className="form-group">
                  <label>Apellidos</label>
                  <input type="text" className="form-control" name="apellidos" value={formApoderado.apellidos} onChange={handleChangeApoderado} />
                </div>
                <div className="form-group fg-full">
                  <label>Email</label>
                  <input type="email" className="form-control" name="email" value={formApoderado.email} onChange={handleChangeApoderado} />
                </div>
                <div className="form-group fg-full">
                  <label>Teléfono</label>
                  <input type="text" className="form-control" name="telefono" value={formApoderado.telefono} onChange={handleChangeApoderado} />
                </div>
                <div className="form-group fg-full">
                  <label>Dirección</label>
                  <input type="text" className="form-control" name="direccion" value={formApoderado.direccion} onChange={handleChangeApoderado} />
                </div>
              </div>
            ) : (
              <p className="missing-data-msg">No hay apoderado vinculado a este alumno.</p>
            )
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCerrar} disabled={guardando}>Cerrar</button>
          {(activeTab === 'alumno' || (activeTab === 'apoderado' && datosCompletos?.apoderado)) && (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          )}
        </div>
      </div>
      <style>{`
        /* Centrado del modal */
        .modal-overlay { display: flex; align-items: center; justify-content: center; padding: 10px; z-index: 10000; }
        
        /* Modal más compacto en escritorio/tablet (680px) */
        .modal-xl { 
            max-width: 680px; 
            width: 95%; 
            margin: auto; 
            max-height: 90vh; 
            display: flex; 
            flex-direction: column; 
        }

        /* Ajuste específico para Tablet y Desktop: Bajar posición (Despegar del header) */
        @media (min-width: 768px) {
            .modal-overlay { align-items: flex-start; padding-top: 90px; padding-bottom: 50px; }
            .modal-xl { margin: 0 auto; max-height: calc(100vh - 160px); }
        }
        
        /* Ajuste de contenido para ser más "chico" */
        .modal-xl .modal-header { padding: 15px 20px; }
        .modal-xl .modal-header h3 { font-size: 1.15rem; margin: 0; color: white; }
        .modal-xl .form-control { font-size: 0.9rem; padding: 6px 10px; height: auto; }
        .modal-xl .modal-tab-btn { padding: 8px 12px; font-size: 0.9rem; }
        .modal-xl .modal-body { padding: 0 20px 15px; flex: 1; overflow-y: auto; }
        .modal-xl .modal-footer { padding: 8px 20px; }
        @media (max-width: 639px) {
            .modal-xl .modal-footer { padding: 6px 14px; }
            .modal-xl .modal-body { padding: 0 14px 6px; }
        }

        /* Grid System: 1 col on mobile, 2 on small tablet, 3 on desktop */
        .grid-responsive {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 15px;
        }
        @media (min-width: 640px) {
            .grid-responsive { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 768px) {
            .grid-responsive { grid-template-columns: 1fr 1fr 1fr; }
            .grid-responsive.info-grid { grid-template-columns: 1fr 1fr; }
        }

        /* Ficha grid: 2 cols en móvil, fg-full ocupa fila completa solo en móvil */
        .ficha-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        @media (max-width: 639px) {
            .ficha-grid .fg-full { grid-column: 1 / -1; }
        }
        @media (min-width: 640px) {
            .ficha-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 768px) {
            .ficha-grid { grid-template-columns: 1fr 1fr 1fr; }
        }
        
        .section-divider {
            font-size: 0.85rem; font-weight: 700; color: #4b5563;
            border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; margin: 10px 0 2px 0;
            text-transform: uppercase; letter-spacing: 0.5px;
            grid-column: 1 / -1;
        }
        
        /* Estilos de inputs en el modal para que se ajusten al grid */
        .form-control { width: 100%; box-sizing: border-box; }
        .form-group label { font-weight: 500; font-size: 0.85em; margin-bottom: 3px; display: block; }
        @media (max-width: 768px) {
          .modal-xl { width: 100%; max-height: 100vh; border-radius: 0; }
          .form-group label { font-size: 0.75rem; }
          .info-item label { font-size: 0.7rem !important; }
          .data-val { font-size: 0.85rem; word-break: break-word; }
        }
        
        /* Estilos de ReadOnly Info */
        .info-item label { display: block; font-size: 0.8rem; color: #6b7280; margin-bottom: 2px; text-transform: uppercase; font-weight: 600; }
        .readonly-val, .data-val { font-weight: 500; color: #1f2937; min-height: 24px; padding: 4px 0; border-bottom: 1px dotted #e5e7eb; word-break: break-all; }
        
        .badge-warning { background: #fff7ed; color: #c2410c; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; border: 1px solid #fed7aa; display: inline-block;}
        .highlight { color: #2563eb; font-weight: 600; }
        
        .matricula-badge { margin-top: 5px; padding: 6px 10px; background: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0; color: #166534; font-size: 0.85em; text-align: center; font-weight: 500; }
        .missing-data-msg { text-align: center; color: #ef4444; background: #fef2f2; padding: 10px; border-radius: 6px; margin-top: 15px; font-size: 0.9em; }

        .modal-tabs { display: flex; border-bottom: 1px solid #ddd; margin-bottom: 20px; padding: 0 20px; }
        .modal-tab-btn { flex: 1; padding: 12px; border: none; background: none; cursor: pointer; border-bottom: 3px solid transparent; font-weight: 500; color: #64748b; transition: all 0.2s; font-size: 1rem; }
        .modal-tab-btn:hover { color: #3b82f6; background: #f8fafc; }
        .modal-tab-btn.active { border-bottom-color: #3b82f6; color: #2563eb; background: #eff6ff; font-weight: 600; }
        .modal-body { padding: 0 20px 20px; }
      `}</style>
    </div>
  );
};

function AlumnosTab() {
  const { mostrarMensaje } = useMensaje();
  const [filtros, setFiltros] = useState({ cursoId: '', cursoNombre: '', busquedaAlumno: '', alumnoSeleccionado: null });
  const [modalEditar, setModalEditar] = useState({ visible: false, alumno: null });
  const [cursosDB, setCursosDB] = useState([]);
  const [alumnosPorCursoDB, setAlumnosPorCursoDB] = useState({});
  const [alumnosDelCursoFiltro, setAlumnosDelCursoFiltro] = useState([]);
  const [dropdownAlumnoAbierto, setDropdownAlumnoAbierto] = useState(false);
  const dropdownAlumnoRef = useRef(null);

  const { isMobile } = useResponsive();
  const { dropdownAbierto, setDropdownAbierto } = useDropdown();

  // Formatear nombre para móvil: "Apellido1 A., Nombre1 N." → partes separadas
  const formatNombreMobile = (nombreCompleto) => {
    if (!nombreCompleto) return { apellidos: '', nombres: '' };
    const [aps, noms] = nombreCompleto.split(',').map(s => s?.trim() || '');
    const partesAp = aps.split(' ').filter(Boolean);
    const partesNom = noms.split(' ').filter(Boolean);
    const apFormateado = partesAp.length > 1
      ? `${partesAp[0]} ${partesAp[1][0]}.`
      : partesAp[0] || '';
    const nomFormateado = partesNom.length > 1
      ? `${partesNom[0]} ${partesNom[1][0]}.`
      : partesNom[0] || '';
    return { apellidos: apFormateado, nombres: nomFormateado };
  };

  // Cerrar dropdown de alumnos al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownAlumnoRef.current && !dropdownAlumnoRef.current.contains(event.target)) {
        setDropdownAlumnoAbierto(false);
      }
    };
    if (dropdownAlumnoAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownAlumnoAbierto]);

  // Cargar cursos y alumnos al montar el componente
  useEffect(() => {
    cargarCursos();
    cargarAlumnos();
  }, []);

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

  const cargarAlumnos = async () => {
    try {
      const response = await apiFetch(`/alumnos/por-curso`);
      const data = await response.json();
      if (data.success) {
        setAlumnosPorCursoDB(data.data || {});
      }
    } catch (error) {
      console.error('Error cargando alumnos:', error);
    }
  };

  // Cargar alumnos del curso seleccionado
  const cargarAlumnosDelCurso = async (cursoId) => {
    if (!cursoId) {
      setAlumnosDelCursoFiltro([]);
      return;
    }
    try {
      const response = await apiFetch(`/alumnos?curso_id=${cursoId}`);
      const data = await response.json();
      if (data.success) {
        setAlumnosDelCursoFiltro(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando alumnos del curso:', error);
    }
  };

  // Cuando cambia el curso del filtro
  const handleCambiarCursoFiltro = (cursoId, cursoNombre) => {
    setFiltros({ ...filtros, cursoId, cursoNombre, busquedaAlumno: '', alumnoSeleccionado: null });
    cargarAlumnosDelCurso(cursoId);
  };

  // Cuando se selecciona un alumno del dropdown
  const handleSeleccionarAlumnoFiltro = (alumno) => {
    setFiltros({ ...filtros, busquedaAlumno: alumno.nombre_completo, alumnoSeleccionado: alumno });
    setDropdownAlumnoAbierto(false);
  };

  // Alumnos filtrados por texto de búsqueda (para el dropdown)
  const alumnosSugeridos = useMemo(() => {
    if (!filtros.busquedaAlumno || filtros.alumnoSeleccionado) return alumnosDelCursoFiltro;
    const busqueda = filtros.busquedaAlumno.toLowerCase();
    const busquedaSinFormato = busqueda.replace(/[.\-]/g, '');
    return alumnosDelCursoFiltro.filter(alumno =>
      alumno.nombre_completo.toLowerCase().includes(busqueda) ||
      alumno.rut.toLowerCase().includes(busqueda) ||
      alumno.rut.replace(/[.\-]/g, '').includes(busquedaSinFormato)
    );
  }, [alumnosDelCursoFiltro, filtros.busquedaAlumno, filtros.alumnoSeleccionado]);

  // Alumnos mostrados en la tabla
  const alumnosFiltrados = useMemo(() => {
    // Si hay un alumno seleccionado específicamente, mostrar solo ese
    if (filtros.alumnoSeleccionado) {
      return [filtros.alumnoSeleccionado];
    }

    // Si hay un curso seleccionado, mostrar alumnos de ese curso
    if (filtros.cursoId) {
      // Filtrar por texto de búsqueda si hay
      if (filtros.busquedaAlumno) {
        return alumnosDelCursoFiltro.filter(alumno =>
          alumno.nombre_completo.toLowerCase().includes(filtros.busquedaAlumno.toLowerCase()) ||
          alumno.rut.toLowerCase().includes(filtros.busquedaAlumno.toLowerCase())
        );
      }
      return alumnosDelCursoFiltro;
    }

    // Si no hay filtros, mostrar todos los alumnos
    let alumnos = [];
    Object.entries(alumnosPorCursoDB).forEach(([curso, lista]) => {
      lista.forEach(alumno => alumnos.push(alumno));
    });
    return alumnos;
  }, [filtros.cursoId, filtros.busquedaAlumno, filtros.alumnoSeleccionado, alumnosDelCursoFiltro, alumnosPorCursoDB]);

  const eliminarAlumno = async (alumno) => {
    if (window.confirm(`¿Desea eliminar al alumno ${alumno.nombre_completo}?\n\nEsta acción lo desactivará del sistema y no aparecerá en ningún listado.`)) {
      try {
        const response = await apiFetch(`/alumnos/${alumno.id}`, {
          method: 'DELETE',
  
          body: JSON.stringify({ usuario_modificacion: 'Administrador' })
        });
        const data = await response.json();
        if (data.success) {
          mostrarMensaje('Exito', 'Alumno eliminado correctamente', 'success');
          cargarAlumnos();
          // Recargar también los alumnos del filtro si hay un curso seleccionado
          if (filtros.cursoId) {
            cargarAlumnosDelCurso(filtros.cursoId);
          }
        } else {
          mostrarMensaje('Error', data.error || 'Error al eliminar', 'error');
        }
      } catch (error) {
        mostrarMensaje('Error', 'Error de conexión', 'error');
      }
    }
  };

  // Función para cuando se guarda un alumno editado
  const handleGuardarEdicion = () => {
    mostrarMensaje('Exito', 'Alumno actualizado correctamente', 'success');
    setModalEditar({ visible: false, alumno: null });
    cargarAlumnos();
    // Recargar también los alumnos del filtro si hay un curso seleccionado
    if (filtros.cursoId) {
      cargarAlumnosDelCurso(filtros.cursoId);
    }
  };

  return (
    <div className="tab-panel active">
      <div className="card full-width-card">
        <div className="card-header"><h3>Kárdex de Alumnos (Gestión y Consulta)</h3></div>
        <div className="card-body">
          <div className="filtros-alumnos">
            <div className="form-row form-row-filtros">
              <div className="form-group">
                <label>Curso</label>
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
                      <div className="custom-select-option" onClick={() => { handleCambiarCursoFiltro('', ''); setDropdownAbierto(null); }}>Todos los cursos</div>
                      {cursosDB.map(curso => (
                        <div
                          key={curso.id}
                          className={`custom-select-option ${filtros.cursoId === String(curso.id) ? 'selected' : ''}`}
                          onClick={() => { handleCambiarCursoFiltro(curso.id, curso.nombre); setDropdownAbierto(null); }}
                        >
                          {curso.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group" style={{ position: 'relative' }} ref={dropdownAlumnoRef}>
                <label>Alumno</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={filtros.cursoId ? "Buscar alumno..." : "Seleccione un curso primero"}
                  value={filtros.busquedaAlumno}
                  disabled={!filtros.cursoId}
                  onChange={(e) => {
                    setFiltros({ ...filtros, busquedaAlumno: e.target.value, alumnoSeleccionado: null });
                    setDropdownAlumnoAbierto(true);
                  }}
                  onFocus={() => filtros.cursoId && setDropdownAlumnoAbierto(true)}
                />
                {dropdownAlumnoAbierto && filtros.cursoId && (
                  <div className="dropdown-alumnos" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0 0 8px 8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}>
                    {/* Opción "Todos" al inicio */}
                    <div
                      onClick={() => {
                        setFiltros({ ...filtros, busquedaAlumno: '', alumnoSeleccionado: null });
                        setDropdownAlumnoAbierto(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '2px solid #e2e8f0',
                        background: !filtros.alumnoSeleccionado && !filtros.busquedaAlumno ? '#eff6ff' : 'white',
                        color: '#3b82f6',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = !filtros.alumnoSeleccionado && !filtros.busquedaAlumno ? '#eff6ff' : 'white'}
                    >
                      Todos los alumnos
                    </div>
                    {/* Lista de alumnos filtrados */}
                    {alumnosSugeridos.length > 0 ? (
                      alumnosSugeridos.map(alumno => (
                        <div
                          key={alumno.id}
                          onClick={() => handleSeleccionarAlumnoFiltro(alumno)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: filtros.alumnoSeleccionado?.id === alumno.id ? '#eff6ff' : 'white'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = filtros.alumnoSeleccionado?.id === alumno.id ? '#eff6ff' : 'white'}
                        >
                          <div>
                            <div style={{ fontWeight: '500', color: '#1e293b', fontSize: isMobile ? '12px' : '14px' }}>
                              {isMobile ? (() => {
                                const fmt = formatNombreMobile(alumno.nombre_completo);
                                const primerNombre = (alumno.nombre_completo.split(',')[1]?.trim() || '').split(' ')[0];
                                return `${fmt.apellidos} ${primerNombre}`;
                              })() : alumno.nombre_completo}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                              {alumno.rut}
                            </div>
                          </div>
                          {!isMobile && (
                            <div style={{ color: '#64748b', fontSize: '10px', whiteSpace: 'nowrap', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                              {alumno.curso_nombre}
                            </div>
                          )}
                        </div>
                      ))
                    ) : filtros.busquedaAlumno ? (
                      <div style={{ padding: '12px', color: '#94a3b8', fontSize: '14px' }}>
                        No se encontraron alumnos
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            {filtros.cursoNombre && (
              <div style={{ marginTop: '10px', padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#3b82f6', fontWeight: '500' }}>Mostrando:</span>
                <span style={{ color: '#1e40af' }}>{filtros.cursoNombre?.replace(/Básico|Basico|Básica|Basica/gi, 'B').replace(/Media/gi, 'M')}</span>
                {filtros.alumnoSeleccionado && (
                  <>
                    <span style={{ color: '#94a3b8' }}>→</span>
                    <span style={{ color: '#1e40af' }}>{filtros.alumnoSeleccionado.nombre_completo}</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFiltros({ cursoId: '', cursoNombre: '', busquedaAlumno: '', alumnoSeleccionado: null });
                    setAlumnosDelCursoFiltro([]);
                  }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px' }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
          <div className="table-responsive table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>{isMobile ? 'Nombre' : 'Nombre Completo'}</th><th>RUT</th><th>Curso</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {alumnosFiltrados.length > 0 ? alumnosFiltrados.map(alumno => (
                  <tr key={alumno.id}>
                    <td>
                      {isMobile ? (() => {
                        const fmt = formatNombreMobile(alumno.nombre_completo);
                        return (
                          <div>
                            <div style={{ fontWeight: 600 }}>{fmt.apellidos}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{fmt.nombres}</div>
                          </div>
                        );
                      })() : alumno.nombre_completo}
                    </td>
                    <td>{alumno.rut}</td>
                    <td>{alumno.curso_nombre?.replace(/Básico|Basico|Básica|Basica/gi, 'B').replace(/Media/gi, 'M')}</td>
                    <td>
                      <div className="acciones-btns">
                        <button className="btn-icon btn-icon-edit" onClick={() => setModalEditar({ visible: true, alumno })} title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button className="btn-icon btn-icon-delete" onClick={() => eliminarAlumno(alumno)} title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan="4" className="text-center text-muted">No hay alumnos registrados</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalEditar.visible && (
        <ModalEditarAlumno
          alumno={modalEditar.alumno}
          cursos={cursosDB}
          onGuardar={handleGuardarEdicion}
          onCerrar={() => setModalEditar({ visible: false, alumno: null })}
        />
      )}
    </div>
  );
}

export default AlumnosTab;
