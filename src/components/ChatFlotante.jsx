import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  obtenerContactos,
  obtenerMensajes,
  crearConversacion,
  enviarMensaje,
  marcarConversacionLeida,
  obtenerNoLeidos,
  obtenerNuevosMensajes,
  obtenerCursosDocente,
  obtenerAlumnosCurso,
  habilitarRespuesta,
  enviarMensajeMasivo
} from '../services/chatService';
import socketService from '../services/socketService';


function ChatFlotante({ usuario, establecimientoId }) {
  const [chatAbierto, setChatAbierto] = useState(false);
  const [contactoActual, setContactoActual] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // chat, institucional, cursos
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [conversacionActual, setConversacionActual] = useState(null);
  const [mensajeInput, setMensajeInput] = useState('');
  const [contactos, setContactos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [totalNoLeidos, setTotalNoLeidos] = useState(0);
  const [ultimoTimestamp, setUltimoTimestamp] = useState(null);
  const [respuestaHabilitada, setRespuestaHabilitada] = useState(true); // Default true (will update on load)
  const [esMensajeMasivo, setEsMensajeMasivo] = useState(false);
  const [destinatariosMasivos, setDestinatariosMasivos] = useState([]);
  const [nombreDestinatarioMasivo, setNombreDestinatarioMasivo] = useState('');

  const mensajesRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  // Verificar si el usuario puede usar el chat (solo docentes y admins)
  const puedeUsarChat = usuario &&
    (usuario.tipo === 'docente' || usuario.tipo === 'administrador' || usuario.tipo === 'admin');

  // Cargar contactos al abrir el chat (Institucional)
  const cargarContactos = useCallback(async () => {
    if (!usuario?.id || !establecimientoId) return;

    setCargando(true);
    try {
      const resultado = await obtenerContactos(usuario.id, establecimientoId);
      if (resultado.success) {
        setContactos(resultado.data || []);
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error);
    } finally {
      setCargando(false);
    }
  }, [usuario?.id, establecimientoId]);

  // Cargar cursos
  const cargarCursos = useCallback(async () => {
    if (!usuario?.id || !establecimientoId) return;
    setCargando(true);
    try {
      const resultado = await obtenerCursosDocente(usuario.id, establecimientoId);
      if (resultado.success) {
        setCursos(resultado.data || []);
      }
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    } finally {
      setCargando(false);
    }
  }, [usuario?.id, establecimientoId]);

  // Cargar alumnos
  const cargarAlumnos = async (cursoId) => {
    setCargando(true);
    setAlumnos([]);
    try {
      const resultado = await obtenerAlumnosCurso(cursoId, usuario.id);
      if (resultado.success) {
        setAlumnos(resultado.data || []);
      }
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
    } finally {
      setCargando(false);
    }
  };

  // Cargar mensajes de una conversacion
  const cargarMensajes = useCallback(async (conversacionId) => {
    if (!conversacionId || !usuario?.id) return;

    setCargando(true);
    try {
      const resultado = await obtenerMensajes(conversacionId, usuario.id);
      if (resultado.success) {
        setMensajes(resultado.data || []);
        // Si hay mensajes, verificar si la respuesta esta habilitada (se asume que viene en la conversacion, pero obtenerMensajes retorna mensajes)
        // Necesitamos la info de la conversacion. La info completa.
        // Por ahora, asumimos que viene en el endpoint de mensajes o lo manejamos separado.
        // En realidad, createConversacion retorna informacion.

        // Marcar como leidos
        await marcarConversacionLeida(conversacionId, usuario.id);
        // Actualizar timestamp para polling
        setUltimoTimestamp(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    } finally {
      setCargando(false);
    }
  }, [usuario?.id]);

  // Obtener total de no leidos
  const actualizarNoLeidos = useCallback(async () => {
    if (!usuario?.id || !establecimientoId) return;

    try {
      const resultado = await obtenerNoLeidos(usuario.id, establecimientoId);
      if (resultado.success) {
        setTotalNoLeidos(resultado.data?.total_no_leidos || 0);
      }
    } catch (error) {
      console.error('Error al obtener no leidos:', error);
    }
  }, [usuario?.id, establecimientoId]);

  // Polling para nuevos mensajes
  const verificarNuevosMensajes = useCallback(async () => {
    if (!usuario?.id || !establecimientoId || !chatAbierto) return;

    try {
      const resultado = await obtenerNuevosMensajes(usuario.id, establecimientoId, ultimoTimestamp);
      if (resultado.success && resultado.data?.length > 0) {
        // Agregar nuevos mensajes a la conversacion actual si aplica
        if (conversacionActual) {
          const nuevosParaConversacion = resultado.data.filter(
            m => m.conversacion_id === conversacionActual
          );
          if (nuevosParaConversacion.length > 0) {
            setMensajes(prev => [...prev, ...nuevosParaConversacion.map(m => ({
              ...m,
              direccion: 'recibido'
            }))]);
          }
        }
        // Actualizar conteo de no leidos
        actualizarNoLeidos();
        // Actualizar contactos para reflejar nuevos mensajes
        cargarContactos();
      }
      if (resultado.timestamp) {
        setUltimoTimestamp(resultado.timestamp);
      }
    } catch (error) {
      console.error('Error en polling:', error);
    }
  }, [usuario?.id, establecimientoId, chatAbierto, ultimoTimestamp, conversacionActual, actualizarNoLeidos, cargarContactos]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (chatAbierto && puedeUsarChat) {
      if (activeTab === 'institucional') cargarContactos();
      if (activeTab === 'cursos') cargarCursos();
      actualizarNoLeidos();
    }
  }, [chatAbierto, puedeUsarChat, activeTab, cargarContactos, cargarCursos, actualizarNoLeidos]);

  // ==================== SOCKET.IO ====================
  useEffect(() => {
    if (chatAbierto && usuario?.id) {
      const socket = socketService.connect(usuario.id);

      const handleNuevoMensaje = (msg) => {
        // 1. Si el mensaje es para la conversación actual abierta
        if (conversacionActual && String(msg.conversacion_id) === String(conversacionActual)) {
          setMensajes(prev => {
            // Evitar duplicados
            if (prev.some(m => String(m.id) === String(msg.id))) return prev;
            return [...prev, msg];
          });

          // Si lo recibimos nosotros, marcarlo leído
          if (msg.direccion === 'recibido') {
            marcarConversacionLeida(conversacionActual, usuario.id);
          }
        } else {
          // 2. Es de otra conversación o el chat está cerrado
          if (msg.direccion === 'recibido') {
            setTotalNoLeidos(prev => prev + 1);
            // Actualizar contactos para reflejar nuevos mensajes
            cargarContactos();
          }
        }
      };

      socket.on('nuevo_mensaje', handleNuevoMensaje);

      return () => {
        socket.off('nuevo_mensaje', handleNuevoMensaje);
        socketService.disconnect();
      };
    }
  }, [usuario?.id, conversacionActual, chatAbierto, cargarContactos]);

  // Efecto para polling de respaldo (cada 30s)
  useEffect(() => {
    if (chatAbierto && puedeUsarChat) {
      pollingRef.current = setInterval(actualizarNoLeidos, 30000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [chatAbierto, puedeUsarChat, actualizarNoLeidos]);

  // Efecto para actualizar no leidos periodicamente (cuando el chat esta cerrado)
  useEffect(() => {
    if (puedeUsarChat) {
      actualizarNoLeidos(); // Al montar
      const interval = setInterval(actualizarNoLeidos, 30000); // cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [puedeUsarChat, actualizarNoLeidos]);

  // Scroll behavior
  useLayoutEffect(() => {
    if (mensajesRef.current) {
      mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
    }
    // Fallback
    const timer = setTimeout(() => {
      if (mensajesRef.current) {
        mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [mensajes, conversacionActual, chatAbierto]);

  const toggleChat = () => {
    setChatAbierto(!chatAbierto);
    if (!chatAbierto) {
      // Resetear estados al abrir
      setContactoActual(null);
      setConversacionActual(null);
      setMensajes([]);
      // Default a tab institucional si no hay nada
      if (activeTab === 'chat' && !conversacionActual) setActiveTab('institucional');
    } else {
      // Al cerrar (opcional: limpiar o mantener estado?)
      // setContactoActual(null);
      // setConversacionActual(null);
    }
  };

  const seleccionarContacto = async (contacto, tipoContacto = 'institucional') => {
    setContactoActual({
      ...contacto,
      nombre_completo: contacto.nombre_completo || contacto.nombre_apoderado || contacto.nombre_alumno // Handling differnt object shapes
    });
    setEsMensajeMasivo(false);
    setCargando(true);

    try {
      // Crear o recuperar conversacion
      const resultado = await crearConversacion(
        usuario.id,
        contacto.usuario_id || contacto.apoderado_usuario_id, // Apoderado ID logic
        establecimientoId
      );

      if (resultado.success) {
        setConversacionActual(resultado.data.id);

        // Fix: backend now returns 'respuesta_habilitada' in getConversaciones, but createConversacion returns data object.
        // Assuming createConversacion response structure or fetch it.
        // If we just got the ID, we have to assume default or fetch details.
        // For simplicity, let's look at the result data if it has the flag, otherwise default based on type.
        if (resultado.data.respuesta_habilitada !== undefined) {
          setRespuestaHabilitada(resultado.data.respuesta_habilitada === 1);
        } else {
          // If info missing, default to true unless it is parent (logic handled in backend creation)
          // We can update state later if needed
          setRespuestaHabilitada(true); // Temp default
        }

        await cargarMensajes(resultado.data.id);

        // Actualizar no leidos del contacto
        // ... (logic for specific contact update skipped for brevity, full reload might be needed or smart update)
        actualizarNoLeidos();
      }
    } catch (error) {
      console.error('Error al seleccionar contacto:', error);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarCurso = (curso) => {
    setCursoSeleccionado(curso);
    cargarAlumnos(curso.id);
  };

  const iniciarMensajeMasivo = (curso, listaAlumnos) => {
    setEsMensajeMasivo(true);
    setDestinatariosMasivos(listaAlumnos.map(a => a.apoderado_usuario_id));
    setContactoActual({ nombre_completo: `Todos - ${curso.grado}° ${curso.letra}`, tipo: 'curso' });
    setConversacionActual('masivo'); // Dummy ID
    setMensajes([]);
  };

  const handleEnviarMensaje = async () => {
    if (!mensajeInput.trim() || !conversacionActual || enviando) return;

    const textoMensaje = mensajeInput.trim();
    setMensajeInput('');
    setEnviando(true);

    // Si es masivo
    if (esMensajeMasivo) {
      try {
        // Add optimistic message (fake)
        const mensajeOptimista = {
          id: `temp-${Date.now()}`,
          mensaje: textoMensaje,
          direccion: 'enviado',
          fecha_envio: new Date().toISOString(),
          enviando: true
        };
        setMensajes(prev => [...prev, mensajeOptimista]);

        const resultado = await enviarMensajeMasivo(
          usuario.id,
          destinatariosMasivos,
          textoMensaje,
          establecimientoId
        );

        if (resultado.success) {
          // Update optimistic
          setMensajes(prev => prev.map(m =>
            m.id === mensajeOptimista.id
              ? { ...m, enviando: false, leido: 1 } // Fake leido
              : m
          ));
        } else {
          setMensajes(prev => prev.map(m =>
            m.id === mensajeOptimista.id
              ? { ...m, error: true, enviando: false }
              : m
          ));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setEnviando(false);
      }
      return;
    }

    // Agregar mensaje optimisticamente
    const mensajeOptimista = {
      id: `temp-${Date.now()}`,
      mensaje: textoMensaje,
      direccion: 'enviado',
      fecha_envio: new Date().toISOString(),
      enviando: true
    };
    setMensajes(prev => [...prev, mensajeOptimista]);

    try {
      const resultado = await enviarMensaje(conversacionActual, usuario.id, textoMensaje);

      if (resultado.success) {
        // Reemplazar mensaje optimista con el real
        setMensajes(prev => prev.map(m =>
          m.id === mensajeOptimista.id
            ? { ...resultado.data, direccion: 'enviado' }
            : m
        ));
        setUltimoTimestamp(new Date().toISOString());
      } else {
        // Marcar como error
        setMensajes(prev => prev.map(m =>
          m.id === mensajeOptimista.id
            ? { ...m, error: true, enviando: false }
            : m
        ));
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setMensajes(prev => prev.map(m =>
        m.id === mensajeOptimista.id
          ? { ...m, error: true, enviando: false }
          : m
      ));
    } finally {
      setEnviando(false);
    }
  };

  const toggleRespuestaHabilitada = async () => {
    if (!conversacionActual || esMensajeMasivo) return;
    const nuevoEstado = !respuestaHabilitada;
    setRespuestaHabilitada(nuevoEstado); // Optimistic UI

    const resultado = await habilitarRespuesta(conversacionActual, nuevoEstado);
    if (!resultado.success) {
      setRespuestaHabilitada(!nuevoEstado); // Revert on error
    }
  };

  const formatearHora = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (date.toDateString() === hoy.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === ayer.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    }
  };

  // No mostrar el chat si el usuario no puede usarlo
  if (!puedeUsarChat) {
    return null;
  }

  return (
    <>
      {/* Boton flotante */}
      <button className="chat-fab" onClick={toggleChat}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {totalNoLeidos > 0 && (
          <span className="chat-fab-badge">{totalNoLeidos > 99 ? '99+' : totalNoLeidos}</span>
        )}
      </button>

      {/* Overlay */}
      {chatAbierto && (
        <div className="chat-overlay" onClick={toggleChat}></div>
      )}

      {/* Modal del chat - Nuevo Diseño Profesional */}
      <div className={`chat-modal ${chatAbierto ? 'active' : ''}`}>

        {/* === SIDEBAR (Izquierda) === */}
        <div className={`chat-contacts-full ${contactoActual ? 'hidden-mobile' : ''}`}>

          {/* Header del Sidebar */}
          <div className="chat-sidebar-header">
            <div className="chat-sidebar-title">Mensajes</div>
            {/* Tabs de navegación */}
            <div className="chat-tabs">
              <button
                className={`chat-tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >Activos</button>
              <button
                className={`chat-tab ${activeTab === 'institucional' ? 'active' : ''}`}
                onClick={() => setActiveTab('institucional')}
              >Institucional</button>
              <button
                className={`chat-tab ${activeTab === 'cursos' ? 'active' : ''}`}
                onClick={() => setActiveTab('cursos')}
              >Cursos</button>
            </div>
          </div>

          {/* Lista de Contactos */}
          <div className="chat-students-list">
            {activeTab === 'institucional' && (
              cargando ? (<div className="chat-loading">Cargando...</div>) :
                contactos.length === 0 ? (<div className="chat-empty">Sin contactos</div>) : (
                  contactos.map(contacto => (
                    <div
                      key={contacto.usuario_id}
                      className={`chat-contact-item ${contacto.es_admin ? 'admin-contact' : ''} ${contactoActual?.usuario_id === contacto.usuario_id ? 'active' : ''}`}
                      onClick={() => seleccionarContacto(contacto)}
                    >
                      <div className="chat-contact-avatar">
                        {contacto.foto_url ? <img src={contacto.foto_url} alt="" /> : (contacto.nombre_completo?.charAt(0) || '?')}
                      </div>
                      <div className="chat-contact-info">
                        <div className="chat-contact-name">
                          {contacto.nombre_completo}
                          {contacto.es_admin === 1 && <span className="chat-admin-badge">Admin</span>}
                        </div>
                        <div className="chat-contact-tipo">{contacto.tipo === 'administrador' ? 'Administración' : 'Docente'}</div>
                      </div>
                    </div>
                  ))
                )
            )}

            {activeTab === 'cursos' && (
              cursoSeleccionado ? (
                <>
                  <div className="chat-contact-item" onClick={() => setCursoSeleccionado(null)} style={{ background: '#f1f5f9', justifyContent: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>← Volver a Cursos</span>
                  </div>

                  <div className="chat-contact-item" onClick={() => iniciarMensajeMasivo(cursoSeleccionado, alumnos)} style={{ borderLeft: '3px solid #10b981' }}>
                    <div className="chat-contact-avatar" style={{ background: '#10b981', color: 'white' }}>T</div>
                    <div className="chat-contact-info">
                      <div className="chat-contact-name">Todos los Apoderados</div>
                      <div className="chat-contact-tipo">Enviar mensaje masivo</div>
                    </div>
                  </div>

                  {alumnos.map(alumno => (
                    <div
                      key={alumno.alumno_id}
                      className={`chat-contact-item ${contactoActual?.apoderado_usuario_id === alumno.apoderado_usuario_id ? 'active' : ''}`}
                      onClick={() => seleccionarContacto(alumno, 'apoderado')}
                    >
                      <div className="chat-contact-avatar" style={{ background: '#6366f1', color: 'white' }}>
                        {alumno.nombre_alumno.charAt(0)}
                      </div>
                      <div className="chat-contact-info">
                        <div className="chat-contact-name">{alumno.nombre_alumno}</div>
                        <div className="chat-contact-tipo">Apoderado: {alumno.nombre_apoderado}</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                cargando ? <div className="chat-loading">Cargando...</div> :
                  cursos.map(curso => (
                    <div key={curso.id} className="chat-contact-item" onClick={() => seleccionarCurso(curso)}>
                      <div className="chat-contact-avatar" style={{ background: '#f59e0b', color: 'white', fontSize: '11px' }}>
                        {curso.grado}{curso.letra}
                      </div>
                      <div className="chat-contact-info">
                        <div className="chat-contact-name">{curso.grado}° {curso.letra} {curso.nivel}</div>
                        <div className="chat-contact-tipo">{curso.nombre}</div>
                      </div>
                    </div>
                  ))
              )
            )}

            {activeTab === 'chat' && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Selecciona una pestaña arriba para buscar contactos.
              </div>
            )}
          </div>
        </div>

        {/* === CHAT AREA (Derecha) === */}
        <div className={`chat-messages-area ${!contactoActual ? 'hidden-mobile' : ''}`}>

          {contactoActual ? (
            <>
              {/* Header Principal del Chat */}
              <div className="chat-main-header">
                <div className="chat-header-user-info">
                  <div className="chat-header-name">{contactoActual.nombre_completo}</div>
                  <div className="chat-header-subtitle">
                    {esMensajeMasivo ? 'Difusión a todo el curso' : (contactoActual.tipo || 'Chat')}
                  </div>
                </div>

                <div className="chat-header-actions">
                  {/* Toggle Permisos (Solo si es apoderado indiv y no masivo) */}
                  {!esMensajeMasivo && (
                    <div className="header-toggle-container" title="Permitir que el apoderado responda">
                      <span className="header-toggle-label">Respuestas</span>
                      <div
                        className={`modern-switch ${respuestaHabilitada ? 'checked' : ''}`}
                        onClick={toggleRespuestaHabilitada}
                      ></div>
                    </div>
                  )}

                  {/* Botón Cerrar / Info / Volver (Movil) */}
                  <button className="chat-close-btn-modern" onClick={toggleChat} title="Cerrar Chat">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Lista de Mensajes */}
              <div className="chat-messages" ref={mensajesRef}>
                {cargando ? (<div className="chat-loading">Cargando historial...</div>) :
                  mensajes.length === 0 ? (
                    <div className="chat-empty">
                      <div style={{ opacity: 0.5, marginBottom: 10 }}>👋</div>
                      <p>Comienza la conversación con {contactoActual.nombre_completo.split(' ')[0]}</p>
                    </div>
                  ) : (
                    mensajes.map((msg, index) => {
                      const mostrarFecha = index === 0 || formatearFecha(msg.fecha_envio) !== formatearFecha(mensajes[index - 1]?.fecha_envio);
                      return (
                        <React.Fragment key={msg.id}>
                          {mostrarFecha && (
                            <div className="chat-fecha-separador" style={{ alignSelf: 'center', background: 'rgba(0,0,0,0.05)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', margin: '10px 0' }}>
                              {formatearFecha(msg.fecha_envio)}
                            </div>
                          )}
                          <div className={`chat-message ${msg.direccion} ${msg.enviando ? 'enviando' : ''}`}>
                            <div className="chat-message-content">{msg.mensaje}</div>
                            <div className="chat-message-time">
                              {formatearHora(msg.fecha_envio)}
                              {msg.direccion === 'enviado' && msg.leido === 1 && <span>✓✓</span>}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="chat-input-area">
                <input
                  type="text"
                  className="chat-input"
                  placeholder={!respuestaHabilitada && !esMensajeMasivo ? "Respuestas deshabilitadas (aún puedes enviar)..." : "Escribe tu mensaje..."}
                  value={mensajeInput}
                  onChange={(e) => setMensajeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEnviarMensaje()}
                  disabled={enviando}
                />
                <button
                  className="chat-send-btn"
                  onClick={handleEnviarMensaje}
                  disabled={enviando || !mensajeInput.trim()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>

            </>
          ) : (
            /* Estado Vacio (Placeholder) */
            <div className="chat-placeholder">
              <svg className="chat-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <div className="chat-placeholder-text">Selecciona un chat para comenzar</div>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>Gestiona la comunicación con apoderados y colegas.</p>

              {/* Boton cerrar global si no hay chat (opcional) */}
              <button onClick={toggleChat} style={{ marginTop: '40px', background: 'none', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', color: '#64748b', cursor: 'pointer' }}>
                Cerrar Ventana
              </button>
            </div>
          )}
        </div>

      </div>
    </>
  );
}

export default ChatFlotante;
