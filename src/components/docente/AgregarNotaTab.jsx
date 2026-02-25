import React, { useState, useEffect, useMemo } from 'react';
import { useResponsive, useDropdown } from '../../hooks';
import { SelectNativo, SelectMovil, AutocompleteAlumno } from './shared';
import { ordenarCursos } from './shared/utils';
import { apiFetch } from '../../utils/api';
import { getPeriodos } from '../../utils/periodos';
// Demo data removed

// Simple Error Boundary for this component
class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error en AgregarNotaTab:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', border: '1px solid red' }}>
          <h3>Error crítico en el componente</h3>
          <p>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ maxWidth: '100%', overflow: 'auto' }}>{this.state.error && this.state.error.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function AgregarNotaTabInternal({ docenteId, establecimientoId, usuarioId, modalidad }) {
  const periodos = useMemo(() => getPeriodos(modalidad), [modalidad]);
  // Estados para datos cargados desde API
  const [cursos, setCursos] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [tiposEvaluacion, setTiposEvaluacion] = useState([]);
  const [notasRecientes, setNotasRecientes] = useState([]);

  // Estados del formulario
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [cursoNombre, setCursoNombre] = useState('');
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState('');
  const [asignaturaNombre, setAsignaturaNombre] = useState('');
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState('');
  const [trimestre, setTrimestre] = useState('');
  const [trimestreNombre, setTrimestreNombre] = useState('');
  const [tipoEvaluacion, setTipoEvaluacion] = useState('');
  const [tipoEvaluacionNombre, setTipoEvaluacionNombre] = useState('');
  const [nota, setNota] = useState('');
  const getFechaLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [fecha, setFecha] = useState(getFechaLocal());
  const [comentario, setComentario] = useState('');
  const [notaPendiente, setNotaPendiente] = useState(false);
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'fecha_creacion', direction: 'desc' });

  // Estados de carga
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [cargandoAsignaturas, setCargandoAsignaturas] = useState(false);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [cargandoNotas, setCargandoNotas] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados para filtros de notas recientes
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroCursoNombre, setFiltroCursoNombre] = useState('');
  const [filtroAlumno, setFiltroAlumno] = useState('');
  const [filtroAlumnoNombre, setFiltroAlumnoNombre] = useState('');
  const [alumnosFiltro, setAlumnosFiltro] = useState([]);

  const [pestanaActiva, setPestanaActiva] = useState('registro');
  const { isMobile, isTablet } = useResponsive();
  const showTabs = isMobile; // Solo móvil usa el selector de pestañas
  const isStacked = isMobile || isTablet; // Móvil y Tablet apilan las columnas
  const { dropdownAbierto, setDropdownAbierto } = useDropdown();

  // Formato dos líneas para móvil: apellidos arriba, nombres abajo
  const formatNombreMovil = (alumno) => {
    if (!alumno.id) return alumno.nombres; // "Todos"
    return (
      <span>
        <span style={{ fontWeight: 500 }}>{alumno.apellidos}</span>
        <br />
        <span style={{ fontSize: '11px', color: '#64748b' }}>{alumno.nombres}</span>
      </span>
    );
  };

  const trimestres = periodos.labelsFiltro.map(p => ({ id: String(p.id), nombre: p.nombre }));

  // Helpers de formateo
  const abreviarAsignatura = (nombre) => {
    if (!nombre) return '-';
    const mapping = {
      'Lenguaje': 'Len',
      'Lenguaje y Comunicación': 'Len y Com',
      'Matemática': 'Mat',
      'Matematicas': 'Mat',
      'Historia': 'Hist',
      'Historia, Geografía y Ciencias Sociales': 'Hist y Geo',
      'Ciencias Naturales': 'Cien Nat',
      'Biología': 'Biol',
      'Física': 'Fís',
      'Química': 'Quím',
      'Inglés': 'Ing',
      'Artes Visuales': 'Art',
      'Música': 'Mús',
      'Educación Física y Salud': 'Ed. Fís',
      'Tecnología': 'Tec',
      'Religión': 'Rel',
      'Orientación': 'Ori',
      'Filosofía': 'Filo'
    };

    // Buscar coincidencia exacta o parcial
    for (const [key, val] of Object.entries(mapping)) {
      if (nombre.includes(key)) return val;
    }

    // Si no hay mapping, devolver primeras 3-4 letras
    return nombre.length > 6 ? nombre.substring(0, 4) + '.' : nombre;
  };

  const formatearCurso = (nombre) => {
    if (!nombre) return '-';
    // Normalizar
    const upper = nombre.toUpperCase();

    // Extrar letra final (ej: "Cuarto Medio A" -> "A")
    // Logica: Si termina en espacio + letra unica
    let letra = '';
    const matchLetra = upper.match(/\s([A-Z])$/);
    if (matchLetra) {
      letra = matchLetra[1];
    }

    let nivel = '';
    // Detectar numeros escritos
    if (upper.includes('PRIMERO') || upper.includes('1RO')) nivel = '1°';
    else if (upper.includes('SEGUNDO') || upper.includes('2DO')) nivel = '2°';
    else if (upper.includes('TERCERO') || upper.includes('3RO')) nivel = '3°';
    else if (upper.includes('CUARTO') || upper.includes('4TO')) nivel = '4°';
    else if (upper.includes('QUINTO') || upper.includes('5TO')) nivel = '5°';
    else if (upper.includes('SEXTO') || upper.includes('6TO')) nivel = '6°';
    else if (upper.includes('SEPTIMO') || upper.includes('7MO')) nivel = '7°';
    else if (upper.includes('OCTAVO') || upper.includes('8VO')) nivel = '8°';
    else if (upper.includes('KINDER')) return 'Kinder ' + letra;
    else if (upper.includes('PRE')) return 'PK ' + letra;

    let ciclo = '';
    if (upper.includes('MEDIO') || upper.includes('MEDIA')) ciclo = 'M';
    else if (upper.includes('BASICO') || upper.includes('BASICA') || upper.includes('BÁSICO')) ciclo = 'B';

    if (nivel && ciclo) return `${nivel}${ciclo} ${letra}`;

    // Si falla la lógica anterior, intentar reemplazo directo simple
    let simple = upper.replace('MEDIO', 'M').replace('BASICO', 'B').replace('BÁSICO', 'B');
    return simple;
  };

  // Cargar cursos del docente
  useEffect(() => {
    const cargarCursos = async () => {
      try {
        const response = await apiFetch(`/docente/${docenteId}/cursos?establecimiento_id=${establecimientoId}`);
        const data = await response.json();
        if (data.success) {
          setCursos(ordenarCursos(data.data || []));
        }
      } catch (error) {
        console.error('Error cargando cursos:', error);
      } finally {
        setCargandoCursos(false);
      }
    };

    if (docenteId) cargarCursos();
  }, [docenteId, establecimientoId]);

  // Cargar tipos de evaluación
  useEffect(() => {
    const cargarTiposEvaluacion = async () => {
      if (!establecimientoId) return;
      try {
        const response = await apiFetch(`/tipos-evaluacion?establecimiento_id=${establecimientoId}`);
        const data = await response.json();
        if (data.success) {
          setTiposEvaluacion(data.data || []);
        }
      } catch (error) {
        console.error('Error cargando tipos de evaluación:', error);
      }
    };

    cargarTiposEvaluacion();
  }, [establecimientoId]);

  // Cargar asignaturas cuando se selecciona curso
  useEffect(() => {
    const cargarAsignaturas = async () => {
      if (!cursoSeleccionado) {
        setAsignaturas([]);
        return;
      }
      setCargandoAsignaturas(true);
      try {
        const response = await apiFetch(`/docente/${docenteId}/asignaturas-por-curso/${cursoSeleccionado}?establecimiento_id=${establecimientoId}`);
        const data = await response.json();
        if (data.success) {
          setAsignaturas(data.data || []);
        }
      } catch (error) {
        console.error('Error cargando asignaturas:', error);
      } finally {
        setCargandoAsignaturas(false);
      }
    };

    cargarAsignaturas();
  }, [cursoSeleccionado, docenteId, establecimientoId]);

  // Cargar alumnos cuando se selecciona curso
  useEffect(() => {
    const cargarAlumnos = async () => {
      if (!cursoSeleccionado) {
        setAlumnos([]);
        return;
      }

      setCargandoAlumnos(true);
      try {
        const response = await apiFetch(`/curso/${cursoSeleccionado}/alumnos`);
        const data = await response.json();
        if (data.success) {
          setAlumnos(data.data || []);
        }
      } catch (error) {
        console.error('Error cargando alumnos:', error);
      } finally {
        setCargandoAlumnos(false);
      }
    };

    cargarAlumnos();
  }, [cursoSeleccionado]);

  const cargarNotasRecientes = async (cursoId = null, alumnoId = null) => {
    if (!cursoId) {
      setNotasRecientes([]);
      return;
    }
    setCargandoNotas(true);
    try {
      let url = `/docente/${docenteId}/notas/buscar?establecimiento_id=${establecimientoId}&curso_id=${cursoId}`;
      if (alumnoId) url += `&alumno_id=${alumnoId}`;
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.success) {
        setNotasRecientes(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando notas recientes:', error);
    } finally {
      setCargandoNotas(false);
    }
  };

  // Cargar alumnos para filtro cuando se selecciona curso en filtros
  useEffect(() => {
    const cargarAlumnosFiltro = async () => {
      if (!filtroCurso) {
        setAlumnosFiltro([]);
        setFiltroAlumno('');
        setFiltroAlumnoNombre('');
        return;
      }

      try {
        const response = await apiFetch(`/curso/${filtroCurso}/alumnos`);
        const data = await response.json();
        if (data.success) {
          setAlumnosFiltro(data.data || []);
        }
      } catch (error) {
        console.error('Error cargando alumnos filtro:', error);
      }
    };

    cargarAlumnosFiltro();
  }, [filtroCurso]);

  // Auto-seleccionar primer curso en filtro para pre-cargar notas recientes
  useEffect(() => {
    if (cursos.length > 0 && !filtroCurso) {
      setFiltroCurso(String(cursos[0].id));
      setFiltroCursoNombre(cursos[0].nombre || '');
    }
  }, [cursos]);

  // Aplicar filtros a notas recientes
  useEffect(() => {
    cargarNotasRecientes(filtroCurso || null, filtroAlumno || null);
  }, [filtroCurso, filtroAlumno]);

  const handleCursoChange = (cursoId, nombre = '') => {
    setCursoSeleccionado(cursoId);
    setCursoNombre(nombre);
    setAsignaturaSeleccionada('');
    setAsignaturaNombre('');
    setAlumnoSeleccionado('');
    setBusquedaAlumno('');
  };

  const handleSeleccionarAlumno = (alumno) => {
    setAlumnoSeleccionado(alumno.id);
    setBusquedaAlumno(`${alumno.apellidos}, ${alumno.nombres}`);
  };

  const limpiarFormulario = () => {
    setCursoSeleccionado('');
    setCursoNombre('');
    setAsignaturaSeleccionada('');
    setAsignaturaNombre('');
    setAlumnoSeleccionado('');
    setTrimestre('');
    setTrimestreNombre('');
    setTipoEvaluacion('');
    setTipoEvaluacionNombre('');
    setNota('');
    setFecha(getFechaLocal());
    setComentario('');
    setNotaPendiente(false);
    setBusquedaAlumno('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cursoSeleccionado || !asignaturaSeleccionada || !alumnoSeleccionado || !trimestre) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (!notaPendiente && !nota) {
      alert('Debe ingresar una nota o marcar como pendiente');
      return;
    }

    if (!notaPendiente && (parseFloat(nota) < 1.0 || parseFloat(nota) > 7.0)) {
      alert('La nota debe estar entre 1.0 y 7.0');
      return;
    }

    setGuardando(true);

    try {
      const response = await apiFetch('/notas/registrar', {
        method: 'POST',
        body: JSON.stringify({
          establecimiento_id: establecimientoId,
          alumno_id: parseInt(alumnoSeleccionado),
          asignatura_id: parseInt(asignaturaSeleccionada),
          curso_id: parseInt(cursoSeleccionado),
          docente_id: docenteId,
          registrado_por: usuarioId,
          tipo_evaluacion_id: tipoEvaluacion ? parseInt(tipoEvaluacion) : null,
          trimestre: parseInt(trimestre),
          nota: notaPendiente ? null : parseFloat(nota),
          es_pendiente: notaPendiente,
          fecha_evaluacion: fecha,
          descripcion: '',
          comentario: comentario || null
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Nota registrada exitosamente');
        limpiarFormulario();
        cargarNotasRecientes(filtroCurso || null, filtroAlumno || null);
      } else {
        alert(data.error || 'Error al registrar nota');
      }
    } catch (error) {
      console.error('Error al registrar nota:', error);
      alert('Error al registrar nota');
    } finally {
      setGuardando(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    // Solo mostrar dia/mes para ahorrar espacio
    const date = new Date(fecha);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Formulario movil
  const FormularioMovil = () => (
    <>
      <div className="form-row-movil">
        {cargandoCursos ? (
          <div className="form-group">
            <label>Curso</label>
            <div style={{ padding: '8px', color: '#64748b' }}>Cargando...</div>
          </div>
        ) : (
          <SelectMovil
            label="Curso"
            value={cursoSeleccionado}
            valueName={cursoNombre}
            onChange={handleCursoChange}
            options={cursos}
            placeholder="Seleccionar..."
            isOpen={dropdownAbierto === 'curso'}
            onToggle={() => setDropdownAbierto(dropdownAbierto === 'curso' ? null : 'curso')}
            onClose={() => setDropdownAbierto(null)}
          />
        )}
        <SelectMovil
          label="Asignatura"
          value={asignaturaSeleccionada}
          valueName={asignaturaNombre}
          onChange={(id, nombre) => { setAsignaturaSeleccionada(id); setAsignaturaNombre(nombre); }}
          options={asignaturas}
          placeholder={cargandoAsignaturas ? 'Cargando...' : (cursoSeleccionado ? 'Seleccionar...' : 'Seleccione curso')}
          disabled={!cursoSeleccionado || cargandoAsignaturas}
          isOpen={dropdownAbierto === 'asignatura'}
          onToggle={() => setDropdownAbierto(dropdownAbierto === 'asignatura' ? null : 'asignatura')}
          onClose={() => setDropdownAbierto(null)}
        />
      </div>
      <div className="form-row-movil">
        <AutocompleteAlumno
          alumnos={alumnos}
          alumnoSeleccionado={alumnoSeleccionado}
          busqueda={busquedaAlumno}
          onBusquedaChange={(val) => { setBusquedaAlumno(val); setAlumnoSeleccionado(''); }}
          onSeleccionar={handleSeleccionarAlumno}
          disabled={!cursoSeleccionado || cargandoAlumnos}
          placeholder={cargandoAlumnos ? 'Cargando...' : 'Buscar...'}
          onDropdownOpen={() => setDropdownAbierto(null)}
          formatNombre={formatNombreMovil}
        />
        <SelectMovil
          label={periodos.nombreGenerico}
          value={trimestre}
          valueName={trimestreNombre}
          onChange={(id, nombre) => { setTrimestre(id); setTrimestreNombre(nombre); }}
          options={trimestres}
          placeholder="Seleccionar..."
          isOpen={dropdownAbierto === 'trimestre'}
          onToggle={() => setDropdownAbierto(dropdownAbierto === 'trimestre' ? null : 'trimestre')}
          onClose={() => setDropdownAbierto(null)}
        />
      </div>
      <div className="form-row-movil">
        <SelectMovil
          label="Tipo Evaluacion"
          value={tipoEvaluacion}
          valueName={tipoEvaluacionNombre}
          onChange={(id, nombre) => { setTipoEvaluacion(id); setTipoEvaluacionNombre(nombre); }}
          options={tiposEvaluacion}
          placeholder="Seleccionar..."
          isOpen={dropdownAbierto === 'tipoEval'}
          onToggle={() => setDropdownAbierto(dropdownAbierto === 'tipoEval' ? null : 'tipoEval')}
          onClose={() => setDropdownAbierto(null)}
        />
        <div className="form-group">
          <label>Fecha</label>
          <input type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </div>
      </div>
      <div className="form-row-movil">
        <div className="form-group">
          <label>Nota (1.0 - 7.0)</label>
          <input
            type="number"
            className="form-control"
            min="1.0"
            max="7.0"
            step="0.1"
            placeholder="Ej: 6.5"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            disabled={notaPendiente}
            required={!notaPendiente}
          />
        </div>
      </div>
    </>
  );

  // Formulario desktop
  const FormularioDesktop = () => (
    <div className="docente-filtros-row" style={{
      display: 'grid',
      // En Tablet forzamos 3 columnas también para el layout específico
      gridTemplateColumns: isTablet ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
      gap: '15px',
      marginBottom: '15px',
      alignItems: 'end'
    }}>
      {/* 
         LAYOUT TABLET REQUERIDO (Order):
         Fila 1: Curso (1), Asignatura (2), Trimestre (3)
         Fila 2: Alumno (4), Tipo Eval (5), Fecha (6)
         Fila 3: Nota (7)
      */}

      {cargandoCursos ? (
        <div className="form-group" style={{ order: isTablet ? 1 : 0 }}>
          <label>Curso</label>
          <div style={{ padding: '8px', color: '#64748b', fontSize: '13px' }}>Cargando...</div>
        </div>
      ) : (
        <SelectNativo
          label="Curso"
          value={cursoSeleccionado}
          onChange={(e) => {
            const curso = cursos.find(c => c.id.toString() === e.target.value);
            handleCursoChange(e.target.value, curso?.nombre || '');
          }}
          options={cursos}
          placeholder="Seleccionar curso"
          containerStyle={{ order: isTablet ? 1 : 0 }}
        />
      )}

      <SelectNativo
        label="Asignatura"
        value={asignaturaSeleccionada}
        onChange={(e) => {
          const asig = asignaturas.find(a => a.id.toString() === e.target.value);
          setAsignaturaSeleccionada(e.target.value);
          setAsignaturaNombre(asig?.nombre || '');
        }}
        options={asignaturas}
        placeholder={cargandoAsignaturas ? 'Cargando...' : (cursoSeleccionado ? 'Seleccionar' : 'Primero seleccione curso')}
        disabled={!cursoSeleccionado || cargandoAsignaturas}
        containerStyle={{ order: isTablet ? 2 : 0 }}
      />

      <AutocompleteAlumno
        alumnos={alumnos}
        alumnoSeleccionado={alumnoSeleccionado}
        busqueda={busquedaAlumno}
        onBusquedaChange={(val) => { setBusquedaAlumno(val); setAlumnoSeleccionado(''); }}
        onSeleccionar={handleSeleccionarAlumno}
        disabled={!cursoSeleccionado || cargandoAlumnos}
        placeholder={cargandoAlumnos ? 'Cargando...' : 'Buscar Alumno'}
        containerStyle={{ order: isTablet ? 4 : 0 }}
      />

      <SelectNativo
        label={periodos.nombreGenerico}
        value={trimestre}
        onChange={(e) => {
          setTrimestre(e.target.value);
          const match = trimestres.find(t => t.id === e.target.value);
          setTrimestreNombre(match?.nombre || '');
        }}
        options={trimestres}
        placeholder="Seleccionar"
        containerStyle={{ order: isTablet ? 3 : 0 }}
      />

      <SelectNativo
        label="Tipo Evaluacion"
        value={tipoEvaluacion}
        onChange={(e) => {
          const tipo = tiposEvaluacion.find(t => t.id.toString() === e.target.value);
          setTipoEvaluacion(e.target.value);
          setTipoEvaluacionNombre(tipo?.nombre || '');
        }}
        options={tiposEvaluacion}
        placeholder="Seleccionar"
        containerStyle={{ order: isTablet ? 5 : 0 }}
      />

      <div className="form-group" style={{ order: isTablet ? 6 : 0, position: 'relative', marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Fecha</label>
        <input
          type="date"
          className="form-control"
          style={{ height: '30px', fontSize: '13px', minHeight: 'unset', padding: '0 8px', border: '1px solid #ced4da', borderRadius: '0.25rem' }}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />
      </div>

      <div className="form-group" style={{ order: isTablet ? 7 : 0, position: 'relative', marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Nota (1.0 - 7.0)</label>
        <input
          type="number"
          className="form-control"
          style={{ height: '30px', fontSize: '13px', minHeight: 'unset', padding: '0 8px', border: '1px solid #ced4da', borderRadius: '0.25rem' }}
          min="1.0"
          max="7.0"
          step="0.1"
          placeholder="Ej: 6.5"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          disabled={notaPendiente}
          required={!notaPendiente}
        />
      </div>
    </div>
  );

  // Componente de Ultimas Notas
  const TablaUltimasNotas = () => (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="card-header">
        <h3>Ultimas Notas</h3>
      </div>
      <div className="card-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Filtros */}
        <div className="filtros-notas-recientes" style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* ... filtros (mismo código) ... */}
          {/* ... Simplificado filtros visual ... */}
          {/* (Mantengo filtros pero no cambios significativos allí) */}
          {showTabs ? (
            // ... Movil ...
            <>
              <SelectMovil
                label="Filtrar por Curso"
                value={filtroCurso}
                valueName={filtroCursoNombre}
                onChange={(id, nombre) => { setFiltroCurso(id); setFiltroCursoNombre(nombre); setFiltroAlumno(''); setFiltroAlumnoNombre(''); }}
                options={cursos}
                placeholder="Todos"
                isOpen={dropdownAbierto === 'filtroCurso'}
                onToggle={() => setDropdownAbierto(dropdownAbierto === 'filtroCurso' ? null : 'filtroCurso')}
                onClose={() => setDropdownAbierto(null)}
              />
              {filtroCurso && (
                <AutocompleteAlumno
                  alumnos={[{ id: '', nombres: 'Todos', apellidos: '' }, ...alumnosFiltro]}
                  alumnoSeleccionado={filtroAlumno}
                  busqueda={filtroAlumnoNombre}
                  onBusquedaChange={(val) => { setFiltroAlumnoNombre(val); setFiltroAlumno(''); }}
                  onSeleccionar={(alumno) => {
                    setFiltroAlumno(alumno.id ? alumno.id.toString() : '');
                    setFiltroAlumnoNombre(alumno.id ? `${alumno.apellidos}, ${alumno.nombres}` : '');
                  }}
                  disabled={false}
                  placeholder="Todos"
                  label="Alumno"
                  containerStyle={{ flex: 2, marginBottom: 0 }}
                  onDropdownOpen={() => setDropdownAbierto(null)}
                  formatNombre={formatNombreMovil}
                />
              )}
            </>
          ) : (
            <>
              {/* Filtrar por curso con Custom SelectNativo para Tablet y Desktop */}
              <SelectNativo
                label="Curso"
                value={filtroCurso}
                onChange={(e) => { setFiltroCurso(e.target.value); setFiltroAlumno(''); }}
                options={cursos.map(c => ({ ...c, nombre: formatearCurso(c.nombre) }))}
                placeholder="Todos"
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />

              {filtroCurso && (
                <AutocompleteAlumno
                  alumnos={[{ id: '', nombres: 'Todos', apellidos: '' }, ...alumnosFiltro]}
                  alumnoSeleccionado={filtroAlumno}
                  busqueda={filtroAlumnoNombre}
                  onBusquedaChange={(val) => { setFiltroAlumnoNombre(val); setFiltroAlumno(''); }}
                  onSeleccionar={(alumno) => {
                    setFiltroAlumno(alumno.id ? alumno.id.toString() : '');
                    setFiltroAlumnoNombre(alumno.id ? `${alumno.apellidos}, ${alumno.nombres}` : '');
                  }}
                  disabled={false}
                  placeholder="Todos"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
              )}
            </>
          )}
        </div>

        {/* Tabla SCROLLABLE */}
        {cargandoNotas ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
            Cargando...
          </div>
        ) : notasRecientes.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
            Sin notas recientes
          </div>
        ) : (
          <div className="table-responsive" style={{ flex: 1, overflowY: 'auto', overflowX: showTabs ? 'hidden' : 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table className="data-table" style={showTabs ? { tableLayout: 'fixed', width: '100%' } : {}}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                <tr>
                  <th style={{ width: showTabs ? '42px' : '80px', whiteSpace: 'nowrap', padding: showTabs ? '4px 2px' : undefined }}>
                    Fecha
                    {!showTabs && (
                      <div style={{ display: 'inline-flex', marginLeft: '6px', gap: '1px', verticalAlign: 'middle', alignItems: 'center' }}>
                        <span onClick={() => setSortConfig({ key: 'fecha_evaluacion', direction: 'asc' })} style={{ cursor: 'pointer', fontSize: '12px', lineHeight: '0.8', color: sortConfig.key === 'fecha_evaluacion' && sortConfig.direction === 'asc' ? '#3b82f6' : '#cbd5e1' }}>▲</span>
                        <span onClick={() => setSortConfig({ key: 'fecha_evaluacion', direction: 'desc' })} style={{ cursor: 'pointer', fontSize: '12px', lineHeight: '0.8', color: sortConfig.key === 'fecha_evaluacion' && sortConfig.direction === 'desc' ? '#3b82f6' : '#cbd5e1' }}>▼</span>
                      </div>
                    )}
                  </th>
                  <th style={{ width: 'auto', whiteSpace: 'nowrap', padding: showTabs ? '4px 2px' : undefined }}>
                    Alumno
                    {!showTabs && (
                      <div style={{ display: 'inline-flex', marginLeft: '6px', gap: '1px', verticalAlign: 'middle', alignItems: 'center' }}>
                        <span onClick={() => setSortConfig({ key: 'alumno_apellidos', direction: 'asc' })} style={{ cursor: 'pointer', fontSize: '12px', lineHeight: '0.8', color: sortConfig.key === 'alumno_apellidos' && sortConfig.direction === 'asc' ? '#3b82f6' : '#cbd5e1' }}>▲</span>
                        <span onClick={() => setSortConfig({ key: 'alumno_apellidos', direction: 'desc' })} style={{ cursor: 'pointer', fontSize: '12px', lineHeight: '0.8', color: sortConfig.key === 'alumno_apellidos' && sortConfig.direction === 'desc' ? '#3b82f6' : '#cbd5e1' }}>▼</span>
                      </div>
                    )}
                  </th>
                  {!showTabs && <th style={{ width: '60px' }}>Curso</th>}
                  <th style={{ width: showTabs ? '35px' : '60px', padding: showTabs ? '4px 2px' : undefined }}>Asig.</th>
                  <th style={{ width: showTabs ? '25px' : '40px', textAlign: 'center', padding: showTabs ? '4px 1px' : undefined }}>Tri.</th>
                  <th style={{ width: showTabs ? '35px' : '65px', whiteSpace: 'nowrap', padding: showTabs ? '4px 2px' : undefined }}>
                    Nota
                    {!showTabs && (
                      <div style={{ display: 'inline-flex', marginLeft: '6px', gap: '1px', verticalAlign: 'middle', alignItems: 'center' }}>
                        <span onClick={() => setSortConfig({ key: 'nota', direction: 'asc' })} style={{ cursor: 'pointer', fontSize: '12px', lineHeight: '0.8', color: sortConfig.key === 'nota' && sortConfig.direction === 'asc' ? '#3b82f6' : '#cbd5e1' }}>▲</span>
                        <span onClick={() => setSortConfig({ key: 'nota', direction: 'desc' })} style={{ cursor: 'pointer', fontSize: '12px', lineHeight: '0.8', color: sortConfig.key === 'nota' && sortConfig.direction === 'desc' ? '#3b82f6' : '#cbd5e1' }}>▼</span>
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...notasRecientes].sort((a, b) => {
                  if (!sortConfig.key) return 0;
                  let valA = a[sortConfig.key];
                  let valB = b[sortConfig.key];

                  if (sortConfig.key === 'nota') {
                    valA = a.es_pendiente ? -1 : parseFloat(a.nota);
                    valB = b.es_pendiente ? -1 : parseFloat(b.nota);
                  }

                  if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                  if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                  return 0;
                }).map(n => (
                  <tr key={n.id}>
                    <td style={{ fontSize: showTabs ? '10px' : '12px', padding: showTabs ? '4px 2px' : undefined }}>{formatearFecha(n.fecha_evaluacion)}</td>
                    <td style={{ fontSize: showTabs ? '10px' : '13px', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: showTabs ? '90px' : '150px', padding: showTabs ? '4px 2px' : undefined, whiteSpace: showTabs ? 'normal' : 'nowrap', lineHeight: showTabs ? '1.2' : undefined }}>
                      {showTabs ? (
                        <>
                          <span style={{ fontWeight: 500 }}>{n.alumno_apellidos}</span>
                          <br />
                          <span style={{ color: '#64748b' }}>{n.alumno_nombres}</span>
                        </>
                      ) : (
                        <>{n.alumno_apellidos}, {n.alumno_nombres?.split(' ')[0]}</>
                      )}
                    </td>
                    {!showTabs && <td style={{ fontSize: '12px' }}>{formatearCurso(n.curso_nombre)}</td>}
                    <td style={{ fontSize: showTabs ? '10px' : '12px', padding: showTabs ? '4px 2px' : undefined }}>
                      {abreviarAsignatura(n.asignatura_nombre)}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: showTabs ? '10px' : '12px', padding: showTabs ? '4px 1px' : undefined }}>{n.trimestre}°</td>
                    <td style={{ textAlign: 'center', fontWeight: '600', fontSize: showTabs ? '11px' : '13px', padding: showTabs ? '4px 2px' : undefined, color: n.es_pendiente ? '#f59e0b' : (n.nota >= 4.0 ? '#10b981' : '#ef4444') }}>
                      {n.es_pendiente ? 'P' : (
                        Number(n.nota) ? Number(n.nota).toFixed(1) : '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="tab-panel active" style={{ height: isStacked ? 'auto' : 'calc(100vh - 140px)', minHeight: '500px' }}>
      {/* Overrides para uniformidad en Filtros (Registro) */}
      <style>{`
        .docente-filtros-row .form-group {
          margin-bottom: 0 !important;
          min-width: 0;
        }
        .docente-filtros-row .form-control,
        .docente-filtros-row .docente-autocomplete-container input {
          height: 30px !important;
          min-height: 30px !important;
          padding: 0 10px !important;
          font-size: 13px !important;
        }
        .docente-filtros-row label {
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          margin-bottom: 5px !important;
          display: block !important;
          height: 14px;
        }
      `}</style>
      {showTabs && (
        <div className="mobile-subtabs">
          <button
            className={`mobile-subtab ${pestanaActiva === 'registro' ? 'active' : ''}`}
            onClick={() => setPestanaActiva('registro')}
          >
            Registro
          </button>
          <button
            className={`mobile-subtab ${pestanaActiva === 'ultimas' ? 'active' : ''}`}
            onClick={() => setPestanaActiva('ultimas')}
          >
            Ultimas Notas
          </button>
        </div>
      )}

      {/* Two columns layout */}
      <div className={isStacked ? "" : "two-columns"} style={{ height: '100%', alignItems: 'stretch', display: isStacked ? 'block' : 'grid' }}>
        {(!showTabs || pestanaActiva === 'registro') && (
          <div className="column" style={{ height: 'auto', marginBottom: isTablet ? '24px' : '0' }}>
            <div className="card" style={{ overflow: 'visible' }}>
              <div className="card-header">
                <h3>Registro de Calificacion</h3>
              </div>
              <div className="card-body" style={{ overflow: 'visible' }}>
                <form onSubmit={handleSubmit}>
                  {showTabs ? FormularioMovil() : FormularioDesktop()}

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={notaPendiente}
                        onChange={(e) => {
                          setNotaPendiente(e.target.checked);
                          if (e.target.checked) setNota('');
                        }}
                      />
                      <span style={{ fontSize: '13px', color: '#475569' }}>Nota pendiente</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label htmlFor="comentarioNuevaNota">Comentario (Opcional)</label>
                    <textarea
                      id="comentarioNuevaNota"
                      className="form-control"
                      rows="3"
                      placeholder="Ingrese alguna observacion..."
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                    ></textarea>
                  </div>

                  <div className={`form-actions ${showTabs ? 'form-actions-movil' : ''}`} style={!showTabs ? { gap: '8px', marginTop: '10px' } : {}}>
                    <button type="button" className="btn btn-secondary" onClick={limpiarFormulario} style={!showTabs ? { height: '30px', fontSize: '11px', padding: '0 15px', textTransform: 'uppercase', fontWeight: '600' } : {}}>
                      Limpiar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={guardando} style={!showTabs ? { height: '30px', fontSize: '11px', padding: '0 15px', textTransform: 'uppercase', fontWeight: '600' } : {}}>
                      {guardando ? 'Guardando...' : (showTabs ? 'Registrar' : 'Registrar Nota')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {(!showTabs || pestanaActiva === 'ultimas') && (
          <div className="column" style={{
            height: isTablet ? '500px' : (isMobile ? 'calc(100vh - 280px)' : '100%'),
            overflow: 'hidden'
          }}>
            {TablaUltimasNotas()}
          </div>
        )}
      </div>
    </div>
  );
}

// Exportar el componente envuelto en el Error Boundary
export default function AgregarNotaTab(props) {
  return (
    <ComponentErrorBoundary>
      <AgregarNotaTabInternal {...props} />
    </ComponentErrorBoundary>
  );
}
