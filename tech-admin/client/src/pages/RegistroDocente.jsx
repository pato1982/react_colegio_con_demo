import { useState, useEffect } from 'react'
import { api } from '../api'

function formatRut(value) {
  const clean = value.replace(/[^0-9kK]/g, '')
  if (clean.length <= 1) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1).toUpperCase()
  let formatted = ''
  const reversed = body.split('').reverse()
  reversed.forEach((ch, i) => {
    if (i > 0 && i % 3 === 0) formatted = '.' + formatted
    formatted = ch + formatted
  })
  return formatted + '-' + dv
}

export default function RegistroDocente() {
  const [tab, setTab] = useState('agregar')
  const [form, setForm] = useState({
    establecimiento_id: '',
    nombres: '', apellidos: '', rut: '',
    telefono: '', email: ''
  })
  const [establecimientos, setEstablecimientos] = useState([])
  const [asignaturas, setAsignaturas] = useState([])
  const [selectedAsig, setSelectedAsig] = useState([])
  const [loadingAsig, setLoadingAsig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  // --- Estado pestaña Modificar ---
  const [buscarRut, setBuscarRut] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [docenteActual, setDocenteActual] = useState(null)
  const [estActual, setEstActual] = useState(null)
  const [cursosDocente, setCursosDocente] = useState([])
  const [asigDisponibles, setAsigDisponibles] = useState([])
  const [asigDocente, setAsigDocente] = useState([])
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [guardandoAsig, setGuardandoAsig] = useState(false)
  const [msgMod, setMsgMod] = useState(null)

  // --- Estado cursos asignados (tabla editable) ---
  const [cursosEstablecimiento, setCursosEstablecimiento] = useState([])
  const [asignacionesChecked, setAsignacionesChecked] = useState(new Set())
  const [asignacionesOriginal, setAsignacionesOriginal] = useState(new Set())
  const [asignacionesIdMap, setAsignacionesIdMap] = useState({})
  const [guardandoCursos, setGuardandoCursos] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  // Cargar establecimientos al montar
  useEffect(() => {
    api('/registro/establecimientos')
      .then(data => {
        if (data.establecimientos) setEstablecimientos(data.establecimientos)
      })
      .catch(() => {})
  }, [])

  // Cargar asignaturas al cambiar establecimiento (tab agregar)
  useEffect(() => {
    if (!form.establecimiento_id) {
      setAsignaturas([])
      setSelectedAsig([])
      return
    }
    setLoadingAsig(true)
    setSelectedAsig([])
    api(`/registro/asignaturas/${form.establecimiento_id}`)
      .then(data => {
        if (data.asignaturas) setAsignaturas(data.asignaturas)
        else setAsignaturas([])
      })
      .catch(() => setAsignaturas([]))
      .finally(() => setLoadingAsig(false))
  }, [form.establecimiento_id])

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleRut = e => {
    setForm(f => ({ ...f, rut: formatRut(e.target.value) }))
  }

  const toggleAsignatura = id => {
    setSelectedAsig(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleLimpiar = () => {
    setForm({ establecimiento_id: '', nombres: '', apellidos: '', rut: '', telefono: '', email: '' })
    setSelectedAsig([])
    setMsg(null)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setMsg(null)

    if (!form.establecimiento_id || !form.nombres || !form.apellidos || !form.rut) {
      setMsg({ type: 'error', text: 'Completa todos los campos obligatorios' })
      return
    }

    setLoading(true)
    try {
      const res = await api('/registro/docente-tech', {
        method: 'POST',
        body: JSON.stringify({
          establecimiento_id: parseInt(form.establecimiento_id),
          rut: form.rut,
          nombres: form.nombres,
          apellidos: form.apellidos,
          email: form.email || null,
          telefono: form.telefono || null,
          asignaturas: selectedAsig
        })
      })
      if (res.error) throw new Error(res.error)
      setMsg({ type: 'success', text: res.message || 'Docente pre-registrado con éxito' })
      setForm(f => ({ ...f, nombres: '', apellidos: '', rut: '', telefono: '', email: '' }))
      setSelectedAsig([])
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  // --- Funciones pestaña Modificar ---

  const handleBuscarDocente = async () => {
    setMsgMod(null)
    setBuscando(true)
    setDocenteActual(null)
    setEstActual(null)
    setCursosDocente([])
    setAsigDisponibles([])
    setAsigDocente([])
    setCursosEstablecimiento([])
    setAsignacionesChecked(new Set())
    setAsignacionesOriginal(new Set())
    setAsignacionesIdMap({})
    try {
      const res = await api(`/registro/docente-by-rut?rut=${encodeURIComponent(buscarRut)}`)
      if (res.error) throw new Error(res.error)
      setDocenteActual(res.docente)
      setEstActual(res.establecimiento)
      setAsigDocente([...res.asignaturas])
      setCursosDocente(res.cursos || [])

      // Build asignaciones state
      const checked = new Set()
      const idMap = {}
      for (const c of (res.cursos || [])) {
        const key = `${c.curso_id}-${c.asignatura_id}`
        checked.add(key)
        idMap[key] = c.asignacion_id
      }
      setAsignacionesChecked(new Set(checked))
      setAsignacionesOriginal(new Set(checked))
      setAsignacionesIdMap(idMap)

      // Cargar asignaturas disponibles y cursos del establecimiento en paralelo
      const [asigRes, cursosRes] = await Promise.all([
        api(`/registro/asignaturas/${res.establecimiento.id}`),
        api(`/registro/cursos/${res.establecimiento.id}`)
      ])
      if (asigRes.asignaturas) setAsigDisponibles(asigRes.asignaturas)
      if (cursosRes.cursos) setCursosEstablecimiento(cursosRes.cursos)
    } catch (err) {
      setMsgMod({ type: 'error', text: err.message })
    } finally {
      setBuscando(false)
    }
  }

  const handleGuardarDatos = async () => {
    setMsgMod(null)
    setGuardandoDatos(true)
    try {
      const res = await api(`/registro/docente/${docenteActual.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombres: docenteActual.nombres,
          apellidos: docenteActual.apellidos,
          email: docenteActual.email,
          telefono: docenteActual.telefono
        })
      })
      if (res.error) throw new Error(res.error)
      setMsgMod({ type: 'success', text: 'Datos del docente actualizados' })
    } catch (err) {
      setMsgMod({ type: 'error', text: err.message })
    } finally {
      setGuardandoDatos(false)
    }
  }

  const handleGuardarAsignaturas = async () => {
    setMsgMod(null)
    setGuardandoAsig(true)
    try {
      const res = await api(`/registro/docente-asignaturas/${docenteActual.id}`, {
        method: 'PUT',
        body: JSON.stringify({ asignaturas: asigDocente })
      })
      if (res.error) throw new Error(res.error)
      setMsgMod({ type: 'success', text: 'Asignaturas actualizadas correctamente' })
    } catch (err) {
      setMsgMod({ type: 'error', text: err.message })
    } finally {
      setGuardandoAsig(false)
    }
  }

  const toggleAsigDocente = id => {
    setAsigDocente(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAsignacionCurso = (cursoId, asigId) => {
    const key = `${cursoId}-${asigId}`
    setAsignacionesChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleGuardarCursos = async () => {
    setMsgMod(null)
    setGuardandoCursos(true)
    try {
      // Additions: checked but not in original
      const toAdd = {}
      for (const key of asignacionesChecked) {
        if (!asignacionesOriginal.has(key)) {
          const [cursoId, asigId] = key.split('-').map(Number)
          if (!toAdd[cursoId]) toAdd[cursoId] = []
          toAdd[cursoId].push(asigId)
        }
      }
      // Removals: in original but not checked
      const toRemove = []
      for (const key of asignacionesOriginal) {
        if (!asignacionesChecked.has(key)) {
          toRemove.push(asignacionesIdMap[key])
        }
      }

      for (const cursoId of Object.keys(toAdd)) {
        const res = await api('/registro/docente-asignacion', {
          method: 'POST',
          body: JSON.stringify({
            docente_id: docenteActual.id,
            establecimiento_id: estActual.id,
            curso_id: parseInt(cursoId),
            asignaturas: toAdd[cursoId]
          })
        })
        if (res.error) throw new Error(res.error)
      }

      for (const id of toRemove) {
        const res = await api(`/registro/docente-asignacion/${id}`, { method: 'DELETE' })
        if (res.error) throw new Error(res.error)
      }

      // Recargar estado desde el servidor
      const res = await api(`/registro/docente-by-rut?rut=${encodeURIComponent(buscarRut)}`)
      if (!res.error) {
        setCursosDocente(res.cursos || [])
        const checked = new Set()
        const idMap = {}
        for (const c of (res.cursos || [])) {
          const key = `${c.curso_id}-${c.asignatura_id}`
          checked.add(key)
          idMap[key] = c.asignacion_id
        }
        setAsignacionesChecked(new Set(checked))
        setAsignacionesOriginal(new Set(checked))
        setAsignacionesIdMap(idMap)
      }

      setMsgMod({ type: 'success', text: 'Cursos actualizados correctamente' })
    } catch (err) {
      setMsgMod({ type: 'error', text: err.message })
    } finally {
      setGuardandoCursos(false)
    }
  }

  // Asignaturas del docente (especialidades)
  const asigEspecialidades = asigDisponibles.filter(a => asigDocente.includes(a.id))

  // Detectar cambios pendientes en cursos
  const hasCursosChanges = asignacionesChecked.size !== asignacionesOriginal.size ||
    [...asignacionesChecked].some(k => !asignacionesOriginal.has(k))

  const handleEliminarDocente = async () => {
    const nombre = `${docenteActual.nombres} ${docenteActual.apellidos}`
    const est = estActual ? estActual.nombre : 'su establecimiento'
    if (!confirm(`¿Está seguro que desea eliminar al docente ${nombre} del establecimiento ${est}?\n\nEsta acción desactivará su cuenta, asignaturas y todos los cursos asignados.`)) return

    setMsgMod(null)
    setEliminando(true)
    try {
      const res = await api(`/registro/docente/${docenteActual.id}`, { method: 'DELETE' })
      if (res.error) throw new Error(res.error)
      setMsgMod({ type: 'success', text: `Docente ${nombre} eliminado correctamente` })
      setDocenteActual(null)
      setEstActual(null)
      setCursosDocente([])
      setAsigDisponibles([])
      setAsigDocente([])
      setCursosEstablecimiento([])
      setAsignacionesChecked(new Set())
      setAsignacionesOriginal(new Set())
      setAsignacionesIdMap({})
      setBuscarRut('')
    } catch (err) {
      setMsgMod({ type: 'error', text: err.message })
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="tech-page">
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'agregar' ? 'active' : ''}`} onClick={() => setTab('agregar')}>Agregar Docente</button>
        <button className={`tab-btn ${tab === 'modificar' ? 'active' : ''}`} onClick={() => setTab('modificar')}>Modificar Docente</button>
      </div>

      {tab === 'agregar' && (
        <div className="registro-form-container">
          <form onSubmit={handleSubmit} className="registro-form">
            {msg && (
              <div className={`registro-msg ${msg.type}`}>{msg.text}</div>
            )}

            <div className="form-row-4">
              <div className="form-group">
                <label>Establecimiento *</label>
                <select name="establecimiento_id" value={form.establecimiento_id} onChange={handleChange}>
                  <option value="">— Seleccionar —</option>
                  {establecimientos.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nombres *</label>
                <input type="text" name="nombres" value={form.nombres} onChange={handleChange} placeholder="Ej: María José" />
              </div>
              <div className="form-group">
                <label>Apellidos *</label>
                <input type="text" name="apellidos" value={form.apellidos} onChange={handleChange} placeholder="Ej: González Muñoz" />
              </div>
              <div className="form-group">
                <label>RUT *</label>
                <input type="text" name="rut" value={form.rut} onChange={handleRut} placeholder="12.345.678-9" maxLength="12" />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label>Teléfono</label>
                <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} placeholder="+56 9 1234 5678" />
              </div>
              <div className="form-group">
                <label>Correo electrónico</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="ejemplo@correo.cl" />
              </div>
            </div>

            <div className="estructura-section">
              <label className="estructura-title">Especialidades / Asignaturas</label>
              {!form.establecimiento_id ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Selecciona un establecimiento para ver las asignaturas disponibles</div>
              ) : loadingAsig ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Cargando asignaturas...</div>
              ) : asignaturas.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay asignaturas registradas en este establecimiento</div>
              ) : (
                <div className="asignaturas-grid-tech">
                  {asignaturas.map(a => (
                    <label key={a.id} className="nivel-header">
                      <input
                        type="checkbox"
                        checked={selectedAsig.includes(a.id)}
                        onChange={() => toggleAsignatura(a.id)}
                      />
                      <span>{a.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedAsig.length > 0 && (
                <div className="estructura-resumen">
                  {selectedAsig.length} asignatura{selectedAsig.length !== 1 ? 's' : ''} seleccionada{selectedAsig.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="codigo-row">
              <button type="button" className="btn btn-red" onClick={handleLimpiar}>
                Limpiar
              </button>
              <button type="submit" className="login-btn codigo-submit" disabled={loading}>
                {loading ? 'Registrando...' : 'Confirmar pre registro'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'modificar' && (
        <div className="registro-form-container">
          <div className="registro-form">
            {msgMod && (
              <div className={`registro-msg ${msgMod.type}`}>{msgMod.text}</div>
            )}

            {/* Datos del docente — RUT como primer campo con búsqueda integrada */}
            <div className="estructura-section">
              <label className="estructura-title">Datos del docente</label>
              <div className="form-row-4">
                <div className="form-group">
                  <label>RUT</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={buscarRut}
                      onChange={e => setBuscarRut(formatRut(e.target.value))}
                      placeholder="12.345.678-9"
                      maxLength="12"
                      style={{ flex: 1 }}
                      onKeyDown={e => { if (e.key === 'Enter' && buscarRut) { e.preventDefault(); handleBuscarDocente() } }}
                    />
                    <button
                      type="button"
                      className="btn btn-blue"
                      disabled={buscando || !buscarRut}
                      onClick={handleBuscarDocente}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {buscando ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Nombres</label>
                  <input
                    type="text"
                    value={docenteActual ? docenteActual.nombres : ''}
                    onChange={e => setDocenteActual(s => ({ ...s, nombres: e.target.value }))}
                    disabled={!docenteActual}
                    placeholder="—"
                  />
                </div>
                <div className="form-group">
                  <label>Apellidos</label>
                  <input
                    type="text"
                    value={docenteActual ? docenteActual.apellidos : ''}
                    onChange={e => setDocenteActual(s => ({ ...s, apellidos: e.target.value }))}
                    disabled={!docenteActual}
                    placeholder="—"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={docenteActual ? (docenteActual.email || '') : ''}
                    onChange={e => setDocenteActual(s => ({ ...s, email: e.target.value }))}
                    disabled={!docenteActual}
                    placeholder="—"
                  />
                </div>
              </div>
              <div className="form-row-4">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={docenteActual ? (docenteActual.telefono || '') : ''}
                    onChange={e => setDocenteActual(s => ({ ...s, telefono: e.target.value }))}
                    disabled={!docenteActual}
                    placeholder="—"
                  />
                </div>
                <div className="form-group">
                  <label>Cargo</label>
                  <input type="text" value={docenteActual ? (docenteActual.cargo || '—') : ''} readOnly className="input-readonly" placeholder="—" />
                </div>
                <div className="form-group">
                  <label>Establecimiento</label>
                  <input type="text" value={estActual ? estActual.nombre : ''} readOnly className="input-readonly" placeholder="—" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-blue"
                    disabled={!docenteActual || guardandoDatos}
                    onClick={handleGuardarDatos}
                  >
                    {guardandoDatos ? 'Guardando...' : 'Guardar datos'}
                  </button>
                </div>
              </div>
            </div>

            {/* Asignaturas (editable checkboxes) */}
            <div className="estructura-section">
              <label className="estructura-title">Asignaturas</label>
              {!docenteActual ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Busca un docente por RUT para ver sus asignaturas</div>
              ) : asigDisponibles.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay asignaturas registradas en este establecimiento</div>
              ) : (
                <>
                  <div className="asignaturas-grid-tech">
                    {asigDisponibles.map(a => (
                      <label key={a.id} className="nivel-header">
                        <input
                          type="checkbox"
                          checked={asigDocente.includes(a.id)}
                          onChange={() => toggleAsigDocente(a.id)}
                        />
                        <span>{a.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {asigDocente.length > 0 && (
                    <div className="estructura-resumen">
                      {asigDocente.length} asignatura{asigDocente.length !== 1 ? 's' : ''} seleccionada{asigDocente.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              )}
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-blue"
                  disabled={!docenteActual || guardandoAsig}
                  onClick={handleGuardarAsignaturas}
                >
                  {guardandoAsig ? 'Guardando...' : 'Guardar asignaturas'}
                </button>
              </div>
            </div>

            {/* Cursos asignados (tabla editable) */}
            <div className="estructura-section">
              <label className="estructura-title">Cursos asignados</label>

              {!docenteActual ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Busca un docente por RUT para ver sus cursos</div>
              ) : asigEspecialidades.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>El docente no tiene asignaturas. Agrega asignaturas primero.</div>
              ) : cursosEstablecimiento.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay cursos en este establecimiento</div>
              ) : (
                <div className="cursos-asig-table-wrap">
                  <table className="cursos-asig-table">
                    <thead>
                      <tr>
                        <th>Curso</th>
                        {asigEspecialidades.map(a => (
                          <th key={a.id}>{a.nombre}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cursosEstablecimiento.map(curso => (
                        <tr key={curso.id}>
                          <td className="curso-nombre-cell">{curso.nombre}</td>
                          {asigEspecialidades.map(a => {
                            const key = `${curso.id}-${a.id}`
                            return (
                              <td key={a.id} className="curso-check-cell">
                                <input
                                  type="checkbox"
                                  checked={asignacionesChecked.has(key)}
                                  onChange={() => toggleAsignacionCurso(curso.id, a.id)}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-blue"
                  disabled={!docenteActual || guardandoCursos || !hasCursosChanges}
                  onClick={handleGuardarCursos}
                >
                  {guardandoCursos ? 'Guardando...' : 'Guardar cursos'}
                </button>
              </div>
            </div>

            {/* Botón eliminar docente */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-red"
                disabled={!docenteActual || eliminando}
                onClick={handleEliminarDocente}
              >
                {eliminando ? 'Eliminando...' : 'Eliminar docente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
