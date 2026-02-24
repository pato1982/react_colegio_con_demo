import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { useResponsive } from '../hooks';

const MatriculasTab = ({ mostrarMensaje }) => {
    // ESTADOS
    const [seccionActual, setSeccionActual] = useState(1);
    const [matriculando, setMatriculando] = useState(false);
    const [mismaDireccion, setMismaDireccion] = useState(true);

    // Datos y Listas
    const [cursos, setCursos] = useState([]);
    const [alumnosExistentes, setAlumnosExistentes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [sugerencias, setSugerencias] = useState([]);

    // POPUP ERROR
    const [errorPopup, setErrorPopup] = useState({ visible: false, titulo: '', mensaje: '' });

    // Dropdown Curso custom
    const [dropdownCursoAbierto, setDropdownCursoAbierto] = useState(false);
    const dropdownRef = useRef(null);

    // Tablet: 2 pasos en vez de 5
    const { isTablet } = useResponsive();
    const totalPasos = isTablet ? 2 : 5;

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownCursoAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [form, setForm] = useState({
        anio_academico: new Date().getFullYear(),
        curso_asignado_id: '',

        rut_alumno: '', nombres_alumno: '', apellidos_alumno: '',
        fecha_nacimiento_alumno: '', sexo_alumno: '', nacionalidad_alumno: 'Chilena',
        direccion_alumno: '', comuna_alumno: '', ciudad_alumno: '', telefono_alumno: '', email_alumno: '',

        rut_apoderado: '', nombres_apoderado: '', apellidos_apoderado: '',
        email_apoderado: '', telefono_apoderado: '', direccion_apoderado: '',
        parentezco: '',

        contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
        tiene_nee: false, detalle_nee: '', alergias: 'Ninguna', enfermedades_cronicas: 'Ninguna',

        colegio_procedencia: '', ultimo_curso_aprobado: '', promedio_notas_anterior: '',
        observaciones_apoderado: '',

        alumno_id_existente: null
    });

    useEffect(() => {
        cargarCursos();
        cargarAlumnos();
    }, []);

    const cargarCursos = async () => { /* ... */ try { const r = await apiFetch(`/cursos`); const d = await r.json(); if (d.success) setCursos(d.data); } catch (e) { } };
    const cargarAlumnos = async () => { /* ... */ try { const r = await apiFetch(`/alumnos`); const d = await r.json(); if (d.success) setAlumnosExistentes(d.data); } catch (e) { } };

    // Buscador Alumnos logic
    useEffect(() => {
        if (busqueda.length > 2) {
            const t = busqueda.toLowerCase();
            setSugerencias(alumnosExistentes.filter(a => a.nombre_completo.toLowerCase().includes(t) || a.rut.includes(t)).slice(0, 5));
        } else setSugerencias([]);
    }, [busqueda, alumnosExistentes]);

    const seleccionarAlumnoExistente = (alumno) => {
        setForm(prev => ({
            ...prev,
            alumno_id_existente: alumno.id,
            rut_alumno: alumno.rut || '', nombres_alumno: alumno.nombres || '', apellidos_alumno: alumno.apellidos || '',
            fecha_nacimiento_alumno: alumno.fecha_nacimiento ? alumno.fecha_nacimiento.substring(0, 10) : '',
            sexo_alumno: alumno.genero || '', direccion_alumno: alumno.direccion || '',
            comuna_alumno: alumno.comuna || '', ciudad_alumno: alumno.ciudad || '',
            email_alumno: alumno.email || '', telefono_alumno: alumno.telefono || '',
        }));
        setBusqueda(''); setSugerencias([]); if (!isTablet) setSeccionActual(2);
    };

    // --- NUEVO: AUTOLLENADO APODERADO ---
    const handleBlurRutApoderado = async () => {
        if (form.rut_apoderado.length > 8) {
            try {
                const res = await apiFetch(`/matriculas/apoderado/${form.rut_apoderado}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setForm(prev => ({
                        ...prev,
                        nombres_apoderado: data.data.nombres || '',
                        apellidos_apoderado: data.data.apellidos || '',
                        email_apoderado: data.data.email || '',
                        telefono_apoderado: data.data.telefono || ''
                        // NO TOCO DIRECCION
                    }));
                }
            } catch (e) { console.error("Error buscando apoderado", e); }
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const seleccionarCurso = (cursoId) => {
        setForm(prev => ({ ...prev, curso_asignado_id: cursoId }));
        setDropdownCursoAbierto(false);
    };

    const siguientePaso = () => {
        if (isTablet) {
            // Tablet paso 1: validar alumno completo (pasos originales 1+2+4)
            if (seccionActual === 1) {
                if (!form.curso_asignado_id || !form.anio_academico) {
                    alert('Debe seleccionar el Curso de Destino y Año Académico.'); return;
                }
                if (!form.rut_alumno || !form.nombres_alumno || !form.apellidos_alumno ||
                    !form.fecha_nacimiento_alumno || !form.sexo_alumno || !form.direccion_alumno) {
                    alert('Complete todos los datos del Alumno (RUT, Nombres, Apellidos, Fecha, Sexo, Dirección).'); return;
                }
                if (!form.contacto_emergencia_nombre || !form.contacto_emergencia_telefono) {
                    alert('Debe ingresar un Contacto de Emergencia (Nombre y Teléfono).'); return;
                }
                if (!form.alergias) {
                    alert('El campo Alergias es obligatorio (puede ser "Ninguna").'); return;
                }
            }
            setSeccionActual(prev => prev + 1);
            return;
        }

        // Desktop/móvil: comportamiento original
        if (seccionActual === 1) {
            if (!form.curso_asignado_id || !form.anio_academico) {
                alert('Debe seleccionar el Curso de Destino y Año Académico.'); return;
            }
        }
        if (seccionActual === 2) {
            if (!form.rut_alumno || !form.nombres_alumno || !form.apellidos_alumno ||
                !form.fecha_nacimiento_alumno || !form.sexo_alumno || !form.direccion_alumno) {
                alert('Complete todos los datos del Alumno (RUT, Nombres, Apellidos, Fecha, Sexo, Dirección).'); return;
            }
        }
        if (seccionActual === 3) {
            if (!form.rut_apoderado || !form.nombres_apoderado || !form.apellidos_apoderado ||
                !form.parentezco || !form.email_apoderado || !form.telefono_apoderado) {
                alert('Complete todos los datos del Apoderado.'); return;
            }
            if (!mismaDireccion && !form.direccion_apoderado) {
                alert('Ingrese la dirección del apoderado.'); return;
            }
        }
        if (seccionActual === 4) {
            if (!form.contacto_emergencia_nombre || !form.contacto_emergencia_telefono) {
                alert('Debe ingresar un Contacto de Emergencia (Nombre y Teléfono).'); return;
            }
            if (!form.alergias) {
                alert('El campo Alergias es obligatorio (puede ser "Ninguna").'); return;
            }
        }
        setSeccionActual(prev => prev + 1);
    };
    const anteriorPaso = () => setSeccionActual(prev => prev - 1);

    const llenarDatosPrueba = () => { /* ... DEMO ... */
        setForm(prev => ({
            ...prev,
            rut_alumno: '26.111.222-3', nombres_alumno: 'Agustín Ignacio', apellidos_alumno: 'Soto Muñoz',
            fecha_nacimiento_alumno: '2016-05-15', sexo_alumno: 'Masculino',
            direccion_alumno: 'Calle Falsa 123', comuna_alumno: 'Santiago',
            rut_apoderado: '15.222.333-4', nombres_apoderado: 'Héctor', apellidos_apoderado: 'Soto Pérez',
            email_apoderado: 'apoderado.demo@example.com', telefono_apoderado: '+56987654321', parentezco: 'Padre', direccion_apoderado: '',
            tiene_nee: false, alergias: 'Ninguna', contacto_emergencia_nombre: 'María Muñoz', contacto_emergencia_telefono: '+56911112222', colegio_procedencia: 'Garden', observaciones_apoderado: 'Ok'
        }));
        setMismaDireccion(true);
    };

    const handleSubmit = async () => {
        // Validar último paso
        if (!form.colegio_procedencia) {
            alert('Debe ingresar el Colegio de Procedencia.'); return;
        }

        // En tablet, validar apoderado aquí (en desktop se valida en siguientePaso)
        if (isTablet) {
            if (!form.rut_apoderado || !form.nombres_apoderado || !form.apellidos_apoderado ||
                !form.parentezco || !form.email_apoderado || !form.telefono_apoderado) {
                alert('Complete todos los datos del Apoderado.'); return;
            }
            if (!mismaDireccion && !form.direccion_apoderado) {
                alert('Ingrese la dirección del apoderado.'); return;
            }
        }

        // VALIDACIÓN PREVIA EN BACKEND
        if (form.alumno_id_existente) {
            const valRes = await apiFetch(`/matriculas/validar-promocion`, {
                method: 'POST',
                body: JSON.stringify({ alumno_id: form.alumno_id_existente, curso_destino_id: form.curso_asignado_id })
            });
            const valData = await valRes.json();

            if (!valData.success) {
                // ERROR DETECTADO: MOSTRAR POPUP
                setErrorPopup({ visible: true, titulo: valData.titulo, mensaje: valData.mensaje });
                return; // DETENER MATRÍCULA
            }
        }

        if (!window.confirm('¿Confirmar matrícula?')) return;
        setMatriculando(true);
        try {
            const dirApoderadoFinal = mismaDireccion ? form.direccion_alumno : form.direccion_apoderado;
            const payload = { establishment_id: 1, ...form, direccion_apoderado: dirApoderadoFinal, establecimiento_id: 1 };
            const res = await apiFetch(`/matriculas`, { method: 'POST', body: JSON.stringify(payload) });
            const data = await res.json();

            if (data.success) {
                if (mostrarMensaje) mostrarMensaje('Éxito', 'Matrícula exitosa', 'success'); else alert('Éxito');
                setForm({ anio_academico: new Date().getFullYear(), cucumber: '', curso_asignado_id: '', rut_alumno: '', nombres_alumno: '', apellidos_alumno: '', rut_apoderado: '', nombres_apoderado: '', apellidos_apoderado: '', email_apoderado: '', parentezco: '', tiene_nee: false, detalle_nee: '', contacto_emergencia_nombre: '', alumno_id_existente: null });
                setSeccionActual(1);
            } else { alert('Error: ' + data.error); }
        } catch (e) { console.error(e); alert('Error Conexión'); } finally { setMatriculando(false); }
    };

    return (
        <div className="tab-panel active" style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>

            {/* POPUP ERROR MODAL */}
            {errorPopup.visible && (
                <div className="modal-overlay">
                    <div className="modal-content animate-pop">
                        <div className="modal-header-error">
                            <h3>{errorPopup.titulo}</h3>
                            <button className="close-btn" onClick={() => setErrorPopup({ visible: false, titulo: '', mensaje: '' })}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p>{errorPopup.mensaje}</p>
                            <div className="alert-info-fix">
                                Revise la selección del curso en el Paso 1 o verifique las notas del alumno.
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setErrorPopup({ visible: false, titulo: '', mensaje: '' })}>Entendido, Corregir</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3>Ficha de Matrícula {form.anio_academico}</h3>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>Paso {seccionActual} de {totalPasos}</div>
                </div>

                <div className="card-body">
                    {/* Barra Progreso */}
                    <div style={{ display: 'flex', marginBottom: '20px', background: '#eee', height: '4px', borderRadius: '2px' }}>
                        <div style={{ width: `${(seccionActual / totalPasos) * 100}%`, background: '#3182ce', transition: 'width 0.3s' }}></div>
                    </div>

                    {seccionActual === 1 && (
                        <div>
                            <h4 style={{ color: '#2b6cb0' }}>1. Selección Académica</h4>
                            <div className="matricula-paso1-grid">
                                <div className="form-group matricula-busqueda" style={{ position: 'relative' }}>
                                    <label>Autocargar Alumno Existente (Opcional)</label>
                                    <input type="text" className="form-control" placeholder="Buscar RUT o Nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                                    {sugerencias.length > 0 && (
                                        <div className="lista-flotante-sugerencias">
                                            {sugerencias.map(a => (<div key={a.id} className="item-sugerencia" onClick={() => seleccionarAlumnoExistente(a)}>{a.nombre_completo} ({a.rut})</div>))}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group matricula-curso">
                                    <label>Curso Destino <span className="text-danger">*</span></label>
                                    <div className="custom-dropdown-curso" ref={dropdownRef}>
                                        <div
                                            className="custom-dropdown-trigger form-control"
                                            onClick={() => setDropdownCursoAbierto(!dropdownCursoAbierto)}
                                        >
                                            <span>{form.curso_asignado_id ? cursos.find(c => c.id == form.curso_asignado_id)?.nombre : 'Seleccione...'}</span>
                                            <span className="dropdown-arrow">{dropdownCursoAbierto ? '▲' : '▼'}</span>
                                        </div>
                                        {dropdownCursoAbierto && (
                                            <div className="custom-dropdown-options">
                                                {cursos.map(c => (
                                                    <div
                                                        key={c.id}
                                                        className={`custom-dropdown-option ${form.curso_asignado_id == c.id ? 'selected' : ''}`}
                                                        onClick={() => seleccionarCurso(c.id)}
                                                    >
                                                        {c.nombre}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group matricula-anio"><label>Año</label><input type="number" name="anio_academico" className="form-control" value={form.anio_academico} onChange={handleChange} /></div>
                            </div>
                        </div>
                    )}

                    {(isTablet ? seccionActual === 1 : seccionActual === 2) && (
                        <div style={isTablet ? { marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' } : undefined}>
                            <h4 style={{ color: '#2b6cb0' }}>{isTablet ? 'Datos del Alumno' : '2. Datos del Alumno'}</h4>
                            <div className="matricula-paso2-grid">
                                <div className="form-group campo-rut"><label>RUT</label><input type="text" name="rut_alumno" className="form-control" value={form.rut_alumno} onChange={handleChange} /></div>
                                <div className="form-group campo-nombres"><label>Nombres</label><input type="text" name="nombres_alumno" className="form-control" value={form.nombres_alumno} onChange={handleChange} /></div>
                                <div className="form-group campo-apellidos"><label>Apellidos</label><input type="text" name="apellidos_alumno" className="form-control" value={form.apellidos_alumno} onChange={handleChange} /></div>
                                <div className="form-group campo-fecha"><label>Fecha Nac.</label><input type="date" name="fecha_nacimiento_alumno" className="form-control" value={form.fecha_nacimiento_alumno} onChange={handleChange} /></div>
                                <div className="form-group campo-sexo"><label>Sexo</label><select name="sexo_alumno" className="form-control" value={form.sexo_alumno} onChange={handleChange}><option value="">Select...</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="Otro">Otro</option></select></div>
                                <div className="form-group campo-direccion"><label>Dirección</label><input type="text" name="direccion_alumno" className="form-control" value={form.direccion_alumno} onChange={handleChange} /></div>
                            </div>
                        </div>
                    )}

                    {(isTablet ? seccionActual === 2 : seccionActual === 3) && (
                        <div>
                            <h4 style={{ color: '#dd6b20' }}>{isTablet ? 'Datos del Apoderado' : '3. Datos del Apoderado'}</h4>
                            <div className="alert alert-warning" style={{ marginBottom: '15px', fontSize: '0.9em' }}>
                                Ingrese el RUT del apoderado. Si existe, se cargarán sus datos (excepto dirección).
                            </div>
                            <div className="matricula-paso3-grid">
                                <div className="form-group campo-rut-apod">
                                    <label>RUT Apoderado <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        name="rut_apoderado"
                                        className="form-control"
                                        value={form.rut_apoderado}
                                        onChange={handleChange}
                                        onBlur={handleBlurRutApoderado}
                                        placeholder="Ej: 15.222.333-4"
                                    />
                                </div>
                                <div className="form-group campo-parentezco">
                                    <label>Parentezco</label>
                                    <select name="parentezco" className="form-control" value={form.parentezco} onChange={handleChange} required>
                                        <option value="">Seleccione...</option><option value="Padre">Padre</option><option value="Madre">Madre</option><option value="Abuelo/a">Abuelo/a</option><option value="Tío/a">Tío/a</option><option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div className="form-group campo-nombres-apod"><label>Nombres</label><input type="text" name="nombres_apoderado" className="form-control" value={form.nombres_apoderado} onChange={handleChange} /></div>
                                <div className="form-group campo-apellidos-apod"><label>Apellidos</label><input type="text" name="apellidos_apoderado" className="form-control" value={form.apellidos_apoderado} onChange={handleChange} /></div>
                                <div className="form-group campo-email-apod"><label>Email</label><input type="email" name="email_apoderado" className="form-control" value={form.email_apoderado} onChange={handleChange} /></div>
                                <div className="form-group campo-telefono-apod"><label>Teléfono</label><input type="text" name="telefono_apoderado" className="form-control" value={form.telefono_apoderado} onChange={handleChange} /></div>
                            </div>
                            <div className="campo-direccion-apod" style={{ marginTop: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '6px', background: '#fafafa' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>¿Vive en la misma dirección del alumno?</label>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="radio" name="mismaDireccion" checked={mismaDireccion === true} onChange={() => setMismaDireccion(true)} /> Sí</label>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="radio" name="mismaDireccion" checked={mismaDireccion === false} onChange={() => setMismaDireccion(false)} /> No</label>
                                </div>
                                {mismaDireccion ? (<div className="form-group"><input type="text" className="form-control" value={form.direccion_alumno || '(Misma del alumno)'} disabled style={{ backgroundColor: '#e2e8f0' }} /></div>) : (<div className="form-group"><input type="text" name="direccion_apoderado" className="form-control" value={form.direccion_apoderado} onChange={handleChange} placeholder="Ingrese Direcc. Apoderado" /></div>)}
                            </div>
                        </div>
                    )}

                    {(isTablet ? seccionActual === 1 : seccionActual === 4) && (
                        <div style={isTablet ? { marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' } : undefined}>
                            <h4 style={{ color: '#2b6cb0' }}>{isTablet ? 'Salud y Emergencias' : '4. Salud y Emergencias'}</h4>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="checkbox" name="tiene_nee" checked={form.tiene_nee} onChange={handleChange} />
                                    <span>{isTablet ? '¿Necesidades Educativas Especiales?' : '¿NEE?'}</span>
                                    {!isTablet && <span className="tooltip-nee">
                                        <span className="tooltip-icon">?</span>
                                        <span className="tooltip-text">NEE: Necesidades Educativas Especiales</span>
                                    </span>}
                                </label>
                            </div>
                            {form.tiene_nee && (<div className="form-group"><label>Detalle</label><textarea name="detalle_nee" className="form-control" value={form.detalle_nee} onChange={handleChange} /></div>)}
                            <div className="form-row"><div className="form-group"><label>Alergias</label><input type="text" name="alergias" className="form-control" value={form.alergias} onChange={handleChange} /></div></div>
                            <h5 style={{ marginTop: '20px' }}>Emergencia</h5>
                            <div className="emergencia-row">
                                <div className="form-group"><label>Contacto</label><input type="text" name="contacto_emergencia_nombre" className="form-control" value={form.contacto_emergencia_nombre} onChange={handleChange} /></div>
                                <div className="form-group"><label>Teléfono</label><input type="text" name="contacto_emergencia_telefono" className="form-control" value={form.contacto_emergencia_telefono} onChange={handleChange} /></div>
                            </div>
                        </div>
                    )}

                    {/* Colegio + Observaciones: desktop paso 5 / tablet paso 1 */}
                    {(isTablet ? seccionActual === 1 : seccionActual === 5) && (
                        <div style={isTablet ? { marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' } : undefined}>
                            <h4 style={{ color: '#2b6cb0' }}>{isTablet ? 'Procedencia y Observaciones' : '5. Resumen Final'}</h4>
                            <div className="form-group"><label>Colegio Procedencia</label><input type="text" name="colegio_procedencia" className="form-control" value={form.colegio_procedencia} onChange={handleChange} /></div>
                            <div className="form-group"><label>Observaciones</label><textarea name="observaciones_apoderado" className="form-control" value={form.observaciones_apoderado} onChange={handleChange} /></div>
                        </div>
                    )}

                    {/* Resumen confirmación: desktop paso 5 / tablet paso 2 */}
                    {(isTablet ? seccionActual === 2 : seccionActual === 5) && (
                        <div style={isTablet ? { marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' } : undefined}>
                            {isTablet && <h4 style={{ color: '#2b6cb0' }}>Confirmación</h4>}
                            <div style={{ marginTop: '15px', padding: '15px', background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '8px' }}>
                                <ul>
                                    <li><strong>Alumno:</strong> {form.nombres_alumno} {form.apellidos_alumno}</li>
                                    <li><strong>Curso Destino:</strong> {cursos.find(c => c.id == form.curso_asignado_id)?.nombre || '---'}</li>
                                    <li><strong>Apoderado:</strong> {form.nombres_apoderado} {form.apellidos_apoderado}</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="matricula-botones">
                        {seccionActual > 1 ? <button className="btn btn-secondary" onClick={anteriorPaso}>Atrás</button> : <div></div>}
                        {seccionActual < totalPasos ? <button className="btn btn-primary" onClick={siguientePaso}>Siguiente &rarr;</button> :
                            <button className="btn btn-success btn-confirmar" onClick={handleSubmit} disabled={matriculando}>
                                {matriculando ? 'Validando...' : 'CONFIRMAR MATRÍCULA'}
                            </button>
                        }
                    </div>
                </div>
            </div>

            <style>{`
                .lista-flotante-sugerencias { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; z-index: 100; max-height: 200px; overflow-y: auto; }
                .item-sugerencia { padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; }
                .item-sugerencia:hover { background-color: #f7fafc; }

                /* Paso 1 - Grid Responsive */
                .matricula-paso1-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                .matricula-paso1-grid .form-group {
                    margin-bottom: 0;
                }

                /* Tablet (768px - 1024px) - mantener 3 columnas */
                @media (max-width: 1024px) and (min-width: 481px) {
                    .matricula-paso1-grid {
                        grid-template-columns: 2fr 1fr 1fr;
                        gap: 12px;
                    }
                }

                /* Móvil (menos de 480px) - RUT arriba, curso y año abajo */
                @media (max-width: 480px) {
                    .matricula-paso1-grid {
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                    }
                    .matricula-busqueda {
                        grid-column: 1 / -1;
                    }
                    .matricula-curso {
                        grid-column: 1;
                    }
                    .matricula-anio {
                        grid-column: 2;
                    }
                }

                /* Paso 2 - Grid Responsive */
                .matricula-paso2-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 16px;
                }
                .matricula-paso2-grid .form-group {
                    margin-bottom: 0;
                }

                /* Tablet - mantener 3 columnas */
                @media (max-width: 1024px) and (min-width: 481px) {
                    .matricula-paso2-grid {
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 12px;
                    }
                }

                /* Móvil - reordenar campos */
                @media (max-width: 480px) {
                    .matricula-paso2-grid {
                        grid-template-columns: 1fr 1fr;
                        grid-template-areas:
                            "rut fecha"
                            "nombres apellidos"
                            "sexo direccion";
                        gap: 12px;
                    }
                    .campo-nombres { grid-area: nombres; }
                    .campo-apellidos { grid-area: apellidos; }
                    .campo-rut { grid-area: rut; }
                    .campo-fecha { grid-area: fecha; }
                    .campo-sexo { grid-area: sexo; }
                    .campo-direccion { grid-area: direccion; }
                }

                /* Paso 3 - Grid Responsive */
                .matricula-paso3-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    grid-template-areas:
                        "rut-apod nombres-apod apellidos-apod"
                        "parentezco telefono-apod email-apod";
                    gap: 16px;
                }
                .matricula-paso3-grid .form-group {
                    margin-bottom: 0;
                }
                .campo-rut-apod { grid-area: rut-apod; }
                .campo-parentezco { grid-area: parentezco; }
                .campo-nombres-apod { grid-area: nombres-apod; }
                .campo-apellidos-apod { grid-area: apellidos-apod; }
                .campo-email-apod { grid-area: email-apod; }
                .campo-telefono-apod { grid-area: telefono-apod; }

                /* Móvil Paso 3 - reordenar campos */
                @media (max-width: 480px) {
                    .matricula-paso3-grid {
                        grid-template-columns: 1fr 1fr;
                        grid-template-areas:
                            "rut-apod parentezco"
                            "nombres-apod apellidos-apod"
                            "email-apod telefono-apod";
                        gap: 12px;
                    }

                    .campo-direccion-apod {
                        margin-top: 12px !important;
                        padding: 12px !important;
                    }
                }

                /* Custom Dropdown Curso */
                .custom-dropdown-curso {
                    position: relative;
                    z-index: 1000;
                }
                .custom-dropdown-trigger {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    background: white;
                }
                .dropdown-arrow {
                    font-size: 10px;
                    color: #666;
                }
                .custom-dropdown-options {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-top: none;
                    border-radius: 0 0 4px 4px;
                    max-height: 150px;
                    overflow-y: auto;
                    z-index: 9999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }

                /* Asegurar que los contenedores padres no corten el dropdown */
                .matricula-paso1-grid {
                    overflow: visible !important;
                }
                .card-body {
                    overflow: visible !important;
                }
                .card {
                    overflow: visible !important;
                }
                .custom-dropdown-option {
                    padding: 10px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                    font-size: 14px;
                }
                .custom-dropdown-option:last-child {
                    border-bottom: none;
                }
                .custom-dropdown-option:hover {
                    background-color: #f7fafc;
                }
                .custom-dropdown-option.selected {
                    background-color: #ebf8ff;
                    color: #2b6cb0;
                    font-weight: 500;
                }

                /* Botones de navegación */
                .matricula-botones {
                    margin-top: 30px;
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                }
                .matricula-botones .btn-confirmar {
                    background: #38a169;
                    border-color: #38a169;
                }

                /* Botones en móvil */
                @media (max-width: 480px) {
                    .matricula-botones {
                        margin-top: 16px;
                        gap: 8px;
                    }
                    .matricula-botones .btn {
                        flex: 1;
                        padding: 6px 8px;
                        font-size: 11px;
                    }
                    .matricula-botones .btn-confirmar {
                        font-size: 10px;
                        padding: 6px 4px;
                    }
                }

                /* Tooltip NEE */
                .tooltip-nee {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    cursor: pointer;
                }
                .tooltip-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 18px;
                    height: 18px;
                    color: #d69e2e;
                    font-size: 12px;
                    font-weight: bold;
                    border: 1px solid #d69e2e;
                    border-radius: 50%;
                    background: transparent;
                }
                .tooltip-text {
                    visibility: hidden;
                    opacity: 0;
                    position: absolute;
                    left: 50%;
                    top: 100%;
                    transform: translateX(-50%);
                    margin-top: 8px;
                    background: #2d3748;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 1000;
                    transition: opacity 0.2s, visibility 0.2s;
                }
                    border: 6px solid transparent;
                    border-bottom-color: #2d3748;
                }
                .tooltip-nee:hover .tooltip-text {
                    visibility: visible;
                    opacity: 1;
                }

                @media (max-width: 480px) {
                    .tooltip-text {
                        left: 0;
                        transform: none;
                        white-space: normal;
                        width: 200px;
                        text-align: left;
                    }
                    .tooltip-text::before {
                        left: 10px;
                        transform: none;
                    }
                }
                .tooltip-nee:hover .tooltip-text,
                .tooltip-nee:active .tooltip-text {
                    visibility: visible;
                    opacity: 1;
                }

                /* Emergencia - siempre en fila */
                .emergencia-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .emergencia-row .form-group {
                    margin-bottom: 0;
                }
                @media (max-width: 480px) {
                    .emergencia-row {
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                    }
                }

                /* Modal Styles */
                .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; alignItems: center; z-index: 1000; }
                .modal-content { background: white; padding: 0; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); overflow: hidden; }
                .modal-header-error { background: #e53e3e; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
                .modal-header-error h3 { margin: 0; font-size: 1.2rem; }
                .close-btn { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
                .modal-body { padding: 20px; color: #333; font-size: 1rem; line-height: 1.5; }
                .alert-info-fix { margin-top: 15px; padding: 10px; background: #fffaf0; border-left: 4px solid #ed8936; color: #7b341e; font-size: 0.9rem; }
                .modal-footer { padding: 15px 20px; text-align: right; background: #f7fafc; border-top: 1px solid #edf2f7; }
                .animate-pop { animation: popIn 0.3s ease-out; }
                @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};
export default MatriculasTab;
