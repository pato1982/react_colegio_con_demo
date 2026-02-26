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

  // Cargar establecimientos al montar
  useEffect(() => {
    api('/registro/establecimientos')
      .then(data => {
        if (data.establecimientos) setEstablecimientos(data.establecimientos)
      })
      .catch(() => {})
  }, [])

  // Cargar asignaturas al cambiar establecimiento
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
            <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '20px 0' }}>Próximamente...</div>
          </div>
        </div>
      )}
    </div>
  )
}
