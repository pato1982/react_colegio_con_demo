import React, { useState, useEffect } from 'react';
import Header from '../Header';
import AlumnosTab from '../AlumnosTab';
import MatriculasTab from '../MatriculasTab';
import DocentesTab from '../DocentesTab';
import AsignacionesTab from '../AsignacionesTab';
import NotasPorCursoTab from '../NotasPorCursoTab';
import AsistenciaTab from '../AsistenciaTab';
import ComunicadosTab from '../ComunicadosTab';
import EstadisticasTab from '../EstadisticasTab';
import ErrorBoundary from '../common/ErrorBoundary';
import { SectionErrorFallback } from '../common/ErrorFallback';
import ChatDocenteV2 from '../ChatDocenteV2';
import '../../styles/apoderado_menu.css';

function AdminPage({ usuario, onCerrarSesion }) {
    const [tabActual, setTabActual] = useState('alumnos');
    const [vistaModo, setVistaModo] = useState('menu');

    // Keep Alive: solo monta componentes cuando se visitan por primera vez
    const [visitedTabs, setVisitedTabs] = useState(new Set(['alumnos']));

    useEffect(() => {
        setVisitedTabs(prev => {
            if (prev.has(tabActual)) return prev;
            const newSet = new Set(prev);
            newSet.add(tabActual);
            return newSet;
        });
    }, [tabActual]);

    const tabs = [
        { id: 'alumnos', label: 'Gestión de Alumnos', desc: 'En esta sección podrá modificar los datos del alumno y del apoderado registrados en la matrícula, así como eliminar a aquellos alumnos que ya no pertenecen al establecimiento.', icon: 'group', color: 'blue' },
        { id: 'matriculas', label: 'Matrículas', desc: 'En esta sección podrá registrar la matrícula del alumno, ingresando y gestionando la información requerida para su incorporación al establecimiento.', icon: 'badge', color: 'naranja' },
        { id: 'docentes', label: 'Cuerpo Docente', desc: 'En esta sección podrá incorporar nuevos docentes y gestionar a los docentes en ejercicio, permitiendo modificar sus datos, actualizar sus funciones académicas o darlos de baja.', icon: 'school', color: 'pink' },
        { id: 'asignacion-cursos', label: 'Cargas Académicas', desc: 'En esta sección podrá asignar cursos a los docentes según sus asignaturas, así como modificar o eliminar dichas asignaciones en caso de cambios.', icon: 'assignment_ind', color: 'green' },
        { id: 'notas-por-curso', label: 'Sábana de Notas', desc: 'En esta sección podrá visualizar las notas de cada curso del establecimiento, organizadas por asignatura y con opción de filtrar por trimestre.', icon: 'menu_book', color: 'morado' },
        { id: 'asistencia', label: 'Control Asistencia', desc: 'En esta sección podrá visualizar la asistencia mensual de cada curso mediante indicadores, incluyendo el total de registros, el porcentaje de asistencia y la cantidad de alumnos bajo el mínimo exigido para la promoción.', icon: 'event_available', color: 'celeste' },
        { id: 'comunicados', label: 'Central de Avisos', desc: 'En esta sección el administrador podrá enviar comunicados a cursos específicos o a todo el establecimiento, con el fin de informar oportunamente sobre urgencias, avisos, reuniones o eventos dirigidos a los apoderados en tiempo real.', icon: 'campaign', color: 'verde' },
        { id: 'estadisticas', label: 'Métricas de Gestión', desc: 'En esta sección podrá analizar el rendimiento académico, la asistencia y el desempeño docente en los cursos asignados, mediante indicadores clave, gráficos y filtros por curso, docente, asignatura o período, obteniendo una visión integral para la toma de decisiones.', icon: 'monitoring', color: 'amarillo' }
    ];

    const seleccionarVista = (tabId) => {
        setTabActual(tabId);
        setVistaModo('contenido');
    };

    const volverAMenu = () => {
        setVistaModo('menu');
    };

    const renderTabContent = () => {
        const tabsConfig = [
            { id: 'alumnos', Component: AlumnosTab },
            { id: 'matriculas', Component: MatriculasTab },
            { id: 'docentes', Component: DocentesTab },
            { id: 'asignacion-cursos', Component: AsignacionesTab },
            { id: 'notas-por-curso', Component: NotasPorCursoTab, props: { modalidad: usuario?.modalidad_academica } },
            { id: 'asistencia', Component: AsistenciaTab },
            { id: 'comunicados', Component: ComunicadosTab },
            { id: 'estadisticas', Component: EstadisticasTab }
        ];

        return tabsConfig.map(({ id, Component, props }) => {
            if (!visitedTabs.has(id) && tabActual !== id) return null;
            const isActive = tabActual === id;
            return (
                <div key={id} style={{ display: isActive ? 'block' : 'none' }} role="tabpanel">
                    <ErrorBoundary FallbackComponent={SectionErrorFallback}>
                        <Component {...(props || {})} />
                    </ErrorBoundary>
                </div>
            );
        });
    };

    return (
        <div className="app-container">
            <Header usuario={usuario} onCerrarSesion={onCerrarSesion} />

            <main className="main-content apoderado-main">
                <section className="control-panel" style={{ overflow: 'visible' }}>
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>{vistaModo === 'menu' ? 'Panel de Administración' : tabs.find(t => t.id === tabActual)?.label}</h2>
                    </div>

                    {vistaModo === 'contenido' && (
                        <button
                            onClick={volverAMenu}
                            className="btn-volver-menu"
                            style={{
                                position: 'fixed',
                                top: '80px',
                                right: '40px',
                                zIndex: 1000,
                                padding: '8px 16px',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', fontWeight: 'bold' }}>arrow_back</span>
                            Volver
                        </button>
                    )}

                    <div className="tabs-container">
                        {vistaModo === 'menu' ? (
                            <div className="apoderado-menu-grid">
                                {tabs.map(tab => (
                                    <div
                                        key={tab.id}
                                        className={`menu-card-libro ${tab.color}`}
                                        onClick={() => seleccionarVista(tab.id)}
                                    >
                                        <span className="material-symbols-outlined menu-card-icon">{tab.icon}</span>
                                        <div className="menu-card-info">
                                            <div className="menu-card-title">{tab.label}</div>
                                            <div className="menu-card-desc">{tab.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="apoderado-content-view">
                                <div className="tabs-content" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                    {renderTabContent()}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <footer className="main-footer">
                <p>Sistema de Gestión Académica &copy; 2024 | Todos los derechos reservados</p>
                <p className="footer-creditos">Sistema escolar desarrollado por <span className="ch-naranja">CH</span>system</p>
            </footer>

            <ErrorBoundary fallback={null}>
                <ChatDocenteV2
                    usuario={usuario ? {
                        id: usuario.id,
                        tipo: usuario.tipo || usuario.tipo_usuario?.toLowerCase(),
                        nombres: usuario.nombres,
                        apellidos: usuario.apellidos
                    } : null}
                    establecimientoId={usuario?.establecimiento_id}
                />
            </ErrorBoundary>
        </div>
    );
}

export default AdminPage;
