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
      <div className="page-header">
        <h1>Registro — Administrador</h1>
      </div>

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

          <div className="form-row-2">
            <div className="form-group">
              <label>Correo electrónico *</label>
              <input type="email" name="correo" value={form.correo} onChange={handleChange} placeholder="ejemplo@correo.cl" />
            </div>
            <div className="form-group">
              <label>Establecimiento *</label>
              <input type="text" name="establecimiento" value={form.establecimiento} onChange={handleChange} placeholder="Nombre del establecimiento" />
            </div>
          </div>

          <div className="form-row-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label>Dirección</label>
              <input type="text" name="direccion" value={datosEst.direccion} onChange={handleEstChange} placeholder="Av. Principal 123" />
            </div>
            <div className="form-group">
              <label>Comuna</label>
              <input type="text" name="comuna" value={datosEst.comuna} onChange={handleEstChange} placeholder="Santiago" />
            </div>
          </div>
          <div className="form-row-3">
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
          </div>

          <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: 16 }}>
            {loading ? 'Registrando...' : 'Confirmar pre registro'}
          </button>
        </form>
      </div>
    </div>
  )
}
