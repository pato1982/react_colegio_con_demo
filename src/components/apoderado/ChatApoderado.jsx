import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import config from '../../config/env';
import socketService from '../../services/socketService';
import chatService from '../../services/chatService';

function ChatApoderado({ usuario, pupiloSeleccionado }) {
  // Estados principales
  const [chatAbierto, setChatAbierto] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('docentes'); // Solo docentes por defecto
  const [busqueda, setBusqueda] = useState('');

  // Estados de datos
  const [contactos, setContactos] = useState([]);

  // Estados de chat activo
  const [contactoActual, setContactoActual] = useState(null);
  const [conversacionActiva, setConversacionActiva] = useState(null); // ID de la conversacion
  const [mensajes, setMensajes] = useState([]);
  const [mensajeInput, setMensajeInput] = useState('');
  const [respuestaHabilitada, setRespuestaHabilitada] = useState(true);

  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [totalNoLeidos, setTotalNoLeidos] = useState(0);

  // Estados de panel movil
  const [mostrarListaMobile, setMostrarListaMobile] = useState(true);

  const messagesEndRef = useRef(null);
  const mensajesRef = useRef(null);
  const inputRef = useRef(null);
  const pollingRef = useRef(null);

  // Función helper para desplazar el chat al final
  const scrollChatToBottom = () => {
    if (mensajesRef.current) {
      mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
    }
  };

  // ==================== CARGA DE DATOS ====================

  const actualizarBadgesLocales = useCallback((conversacionId) => {
    setContactos(prev => prev.map(c => {
      // Nota: en ChatApoderado, el contacto tiene usuario_id
      // Necesitamos asociar el usuario_id con la conversacion.
      // Por simplicidad, si estamos cargando los mensajes de esta conv, 
      // y ese contacto es el activo, ponemos su badge en 0.
      if (contactoActual && c.usuario_id === contactoActual.usuario_id) {
        return { ...c, mensajes_no_leidos: 0 };
      }
      return c;
    }));
    // Recalcular total no leidos basándonos en la lista actualizada
    setTotalNoLeidos(() => {
      const count = contactos.reduce((acc, c) => acc + (c.usuario_id === contactoActual?.usuario_id ? 0 : (c.mensajes_no_leidos || 0)), 0);
      return count;
    });
  }, [contactos, contactoActual]);

  const verificarEstadoBloqueo = async (conversacionId) => {
    try {
      const establecimientoId = pupiloSeleccionado?.establecimiento_id || usuario.establecimiento_id;
      const res = await chatService.obtenerConversaciones(usuario.id, establecimientoId);
      if (res.success) {
        const conv = res.data.find(c => c.id === conversacionId);
        if (conv) {
          setRespuestaHabilitada(conv.respuesta_habilitada === 1);
        }
      }
    } catch (e) { console.error(e); }
  };

  const cargarContactos = useCallback(async () => {
    if (!usuario?.id) return;

    try {
      // Priorizar el establecimiento del pupilo seleccionado
      const establecimientoId = pupiloSeleccionado?.establecimiento_id || usuario.establecimiento_id;

      if (!establecimientoId) {
        console.warn('No hay establecimiento ID disponible para cargar contactos');
        return;
      }

      const res = await chatService.obtenerContactos(usuario.id, establecimientoId);

      if (res.success) {
        setContactos(res.data);
        const noLeidos = res.data.reduce((acc, c) => acc + (c.mensajes_no_leidos || 0), 0);
        setTotalNoLeidos(noLeidos);
      }
    } catch (error) {
      console.error('Error cargando contactos:', error);
    }
  }, [usuario?.id, pupiloSeleccionado?.establecimiento_id, usuario?.establecimiento_id]);

  const cargarMensajes = async (conversacionId) => {
    try {
      const res = await chatService.obtenerMensajes(conversacionId, usuario.id);
      if (res.success) {
        setMensajes(res.data);
        // Después de actualizar los mensajes, desplazar al final
        scrollChatToBottom();
        await chatService.marcarConversacionLeida(conversacionId, usuario.id);
        actualizarBadgesLocales(conversacionId);
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
  };

  const iniciarConversacion = async (contacto) => {
    if (!usuario?.id || !contacto?.usuario_id) return;

    try {
      setCargandoMensajes(true);

      // 1. Obtener o crear conversacion
      const establecimientoId = pupiloSeleccionado?.establecimiento_id || usuario.establecimiento_id;
      const res = await chatService.crearConversacion(
        usuario.id,
        contacto.usuario_id,
        establecimientoId,
        `Chat con ${usuario.nombres}`
      );

      if (res.success && res.data.id) {
        const conversacionId = res.data.id;
        setConversacionActiva(conversacionId);

        // 2. Cargar mensajes
        await cargarMensajes(conversacionId);

        // 3. Verificar estado de respuesta
        if (res.data.respuesta_habilitada !== undefined) {
          setRespuestaHabilitada(res.data.respuesta_habilitada === 1);
        } else {
          // Si no viene en crearConversacion, lo buscamos en el detalle
          verificarEstadoBloqueo(conversacionId);
        }
      }

    } catch (error) {
      console.error('Error iniciando conversacion:', error);
    } finally {
      setCargandoMensajes(false);
    }
  };

  // ==================== SOCKET.IO ====================
  useEffect(() => {
    if (chatAbierto && usuario?.id) {
      const socket = socketService.connect(usuario.id);

      const handleNuevoMensaje = (msg) => {
        // 1. Si el mensaje es para la conversación actual abierta
        if (conversacionActiva && String(msg.conversacion_id) === String(conversacionActiva)) {
          setMensajes(prev => {
            if (prev.some(m => String(m.id) === String(msg.id))) return prev;
            return [...prev, msg];
          });

          // Si lo recibimos nosotros, marcarlo leído
          if (msg.direccion === 'recibido') {
            chatService.marcarConversacionLeida(conversacionActiva, usuario.id);
          }
        } else {
          // 2. Es de otra conversación
          if (msg.direccion === 'recibido') {
            setTotalNoLeidos(prev => prev + 1);
            cargarContactos();
          }
        }
      };

      const handleEstadoActualizado = (data) => {
        if (conversacionActiva && String(data.conversacion_id) === String(conversacionActiva)) {
          setRespuestaHabilitada(!!data.habilitado);
        }
      };

      socket.on('nuevo_mensaje', handleNuevoMensaje);
      socket.on('chat_estado_actualizado', handleEstadoActualizado);

      return () => {
        socket.off('nuevo_mensaje', handleNuevoMensaje);
        socket.off('chat_estado_actualizado', handleEstadoActualizado);
        socketService.disconnect();
      };
    }
  }, [usuario?.id, conversacionActiva, chatAbierto, contactoActual]);

  // ==================== EFFECTS ====================

  // Cargar contactos al abrir o al cambiar pupilo
  useEffect(() => {
    if (chatAbierto) {
      cargarContactos();
    }
  }, [chatAbierto, usuario, pupiloSeleccionado, cargarContactos]);

  // Polling de respaldo (cada 30s) para asegurar sincronía de lista
  useEffect(() => {
    if (chatAbierto) {
      const interval = setInterval(cargarContactos, 30000);
      return () => clearInterval(interval);
    }
  }, [chatAbierto, cargarContactos]);

  // Scroll al final
  useLayoutEffect(() => {
    const scroll = () => {
      if (mensajesRef.current) {
        mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
      }
    };

    scroll();
    // Timeout para asegurar que se ejecute después de renderizado completo
    const timer = setTimeout(scroll, 100);
    // Segundo chequeo por seguridad si hay imágenes o carga lenta
    const timer2 = setTimeout(scroll, 300);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [mensajes, conversacionActiva, chatAbierto, contactoActual]);

  // Focus input
  useEffect(() => {
    if (contactoActual && inputRef.current && !cargandoMensajes) {
      inputRef.current.focus();
    }
  }, [contactoActual, cargandoMensajes]);


  // ==================== HANDLERS ====================

  const toggleChat = () => {
    setChatAbierto(!chatAbierto);
    if (!chatAbierto) {
      setContactoActual(null);
      setConversacionActiva(null);
      setMensajes([]);
      setMostrarListaMobile(true);
    }
  };

  const seleccionarContacto = async (contacto) => {
    setContactoActual(contacto);
    setMostrarListaMobile(false);
    setMensajes([]);
    setRespuestaHabilitada(true);

    await iniciarConversacion(contacto);

    // Marcar leidos visualmente de inmediato
    setContactos(prev => prev.map(c =>
      c.usuario_id === contacto.usuario_id
        ? { ...c, mensajes_no_leidos: 0 }
        : c
    ));
    // El total se actualizará con el socket o el polling de respaldo
  };

  const handleEnviarMensaje = async () => {
    if (!mensajeInput.trim() || !conversacionActiva || enviando) return;
    if (!respuestaHabilitada) {
      alert("No puedes responder a esta conversación porque el docente la ha finalizado o bloqueado.");
      return;
    }

    const textoMensaje = mensajeInput.trim();
    setMensajeInput('');
    setEnviando(true);

    const tempId = `temp-${Date.now()}`;
    const nuevoMensaje = {
      id: tempId,
      mensaje: textoMensaje,
      direccion: 'enviado',
      fecha_envio: new Date().toISOString(),
      enviando: true,
      leido: 0
    };
    setMensajes(prev => [...prev, nuevoMensaje]);

    try {
      const res = await chatService.enviarMensaje(conversacionActiva, usuario.id, textoMensaje);

      if (!res.success) {
        if (res.error?.includes('permiso') || res.error?.includes('bloqueado')) {
          setRespuestaHabilitada(false);
        }
        throw new Error(res.error || 'Error enviando mensaje');
      }

      // El mensaje se actualizará vía Socket.io si todo va bien, 
      // pero actualizamos localmente por si acaso o para quitar el 'enviando'
      setMensajes(prev => prev.map(m =>
        m.id === tempId ? { ...res.data, direccion: 'enviado' } : m
      ));

    } catch (error) {
      console.error(error);
      alert(error.message || 'Error al enviar mensaje');
      setMensajes(prev => prev.map(m =>
        m.id === tempId ? { ...m, error: true, enviando: false } : m
      ));
    } finally {
      setEnviando(false);
    }
  };

  const volverALista = () => {
    setContactoActual(null);
    setConversacionActiva(null);
    setMensajes([]);
    setMostrarListaMobile(true);
  };

  // ==================== HELPERS ====================

  const formatearHora = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatearFechaSeparador = (fecha) => {
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
      return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    }
  };

  const getIniciales = (nombre) => {
    if (!nombre) return '?';
    const partes = nombre.split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  const getContactosFiltrados = () => {
    let lista = contactos;
    if (busqueda) {
      const b = busqueda.toLowerCase();
      lista = lista.filter(c =>
        (c.nombre_completo || '').toLowerCase().includes(b) ||
        (c.asignaturas || '').toLowerCase().includes(b)
      );
    }
    return lista;
  };

  // ==================== RENDER ====================

  return (
    <>
      {/* FAB Button */}
      <button className="chatv2-fab" onClick={toggleChat}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {totalNoLeidos > 0 && (
          <span className="chatv2-fab-badge">{totalNoLeidos > 99 ? '99+' : totalNoLeidos}</span>
        )}
      </button>

      {/* Overlay */}
      {chatAbierto && <div className="chatv2-overlay" onClick={toggleChat}></div>}

      {/* Modal Principal */}
      <div className={`chatv2-modal ${chatAbierto ? 'active' : ''}`}>

        {/* Header del Modal */}
        <div className="chatv2-header">
          <div className="chatv2-header-left">
            <svg className="chatv2-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span className="chatv2-header-title">
              Mensajería {pupiloSeleccionado ? `- ${pupiloSeleccionado.nombres}` : ''}
            </span>
          </div>
          <button className="chatv2-close-btn" onClick={toggleChat}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="chatv2-content">

          {/* Columna 1: Navegación */}
          <div className={`chatv2-nav ${!mostrarListaMobile ? 'hidden-mobile' : ''}`}>
            <button
              className={`chatv2-nav-item ${vistaActiva === 'docentes' ? 'active' : ''}`}
              onClick={() => setVistaActiva('docentes')}
              title="Docentes"
            >
              <div className="chatv2-nav-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <span>Docentes</span>
            </button>
          </div>

          {/* Columna 2: Lista de Contactos */}
          <div className={`chatv2-list ${!mostrarListaMobile ? 'hidden-mobile' : ''}`}>

            {/* Barra de busqueda */}
            <div className="chatv2-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {/* Lista de contactos */}
            <div className="chatv2-list-items">
              {cargando ? (
                <div className="chatv2-loading">
                  <div className="chatv2-spinner"></div>
                  <span>Cargando...</span>
                </div>
              ) : getContactosFiltrados().length === 0 ? (
                <div className="chatv2-empty-list">
                  <p style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    {pupiloSeleccionado ? 'No hay docentes disponibles.' : 'Selecciona un pupilo arriba.'}
                  </p>
                </div>
              ) : (
                getContactosFiltrados().map(contacto => (
                  <div
                    key={contacto.usuario_id}
                    className={`chatv2-list-item ${contactoActual?.usuario_id === contacto.usuario_id ? 'active' : ''}`}
                    onClick={() => seleccionarContacto(contacto)}
                  >
                    <div className={`chatv2-avatar ${contacto.es_admin ? 'admin' : 'docente'}`}>
                      {getIniciales(contacto.nombre_completo)}
                      {contacto.mensajes_no_leidos > 0 && (
                        <span className="chatv2-avatar-badge"></span>
                      )}
                    </div>
                    <div className="chatv2-list-item-info">
                      <div className="chatv2-list-item-header">
                        <span className="chatv2-list-item-name">
                          {contacto.nombre_completo}
                          {contacto.es_admin === 1 && <span className="chatv2-tag admin">Admin</span>}
                        </span>
                      </div>
                      <div className="chatv2-list-item-preview">
                        <span className="chatv2-list-item-role" style={{ fontSize: '11px', color: '#64748b' }}>
                          {contacto.tipo === 'administrador' ? 'Administración' : (contacto.asignaturas || 'Docente General')}
                        </span>
                      </div>
                    </div>
                    {contacto.mensajes_no_leidos > 0 && (
                      <span className="chatv2-unread-badge">{contacto.mensajes_no_leidos}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Columna 3: Area de Chat */}
          <div className={`chatv2-chat ${mostrarListaMobile ? 'hidden-mobile' : ''}`}>

            {contactoActual ? (
              <>
                {/* Header del Chat */}
                <div className="chatv2-chat-header">
                  <button className="chatv2-back-btn" onClick={volverALista}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <div className={`chatv2-avatar small ${contactoActual.es_admin ? 'admin' : 'docente'}`}>
                    {getIniciales(contactoActual.nombre_completo)}
                  </div>
                  <div className="chatv2-chat-header-info">
                    <span className="chatv2-chat-header-name">{contactoActual.nombre_completo}</span>
                    <span className="chatv2-chat-header-status">
                      {!respuestaHabilitada ? 'Respuestas bloqueadas' : 'En línea'}
                    </span>
                  </div>
                  <div className="chatv2-chat-header-actions">
                    <button
                      className="chatv2-cancel-masivo"
                      onClick={volverALista}
                      title="Cerrar chat"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Area de Mensajes */}
                <div className="chatv2-messages" ref={mensajesRef}>
                  {cargandoMensajes ? (
                    <div className="chatv2-loading">
                      <div className="chatv2-spinner"></div>
                      <span>Cargando mensajes...</span>
                    </div>
                  ) : mensajes.length === 0 ? (
                    <div className="chatv2-empty-chat">
                      <p>Inicia la conversación con {contactoActual.nombre_completo} para tu pupilo {pupiloSeleccionado?.nombres}.</p>
                    </div>
                  ) : (
                    mensajes.map((msg, index) => {
                      const mostrarFecha = index === 0 ||
                        formatearFechaSeparador(msg.fecha_envio) !== formatearFechaSeparador(mensajes[index - 1]?.fecha_envio);

                      return (
                        <React.Fragment key={msg.id}>
                          {mostrarFecha && (
                            <div className="chatv2-date-separator">
                              <span>{formatearFechaSeparador(msg.fecha_envio)}</span>
                            </div>
                          )}
                          <div className={`chatv2-message ${msg.direccion} ${msg.enviando ? 'sending' : ''} ${msg.error ? 'error' : ''}`}>
                            <div className="chatv2-message-bubble">
                              <p>{msg.mensaje}</p>
                              <div className="chatv2-message-meta">
                                <span className="chatv2-message-time">{formatearHora(msg.fecha_envio)}</span>
                                {msg.enviando && <span className="chatv2-message-sending">...</span>}
                                {msg.error && <span className="chatv2-message-error" title="No enviado">!</span>}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}

                  {!respuestaHabilitada && (
                    <div style={{
                      textAlign: 'center',
                      margin: '10px 20px',
                      padding: '10px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}>
                      🚫 El docente ha cerrado las respuestas en esta conversación.
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input de Mensaje */}
                <div className="chatv2-input-area">
                  <div className="chatv2-input-wrapper">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={respuestaHabilitada ? "Escribe un mensaje..." : "Respuestas deshabilitadas"}
                      value={mensajeInput}
                      onChange={(e) => setMensajeInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEnviarMensaje()}
                      disabled={enviando || !respuestaHabilitada}
                      style={!respuestaHabilitada ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
                    />
                  </div>
                  <button
                    className="chatv2-send-btn"
                    onClick={handleEnviarMensaje}
                    disabled={enviando || !mensajeInput.trim() || !respuestaHabilitada}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="chatv2-placeholder">
                <div className="chatv2-placeholder-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </div>
                <h3>Selecciona un contacto</h3>
                <p>Elige un docente de la lista para conversar.</p>
              </div>
            )}
          </div>
        </div>
      </div >

      <style>{`
        .chatv2-pupilo-info {
          padding: 8px 16px;
          background: #f0f9ff;
          border-bottom: 1px solid #e0f2fe;
          font-size: 12px;
          color: #0369a1;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .chatv2-avatar.docente {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }
      `}</style>
    </>
  );
}

export default ChatApoderado;
