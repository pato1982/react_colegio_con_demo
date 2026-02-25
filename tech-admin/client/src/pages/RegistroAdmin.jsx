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

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code.slice(0, 3) + '-' + code.slice(3, 6) + '-' + code.slice(6, 9) + '-' + code.slice(9, 12)
}

export default function RegistroAdmin() {
  const [form, setForm] = useState({
    nombres: '', apellidos: '', rut: '', telefono: '',
    correo: '', establecimiento: ''
  })
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleRut = e => {
    setForm(f => ({ ...f, rut: formatRut(e.target.value) }))
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
          codigo: codigo.replace(/[\s\-]/g, '')
        })
      })
      if (res.error) throw new Error(res.error)
      setMsg({ type: 'success', text: res.message || 'Pre-registro confirmado con éxito' })
      setForm({ nombres: '', apellidos: '', rut: '', telefono: '', correo: '', establecimiento: '' })
      setCodigo('')
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
