import React, { useState, useMemo, useEffect, useRef } from 'react';

import InformacionTab from './InformacionTab';
import NotasTab from './NotasTab';
import ComunicadosTab from './ComunicadosTab';
import ProgresoTab from './ProgresoTab';
import ChatApoderado from './ChatApoderado';
import Header from '../Header';
import { apiFetch } from '../../utils/api';
import '../../styles/apoderado_menu.css';

// Datos base del apoderado (estructura mínima para la sesión demo)
const apoderadoDemo = {
  id: 1,
  nombres: 'Apoderado',
  apellidos: 'Demo',
  rut: '12.345.678-9',
  email: '',
  telefono: '',
  direccion: '',
  parentesco: '',
  tipo_usuario: 'Apoderado',
  nombre_establecimiento: 'Sin establecimiento'
};

// Pupilo Demo
const pupiloDemo = {
  id: 1,
  nombres: 'Vicente',
  apellidos: 'Muñoz',
  curso_nombre: '1° Medio A',
  establecimiento_id: 1,
  rut: '22.333.444-5',
  fecha_nacimiento: '2010-05-12',
  sexo: 'Masculino'
};

// Notas y comunicados se cargan desde el interceptor demo (datos estáticos en src/data/demoData.js)

function ApoderadoPage({ onCambiarVista, usuario }) {
  const [tabActiva, setTabActiva] = useState('menu');



  // Estado para Keep Alive Tabs
  const [visitedTabs, setVisitedTabs] = useState(new Set([tabActiva]));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(tabActiva)) return prev;
      const newSet = new Set(prev);
      newSet.add(tabActiva);
      return newSet;
    });
  }, [tabActiva]);
  const [pupilos, setPupilos] = useState([]);
  const [pupilosPendientes, setPupilosPendientes] = useState([]);
  const [pupiloSeleccionado, setPupiloSeleccionado] = useState(null);
  const [mostrarSelectorPupilo, setMostrarSelectorPupilo] = useState(false);
  const [mostrarModalAgregar, setMostrarModalAgregar] = useState(false);
  const [mostrarModalPendientes, setMostrarModalPendientes] = useState(false);
  const [rutAlumnoAgregar, setRutAlumnoAgregar] = useState('');
  const [cargando, setCargando] = useState(false);
  const dropdownRef = useRef(null);

  // Datos del apoderado (del usuario logueado o demo)
  const apoderadoActual = usuario || apoderadoDemo;

  // Cargar pupilos y pupilos pendientes al montar
  useEffect(() => {
    if (apoderadoActual.id) {
      cargarMisPupilos();
    }
    if (apoderadoActual.rut) {
      cargarPupilosPendientes();
    }
  }, [apoderadoActual.id, apoderadoActual.rut]);

  // Seleccionar primer pupilo cuando se cargan
  useEffect(() => {
    if (pupilos.length > 0 && !pupiloSeleccionado) {
      setPupiloSeleccionado(pupilos[0]);
    }
  }, [pupilos]);

  const cargarMisPupilos = async () => {
    console.log('--- DEBUG CARGAR PUPILOS ---');
    console.log('Apoderado Actual:', apoderadoActual);
    if (!apoderadoActual.id) {
      console.error('ALERTA: El apoderado no tiene ID definido.');
      return;
    }

    try {
      // Priorizar el ID de apoderado vinculado al perfil
      const idParaConsulta = apoderadoActual.apoderado_id || apoderadoActual.id;
      const url = `/apoderado/mis-pupilos/${idParaConsulta}`;
      console.log('Fetching URL:', url);

      const response = await apiFetch(url);
      const data = await response.json();

      console.log('Respuesta API Pupilos:', data);

      if (data.success && data.data && data.data.length > 0) {
        setPupilos(data.data);
      } else {
        // Fallback a demo si no API
        console.warn('Usando datos demo para pupilos');
        setPupilos([pupiloDemo]);
      }
    } catch (error) {
      console.error('Error cargando pupilos, usando demo:', error);
      setPupilos([pupiloDemo]);
    }
  };

  const cargarPupilosPendientes = async () => {
    try {
      const response = await apiFetch(`/apoderado/pupilos-pendientes/${encodeURIComponent(apoderadoActual.rut)}`);
      const data = await response.json();
      if (data.success) {
        setPupilosPendientes(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando pupilos pendientes:', error);
    }
  };

  const confirmarPupilo = async (preregistroId) => {
    setCargando(true);
    try {
      const response = await apiFetch(`/apoderado/confirmar-pupilo`, {
        method: 'POST',
        body: JSON.stringify({
          preregistro_id: preregistroId,
          apoderado_id: apoderadoActual.id
        })
      });
      const data = await response.json();
      if (data.success) {
        // Recargar ambas listas
        await cargarMisPupilos();
        await cargarPupilosPendientes();
        setMostrarModalPendientes(false);
      } else {
        alert(data.error || 'Error al vincular pupilo');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  const handleVincularManual = async () => {
    if (!rutAlumnoAgregar) {
      alert('Por favor ingrese el RUT del alumno');
      return;
    }

    try {
      const apoderadoId = apoderadoActual.apoderado_id || apoderadoActual.id;
      const response = await apiFetch(`/apoderado/vincular-manual`, {
        method: 'POST',
        body: JSON.stringify({
          rut_alumno: rutAlumnoAgregar,
          apoderado_id: apoderadoId,
          rut_apoderado: apoderadoActual.rut
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('¡Alumno vinculado exitosamente!');
        setMostrarModalAgregar(false);
        setRutAlumnoAgregar('');
        cargarMisPupilos(); // Recargar lista
      } else {
        alert(data.error || 'Error al vincular alumno');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión al vincular');
    }
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarSelectorPupilo(false);
      }
    };

    if (mostrarSelectorPupilo) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mostrarSelectorPupilo]);



  const tabs = [
    {
      id: 'informacion',
      label: 'Ficha de Información',
      color: 'pink',
      desc: 'Visualice la información administrativa del alumno y del apoderado. Aquí podrá revisar los datos personales registrados en el sistema, como información básica del alumno, curso asignado y datos de contacto del apoderado titular.',
      badge: 'Datos Pupilo',
      icon: 'person_book',
      img: '/assets/navigation/info.png'
    },
    {
      id: 'notas',
      label: 'Libro de Notas',
      color: 'blue',
      desc: 'Acceda al libro digital de calificaciones. Consulte el detalle de notas parciales por trimestre, promedios por asignatura y el promedio general acumulado del año escolar en tiempo real.',
      badge: 'Calificaciones',
      icon: 'auto_stories',
      img: '/assets/navigation/notas.png'
    },
    {
      id: 'comunicados',
      label: 'Cuaderno de Comunicados',
      color: 'green',
      desc: 'Tablón oficial de anuncios del establecimiento. Manténgase informado sobre reuniones, actividades académicas, eventos escolares y avisos administrativos importantes enviados por el colegio.',
      badge: 'Avisos',
      icon: 'drafts',
      img: '/assets/navigation/comunicados.png'
    },
    {
      id: 'progreso',
      label: 'Libro de Progreso',
      color: 'yellow',
      desc: 'Panel estadístico del rendimiento académico. Observe la evolución mensual del promedio de notas, indicadores de aprobación, asistencia y el desempeño detallado por cada asignatura mediante gráficos interactivos.',
      badge: 'Evolución',
      icon: 'trending_up',
      img: '/assets/navigation/progreso.png'
    }
  ];

  // Filtrar notas por pupilo seleccionado
  // Notas y comunicados se cargan directamente en sus tabs via API/interceptor
  // No filtrar por alumno_id aquí, cada tab consulta por pupilo.id
  const notasFiltradas = undefined;
  const comunicadosFiltrados = undefined;

  const handleCambiarPupilo = (pupilo) => {
    setPupiloSeleccionado(pupilo);
    setMostrarSelectorPupilo(false);
  };

  // Badge y progreso se muestran con valores por defecto
  // Los datos reales se cargan dentro de cada tab via API
  const comunicadosNoLeidos = 0;
  const progresoPorcentaje = 0;

  const yearEscolar = new Date().getFullYear();

  const renderTabContent = () => {
    const tabsConfig = [
      { id: 'informacion', Component: InformacionTab, props: { pupilo: pupiloSeleccionado, apoderado: apoderadoActual } },
      { id: 'notas', Component: NotasTab, props: { pupilo: pupiloSeleccionado } },
      { id: 'comunicados', Component: ComunicadosTab, props: { pupilo: pupiloSeleccionado, usuarioId: apoderadoActual.id } },
      { id: 'progreso', Component: ProgresoTab, props: { pupilo: pupiloSeleccionado } }
    ];

    return tabsConfig.map(({ id, Component, props }) => {
      if (!visitedTabs.has(id) && tabActiva !== id) return null;
      const isActive = tabActiva === id;
      return (
        <div
          key={id}
          style={{ display: isActive ? 'block' : 'none' }}
          role="tabpanel"
        >
          <Component {...props} />
        </div>
      );
    });
  };

  return (
    <div className="apoderado-container">
      {/* Header Corporativo Reemplazado */}
      <Header
        usuario={{
          ...apoderadoActual,
          tipo_usuario: 'Apoderado',
          nombre_establecimiento: pupiloSeleccionado?.establecimiento_nombre || 'Sin establecimiento'
        }}
        onCerrarSesion={onCambiarVista}
      />

      <main className="apoderado-main">
        <div className="control-panel">
          <div className="panel-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="panel-title" style={{ fontWeight: 'bold', color: 'white' }}>
              {tabActiva === 'menu' ? 'Panel de Apoderado' : tabs.find(t => t.id === tabActiva)?.label || 'Panel de Apoderado'}
            </h2>

            {/* Contenedor de Acciones del Header (Tutorial y Pupilos Pendientes) */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>



              {/* Notificación de pupilos pendientes */}
              {pupilosPendientes.length > 0 && (
                <button
                  onClick={() => setMostrarModalPendientes(true)}
                  style={{
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '500',
                    animation: 'pulse 2s infinite'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notification_important</span>
                  {pupilosPendientes.length} pupilo(s) pendiente(s)
                </button>
              )}
            </div>
          </div>

          {/* Contenedor Flex para Selector (Normal) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0' }}>

            {/* Selector de Pupilo (Estilo Standard) */}
            <div className="pupilo-selector-container" ref={dropdownRef} style={{ marginBottom: '0', position: 'relative' }}>
              <button
                className="btn-pupilo-current"
                onClick={() => setMostrarSelectorPupilo(!mostrarSelectorPupilo)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
              >
                {pupiloSeleccionado ? (
                  <>
                    <div className="avatar-mini" style={{ width: '30px', height: '30px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                      {pupiloSeleccionado.nombres.charAt(0)}
                    </div>
                    <span style={{ fontWeight: '500', color: '#64748b' }}>{pupiloSeleccionado.nombres} {pupiloSeleccionado.apellidos} ({pupiloSeleccionado.curso_nombre || 'Sin curso'})</span>
                  </>
                ) : (
                  <span style={{ fontWeight: '500', color: '#94a3b8' }}>Sin pupilos registrados</span>
                )}
                <span className="material-symbols-outlined">expand_more</span>
              </button>
              {mostrarSelectorPupilo && (
                <div className="pupilo-dropdown" style={{ position: 'absolute', top: '100%', left: '0', marginTop: '5px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, minWidth: '250px' }}>
                  {pupilos.map(pupilo => (
                    <div
                      key={pupilo.id}
                      className={`pupilo-dropdown-item ${pupiloSeleccionado && pupilo.id === pupiloSeleccionado.id ? 'active' : ''}`}
                      onClick={() => handleCambiarPupilo(pupilo)}
                      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <div className="pupilo-dropdown-avatar" style={{ width: '32px', height: '32px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
                        {pupilo.nombres.charAt(0)}{pupilo.apellidos.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>{pupilo.nombres} {pupilo.apellidos}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{pupilo.curso_nombre || 'Sin curso'}</div>
                      </div>
                    </div>
                  ))}
                  {pupilos.length === 0 && (
                    <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '14px' }}>
                      No tiene pupilos vinculados
                    </div>
                  )}
                  {/* Separador si hay pupilos pendientes */}
                  {pupilosPendientes.length > 0 && (
                    <>
                      <div style={{ borderTop: '2px solid #f59e0b', margin: '0' }}></div>
                      <div
                        style={{ padding: '12px 16px', cursor: 'pointer', background: '#fffbeb', color: '#d97706', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => { setMostrarSelectorPupilo(false); setMostrarModalPendientes(true); }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pending</span>
                        {pupilosPendientes.length} pupilo(s) pendiente(s) de vincular
                      </div>
                    </>
                  )}
                  <div style={{ padding: '12px 16px', cursor: 'pointer', color: '#3b82f6', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #f1f5f9' }} onClick={() => setMostrarModalAgregar(true)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                    Agregar Pupilo
                  </div>
                </div>
              )}
            </div>

            {/* BOTÓN VOLVER FLOTANTE FIJO (FIXED) */}
            {tabActiva !== 'menu' && (
              <button
                className="btn-volver-menu"
                onClick={() => setTabActiva('menu')}
                style={{
                  position: 'fixed',
                  top: '85px', /* Debajo del header (~60px) + margen */
                  right: '25px', /* Margen derecho */
                  zIndex: 9999,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  border: '2px solid #3b82f6',
                  color: '#3b82f6',
                  borderRadius: '50px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)' /* Sombra fuerte para flotar sobre contenido */
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontWeight: 'bold' }}>arrow_back</span>
                Volver
              </button>
            )}
          </div>


          {tabActiva === 'menu' ? (
            /* === VISTA DE MENÚ (GRID DE LIBROS) === */
            <div className="apoderado-menu-grid">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  className={`menu-card-libro ${tab.color}`}
                  onClick={() => setTabActiva(tab.id)}
                  data-tab-id={tab.id}
                >
                  <span className="material-symbols-outlined menu-card-icon">{tab.icon}</span>

                  <div className="menu-card-info">
                    <div className="menu-card-title">{tab.label}</div>
                    <div className="menu-card-desc">
                      {tab.desc}
                    </div>
                  </div>

                  {/* Badge de notificaciones (ej: comunicados no leídos) */}
                  {tab.id === 'comunicados' && comunicadosNoLeidos > 0 && (
                    <div className="libro-badge">
                      {comunicadosNoLeidos}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* === VISTA DE CONTENIDO (CON BOTÓN VOLVER) === */
            <div className="apoderado-content-view">
              {/* Botón volver eliminado de aquí */}

              <div className="tabs-content" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {renderTabContent()}
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Footer Corporativo Reemplazado */}
      <footer className="main-footer">
        <p>Sistema de Gestion Academica &copy; 2024 | Todos los derechos reservados</p>
        <p className="footer-creditos">Sistema escolar desarrollado por <span className="ch-naranja">CH</span>system</p>
      </footer>

      {/* Modal Pupilos Pendientes */}
      {mostrarModalPendientes && (
        <div className="modal-overlay" onClick={() => setMostrarModalPendientes(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ background: '#f59e0b', color: 'white' }}>
              <h3>Pupilos Pendientes de Vincular</h3>
              <button className="modal-close" onClick={() => setMostrarModalPendientes(false)} style={{ color: 'white' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#64748b' }}>
                El establecimiento ha registrado los siguientes alumnos para vincular a su cuenta:
              </p>
              {pupilosPendientes.map(pendiente => (
                <div
                  key={pendiente.preregistro_id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                    background: '#f8fafc'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '16px' }}>
                        {pendiente.nombres_alumno} {pendiente.apellidos_alumno}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                        RUT: {pendiente.rut_alumno}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '14px' }}>
                        Curso: {pendiente.curso_nombre || 'Sin asignar'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '14px' }}>
                        Parentesco: {pendiente.parentesco}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                        {pendiente.establecimiento_nombre}
                      </div>
                    </div>
                    <button
                      onClick={() => confirmarPupilo(pendiente.preregistro_id)}
                      disabled={cargando}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: cargando ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: cargando ? 0.7 : 1
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                      {cargando ? 'Vinculando...' : 'Vincular'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setMostrarModalPendientes(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Pupilo */}
      {mostrarModalAgregar && (
        <div className="modal-overlay" onClick={() => setMostrarModalAgregar(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Agregar Nuevo Pupilo</h3>
              <button className="modal-close" onClick={() => setMostrarModalAgregar(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description" style={{ marginBottom: '15px', color: '#64748b' }}>
                Ingrese el RUT del alumno para vincularlo a su cuenta.
                El establecimiento debe haber autorizado esta vinculación previamente.
              </p>
              <div className="form-group">
                <label>RUT del Alumno</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: 21.234.567-8"
                  value={rutAlumnoAgregar}
                  onChange={(e) => setRutAlumnoAgregar(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setMostrarModalAgregar(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleVincularManual}>
                Vincular Pupilo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para animación */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>


      {/* Chat Flotante */}
      <ChatApoderado
        usuario={apoderadoActual}
        pupiloSeleccionado={pupiloSeleccionado}
      />

    </div>
  );
}

export default ApoderadoPage;
