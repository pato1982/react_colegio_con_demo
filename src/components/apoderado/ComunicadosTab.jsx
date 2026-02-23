import React, { useState, useMemo, useEffect } from 'react';
import { useResponsive } from '../../hooks';
import { apiFetch } from '../../utils/api';

function ComunicadosTab({ pupilo, usuarioId, comunicados: comunicadosProp }) {
  const [comunicados, setComunicados] = useState(comunicadosProp || []);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [comunicadoExpandido, setComunicadoExpandido] = useState(null);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Hook personalizado
  const { isMobile } = useResponsive();

  const tiposComunicado = {
    reunion: { label: 'Reunion', color: '#8b5cf6' },
    academico: { label: 'Academico', color: '#3b82f6' },
    evento: { label: 'Evento', color: '#10b981' },
    administrativo: { label: 'Administrativo', color: '#f59e0b' },
    informativo: { label: 'Informativo', color: '#6b7280' },
    urgente: { label: 'Urgente', color: '#ef4444' }
  };

  // Actualizar comunicados si cambian las props
  useEffect(() => {
    if (comunicadosProp) {
      setComunicados(comunicadosProp);
    }
  }, [comunicadosProp]);

  // Cargar comunicados cuando cambia el pupilo (solo si no hay prop)
  useEffect(() => {
    if (comunicadosProp !== undefined) return;

    const cargarComunicados = async () => {
      if (!pupilo?.id) {
        setComunicados([]);
        return;
      }

      setCargando(true);
      setError('');

      try {
        const url = `/apoderado/pupilo/${pupilo.id}/comunicados?usuario_id=${usuarioId || 0}`;
        const response = await apiFetch(url);
        const data = await response.json();

        if (data.success) {
          setComunicados(data.data || []);
        } else {
          setError(data.error || 'Error al cargar comunicados');
        }
      } catch (err) {
        console.error('Error cargando comunicados:', err);
        setError('Error de conexion');
      } finally {
        setCargando(false);
      }
    };

    cargarComunicados();
  }, [pupilo?.id, usuarioId, comunicadosProp]);

  // Marcar comunicado como leido
  const marcarComoLeido = async (comunicadoId) => {
    if (!usuarioId) return;

    try {
      await apiFetch(`/apoderado/comunicado/${comunicadoId}/marcar-leido`, {
        method: 'POST',
        body: JSON.stringify({ usuario_id: usuarioId })
      });

      // Actualizar estado local
      setComunicados(prev => prev.map(c =>
        c.id === comunicadoId ? { ...c, leido: 1 } : c
      ));
    } catch (err) {
      console.error('Error marcando comunicado como leido:', err);
    }
  };

  // Filtrar comunicados segun los filtros aplicados
  const comunicadosFiltrados = useMemo(() => {
    return comunicados.filter(c => {
      // Filtro por fecha desde
      if (filtroFechaDesde && new Date(c.fecha) < new Date(filtroFechaDesde)) {
        return false;
      }
      // Filtro por fecha hasta
      if (filtroFechaHasta && new Date(c.fecha) > new Date(filtroFechaHasta + 'T23:59:59')) {
        return false;
      }
      // Filtro por tipo
      if (filtroTipo && c.tipo !== filtroTipo) {
        return false;
      }
      return true;
    });
  }, [comunicados, filtroFechaDesde, filtroFechaHasta, filtroTipo]);

  // Separar comunicados por mes actual y meses pasados
  const { comunicadosMesActual, comunicadosMesesPasados } = useMemo(() => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const mesActualList = [];
    const mesesPasadosList = [];

    comunicadosFiltrados.forEach(c => {
      const fechaComunicado = new Date(c.fecha);
      if (fechaComunicado.getMonth() === mesActual && fechaComunicado.getFullYear() === anioActual) {
        mesActualList.push(c);
      } else {
        mesesPasadosList.push(c);
      }
    });

    return {
      comunicadosMesActual: mesActualList,
      comunicadosMesesPasados: mesesPasadosList
    };
  }, [comunicadosFiltrados]);

  const limpiarFiltros = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroTipo('');
  };

  const hayFiltrosActivos = filtroFechaDesde || filtroFechaHasta || filtroTipo;

  // Lista ordenada por fecha (mas recientes primero) para movil
  const comunicadosOrdenados = useMemo(() => {
    return [...comunicadosFiltrados].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [comunicadosFiltrados]);

  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (date.toDateString() === hoy.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === ayer.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    }
  };

  const handleExpandir = (comunicado) => {
    if (comunicadoExpandido === comunicado.id) {
      setComunicadoExpandido(null);
    } else {
      setComunicadoExpandido(comunicado.id);
      if (!comunicado.leido) {
        marcarComoLeido(comunicado.id);
      }
    }
  };

  const renderComunicado = (comunicado) => (
    <div
      key={comunicado.id}
      className={`comunicado-mensaje ${!comunicado.leido ? 'no-leido' : ''}`}
      onClick={() => handleExpandir(comunicado)}
    >
      <div className="comunicado-mensaje-header">
        <div className="comunicado-mensaje-info">
          <span
            className="comunicado-tipo-badge"
            style={{ background: tiposComunicado[comunicado.tipo]?.color || '#6b7280' }}
          >
            {tiposComunicado[comunicado.tipo]?.label || comunicado.tipo}
          </span>
          <h4 className="comunicado-mensaje-titulo">{comunicado.titulo}</h4>
        </div>
        <div className="comunicado-mensaje-meta">
          {!comunicado.leido && <span className="comunicado-nuevo-dot"></span>}
          <span className="comunicado-mensaje-fecha">{formatearFecha(comunicado.fecha)}</span>
        </div>
      </div>
      <p className={`comunicado-mensaje-texto ${comunicadoExpandido === comunicado.id ? 'expandido' : ''}`}>
        {comunicado.mensaje}
      </p>
      {comunicadoExpandido === comunicado.id && comunicado.fecha_evento && (
        <div className="comunicado-evento-info" style={{ marginTop: '10px', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <span><strong>Fecha evento:</strong> {new Date(comunicado.fecha_evento).toLocaleDateString('es-CL')}</span>
            {comunicado.hora_evento && <span><strong>Hora:</strong> {comunicado.hora_evento}</span>}
            {comunicado.lugar_evento && <span><strong>Lugar:</strong> {comunicado.lugar_evento}</span>}
          </div>
        </div>
      )}
    </div>
  );

  const getMesActualNombre = () => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[new Date().getMonth()];
  };

  // Si no hay pupilo seleccionado
  if (!pupilo) {
    return (
      <div className="tab-panel active">
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#64748b', padding: '40px 0' }}>
              No hay pupilo seleccionado. Seleccione un pupilo para ver sus comunicados.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si esta cargando
  if (cargando) {
    return (
      <div className="tab-panel active">
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#64748b', padding: '40px 0' }}>
              Cargando comunicados...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si hay error
  if (error) {
    return (
      <div className="tab-panel active">
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#ef4444', padding: '40px 0' }}>
              {error}
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
          .card-header h3, h3 {
            font-size: 14px !important;
          }
          .comunicado-mensaje-titulo {
            font-size: 10px !important;
          }
          .comunicado-tipo-badge {
            font-size: 9px !important;
            padding: 2px 6px !important;
          }
          .comunicado-mensaje-fecha {
            font-size: 10px !important;
          }
          .comunicado-mensaje-texto {
            font-size: 8px !important;
          }
        }
      `}</style>
      {/* Filtros */}
      <div className="comunicados-filtros">
        <div className="filtro-grupo">
          <label>Fecha Desde</label>
          <input
            type="date"
            className="form-control"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
          />
        </div>
        <div className="filtro-grupo">
          <label>Fecha Hasta</label>
          <input
            type="date"
            className="form-control"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
          />
        </div>
        <div className="filtro-grupo">
          <label>Tipo</label>
          <select
            className="form-control"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="reunion">Reunion</option>
            <option value="academico">Academico</option>
            <option value="evento">Evento</option>
            <option value="administrativo">Administrativo</option>
            <option value="informativo">Informativo</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        {hayFiltrosActivos && (
          <button className="btn-limpiar-filtros" onClick={limpiarFiltros}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Limpiar
          </button>
        )}
      </div>

      {isMobile ? (
        /* Vista Movil: Lista unica ordenada por fecha */
        <div className="comunicados-lista-movil">
          {comunicadosOrdenados.length > 0 ? (
            comunicadosOrdenados.map(renderComunicado)
          ) : (
            <div className="comunicados-vacio-mini">
              <p>No hay comunicados</p>
            </div>
          )}
        </div>
      ) : (
        /* Vista Desktop: Dos columnas */
        <div className="comunicados-dos-columnas">
          {/* Columna Izquierda: Mes Actual */}
          <div className="card comunicados-columna">
            <div className="card-header">
              <h3>{getMesActualNombre()}</h3>
              <span className="comunicados-count">{comunicadosMesActual.length}</span>
            </div>
            <div className="card-body comunicados-chat-body">
              <div className="comunicados-chat comunicados-scroll">
                {comunicadosMesActual.length > 0 ? (
                  comunicadosMesActual.map(renderComunicado)
                ) : (
                  <div className="comunicados-vacio-mini">
                    <p>No hay comunicados este mes</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Meses Pasados */}
          <div className="card comunicados-columna">
            <div className="card-header">
              <h3>Meses Anteriores</h3>
              <span className="comunicados-count">{comunicadosMesesPasados.length}</span>
            </div>
            <div className="card-body comunicados-chat-body">
              <div className="comunicados-chat comunicados-scroll">
                {comunicadosMesesPasados.length > 0 ? (
                  comunicadosMesesPasados.map(renderComunicado)
                ) : (
                  <div className="comunicados-vacio-mini">
                    <p>No hay comunicados anteriores</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComunicadosTab;
