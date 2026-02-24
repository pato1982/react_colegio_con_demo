import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useMensaje } from '../contexts';
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
  enviarMensajeMasivo,
  obtenerConversaciones
} from '../services/chatService';
import socketService from '../services/socketService';

function ChatDocenteV2({ usuario, establecimientoId }) {
  const { mostrarMensaje } = useMensaje();
  // Estados principales
  const [chatAbierto, setChatAbierto] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('institucional'); // institucional, cursos
  const [busqueda, setBusqueda] = useState('');

  // Estados de datos
  const [conversaciones, setConversaciones] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [alumnos, setAlumnos] = useState([]);

  // Estados de chat activo
  const [conversacionActual, setConversacionActual] = useState(null);
  const [contactoActual, setContactoActual] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [mensajeInput, setMensajeInput] = useState('');

  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [totalNoLeidos, setTotalNoLeidos] = useState(0);
  const [ultimoTimestamp, setUltimoTimestamp] = useState(null);
  const [respuestaHabilitada, setRespuestaHabilitada] = useState(false);

  // Estados para mensajes masivos y selección múltiple
  const [esMensajeMasivo, setEsMensajeMasivo] = useState(false);
  const [destinatariosMasivos, setDestinatariosMasivos] = useState([]);
  const [modoSeleccion, setModoSeleccion] = useState(false); // Modo de selección múltiple
  const [apoderadosSeleccionados, setApoderadosSeleccionados] = useState([]); // IDs de apoderados seleccionados

  // Estados de panel móvil
  const [mostrarListaMobile, setMostrarListaMobile] = useState(true);

  const mensajesRef = useRef(null);
  const messagesEndRef = useRef(null); // Nuevo ref para scroll
  const pollingRef = useRef(null);
  const inputRef = useRef(null);

  // Verificar permisos
  const puedeUsarChat = usuario &&
    (usuario.tipo === 'docente' || usuario.tipo === 'administrador' || usuario.tipo === 'admin');

  // Conteos para los botones de navegación (Equipo vs Cursos)
  const totalNoLeidosEquipo = React.useMemo(() => {
    return conversaciones
      .filter(c => c.otro_usuario?.tipo_usuario !== 'apoderado')
      .reduce((acc, c) => acc + (c.mensajes_no_leidos || 0), 0);
  }, [conversaciones]);

  const totalNoLeidosCursos = React.useMemo(() => {
    return conversaciones
      .filter(c => c.otro_usuario?.tipo_usuario === 'apoderado')
      .reduce((acc, c) => acc + (c.mensajes_no_leidos || 0), 0);
  }, [conversaciones]);

  // ==================== CARGA DE DATOS ====================

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

  const cargarCursos = useCallback(async () => {
    if (!usuario?.id || !establecimientoId) return;
    try {
      const resultado = await obtenerCursosDocente(usuario.id, establecimientoId);
      if (resultado.success) {
        setCursos(resultado.data || []);
      }
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    }
  }, [usuario?.id, establecimientoId]);

  const cargarConversaciones = useCallback(async () => {
    if (!usuario?.id || !establecimientoId) return;
    try {
      const resultado = await obtenerConversaciones(usuario.id, establecimientoId);
      if (resultado.success) {
        setConversaciones(resultado.data || []);
      }
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
    }
  }, [usuario?.id, establecimientoId]);

  const cargarContactos = useCallback(async () => {
    if (!usuario?.id || !establecimientoId) return;
    try {
      const resultado = await obtenerContactos(usuario.id, establecimientoId);
      if (resultado.success) {
        setContactos(resultado.data || []);
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error);
    }
  }, [usuario?.id, establecimientoId]);

  const cargarAlumnos = async (cursoId) => {
    setCargando(true);
    setAlumnos([]);
    setApoderadosSeleccionados([]); // Limpiar selección al cambiar de curso
    setModoSeleccion(false);
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

  const cargarMensajes = useCallback(async (conversacionId) => {
    if (!conversacionId || !usuario?.id) return;
    setCargando(true);
    try {
      const resultado = await obtenerMensajes(conversacionId, usuario.id);
      if (resultado.success) {
        setMensajes(resultado.data || []);
        await marcarConversacionLeida(conversacionId, usuario.id);

        // Actualizar contadores inmediatamente
        actualizarNoLeidos();
        cargarCursos();

        setConversaciones(prev => prev.map(c =>
          String(c.id) === String(conversacionId) ? { ...c, mensajes_no_leidos: 0 } : c
        ));

        setUltimoTimestamp(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    } finally {
      setCargando(false);
    }
  }, [usuario?.id, actualizarNoLeidos, cargarCursos]);

  // ==================== POLLING ====================

  const verificarNuevosMensajes = useCallback(async () => {
    if (!usuario?.id || !establecimientoId || !chatAbierto) return;

    const idConv = Number(conversacionActual);
    const esConversacionValida = idConv && !isNaN(idConv) && idConv > 0;

    // ESTRATEGIA OPTIMIZADA (SYNC REAL-TIME):
    if (esConversacionValida) {
      try {
        // Calcular el último ID que tenemos para pedir solo deltas
        const obtenerMaxId = () => {
          if (!mensajes || mensajes.length === 0) return 0;
          const ids = mensajes.map(m => Number(m.id)).filter(id => !isNaN(id) && id > 0);
          return ids.length > 0 ? Math.max(...ids) : 0;
        };

        const ultimoId = obtenerMaxId();

        // Pedir solo mensajes nuevos (sinceId)
        const resultado = await obtenerMensajes(idConv, usuario.id, 50, 0, ultimoId);

        if (resultado.success && resultado.data && resultado.data.length > 0) {
          const nuevosMensajes = resultado.data;

          setMensajes(prev => {
            const idsLocales = new Set(prev.map(m => String(m.id)));
            const realmenteNuevos = nuevosMensajes.filter(m => !idsLocales.has(String(m.id)));

            if (realmenteNuevos.length === 0) return prev;

            return [...prev, ...realmenteNuevos].sort((a, b) =>
              new Date(a.fecha_envio) - new Date(b.fecha_envio)
            );
          });

          const tengoNuevosRecibidos = nuevosMensajes.some(m =>
            m.direccion === 'recibido' && m.leido === 0
          );

          if (tengoNuevosRecibidos) {
            await marcarConversacionLeida(idConv, usuario.id);
            actualizarNoLeidos();
          }
        }
      } catch (error) {
        console.error('Error sync chat:', error);
      }
    } else {
      // Si solo estoy en la lista (chat abierto pero sin conversación seleccionada),
      // chequear nuevos mensajes generales para actualizar orden y badges rápidamente.
      try {
        const res = await obtenerNuevosMensajes(usuario.id, establecimientoId, ultimoTimestamp);
        if (res.success && res.data?.length > 0) {
          actualizarNoLeidos();
          cargarConversaciones();
          if (res.timestamp) setUltimoTimestamp(res.timestamp);
        }
      } catch (e) { console.error('Error polling lista:', e); }
    }
  }, [usuario?.id, establecimientoId, chatAbierto, conversacionActual, actualizarNoLeidos, ultimoTimestamp, mensajes]);

  // ==================== SOCKET.IO ====================
  useEffect(() => {
    if (chatAbierto && usuario?.id) {
      const socket = socketService.connect(usuario.id);

      const handleNuevoMensaje = (msg) => {
        // Si el mensaje es para la conversación actual abierta Y el chat está visible
        if (conversacionActual && String(msg.conversacion_id) === String(conversacionActual)) {
          setMensajes(prev => {
            // Evitar duplicados
            if (prev.some(m => String(m.id) === String(msg.id))) return prev;
            return [...prev, msg];
          });

          // Si lo recibimos nosotros y estamos viendo el chat, marcarlo leído
          if (msg.direccion === 'recibido') {
            marcarConversacionLeida(conversacionActual, usuario.id);
          }

          // Scroll
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);

        } else {
          // === ES DE OTRA CONVERSACIÓN O ESTAMOS EN LA LISTA ===

          // 1. Badge Global
          if (msg.direccion === 'recibido') {
            setTotalNoLeidos(prev => prev + 1);
            actualizarNoLeidos();
            // Audio opcional
          }

          // 2. Actualizar lista de Conversaciones (mover al top)
          setConversaciones(prevConvs => {
            const index = prevConvs.findIndex(c => String(c.id) === String(msg.conversacion_id));
            if (index >= 0) {
              const existe = prevConvs[index];
              const actualizada = {
                ...existe,
                ultimo_mensaje: msg.mensaje,
                ultimo_mensaje_fecha: msg.fecha_envio || new Date().toISOString(),
                mensajes_no_leidos: msg.direccion === 'recibido' ? (existe.mensajes_no_leidos || 0) + 1 : existe.mensajes_no_leidos
              };
              const nuevaLista = [...prevConvs];
              nuevaLista.splice(index, 1);
              return [actualizada, ...nuevaLista];
            } else {
              cargarConversaciones(); // Nueva conversación, recargar
              return prevConvs;
            }
          });

          // 3. Actualizar lista de Contactos (badges individuales) y conteos
          if (msg.direccion === 'recibido') {
            setContactos(prevContactos =>
              prevContactos.map(c => {
                const idUser = c.usuario_id || c.apoderado_usuario_id;
                if (idUser && String(idUser) === String(msg.remitente_id)) {
                  return { ...c, mensajes_no_leidos: (c.mensajes_no_leidos || 0) + 1 };
                }
                return c;
              })
            );

            // Refrescar conversaciones y cursos para actualizar los badges de las pestañas
            cargarConversaciones();
            cargarCursos();
          }
        }
      };

      const handleEstadoActualizado = (data) => {
        if (conversacionActual && String(data.conversacion_id) === String(conversacionActual)) {
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
  }, [usuario?.id, conversacionActual, chatAbierto]);

  // ==================== EFECTOS ====================

  useEffect(() => {
    if (chatAbierto && puedeUsarChat) {
      cargarContactos();
      cargarCursos();
      cargarConversaciones();
      actualizarNoLeidos();
    }
  }, [chatAbierto, puedeUsarChat, cargarContactos, cargarCursos, cargarConversaciones, actualizarNoLeidos]);

  useEffect(() => {
    if (chatAbierto && puedeUsarChat) {
      // Polling de respaldo (Intervalo largo porque usamos Sockets)
      pollingRef.current = setInterval(verificarNuevosMensajes, 30000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [chatAbierto, puedeUsarChat, verificarNuevosMensajes]);

  useEffect(() => {
    if (puedeUsarChat) {
      actualizarNoLeidos();
      // Polling de fondo (chat cerrado) mucho más rápido para alertas
      const interval = setInterval(actualizarNoLeidos, 5000);
      return () => clearInterval(interval);
    }
  }, [puedeUsarChat, actualizarNoLeidos]);

  // useEffect para scroll al final
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

  useEffect(() => {
    if (contactoActual && inputRef.current) {
      inputRef.current.focus();
    }
  }, [contactoActual]);

  // ==================== HANDLERS ====================

  const toggleChat = () => {
    setChatAbierto(!chatAbierto);
    if (!chatAbierto) {
      setContactoActual(null);
      setConversacionActual(null);
      setMensajes([]);
      setCursoSeleccionado(null);
      setMostrarListaMobile(true);
      setModoSeleccion(false);
      setApoderadosSeleccionados([]);
    }
  };

  const seleccionarContacto = async (contacto, tipo = 'institucional') => {
    // Si estamos en modo selección, no abrir chat individual
    if (modoSeleccion) return;

    // Obtener el ID del usuario destinatario
    const destinatarioId = contacto.usuario_id || contacto.apoderado_usuario_id;

    // Si no tiene cuenta de usuario, mostrar mensaje informativo
    if (!destinatarioId) {
      mostrarMensaje('Este apoderado aún no tiene cuenta de usuario registrada', 'info');
      return;
    }

    // Resetear estado anterior
    setConversacionActual(null);
    setRespuestaHabilitada(false);

    const nombreMostrar = contacto.nombre_completo || contacto.nombre_apoderado || contacto.nombre_alumno;

    setContactoActual({
      ...contacto,
      nombre_completo: nombreMostrar,
      tipoContacto: tipo
    });
    setEsMensajeMasivo(false);
    setMostrarListaMobile(false);
    setCargando(true);

    try {
      const resultado = await crearConversacion(
        usuario.id,
        destinatarioId,
        establecimientoId
      );

      if (resultado.success) {
        setConversacionActual(resultado.data.id);
        if (resultado.data.respuesta_habilitada !== undefined) {
          setRespuestaHabilitada(resultado.data.respuesta_habilitada === 1);
        } else {
          setRespuestaHabilitada(false);
        }
        await cargarMensajes(resultado.data.id);
        actualizarNoLeidos();
      } else {
        console.error('Error creando conversación:', resultado.error);
        mostrarMensaje('Error al abrir la conversación', 'error');
      }
    } catch (error) {
      console.error('Error al seleccionar contacto:', error);
      mostrarMensaje('Error al abrir la conversación', 'error');
    } finally {
      setCargando(false);
    }
  };

  const seleccionarCurso = (curso) => {
    setCursoSeleccionado(curso);
    cargarAlumnos(curso.id);
  };

  // Toggle selección de un apoderado
  const toggleSeleccionApoderado = (alumno) => {
    const apoderadoId = alumno.apoderado_usuario_id || `alumno_${alumno.alumno_id}`;

    setApoderadosSeleccionados(prev => {
      if (prev.find(a => a.id === apoderadoId)) {
        return prev.filter(a => a.id !== apoderadoId);
      } else {
        return [...prev, {
          id: apoderadoId,
          nombre_alumno: alumno.nombre_alumno,
          nombre_apoderado: alumno.nombre_apoderado,
          apoderado_activo: alumno.apoderado_activo
        }];
      }
    });
  };

  // Seleccionar todos los apoderados
  const seleccionarTodosApoderados = () => {
    if (apoderadosSeleccionados.length === alumnos.length) {
      // Si ya están todos seleccionados, deseleccionar todos
      setApoderadosSeleccionados([]);
    } else {
      // Seleccionar todos
      setApoderadosSeleccionados(alumnos.map(a => ({
        id: a.apoderado_usuario_id || `alumno_${a.alumno_id}`,
        nombre_alumno: a.nombre_alumno,
        nombre_apoderado: a.nombre_apoderado,
        apoderado_activo: a.apoderado_activo
      })));
    }
  };

  // Iniciar mensaje a seleccionados (puede ser uno, varios o todos)
  const iniciarMensajeASeleccionados = () => {
    if (apoderadosSeleccionados.length === 0) return;

    const ids = apoderadosSeleccionados.map(a => a.id);
    setDestinatariosMasivos(ids);

    if (apoderadosSeleccionados.length === 1) {
      // Si es solo uno, buscar el alumno y abrir chat individual
      const alumno = alumnos.find(a => a.apoderado_usuario_id === ids[0]);
      if (alumno) {
        setModoSeleccion(false);
        setApoderadosSeleccionados([]);
        seleccionarContacto(alumno, 'apoderado');
        return;
      }
    }

    // Mensaje a múltiples destinatarios
    setEsMensajeMasivo(true);
    const nombresAlumnos = apoderadosSeleccionados.map(a => a.nombre_alumno);
    let titulo = '';
    if (apoderadosSeleccionados.length === alumnos.length) {
      titulo = `${cursoSeleccionado.grado}° ${cursoSeleccionado.letra} - Todos (${alumnos.length})`;
    } else {
      titulo = `${cursoSeleccionado.grado}° ${cursoSeleccionado.letra} - ${apoderadosSeleccionados.length} seleccionados`;
    }

    setContactoActual({
      nombre_completo: titulo,
      tipo: 'masivo',
      tipoContacto: 'masivo',
      detalleDestinatarios: nombresAlumnos
    });
    setConversacionActual('masivo');
    setMensajes([]);
    setMostrarListaMobile(false);
    setModoSeleccion(false);
  };

  // Cancelar modo selección
  const cancelarModoSeleccion = () => {
    setModoSeleccion(false);
    setApoderadosSeleccionados([]);
  };

  const handleEnviarMensaje = async () => {
    if (!mensajeInput.trim() || !conversacionActual || enviando) return;

    const textoMensaje = mensajeInput.trim();
    setMensajeInput('');
    setEnviando(true);

    const mensajeOptimista = {
      id: `temp-${Date.now()}`,
      mensaje: textoMensaje,
      direccion: 'enviado',
      fecha_envio: new Date().toISOString(),
      enviando: true
    };
    setMensajes(prev => [...prev, mensajeOptimista]);

    try {
      let resultado;
      if (esMensajeMasivo) {
        resultado = await enviarMensajeMasivo(
          usuario.id,
          destinatariosMasivos,
          textoMensaje,
          establecimientoId,
          respuestaHabilitada
        );
      } else {
        resultado = await enviarMensaje(conversacionActual, usuario.id, textoMensaje);
      }
      if (resultado.success) {
        setMensajes(prev => prev.map(m =>
          m.id === mensajeOptimista.id
            ? { ...(resultado.data || m), direccion: 'enviado', enviando: false }
            : m
        ));
        setUltimoTimestamp(new Date().toISOString());
        cargarConversaciones();
      } else {
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
    const nuevoEstado = !respuestaHabilitada;
    setRespuestaHabilitada(nuevoEstado);

    // Para mensajes masivos, el estado se aplicará cuando se envíe el mensaje
    if (esMensajeMasivo || conversacionActual === 'masivo') {
      return;
    }

    // Para chat individual, actualizar en el servidor
    if (!conversacionActual) {
      console.warn('No hay conversación activa para cambiar estado');
      return;
    }

    try {
      const resultado = await habilitarRespuesta(conversacionActual, nuevoEstado);
      if (!resultado.success) {
        console.error('Error al cambiar estado:', resultado.error);
        setRespuestaHabilitada(!nuevoEstado);
      }
    } catch (error) {
      console.error('Error al cambiar estado de respuesta:', error);
      setRespuestaHabilitada(!nuevoEstado);
    }
  };

  const volverALista = () => {
    setContactoActual(null);
    setConversacionActual(null);
    setMensajes([]);
    setMostrarListaMobile(true);
    setApoderadosSeleccionados([]);
    setEsMensajeMasivo(false);
    setDestinatariosMasivos([]);
    setRespuestaHabilitada(false);
  };

  // ==================== HELPERS ====================

  const formatearHora = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatearFechaRelativa = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (date.toDateString() === hoy.toDateString()) {
      return formatearHora(fecha);
    } else if (date.toDateString() === ayer.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    }
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

  // Filtrar lista según vista y búsqueda
  const getListaFiltrada = () => {
    let lista = contactos.map(c => ({
      ...c,
      tipo_lista: 'institucional'
    }));

    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      lista = lista.filter(item =>
        (item.nombre_completo || '').toLowerCase().includes(busquedaLower)
      );
    }

    // Asegurar que administradores aparezcan primero
    return lista.sort((a, b) => {
      // 1. Prioridad Admin
      if (a.es_admin && !b.es_admin) return -1;
      if (!a.es_admin && b.es_admin) return 1;

      // 2. Prioridad con mensajes no leídos
      if (a.mensajes_no_leidos > 0 && b.mensajes_no_leidos === 0) return -1;
      if (a.mensajes_no_leidos === 0 && b.mensajes_no_leidos > 0) return 1;

      // 3. Orden alfabético
      return (a.nombre_completo || '').localeCompare(b.nombre_completo || '');
    });
  };

  // Verificar si un apoderado está seleccionado
  const estaSeleccionado = (alumno) => {
    const id = alumno.apoderado_usuario_id || `alumno_${alumno.alumno_id}`;
    return apoderadosSeleccionados.some(a => a.id === id);
  };

  // ==================== RENDER ====================

  if (!puedeUsarChat) return null;

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
            <span className="chatv2-header-title">Mensajes</span>
            {totalNoLeidos > 0 && (
              <span className="chatv2-header-badge">{totalNoLeidos}</span>
            )}
          </div>
          <button className="chatv2-close-btn" onClick={toggleChat}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Contenido Principal - 3 columnas */}
        <div className="chatv2-content">

          {/* Columna 1: Navegación */}
          <div className={`chatv2-nav ${!mostrarListaMobile ? 'hidden-mobile' : ''}`}>
            <button
              className={`chatv2-nav-item ${vistaActiva === 'institucional' ? 'active' : ''}`}
              onClick={() => { setVistaActiva('institucional'); setCursoSeleccionado(null); setModoSeleccion(false); }}
              title="Equipo"
            >
              <div className="chatv2-nav-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                {totalNoLeidosEquipo > 0 && <span className="chatv2-nav-badge">{totalNoLeidosEquipo}</span>}
              </div>
              <span>Equipo</span>
            </button>
            <button
              className={`chatv2-nav-item ${vistaActiva === 'cursos' ? 'active' : ''}`}
              onClick={() => { setVistaActiva('cursos'); setModoSeleccion(false); }}
              title="Cursos"
            >
              <div className="chatv2-nav-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                {totalNoLeidosCursos > 0 && <span className="chatv2-nav-badge">{totalNoLeidosCursos}</span>}
              </div>
              <span>Cursos</span>
            </button>
          </div>

          {/* Columna 2: Lista de Contactos/Conversaciones */}
          <div className={`chatv2-list ${!mostrarListaMobile ? 'hidden-mobile' : ''}`}>

            {/* Barra de búsqueda */}
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

            {/* Lista según vista activa */}
            <div className="chatv2-list-items">

              {/* Vista: Equipo (Docentes y Admins) */}
              {vistaActiva === 'institucional' && (
                <>
                  {cargando ? (
                    <div className="chatv2-loading">
                      <div className="chatv2-spinner"></div>
                      <span>Cargando...</span>
                    </div>
                  ) : getListaFiltrada().length === 0 ? (
                    <div className="chatv2-empty-list">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                      </svg>
                      <span>Sin contactos</span>
                    </div>
                  ) : (
                    getListaFiltrada().map(contacto => (
                      <div
                        key={contacto.usuario_id}
                        className={`chatv2-list-item ${contactoActual?.usuario_id === contacto.usuario_id ? 'active' : ''}`}
                        onClick={() => seleccionarContacto(contacto)}
                      >
                        <div className={`chatv2-avatar ${contacto.es_admin ? 'admin' : ''}`}>
                          {contacto.foto_url ? (
                            <img src={contacto.foto_url} alt="" />
                          ) : (
                            getIniciales(contacto.nombre_completo)
                          )}
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
                            <span className="chatv2-list-item-time">
                              {contacto.ultimo_mensaje_fecha && formatearFechaRelativa(contacto.ultimo_mensaje_fecha)}
                            </span>
                          </div>
                          <div className="chatv2-list-item-preview">
                            <span className="chatv2-list-item-role">
                              {contacto.tipo === 'administrador' ? 'Administración' : 'Docente'}
                            </span>
                          </div>
                        </div>
                        {contacto.mensajes_no_leidos > 0 && (
                          <span className="chatv2-unread-badge">{contacto.mensajes_no_leidos}</span>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Vista: Cursos */}
              {vistaActiva === 'cursos' && (
                <>
                  {cursoSeleccionado ? (
                    <>
                      {/* Header con botón volver y acciones */}
                      <div className="chatv2-curso-header">
                        <div className="chatv2-list-back" onClick={() => { setCursoSeleccionado(null); setModoSeleccion(false); setApoderadosSeleccionados([]); }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                          <span>Volver</span>
                        </div>
                        <div className="chatv2-curso-titulo">
                          {cursoSeleccionado.grado}° {cursoSeleccionado.letra}
                        </div>
                      </div>

                      {/* Barra de acciones de selección */}
                      <div className="chatv2-seleccion-bar">
                        {!modoSeleccion ? (
                          <button
                            className="chatv2-btn-seleccionar"
                            onClick={() => setModoSeleccion(true)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <polyline points="9 11 12 14 22 4"></polyline>
                            </svg>
                            Seleccionar destinatarios
                          </button>
                        ) : (
                          <div className="chatv2-seleccion-acciones">
                            <button
                              className={`chatv2-btn-todos ${apoderadosSeleccionados.length === alumnos.length ? 'active' : ''}`}
                              onClick={seleccionarTodosApoderados}
                            >
                              {apoderadosSeleccionados.length === alumnos.length
                                ? 'Deseleccionar todos'
                                : 'Seleccionar todos'}
                            </button>
                            <span className="chatv2-seleccion-count">
                              {apoderadosSeleccionados.length} seleccionado{apoderadosSeleccionados.length !== 1 ? 's' : ''}
                            </span>
                            <button className="chatv2-btn-cancelar" onClick={cancelarModoSeleccion}>
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Botón escribir mensaje a seleccionados */}
                      {modoSeleccion && apoderadosSeleccionados.length > 0 && (
                        <div className="chatv2-enviar-seleccionados">
                          <button
                            className="chatv2-btn-enviar-grupo"
                            onClick={iniciarMensajeASeleccionados}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="22" y1="2" x2="11" y2="13"></line>
                              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                            Escribir mensaje a {apoderadosSeleccionados.length} apoderado{apoderadosSeleccionados.length !== 1 ? 's' : ''}
                          </button>
                        </div>
                      )}

                      {/* Lista de alumnos */}
                      {cargando ? (
                        <div className="chatv2-loading">
                          <div className="chatv2-spinner"></div>
                        </div>
                      ) : alumnos.length === 0 ? (
                        <div className="chatv2-empty-list">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                          </svg>
                          <span>Sin alumnos en este curso</span>
                        </div>
                      ) : (
                        alumnos.map(alumno => (
                          <div
                            key={alumno.alumno_id}
                            className={`chatv2-list-item alumno ${modoSeleccion ? 'selectable' : ''} ${estaSeleccionado(alumno) ? 'selected' : ''} ${contactoActual?.apoderado_usuario_id === alumno.apoderado_usuario_id ? 'active' : ''}`}
                            onClick={() => {
                              if (modoSeleccion) {
                                toggleSeleccionApoderado(alumno);
                              } else {
                                seleccionarContacto(alumno, 'apoderado');
                              }
                            }}
                          >
                            {/* Checkbox en modo selección */}
                            {modoSeleccion && (
                              <div className={`chatv2-checkbox ${estaSeleccionado(alumno) ? 'checked' : ''}`}>
                                {estaSeleccionado(alumno) && (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </div>
                            )}
                            <div
                              className="chatv2-avatar estudiante"
                              style={alumno.chat_habilitado === 1 ? { border: '3px solid #ef4444' } : {}}
                              title={alumno.chat_habilitado === 1 ? "Respuesta habilitada" : ""}
                            >
                              {getIniciales(alumno.nombre_alumno)}
                            </div>
                            <div className="chatv2-list-item-info">
                              <div className="chatv2-list-item-header">
                                <span className="chatv2-list-item-name">{alumno.nombre_alumno}</span>
                              </div>
                              <div className="chatv2-list-item-preview">
                                <span>
                                  Apod: {alumno.nombre_apoderado}
                                  {!alumno.apoderado_activo && <span style={{ color: '#ef4444', marginLeft: '4px', fontSize: '0.85em' }}>(No App)</span>}
                                </span>
                              </div>
                            </div>
                            {!modoSeleccion && alumno.mensajes_no_leidos > 0 && (
                              <span className="chatv2-unread-badge">{alumno.mensajes_no_leidos}</span>
                            )}
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    <>
                      {/* Lista de cursos */}
                      {cargando ? (
                        <div className="chatv2-loading">
                          <div className="chatv2-spinner"></div>
                        </div>
                      ) : cursos.length === 0 ? (
                        <div className="chatv2-empty-list">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                          </svg>
                          <span>Sin cursos asignados</span>
                        </div>
                      ) : cursos.map(curso => (
                        <div
                          key={curso.id}
                          className="chatv2-list-item curso"
                          onClick={() => seleccionarCurso(curso)}
                        >
                          <div className="chatv2-avatar curso">
                            {curso.grado}°{curso.letra}
                            {curso.mensajes_no_leidos > 0 && (
                              <span className="chatv2-avatar-badge" style={{ backgroundColor: '#ef4444' }}></span>
                            )}
                          </div>
                          <div className="chatv2-list-item-info">
                            <div className="chatv2-list-item-header">
                              <span className="chatv2-list-item-name">{curso.grado}° {curso.letra}</span>
                            </div>
                            <div className="chatv2-list-item-preview">
                              <span>{curso.nivel} - {curso.nombre}</span>
                            </div>
                          </div>
                          {curso.mensajes_no_leidos > 0 && (
                            <span className="chatv2-unread-badge">{curso.mensajes_no_leidos}</span>
                          )}
                          <svg className="chatv2-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Columna 3: Área de Chat */}
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
                  <div className={`chatv2-avatar small ${contactoActual.tipoContacto === 'masivo' ? 'masivo' : ''}`}>
                    {contactoActual.tipoContacto === 'masivo' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    ) : (
                      getIniciales(contactoActual.nombre_completo)
                    )}
                  </div>
                  <div className="chatv2-chat-header-info">
                    <span className="chatv2-chat-header-name">{contactoActual.nombre_completo}</span>
                    {esMensajeMasivo ? (
                      <div className="chatv2-destinatarios-tags">
                        {apoderadosSeleccionados.slice(0, 5).map(sel => (
                          <span key={sel.id} className="chatv2-dest-tag">
                            {sel.nombre_alumno}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const nuevosSeleccionados = apoderadosSeleccionados.filter(a => a.id !== sel.id);
                                setApoderadosSeleccionados(nuevosSeleccionados);
                                if (nuevosSeleccionados.length === 0) {
                                  volverALista();
                                } else if (nuevosSeleccionados.length === 1) {
                                  // Si queda solo uno, abrir chat individual
                                  const alumno = alumnos.find(a =>
                                    (a.apoderado_usuario_id || `alumno_${a.alumno_id}`) === nuevosSeleccionados[0].id
                                  );
                                  if (alumno && alumno.apoderado_usuario_id) {
                                    setApoderadosSeleccionados([]);
                                    seleccionarContacto(alumno, 'apoderado');
                                  }
                                } else {
                                  // Actualizar destinatarios masivos
                                  setDestinatariosMasivos(nuevosSeleccionados.map(a => a.id));
                                  setContactoActual(prev => ({
                                    ...prev,
                                    nombre_completo: `${cursoSeleccionado.grado}° ${cursoSeleccionado.letra} - ${nuevosSeleccionados.length} seleccionados`,
                                    detalleDestinatarios: nuevosSeleccionados.map(a => a.nombre_alumno)
                                  }));
                                }
                              }}
                            >×</button>
                          </span>
                        ))}
                        {apoderadosSeleccionados.length > 5 && (
                          <span className="chatv2-dest-more">+{apoderadosSeleccionados.length - 5} más</span>
                        )}
                      </div>
                    ) : (
                      <span className="chatv2-chat-header-status">{contactoActual.tipo || 'Chat'}</span>
                    )}
                  </div>

                  {/* Acciones del header */}
                  <div className="chatv2-chat-header-actions">
                    {(esMensajeMasivo || contactoActual.tipoContacto === 'apoderado') && (
                      <div className="chatv2-toggle-wrapper" title="Permitir respuestas del apoderado">
                        <span className={`chatv2-toggle-label ${respuestaHabilitada ? 'activo' : 'inactivo'}`}>
                          {respuestaHabilitada ? 'Activado' : 'Desactivado'}
                        </span>
                        <button
                          className={`chatv2-toggle ${respuestaHabilitada ? 'active' : ''}`}
                          onClick={toggleRespuestaHabilitada}
                        >
                          <span className="chatv2-toggle-slider"></span>
                        </button>
                      </div>
                    )}
                    {/* Botón X para cerrar/cancelar chat - siempre visible */}
                    <button
                      className="chatv2-cancel-masivo"
                      onClick={() => {
                        setApoderadosSeleccionados([]);
                        volverALista();
                      }}
                      title="Cerrar chat"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Área de Mensajes */}
                <div className="chatv2-messages" ref={mensajesRef}>
                  {cargando ? (
                    <div className="chatv2-loading">
                      <div className="chatv2-spinner"></div>
                      <span>Cargando mensajes...</span>
                    </div>
                  ) : mensajes.length === 0 ? (
                    <div className="chatv2-empty-chat">
                      <div className="chatv2-empty-chat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </div>
                      <p>Inicia la conversación</p>
                      <span>
                        {esMensajeMasivo
                          ? `Envía un mensaje a ${destinatariosMasivos.length} apoderados`
                          : `Envía un mensaje a ${contactoActual.nombre_completo.split(' ')[0]}`
                        }
                      </span>
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
                                {msg.direccion === 'enviado' && !msg.enviando && !msg.error && (
                                  <span className="chatv2-message-status">
                                    {msg.leido === 1 ? (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                        <polyline points="20 12 9 23 4 18"></polyline>
                                      </svg>
                                    ) : (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    )}
                                  </span>
                                )}
                                {msg.enviando && (
                                  <span className="chatv2-message-sending">
                                    <div className="chatv2-mini-spinner"></div>
                                  </span>
                                )}
                                {msg.error && (
                                  <span className="chatv2-message-error" title="Error al enviar">!</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input de Mensaje */}
                <div className="chatv2-input-area">
                  <div className="chatv2-input-wrapper">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={esMensajeMasivo ? `Mensaje para ${destinatariosMasivos.length} apoderados...` : "Escribe un mensaje..."}
                      value={mensajeInput}
                      onChange={(e) => setMensajeInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEnviarMensaje()}
                      disabled={enviando}
                    />
                  </div>
                  <button
                    className="chatv2-send-btn"
                    onClick={handleEnviarMensaje}
                    disabled={enviando || !mensajeInput.trim()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              /* Placeholder cuando no hay chat seleccionado */
              <div className="chatv2-placeholder">
                <div className="chatv2-placeholder-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </div>
                <h3>Selecciona una conversación</h3>
                <p>Elige un contacto del panel izquierdo para comenzar a chatear</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatDocenteV2;
