import React, { useState, useEffect } from 'react';
import { useResponsive, useDropdown } from '../hooks';
import { useMensaje, useAuth } from '../contexts';
import { apiFetch } from '../utils/api';

function ComunicadosTab() {
  const { mostrarMensaje } = useMensaje();
  const { usuario } = useAuth();
  const [formData, setFormData] = useState({
    tipoComunicado: '',
    tipoComunicadoNombre: '',
    modoCurso: '',
    modoCursoNombre: '',
    cursosSeleccionados: [],
    titulo: '',
    mensaje: ''
  });

  // Estado para cursos desde la API
  const [cursosDB, setCursosDB] = useState([]);
  const [enviando, setEnviando] = useState(false);

  // Hooks personalizados
  const { isMobile } = useResponsive();
  const { dropdownAbierto, setDropdownAbierto } = useDropdown();

  const tiposComunicado = [
    { id: 'informativo', nombre: 'Informativo' },
    { id: 'urgente', nombre: 'Urgente' },
    { id: 'reunion', nombre: 'Reunion' },
    { id: 'evento', nombre: 'Evento' }
  ];

  const modosCurso = [
    { id: 'todos', nombre: 'Todos los Cursos' },
    { id: 'especificos', nombre: 'Cursos Especificos' }
  ];

  // Cargar cursos al montar
  useEffect(() => {
    cargarCursos();
  }, []);

  const cargarCursos = async () => {
    try {
      const response = await apiFetch(`/cursos`);
      const data = await response.json();
      if (data.success) {
        setCursosDB(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando cursos:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCursoToggle = (cursoId) => {
    const nuevosSeleccionados = formData.cursosSeleccionados.includes(cursoId)
      ? formData.cursosSeleccionados.filter(id => id !== cursoId)
      : [...formData.cursosSeleccionados, cursoId];
    setFormData({ ...formData, cursosSeleccionados: nuevosSeleccionados });
  };

  const enviarComunicado = async () => {
    // Validaciones
    if (!formData.tipoComunicado) {
      mostrarMensaje('Error', 'Seleccione el tipo de comunicado', 'error');
      return;
    }
    if (!formData.modoCurso) {
      mostrarMensaje('Error', 'Seleccione a quién va dirigido', 'error');
      return;
    }
    if (formData.modoCurso === 'especificos' && formData.cursosSeleccionados.length === 0) {
      mostrarMensaje('Error', 'Seleccione al menos un curso', 'error');
      return;
    }
    if (!formData.titulo.trim()) {
      mostrarMensaje('Error', 'Ingrese el título del comunicado', 'error');
      return;
    }
    if (!formData.mensaje.trim()) {
      mostrarMensaje('Error', 'Ingrese el mensaje del comunicado', 'error');
      return;
    }

    setEnviando(true);

    try {
      const response = await apiFetch(`/comunicados`, {
        method: 'POST',
        body: JSON.stringify({
          titulo: formData.titulo.trim(),
          mensaje: formData.mensaje.trim(),
          tipo: formData.tipoComunicado,
          para_todos_cursos: formData.modoCurso === 'todos',
          cursos_ids: formData.modoCurso === 'especificos' ? formData.cursosSeleccionados : [],
          para_apoderados: true,
          remitente_id: usuario?.id || 1
        })
      });

      const data = await response.json();

      if (data.success) {
        mostrarMensaje('Exito', 'Comunicado enviado correctamente', 'success');
        limpiarFormulario();
      } else {
        mostrarMensaje('Error', data.error || 'Error al enviar comunicado', 'error');
      }
    } catch (error) {
      console.error('Error enviando comunicado:', error);
      mostrarMensaje('Error', 'Error de conexión al enviar comunicado', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const limpiarFormulario = () => {
    setFormData({
      tipoComunicado: '',
      tipoComunicadoNombre: '',
      modoCurso: '',
      modoCursoNombre: '',
      cursosSeleccionados: [],
      titulo: '',
      mensaje: ''
    });
  };

  return (
    <div className="tab-panel active">
      <div className="card">
        <div className="card-header">
          <h3>Enviar Comunicado</h3>
        </div>
        <div className="card-body">
          <div className="form-row form-row-tres form-row-filtros">
            <div className="form-group">
              <label>Tipo de Comunicado</label>
              {isMobile ? (
                <div className="custom-select-container">
                  <div
                    className="custom-select-trigger"
                    onClick={() => setDropdownAbierto(dropdownAbierto === 'tipo' ? null : 'tipo')}
                  >
                    <span>{formData.tipoComunicadoNombre || 'Seleccionar...'}</span>
                    <span className="custom-select-arrow">{dropdownAbierto === 'tipo' ? '▲' : '▼'}</span>
                  </div>
                  {dropdownAbierto === 'tipo' && (
                    <div className="custom-select-options">
                      <div
                        className="custom-select-option"
                        onClick={() => {
                          setFormData({ ...formData, tipoComunicado: '', tipoComunicadoNombre: '' });
                          setDropdownAbierto(null);
                        }}
                      >
                        Seleccionar...
                      </div>
                      {tiposComunicado.map(tipo => (
                        <div
                          key={tipo.id}
                          className={`custom-select-option ${formData.tipoComunicado === tipo.id ? 'selected' : ''}`}
                          onClick={() => {
                            setFormData({ ...formData, tipoComunicado: tipo.id, tipoComunicadoNombre: tipo.nombre });
                            setDropdownAbierto(null);
                          }}
                        >
                          {tipo.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <select
                  className="form-control"
                  name="tipoComunicado"
                  value={formData.tipoComunicado}
                  onChange={(e) => setFormData({ ...formData, tipoComunicado: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  {tiposComunicado.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label>Curso</label>
              {isMobile ? (
                <div className="custom-select-container">
                  <div
                    className="custom-select-trigger"
                    onClick={() => setDropdownAbierto(dropdownAbierto === 'modoCurso' ? null : 'modoCurso')}
                  >
                    <span>{formData.modoCursoNombre || 'Seleccionar...'}</span>
                    <span className="custom-select-arrow">{dropdownAbierto === 'modoCurso' ? '▲' : '▼'}</span>
                  </div>
                  {dropdownAbierto === 'modoCurso' && (
                    <div className="custom-select-options">
                      <div
                        className="custom-select-option"
                        onClick={() => {
                          setFormData({ ...formData, modoCurso: '', modoCursoNombre: '', cursosSeleccionados: [] });
                          setDropdownAbierto(null);
                        }}
                      >
                        Seleccionar...
                      </div>
                      {modosCurso.map(modo => (
                        <div
                          key={modo.id}
                          className={`custom-select-option ${formData.modoCurso === modo.id ? 'selected' : ''}`}
                          onClick={() => {
                            setFormData({ ...formData, modoCurso: modo.id, modoCursoNombre: modo.nombre });
                            setDropdownAbierto(null);
                          }}
                        >
                          {modo.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <select
                  className="form-control"
                  name="modoCurso"
                  value={formData.modoCurso}
                  onChange={(e) => setFormData({ ...formData, modoCurso: e.target.value, cursosSeleccionados: [] })}
                >
                  <option value="">Seleccionar...</option>
                  {modosCurso.map(modo => (
                    <option key={modo.id} value={modo.id}>{modo.nombre}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label>Título</label>
              <input
                type="text"
                className="form-control"
                name="titulo"
                value={formData.titulo}
                onChange={handleInputChange}
                placeholder="Ej: Reunion de apoderados"
              />
            </div>
          </div>

          {formData.modoCurso === 'especificos' && (
            <div className="cursos-grid-container" style={{ marginTop: '15px' }}>
              <div className="checkbox-group checkbox-4-columnas">
                {cursosDB.map(curso => (
                  <div key={curso.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`curso-com-${curso.id}`}
                      checked={formData.cursosSeleccionados.includes(curso.id)}
                      onChange={() => handleCursoToggle(curso.id)}
                    />
                    <label htmlFor={`curso-com-${curso.id}`}>{curso.nombre}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Mensaje</label>
            <textarea
              className="form-control"
              name="mensaje"
              value={formData.mensaje}
              onChange={handleInputChange}
              rows="8"
              placeholder="Escriba el comunicado aqui..."
            ></textarea>
          </div>
          <div className="form-actions" style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={limpiarFormulario}
              disabled={enviando}
            >
              Limpiar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={enviarComunicado}
              disabled={enviando}
            >
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComunicadosTab;
