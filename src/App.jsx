import React, { useState, useEffect } from 'react';
import DocentePage from './components/docente/DocentePage';
import ApoderadoPage from './components/apoderado/ApoderadoPage';
import AdminPage from './components/admin/AdminPage';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegistroPage from './components/RegistroPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { PageErrorFallback } from './components/common/ErrorFallback';
import { useAuth } from './contexts';
import './styles/docente.css';
import './styles/apoderado.css';
import './styles/login.css';
import './styles/registro.css';

function App() {
  // Detectar si venimos de un link de recuperación (/?token=...)
  const [vistaActual, setVistaActual] = useState(window.location.search.includes('token') ? 'reset-password' : 'landing');
  const [tokenRecuperacion] = useState(new URLSearchParams(window.location.search).get('token'));

  const [tipoUsuarioRegistro, setTipoUsuarioRegistro] = useState(null); // 'administrador', 'docente', 'apoderado'
  const [usuarioLogueado, setUsuarioLogueado] = useState(null); // Datos del usuario autenticado
  const { login: loginContext, logout: logoutContext, isAuthenticated, usuario: usuarioAuth, tipoUsuario: tipoUsuarioAuth, cargandoSesion } = useAuth();

  // Efecto para redirigir si ya hay sesión iniciada (RESTORE SESSION)
  useEffect(() => {
    if (!cargandoSesion && isAuthenticated && usuarioAuth && vistaActual === 'landing') {
      const usuarioConEstablecimiento = {
        ...usuarioAuth,
        tipo_usuario: tipoUsuarioAuth === 'administrador' ? 'Administrador' : tipoUsuarioAuth === 'docente' ? 'Docente' : 'Apoderado',
        nombre_establecimiento: usuarioAuth?.establecimiento || usuarioAuth?.nombre_establecimiento || 'Establecimiento Educacional'
      };
      setUsuarioLogueado(usuarioConEstablecimiento);

      if (tipoUsuarioAuth === 'administrador') {
        setVistaActual('administrador');
      } else if (tipoUsuarioAuth === 'docente') {
        setVistaActual('docente');
      } else if (tipoUsuarioAuth === 'apoderado') {
        setVistaActual('apoderado');
      }
    }
  }, [cargandoSesion, isAuthenticated, usuarioAuth, tipoUsuarioAuth, vistaActual]);

  const cerrarSesion = () => {
    setUsuarioLogueado(null);
    logoutContext();
    setVistaActual('landing');
  };

  const irALoginPage = () => {
    setVistaActual('loginPage');
  };

  const irASeleccionRol = () => {
    setVistaActual('seleccion-rol');
  };

  // Mostrar loading mientras se restaura sesión
  if (cargandoSesion) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <div className="spinner"></div>
        <p style={{ color: '#64748b' }}>Restaurando sesión...</p>
        <style>{`
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Landing page
  if (vistaActual === 'landing') {
    return (
      <ErrorBoundary FallbackComponent={PageErrorFallback}>
        <LandingPage onIrALogin={irALoginPage} onIrARegistro={irASeleccionRol} />
      </ErrorBoundary>
    );
  }

  // Pagina de Login
  if (vistaActual === 'loginPage') {
    return (
      <ErrorBoundary FallbackComponent={PageErrorFallback}>
        <LoginPage
          onVolver={() => setVistaActual('landing')}
          onLoginExitoso={(tipo, usuario, recordar) => {
            // Mapear establecimiento a nombre_establecimiento para el Header
            const usuarioConEstablecimiento = {
              ...usuario,
              tipo_usuario: tipo === 'administrador' ? 'Administrador' : tipo === 'docente' ? 'Docente' : 'Apoderado',
              nombre_establecimiento: usuario?.establecimiento || 'Establecimiento Educacional'
            };
            setUsuarioLogueado(usuarioConEstablecimiento);
            loginContext(usuarioConEstablecimiento, tipo, recordar);

            if (tipo === 'administrador') {
              setVistaActual('administrador');
            } else if (tipo === 'docente') {
              setVistaActual('docente');
            } else if (tipo === 'apoderado') {
              setVistaActual('apoderado');
            }
          }}
        />
      </ErrorBoundary>
    );
  }

  // Pantalla de seleccion de rol (simula login)
  if (vistaActual === 'seleccion-rol') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <span>E</span>
            </div>
            <h1>Portal Estudiantil</h1>
            <p>Registrate segun tu perfil y comienza a gestionar la informacion academica</p>
          </div>
          <div className="login-options">
            <button className="login-option admin" onClick={() => { setTipoUsuarioRegistro('administrador'); setVistaActual('registro'); }}>
              <div className="login-option-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="login-option-text">
                <h3>Administrador</h3>
                <p>Gestionar alumnos, docentes, cursos y estadisticas</p>
              </div>
            </button>
            <button className="login-option docente" onClick={() => { setTipoUsuarioRegistro('docente'); setVistaActual('registro'); }}>
              <div className="login-option-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="login-option-text">
                <h3>Docente</h3>
                <p>Registrar notas, ver progreso de alumnos</p>
              </div>
            </button>
            <button className="login-option apoderado" onClick={() => { setTipoUsuarioRegistro('apoderado'); setVistaActual('registro'); }}>
              <div className="login-option-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="login-option-text">
                <h3>Apoderado</h3>
                <p>Ver notas, comunicados y progreso del alumno</p>
              </div>
            </button>
          </div>
          <div className="login-footer">
            <button
              onClick={() => setVistaActual('landing')}
              style={{
                background: 'none',
                border: 'none',
                color: '#3182ce',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pagina de Registro
  if (vistaActual === 'registro') {
    return (
      <ErrorBoundary FallbackComponent={PageErrorFallback}>
        <RegistroPage
          tipoUsuario={tipoUsuarioRegistro}
          onVolver={() => setVistaActual('seleccion-rol')}
          onRegistroExitoso={() => setVistaActual('landing')}
        />
      </ErrorBoundary>
    );
  }

  // Vista de docente
  if (vistaActual === 'docente') {
    return (
      <ErrorBoundary FallbackComponent={PageErrorFallback}>
        <DocentePage onCambiarVista={cerrarSesion} usuarioDocente={usuarioLogueado} />
      </ErrorBoundary>
    );
  }

  // Vista de apoderado
  if (vistaActual === 'apoderado') {
    return (
      <ErrorBoundary FallbackComponent={PageErrorFallback}>
        <ApoderadoPage onCambiarVista={cerrarSesion} usuario={usuarioLogueado} />
      </ErrorBoundary>
    );
  }

  // Vista de reset password
  if (vistaActual === 'reset-password') {
    return (
      <ErrorBoundary FallbackComponent={PageErrorFallback}>
        <ResetPasswordPage
          token={tokenRecuperacion}
          onVolver={() => setVistaActual('loginPage')}
        />
      </ErrorBoundary>
    );
  }

  // Vista de administrador
  return (
    <ErrorBoundary FallbackComponent={PageErrorFallback}>
      <AdminPage usuario={usuarioLogueado} onCerrarSesion={cerrarSesion} />
    </ErrorBoundary>
  );
}

export default App;
