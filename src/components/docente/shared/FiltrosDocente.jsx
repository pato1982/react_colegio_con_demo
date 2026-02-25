import React, { useState, useRef, useEffect } from 'react';

// Componente de select nativo para desktop (Customizado para scroll y estilo)
export function SelectNativo({ label, value, onChange, options, placeholder, disabled, containerStyle = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.id.toString() === value?.toString());

  const handleSelect = (id) => {
    if (disabled) return;
    onChange({ target: { value: id } });
    setIsOpen(false);
  };

  return (
    <div className="form-group" ref={containerRef} style={{ position: 'relative', marginBottom: '15px', zIndex: isOpen ? 100 : 'auto', ...containerStyle }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>{label}</label>
      <div
        className={`form-control ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: disabled ? '#e9ecef' : '#fff',
          height: '30px', // Reducido de 38px
          fontSize: '13px', // Fuente mas chica
          minHeight: 'unset', // Añadido para asegurar que la altura sea 30px
          padding: '0 8px', // Padding ajustado
          border: '1px solid #ced4da',
          borderRadius: '0.25rem'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? (selectedOption.nombre || selectedOption.label || selectedOption.id) : placeholder}
        </span>
        <span style={{ fontSize: '10px', marginLeft: '8px', color: '#6c757d' }}>▼</span>
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '32px', // Ajustado a la nueva altura
          left: 0,
          right: 0,
          maxHeight: '250px', // Scroll solicitado
          overflowY: 'auto',
          backgroundColor: '#fff',
          border: '1px solid #ced4da',
          borderRadius: '4px',
          zIndex: 2000, // Z-index aumentado
          boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
          marginTop: '0'
        }}>
          <div
            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '14px' }}
            onClick={() => handleSelect('')}
          >
            {placeholder}
          </div>
          {options.map(opt => (
            <div
              key={opt.id}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: (value?.toString() === opt.id.toString()) ? '#f1f5f9' : '#fff',
                fontSize: '14px',
                color: '#334155'
              }}
              onClick={() => handleSelect(opt.id)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = (value?.toString() === opt.id.toString()) ? '#f1f5f9' : '#fff'}
            >
              {opt.nombre || opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente de select custom para movil
export function SelectMovil({
  label,
  value,
  valueName,
  onChange,
  options,
  placeholder,
  disabled,
  isOpen,
  onToggle,
  onClose
}) {
  const containerRef = React.useRef(null);

  // Cerrar al hacer clic fuera
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Usar setTimeout para evitar que el clic que abre el dropdown lo cierre inmediatamente
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="form-group" ref={containerRef}>
      <label>{label}</label>
      <div className="custom-select-container" data-dropdown="true">
        <div
          className={`custom-select-trigger ${disabled ? 'disabled' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggle();
          }}
        >
          <span>{valueName || placeholder}</span>
          <span className="custom-select-arrow">{isOpen ? '▲' : '▼'}</span>
        </div>
        {isOpen && !disabled && (
          <div className="custom-select-options">
            <div className="custom-select-option" onClick={() => { onChange('', ''); onClose(); }}>
              {placeholder}
            </div>
            {options.map(opt => (
              <div
                key={opt.id}
                className={`custom-select-option ${value === opt.id.toString() ? 'selected' : ''}`}
                onClick={() => { onChange(opt.id, opt.nombre); onClose(); }}
              >
                {opt.nombre}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Panel de filtros completo
function FiltrosDocente({
  isMobile,
  cursos,
  asignaturas,
  cursoSeleccionado,
  cursoNombre,
  asignaturaSeleccionada,
  asignaturaNombre,
  trimestreSeleccionado,
  trimestreNombre,
  onCursoChange,
  onAsignaturaChange,
  onTrimestreChange,
  onAccion,
  accionTexto = 'Analizar',
  dropdownAbierto,
  setDropdownAbierto,
  mostrarTrimestre = true,
  columnas = '1fr 1fr 1fr auto',
  periodos
}) {
  const labelPeriodo = periodos?.nombreGenerico || 'Trimestre';
  const trimestres = periodos
    ? periodos.labelsFiltro.map(p => ({ id: String(p.id), nombre: p.nombre }))
    : [
        { id: '1', nombre: 'Primero' },
        { id: '2', nombre: 'Segundo' },
        { id: '3', nombre: 'Tercero' }
      ];

  if (isMobile) {
    return (
      <>
        <div className="form-row-movil">
          <SelectMovil
            label="Curso"
            value={cursoSeleccionado}
            valueName={cursoNombre}
            onChange={onCursoChange}
            options={cursos}
            placeholder="Seleccionar..."
            isOpen={dropdownAbierto === 'curso'}
            onToggle={() => setDropdownAbierto(prev => prev === 'curso' ? null : 'curso')}
            onClose={() => setDropdownAbierto(null)}
          />
          <SelectMovil
            label="Asignatura"
            value={asignaturaSeleccionada}
            valueName={asignaturaNombre}
            onChange={onAsignaturaChange}
            options={asignaturas}
            placeholder={cursoSeleccionado ? 'Seleccionar...' : 'Seleccione curso'}
            disabled={!cursoSeleccionado}
            isOpen={dropdownAbierto === 'asignatura'}
            onToggle={() => setDropdownAbierto(prev => prev === 'asignatura' ? null : 'asignatura')}
            onClose={() => setDropdownAbierto(null)}
          />
        </div>
        <div className="form-row-movil" style={{ alignItems: 'flex-end' }}>
          {mostrarTrimestre && (
            <SelectMovil
              label={labelPeriodo}
              value={trimestreSeleccionado}
              valueName={trimestreNombre}
              onChange={onTrimestreChange}
              options={trimestres}
              placeholder="Todos"
              isOpen={dropdownAbierto === 'trimestre'}
              onToggle={() => setDropdownAbierto(prev => prev === 'trimestre' ? null : 'trimestre')}
              onClose={() => setDropdownAbierto(null)}
            />
          )}
          <div className="form-group">
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onAccion}>
              {accionTexto}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="docente-filtros-row" style={{ gridTemplateColumns: columnas }}>
      <SelectNativo
        label="Curso"
        value={cursoSeleccionado}
        onChange={(e) => {
          const curso = cursos.find(c => c.id.toString() === e.target.value);
          onCursoChange(e.target.value, curso?.nombre || '');
        }}
        options={cursos}
        placeholder="Seleccionar"
      />
      <SelectNativo
        label="Asignatura"
        value={asignaturaSeleccionada}
        onChange={(e) => {
          const asig = asignaturas.find(a => a.id.toString() === e.target.value);
          onAsignaturaChange(e.target.value, asig?.nombre || '');
        }}
        options={asignaturas}
        placeholder={cursoSeleccionado ? 'Seleccionar' : 'Primero seleccione un curso'}
        disabled={!cursoSeleccionado}
      />
      {mostrarTrimestre && (
        <SelectNativo
          label={labelPeriodo}
          value={trimestreSeleccionado}
          onChange={(e) => {
            const match = trimestres.find(t => t.id === e.target.value);
            onTrimestreChange(e.target.value, match?.nombre || '');
          }}
          options={trimestres}
          placeholder="Todos"
        />
      )}
      <div className="docente-filtros-actions">
        <button className="btn btn-primary" onClick={onAccion}>
          {accionTexto}
        </button>
      </div>
    </div>
  );
}

export default FiltrosDocente;
