import React from 'react';

function InformacionTab({ pupilo, apoderado }) {
  const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Si no hay pupilo seleccionado, mostrar mensaje
  if (!pupilo) {
    return (
      <div className="tab-panel active">
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#64748b', padding: '40px 0' }}>
              No hay pupilo seleccionado. Seleccione un pupilo para ver su informacion.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel active">
      <style>{`
        @media (max-width: 699px) {
          .card-header h3 {
            font-size: 10px !important;
            display: flex !important;
            align-items: center !important;
            gap: 10px !important; /* Separación del icono */
          }
          .card-header h3 svg {
            width: 14px !important;
            height: 14px !important;
          }
          .info-label {
            font-size: 10px !important;
          }
          .info-value {
            font-size: 12px !important;
          }
        }
      `}</style>
      <div className="info-section">
        {/* Datos del Alumno */}
        <div className="card">
          <div className="card-header">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Datos del Alumno
            </h3>
          </div>
          <div className="card-body">
            <div className="info-grid-4">
              <div className="info-field">
                <span className="info-label">Nombres</span>
                <span className="info-value">{pupilo.nombres}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Apellidos</span>
                <span className="info-value">{pupilo.apellidos}</span>
              </div>
              <div className="info-field">
                <span className="info-label">RUT</span>
                <span className="info-value">{pupilo.rut}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Curso</span>
                <span className="info-value">{pupilo.curso_nombre || 'Sin asignar'}</span>
              </div>
            </div>
            <div className="info-grid-4" style={{ marginTop: '16px' }}>
              <div className="info-field">
                <span className="info-label">Fecha de Nacimiento</span>
                <span className="info-value">{pupilo.fecha_nacimiento ? formatearFecha(pupilo.fecha_nacimiento) : 'No registrada'}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Edad</span>
                <span className="info-value">{pupilo.fecha_nacimiento ? calcularEdad(pupilo.fecha_nacimiento) + ' anos' : '-'}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Sexo</span>
                <span className="info-value">{pupilo.sexo || 'No especificado'}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Estado</span>
                <span className="info-value info-value-badge">Activo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Datos del Apoderado */}
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Datos del Apoderado
            </h3>
          </div>
          <div className="card-body">
            <div className="info-grid-4">
              <div className="info-field">
                <span className="info-label">Nombre Completo</span>
                <span className="info-value">{apoderado.nombres} {apoderado.apellidos}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Parentesco</span>
                <span className="info-value">{pupilo.parentesco || 'No especificado'}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Telefono</span>
                <span className="info-value">{apoderado.telefono || 'No registrado'}</span>
              </div>
              <div className="info-field">
                <span className="info-label">Correo Electronico</span>
                <span className="info-value">{apoderado.email || 'No registrado'}</span>
              </div>
            </div>
            <div className="info-grid-4" style={{ marginTop: '16px' }}>
              <div className="info-field">
                <span className="info-label">RUT</span>
                <span className="info-value">{apoderado.rut || 'No registrado'}</span>
              </div>
              <div className="info-field info-field-wide">
                <span className="info-label">Direccion</span>
                <span className="info-value">{apoderado.direccion || 'No registrada'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InformacionTab;
