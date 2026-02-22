import React from 'react';

function ModalMensaje({ titulo, texto, tipo, onClose }) {
  const getIcon = () => {
    switch (tipo) {
      case 'success':
        return (
          <div className="modal-mensaje-icon success">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="modal-mensaje-icon error">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="modal-mensaje-icon warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        );
      default:
        return (
          <div className="modal-mensaje-icon info">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
        );
    }
  };

  const getButtonClass = () => {
    switch (tipo) {
      case 'success':
        return 'btn-modal-success';
      case 'error':
        return 'btn-modal-error';
      case 'warning':
        return 'btn-modal-warning';
      default:
        return 'btn-modal-info';
    }
  };

  return (
    <div className="modal-overlay modal-mensaje-overlay" onClick={onClose}>
      <div className={`modal modal-mensaje modal-mensaje-${tipo || 'info'}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-mensaje-close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="modal-mensaje-content">
          {getIcon()}
          <h3 className="modal-mensaje-titulo">{titulo}</h3>
          <p className="modal-mensaje-texto">{texto}</p>
        </div>
        <div className="modal-mensaje-footer">
          <button className={`btn-modal ${getButtonClass()}`} onClick={onClose}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalMensaje;
