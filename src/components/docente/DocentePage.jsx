import React, { useState, useEffect, useRef } from 'react';
import { useResponsive } from '../../hooks';
import AsistenciaTab from './AsistenciaTab';
import AgregarNotaTab from './AgregarNotaTab';
import ModificarNotaTab from './ModificarNotaTab';
import VerNotasTab from './VerNotasTab';
import ProgresoTab from './ProgresoTab';
import ChatDocenteV2 from '../ChatDocenteV2';
import { apiFetch } from '../../utils/api';
import '../../styles/apoderado_menu.css';

function DocentePage({ onCambiarVista, usuarioDocente }) {
  const { isMobile } = useResponsive();
  const [tabActual, setTabActual] = useState(() => localStorage.getItem('docenteActiveTab') || 'asistencia');

  const [vistaActual, setVistaActual] = useState('menu');

  // Estado para Keep Alive Tabs (Optimización de carga)
  const [visitedTabs, setVisitedTabs] = useState(new Set([tabActual]));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(tabActual)) return prev;
      const newSet = new Set(prev);
      newSet.add(tabActual);
      return newSet;
    });
  }, [tabActual]);

  const [currentDate, setCurrentDate] = useState('');
  const [establecimientoDropdownAbierto, setEstablecimientoDropdownAbierto] = useState(false);
  const [establecimientosDocente, setEstablecimientosDocente] = useState([]);
  const [establecimientoActual, setEstablecimientoActual] = useState(null);
  const [cargandoEstablecimientos, setCargandoEstablecimientos] = useState(true);
  const dropdownRef = useRef(null);

  // Datos del docente desde el usuario logueado
  const docenteActual = {
    id: usuarioDocente?.docente_id || 0,
    nombres: usuarioDocente?.nombres || 'Docente',
    apellidos: usuarioDocente?.apellidos || '',
    iniciales: usuarioDocente?.iniciales || 'D'
  };

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      setCurrentDate(now.toLocaleDateString('es-CL', options));
    };
    updateDate();
  }, []);

  // Cargar establecimientos del docente
  useEffect(() => {
    const cargarEstablecimientos = async () => {
      try {
        const response = await apiFetch(`/docente/${docenteActual.id}/establecimientos`);
        const data = await response.json();
        if (data.success && data.data?.length > 0) {
          setEstablecimientosDocente(data.data);
          setEstablecimientoActual(data.data[0]);
        }
      } catch (error) {
        console.error('Error cargando establecimientos:', error);
      } finally {
        setCargandoEstablecimientos(false);
      }
    };

    if (docenteActual.id) cargarEstablecimientos();
  }, [docenteActual.id]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setEstablecimientoDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabs = [
    {
      id: 'asistencia',
      label: 'Asistencia',
      icon: 'how_to_reg',
      color: 'azul',
      desc: 'Herramienta diaria para el registro de asistencia. Seleccione el curso y marque los alumnos presentes, ausentes o atrasados.'
    },
    {
      id: 'agregar-nota',
      label: 'Agregar Nota',
      icon: 'post_add',
      color: 'celeste',
      desc: 'Ingrese nuevas calificaciones al libro de clases. Primero seleccione el curso y la asignatura, luego el tipo de evaluación.'
    },
    {
      id: 'modificar-nota',
      label: 'Modificar Nota',
      icon: 'edit_note',
      color: 'naranja',
      desc: 'Permite corregir calificaciones ingresadas erróneamente. Busque la evaluación específica y edite la nota del alumno.'
    },
    {
      id: 'ver-notas',
      label: 'Ver Notas',
      icon: 'table_view',
      color: 'verde',
      desc: 'Visualice el panorama completo de calificaciones de sus cursos. Consulte la sábana de notas y promedios.'
    },
    {
      id: 'progreso',
      label: 'Progreso',
      icon: 'monitoring',
      color: 'morado',
      desc: 'Analíticas de rendimiento de sus cursos. Revise gráficos de aprobación/reprobación y promedios por asignatura.'
    }
  ];

  const renderTabsContent = () => {
    const tabsConfig = [
      {
        id: 'asistencia',
        Component: AsistenciaTab,
        props: { docenteId: docenteActual.id, establecimientoId: establecimientoActual?.id, usuarioId: usuarioDocente?.id }
      },
      {
        id: 'agregar-nota',
        Component: AgregarNotaTab,
        props: { docenteId: docenteActual.id, establecimientoId: establecimientoActual?.id, usuarioId: usuarioDocente?.id }
      },
      {
        id: 'modificar-nota',
        Component: ModificarNotaTab,
        props: { docenteId: docenteActual.id, establecimientoId: establecimientoActual?.id }
      },
      {
        id: 'ver-notas',
        Component: VerNotasTab,
        props: { docenteId: docenteActual.id, establecimientoId: establecimientoActual?.id }
      },
      {
        id: 'progreso',
        Component: ProgresoTab,
        props: { docenteId: docenteActual.id, establecimientoId: establecimientoActual?.id }
      }
    ];

    return tabsConfig.map(({ id, Component, props }) => {
      if (!visitedTabs.has(id) && tabActual !== id) return null;
      const isActive = tabActual === id;
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
    <div className="app-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <div className="logo">
              <span className="logo-icon">E</span>
            </div>
            <div className="brand-text" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: isMobile ? '8px' : '11px', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '0.5px', color: '#cbd5e1' }}>Portal Docente</span>
              <h1 style={{ margin: 0, fontSize: isMobile ? '10px' : '16px', lineHeight: '1.2' }}>{docenteActual.nombres} {docenteActual.apellidos}</h1>
            </div>
          </div>
          <div className="header-info">
            {/* Selector de Establecimiento */}
            <div className="establecimiento-selector" ref={dropdownRef}>
              <button
                className="establecimiento-btn"
                onClick={() => establecimientosDocente.length > 1 && setEstablecimientoDropdownAbierto(!establecimientoDropdownAbierto)}
                style={{ cursor: establecimientosDocente.length > 1 ? 'pointer' : 'default' }}
              >
                <span className="establecimiento-nombre">
                  {cargandoEstablecimientos ? 'Cargando...' : (establecimientoActual?.nombre || 'Sin establecimiento')}
                </span>
                {establecimientosDocente.length > 1 && (
                  <svg
                    className={`establecimiento-arrow ${establecimientoDropdownAbierto ? 'rotated' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                )}
              </button>
              {establecimientoDropdownAbierto && establecimientosDocente.length > 1 && (
                <div className="establecimiento-dropdown">
                  {establecimientosDocente
                    .filter(est => est.id !== establecimientoActual?.id)
                    .map(est => (
                      <button
                        key={est.id}
                        className="establecimiento-option"
                        onClick={() => {
                          setEstablecimientoActual(est);
                          setEstablecimientoDropdownAbierto(false);
                        }}
                      >
                        <span className="est-nombre">{est.nombre}</span>
                        <span className="est-comuna">{est.comuna}</span>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            <span className="header-separator">|</span>
            {/* Nombre movido a la izquierda */}
            <span className="current-date">{currentDate}</span>
            <button className="btn-logout" onClick={onCambiarVista} title="Cerrar Sesion">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header >

      <main className="main-content apoderado-main">
        <section className="control-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{vistaActual === 'menu' ? 'Panel de Control - Docente' : tabs.find(t => t.id === tabActual)?.label}</h2>
            {vistaActual === 'contenido' && (
              <button
                onClick={() => setVistaActual('menu')}
                style={{
                  position: 'fixed',
                  top: '80px',
                  right: '40px',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  border: '2px solid #3b82f6',
                  color: '#3b82f6',
                  borderRadius: '50px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontWeight: 'bold' }}>arrow_back</span>
                Volver
              </button>
            )}
          </div>

          <div className="tabs-container">
            {vistaActual === 'menu' ? (
              <div className="docente-menu-5"><div className="apoderado-menu-grid">
                {tabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`menu-card-libro ${tab.color}`}
                    onClick={() => {
                      setTabActual(tab.id);
                      setVistaActual('contenido');
                    }}
                  >
                    <span className="material-symbols-outlined menu-card-icon">{tab.icon}</span>

                    <div className="menu-card-info">
                      <div className="menu-card-title">{tab.label}</div>
                      <div className="menu-card-desc">
                        {tab.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div></div>
            ) : (
              <div className="apoderado-content-view">
                <div className="tabs-content" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {renderTabsContent()}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="main-footer">
        <p>Sistema de Gestion Academica &copy; 2024 | Todos los derechos reservados</p>
        <p className="footer-creditos">Sistema escolar desarrollado por <span className="ch-naranja">CH</span>system</p>
      </footer>

      {/* Chat V2 - Nuevo diseño estilo Telegram/Discord */}
      <ChatDocenteV2
        usuario={{
          id: usuarioDocente?.id,
          tipo: 'docente',
          nombres: docenteActual.nombres,
          apellidos: docenteActual.apellidos
        }}
        establecimientoId={establecimientoActual?.id}
      />
    </div >
  );
}

export default DocentePage;
