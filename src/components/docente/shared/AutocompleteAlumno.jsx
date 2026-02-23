import React, { useState, useEffect, useMemo, useRef } from 'react';

function AutocompleteAlumno({
  alumnos,
  alumnoSeleccionado,
  busqueda,
  onBusquedaChange,
  onSeleccionar,
  disabled,
  placeholder = 'Buscar alumno...',
  label = 'Alumno',
  mostrarLabel = true,
  onDropdownOpen
}) {
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const containerRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Si el clic fue dentro, no hacer nada
      if (containerRef.current && containerRef.current.contains(event.target)) {
        return;
      }
      setMostrarDropdown(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside); // Soporte touch

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Normalizar texto: quitar acentos y pasar a minúsculas
  const normalizar = (texto) =>
    texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const alumnosFiltrados = useMemo(() => {
    if (alumnoSeleccionado) return alumnos;
    // Filtrar solo a partir del 3er carácter
    if (!busqueda || busqueda.length < 3) return alumnos;
    const busqNorm = normalizar(busqueda);
    return alumnos.filter(a =>
      normalizar(`${a.nombres} ${a.apellidos}`).includes(busqNorm) ||
      normalizar(`${a.apellidos} ${a.nombres}`).includes(busqNorm)
    );
  }, [alumnos, busqueda, alumnoSeleccionado]);

  const handleInputChange = (e) => {
    onBusquedaChange(e.target.value);
    setMostrarDropdown(true);
    if (onDropdownOpen) onDropdownOpen();
  };

  const handleFocus = () => {
    setMostrarDropdown(true);
    if (onDropdownOpen) onDropdownOpen();
  };

  const handleToggle = () => {
    if (!disabled) {
      setMostrarDropdown(!mostrarDropdown);
      if (!mostrarDropdown && onDropdownOpen) onDropdownOpen();
    }
  };

  const handleSeleccionar = (alumno) => {
    onSeleccionar(alumno);
    setMostrarDropdown(false);
  };

  return (
    <div className="form-group">
      {mostrarLabel && <label>{label}</label>}
      <div className="docente-autocomplete-container" ref={containerRef}>
        <input
          type="text"
          className="form-control"
          placeholder={disabled ? 'Seleccione curso' : placeholder}
          value={busqueda}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onClick={handleFocus}
          onMouseDown={handleFocus} // Refuerzo para click
          onTouchStart={handleFocus} // Refuerzo para touch
          disabled={disabled}
          autoComplete="off"
        />
        <button
          type="button"
          className="docente-autocomplete-arrow"
          onClick={handleToggle}
          disabled={disabled}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        {mostrarDropdown && alumnos.length > 0 && (
          <div className="docente-autocomplete-dropdown">
            {alumnosFiltrados.map(alumno => (
              <div
                key={alumno.id}
                className="docente-autocomplete-item"
                onClick={() => handleSeleccionar(alumno)}
              >
                {alumno.nombres} {alumno.apellidos}
              </div>
            ))}
            {alumnosFiltrados.length === 0 && (
              <div className="docente-autocomplete-item disabled">No se encontraron alumnos</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AutocompleteAlumno;
