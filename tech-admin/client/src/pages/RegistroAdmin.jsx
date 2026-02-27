import { useState, useMemo } from 'react'
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

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code.slice(0, 3) + '-' + code.slice(3, 6) + '-' + code.slice(6, 9) + '-' + code.slice(9, 12)
}

// Cada item genera cursos: nivel (para tb_cursos), grados que abarca, secciones
const ITEMS_ESTRUCTURA = [
  { key: 'prekinder', label: 'Pre-Kinder', nivel: 'parvularia', grados: [1], detalle: null },
  { key: 'kinder', label: 'Kinder', nivel: 'parvularia', grados: [2], detalle: null },
  { key: 'basica', label: 'Básica', nivel: 'basica', grados: [1,2,3,4,5,6,7,8], detalle: '1° a 8°' },
  { key: 'media', label: 'Media', nivel: 'media', grados: [1,2,3,4], detalle: '1° a 4°' },
]

const INICIAL_ESTRUCTURA = {
  prekinder: { activo: false, secciones: 1 },
  kinder: { activo: false, secciones: 1 },
  basica: { activo: false, secciones: 1 },
  media: { activo: false, secciones: 1 },
}

export default function RegistroAdmin() {
  const [tab, setTab] = useState('registro')
  const [form, setForm] = useState({
    nombres: '', apellidos: '', rut: '', telefono: '',
    correo: '', establecimiento: ''
  })
  const [datosEst, setDatosEst] = useState({
    direccion: '', comuna: '', region: '', telefono: '', email: ''
  })
  const [estructura, setEstructura] = useState(INICIAL_ESTRUCTURA)
  const [modalidad, setModalidad] = useState('trimestral')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  // --- Estado pestaña Cambiar ---
  const [buscarRut, setBuscarRut] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [adminActual, setAdminActual] = useState(null)
  const [estEditable, setEstEditable] = useState(null)
  const [guardandoEst, setGuardandoEst] = useState(false)
  const [guardandoAdmin, setGuardandoAdmin] = useState(false)
  const [nuevoAdmin, setNuevoAdmin] = useState({ nombres: '', apellidos: '', rut: '', email: '', telefono: '' })
  const [codigoCambio, setCodigoCambio] = useState('')
  const [loadingCambio, setLoadingCambio] = useState(false)
  const [msgCambio, setMsgCambio] = useState(null)

  const resumen = useMemo(() => {
    let total = 0
    const parts = []
    for (const item of ITEMS_ESTRUCTURA) {
      const conf = estructura[item.key]
      if (!conf.activo) continue
      const count = item.grados.length * conf.secciones
      total += count
      parts.push({ label: item.label.toLowerCase(), count })
    }
    return { total, parts }
  }, [estructura])

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleEstChange = e => {
    setDatosEst(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleRut = e => {
    setForm(f => ({ ...f, rut: formatRut(e.target.value) }))
  }

  const toggleItem = key => {
    setEstructura(e => ({
      ...e,
      [key]: { ...e[key], activo: !e[key].activo }
    }))
  }

  const setSecciones = (key, val) => {
    setEstructura(e => ({
      ...e,
      [key]: { ...e[key], secciones: parseInt(val) }
    }))
  }

  const handleGenerar = () => {
    setCodigo(generarCodigo())
  }

  const handleBuscarAdmin = async () => {
    setMsgCambio(null)
    setBuscando(true)
    setAdminActual(null)
    setEstEditable(null)
    setCodigoCambio('')
    setNuevoAdmin({ nombres: '', apellidos: '', rut: '', email: '', telefono: '' })
    try {
      const res = await api(`/registro/admin-by-rut?rut=${encodeURIComponent(buscarRut)}`)
      if (res.error) throw new Error(res.error)
      setAdminActual(res.admin)
      setEstEditable({ ...res.establecimiento })
    } catch (err) {
      setMsgCambio({ type: 'error', text: err.message })
    } finally {
      setBuscando(false)
    }
  }

  const handleGuardarAdmin = async () => {
    setMsgCambio(null)
    setGuardandoAdmin(true)
    try {
      const res = await api(`/registro/admin/${adminActual.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombres: adminActual.nombres,
          apellidos: adminActual.apellidos,
          email: adminActual.email,
          telefono: adminActual.telefono
        })
      })
      if (res.error) throw new Error(res.error)
      setMsgCambio({ type: 'success', text: 'Datos del administrador actualizados' })
    } catch (err) {
      setMsgCambio({ type: 'error', text: err.message })
    } finally {
      setGuardandoAdmin(false)
    }
  }

  const handleGuardarEstablecimiento = async () => {
    setMsgCambio(null)
    setGuardandoEst(true)
    try {
      const res = await api(`/registro/establecimiento/${estEditable.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          direccion: estEditable.direccion,
          comuna: estEditable.comuna,
          region: estEditable.region,
          telefono: estEditable.telefono,
          email: estEditable.email
        })
      })
      if (res.error) throw new Error(res.error)
      setMsgCambio({ type: 'success', text: 'Establecimiento actualizado' })
    } catch (err) {
      setMsgCambio({ type: 'error', text: err.message })
    } finally {
      setGuardandoEst(false)
    }
  }

  const handleConfirmarCambio = async () => {
    setMsgCambio(null)
    if (!nuevoAdmin.nombres || !nuevoAdmin.apellidos || !nuevoAdmin.rut || !nuevoAdmin.email) {
      setMsgCambio({ type: 'error', text: 'Completa todos los campos obligatorios del nuevo administrador' })
      return
    }
    if (!codigoCambio) {
      setMsgCambio({ type: 'error', text: 'Debes generar un código primero' })
      return
    }
    setLoadingCambio(true)
    try {
      const res = await api('/registro/cambiar-admin', {
        method: 'POST',
        body: JSON.stringify({
          admin_anterior_id: adminActual.id,
          establecimiento_id: estEditable.id,
          rut: nuevoAdmin.rut,
          nombres: nuevoAdmin.nombres,
          apellidos: nuevoAdmin.apellidos,
          email: nuevoAdmin.email,
          telefono: nuevoAdmin.telefono,
          codigo: codigoCambio.replace(/[\s\-]/g, '')
        })
      })
      if (res.error) throw new Error(res.error)
      setMsgCambio({ type: 'success', text: res.message || 'Pre-registro de cambio creado con éxito' })
      setNuevoAdmin({ nombres: '', apellidos: '', rut: '', email: '', telefono: '' })
      setCodigoCambio('')
    } catch (err) {
      setMsgCambio({ type: 'error', text: err.message })
    } finally {
      setLoadingCambio(false)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setMsg(null)

    if (!form.nombres || !form.apellidos || !form.rut || !form.correo || !form.establecimiento) {
      setMsg({ type: 'error', text: 'Completa todos los campos obligatorios' })
      return
    }
    if (!codigo) {
      setMsg({ type: 'error', text: 'Debes generar un código primero' })
      return
    }

    const alguno = ITEMS_ESTRUCTURA.some(item => estructura[item.key].activo)
    if (!alguno) {
      setMsg({ type: 'error', text: 'Debes seleccionar al menos un nivel educativo' })
      return
    }

    // Build estructura_cursos payload
    const estructura_cursos = []
    for (const item of ITEMS_ESTRUCTURA) {
      const conf = estructura[item.key]
      if (!conf.activo) continue
      for (const grado of item.grados) {
        estructura_cursos.push({ nivel: item.nivel, grado, secciones: conf.secciones })
      }
    }

    setLoading(true)
    try {
      const res = await api('/registro/admin', {
        method: 'POST',
        body: JSON.stringify({
          rut: form.rut,
          nombres: form.nombres,
          apellidos: form.apellidos,
          email: form.correo,
          telefono: form.telefono,
          establecimiento: form.establecimiento,
          codigo: codigo.replace(/[\s\-]/g, ''),
          modalidad_academica: modalidad,
          estructura_cursos,
          direccion_establecimiento: datosEst.direccion,
          comuna_establecimiento: datosEst.comuna,
          region_establecimiento: datosEst.region,
          telefono_establecimiento: datosEst.telefono,
          email_establecimiento: datosEst.email
        })
      })
      if (res.error) throw new Error(res.error)
      setMsg({ type: 'success', text: res.message || 'Pre-registro confirmado con éxito' })
      setForm({ nombres: '', apellidos: '', rut: '', telefono: '', correo: '', establecimiento: '' })
      setDatosEst({ direccion: '', comuna: '', region: '', telefono: '', email: '' })
      setCodigo('')
      setModalidad('trimestral')
      setEstructura({ ...INICIAL_ESTRUCTURA })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tech-page">
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'registro' ? 'active' : ''}`} onClick={() => setTab('registro')}>Registro</button>
        <button className={`tab-btn ${tab === 'cambiar' ? 'active' : ''}`} onClick={() => setTab('cambiar')}>Cambiar administrador</button>
      </div>

      {tab === 'registro' && (
        <div className="registro-form-container">
          <form onSubmit={handleSubmit} className="registro-form">
            {msg && (
              <div className={`registro-msg ${msg.type}`}>{msg.text}</div>
            )}

            <div className="form-row-4">
              <div className="form-group">
                <label>Nombres *</label>
                <input type="text" name="nombres" value={form.nombres} onChange={handleChange} placeholder="Ej: Juan Pablo" />
              </div>
              <div className="form-group">
                <label>Apellidos *</label>
                <input type="text" name="apellidos" value={form.apellidos} onChange={handleChange} placeholder="Ej: Pérez López" />
              </div>
              <div className="form-group">
                <label>RUT *</label>
                <input type="text" name="rut" value={form.rut} onChange={handleRut} placeholder="12.345.678-9" maxLength="12" />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} placeholder="+56 9 1234 5678" />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label>Correo electrónico *</label>
                <input type="email" name="correo" value={form.correo} onChange={handleChange} placeholder="ejemplo@correo.cl" />
              </div>
              <div className="form-group">
                <label>Establecimiento *</label>
                <input type="text" name="establecimiento" value={form.establecimiento} onChange={handleChange} placeholder="Nombre del establecimiento" />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input type="text" name="direccion" value={datosEst.direccion} onChange={handleEstChange} placeholder="Av. Principal 123" />
              </div>
            </div>

            <div className="form-row-4">
              <div className="form-group">
                <label>Comuna</label>
                <input type="text" name="comuna" value={datosEst.comuna} onChange={handleEstChange} placeholder="Santiago" />
              </div>
              <div className="form-group">
                <label>Región</label>
                <input type="text" name="region" value={datosEst.region} onChange={handleEstChange} placeholder="Metropolitana" />
              </div>
              <div className="form-group">
                <label>Teléfono establecimiento</label>
                <input type="tel" name="telefono" value={datosEst.telefono} onChange={handleEstChange} placeholder="+56 2 1234 5678" />
              </div>
              <div className="form-group">
                <label>Email establecimiento</label>
                <input type="email" name="email" value={datosEst.email} onChange={handleEstChange} placeholder="contacto@colegio.cl" />
              </div>
            </div>

            <div className="estructura-section">
              <label className="estructura-title">Configuración Académica</label>

              <div className="modalidad-row">
                <span className="modalidad-label">Modalidad:</span>
                <label className="modalidad-option">
                  <input type="radio" name="modalidad" value="trimestral" checked={modalidad === 'trimestral'} onChange={() => setModalidad('trimestral')} />
                  <span>Trimestral</span>
                  <span className="modalidad-detalle">(3 periodos)</span>
                </label>
                <label className="modalidad-option">
                  <input type="radio" name="modalidad" value="semestral" checked={modalidad === 'semestral'} onChange={() => setModalidad('semestral')} />
                  <span>Semestral</span>
                  <span className="modalidad-detalle">(2 periodos)</span>
                </label>
              </div>

              <label className="estructura-title" style={{ marginTop: 12 }}>Estructura de Cursos</label>
              <div className="niveles-grid">
                {ITEMS_ESTRUCTURA.map(item => {
                  const conf = estructura[item.key]
                  return (
                    <div key={item.key} className="nivel-col">
                      <label className="nivel-header">
                        <input
                          type="checkbox"
                          checked={conf.activo}
                          onChange={() => toggleItem(item.key)}
                        />
                        <span>{item.label}</span>
                        {item.detalle && <span className="nivel-detalle">{item.detalle}</span>}
                      </label>
                      {conf.activo && (
                        <div className="nivel-opciones">
                          <select
                            value={conf.secciones}
                            onChange={e => setSecciones(item.key, e.target.value)}
                          >
                            <option value={1}>1 sección</option>
                            <option value={2}>2 secciones</option>
                            <option value={3}>3 secciones</option>
                            <option value={4}>4 secciones</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="estructura-resumen">
                Total: <strong>{resumen.total} cursos</strong>
                {resumen.parts.length > 0 && (
                  <span>
                    {' ('}
                    {resumen.parts.map((p, i) => (
                      <span key={i}>{i > 0 ? ' + ' : ''}{p.count} {p.label}</span>
                    ))}
                    {')'}
                  </span>
                )}
              </div>
            </div>

            <div className="codigo-row">
              <button type="button" className="btn btn-blue" onClick={handleGenerar} disabled={!!codigo}>
                {codigo ? 'Código generado' : 'Generar código'}
              </button>
              {codigo && (
                <span className="codigo-display">{codigo}</span>
              )}
              <button type="submit" className="login-btn codigo-submit" disabled={loading}>
                {loading ? 'Registrando...' : 'Confirmar pre registro'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'cambiar' && (
        <div className="registro-form-container">
          <div className="registro-form">
            {msgCambio && (
              <div className={`registro-msg ${msgCambio.type}`}>{msgCambio.text}</div>
            )}

            {/* Administrador actual */}
            <div className="estructura-section">
              <label className="estructura-title">Administrador actual</label>
              <div className="form-row-4">
                <div className="form-group">
                  <label>RUT</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={buscarRut}
                      onChange={e => setBuscarRut(formatRut(e.target.value))}
                      onKeyDown={e => { if (e.key === 'Enter' && buscarRut) handleBuscarAdmin() }}
                      placeholder="12.345.678-9"
                      maxLength="12"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-blue"
                      disabled={buscando || !buscarRut}
                      onClick={handleBuscarAdmin}
                    >
                      {buscando ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Nombres</label>
                  <input type="text" value={adminActual ? adminActual.nombres : ''} onChange={e => setAdminActual(s => ({ ...s, nombres: e.target.value }))} disabled={!adminActual} placeholder="—" />
                </div>
                <div className="form-group">
                  <label>Apellidos</label>
                  <input type="text" value={adminActual ? adminActual.apellidos : ''} onChange={e => setAdminActual(s => ({ ...s, apellidos: e.target.value }))} disabled={!adminActual} placeholder="—" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={adminActual ? adminActual.email : ''} onChange={e => setAdminActual(s => ({ ...s, email: e.target.value }))} disabled={!adminActual} placeholder="—" />
                </div>
              </div>
              <div className="form-row-4">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={adminActual ? (adminActual.telefono || '') : ''} onChange={e => setAdminActual(s => ({ ...s, telefono: e.target.value }))} disabled={!adminActual} placeholder="—" />
                </div>
                <div className="form-group" />
                <div className="form-group" />
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-blue"
                    disabled={!adminActual || guardandoAdmin}
                    onClick={handleGuardarAdmin}
                  >
                    {guardandoAdmin ? 'Guardando...' : 'Guardar datos'}
                  </button>
                </div>
              </div>
            </div>

            {/* Establecimiento */}
            <div className="estructura-section">
              <label className="estructura-title">Establecimiento</label>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Nombre</label>
                  <input type="text" value={estEditable ? estEditable.nombre : ''} readOnly className="input-readonly" disabled={!adminActual} placeholder="—" />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input type="text" value={estEditable ? (estEditable.direccion || '') : ''} onChange={e => setEstEditable(s => ({ ...s, direccion: e.target.value }))} disabled={!adminActual} placeholder="—" />
                </div>
                <div className="form-group">
                  <label>Comuna</label>
                  <input type="text" value={estEditable ? (estEditable.comuna || '') : ''} onChange={e => setEstEditable(s => ({ ...s, comuna: e.target.value }))} disabled={!adminActual} placeholder="—" />
                </div>
              </div>
              <div className="form-row-4">
                <div className="form-group">
                  <label>Región</label>
                  <input type="text" value={estEditable ? (estEditable.region || '') : ''} onChange={e => setEstEditable(s => ({ ...s, region: e.target.value }))} disabled={!adminActual} placeholder="—" />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={estEditable ? (estEditable.telefono || '') : ''} onChange={e => setEstEditable(s => ({ ...s, telefono: e.target.value }))} disabled={!adminActual} placeholder="—" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={estEditable ? (estEditable.email || '') : ''} onChange={e => setEstEditable(s => ({ ...s, email: e.target.value }))} disabled={!adminActual} placeholder="—" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-blue"
                    disabled={!adminActual || guardandoEst}
                    onClick={handleGuardarEstablecimiento}
                  >
                    {guardandoEst ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            </div>

            {/* Reemplazar administrador */}
            <div className="estructura-section">
              <label className="estructura-title">Reemplazar administrador</label>
              <div className="form-row-4">
                <div className="form-group">
                  <label>Nombres *</label>
                  <input type="text" value={nuevoAdmin.nombres} onChange={e => setNuevoAdmin(s => ({ ...s, nombres: e.target.value }))} disabled={!adminActual} placeholder={adminActual ? 'Ej: María José' : '—'} />
                </div>
                <div className="form-group">
                  <label>Apellidos *</label>
                  <input type="text" value={nuevoAdmin.apellidos} onChange={e => setNuevoAdmin(s => ({ ...s, apellidos: e.target.value }))} disabled={!adminActual} placeholder={adminActual ? 'Ej: García Muñoz' : '—'} />
                </div>
                <div className="form-group">
                  <label>RUT *</label>
                  <input type="text" value={nuevoAdmin.rut} onChange={e => setNuevoAdmin(s => ({ ...s, rut: formatRut(e.target.value) }))} disabled={!adminActual} placeholder={adminActual ? '12.345.678-9' : '—'} maxLength="12" />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={nuevoAdmin.telefono} onChange={e => setNuevoAdmin(s => ({ ...s, telefono: e.target.value }))} disabled={!adminActual} placeholder={adminActual ? '+56 9 1234 5678' : '—'} />
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={nuevoAdmin.email} onChange={e => setNuevoAdmin(s => ({ ...s, email: e.target.value }))} disabled={!adminActual} placeholder={adminActual ? 'ejemplo@correo.cl' : '—'} />
                </div>
              </div>
              <div className="codigo-row">
                <button type="button" className="btn btn-blue" onClick={() => setCodigoCambio(generarCodigo())} disabled={!adminActual || !!codigoCambio}>
                  {codigoCambio ? 'Código generado' : 'Generar código'}
                </button>
                {codigoCambio && (
                  <span className="codigo-display">{codigoCambio}</span>
                )}
                <button
                  type="button"
                  className="login-btn codigo-submit"
                  disabled={!adminActual || loadingCambio}
                  onClick={handleConfirmarCambio}
                >
                  {loadingCambio ? 'Procesando...' : 'Confirmar cambio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
