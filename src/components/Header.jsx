import React, { useState, useEffect } from 'react';

function Header({ usuario, onCerrarSesion }) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      setCurrentDate(now.toLocaleDateString('es-CL', options));
    };
    updateDate();
  }, []);

  const cerrarSesion = () => {
    if (onCerrarSesion) {
      onCerrarSesion();
    }
  };

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="brand">
          <div className="logo">
            <span className="logo-icon">E</span>
          </div>
          <div className="brand-mobile">
            <span className="rol-titulo">
              {(usuario.nombre_establecimiento || 'Establecimiento Educacional').toUpperCase()}
            </span>
            <span className="establecimiento-nombre">
              {usuario.nombres && usuario.apellidos
                ? `${usuario.nombres} ${usuario.apellidos}`
                : (usuario.tipo_usuario || 'Usuario')}
            </span>
          </div>
        </div>
        <div className="header-info">
          <span className="user-info">{usuario.tipo_usuario || 'Usuario'}</span>
          <span className="current-date">{currentDate}</span>
          <button className="btn-logout" onClick={cerrarSesion} title="Cerrar Sesion">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
