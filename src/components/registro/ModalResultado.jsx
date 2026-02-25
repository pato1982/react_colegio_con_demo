import React from 'react';

const SuccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

function ModalResultado({ visible, exito, mensaje, onCerrar, intentos }) {
  if (!visible) return null;

  return (
    <div className="modal-resultado-overlay">
      <div className={`modal-resultado ${exito ? 'exito' : 'error'}`}>
        <div className="modal-resultado-icon">
          {exito ? <SuccessIcon /> : <ErrorIcon />}
        </div>
        <h3>{exito ? 'Registro Exitoso' : 'Error en el Registro'}</h3>
        <p>{mensaje}</p>
        {intentos && !exito && (
          <p style={{ color: '#e67e22', fontWeight: '600', fontSize: '0.9rem', marginTop: '8px' }}>
            {intentos}
          </p>
        )}
        <button className="btn-modal-resultado" onClick={onCerrar}>
          {exito ? 'Continuar' : 'Entendido'}
        </button>
      </div>
    </div>
  );
}

export default ModalResultado;
