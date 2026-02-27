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

export default function RegistroAlumno() {
  const [tab, setTab] = useState('agregar')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  // Establecimiento y cursos
  const [establecimientos, setEstablecimientos] = useState([])
  const [estId, setEstId] = useState('')
  const [cursos, setCursos] = useState([])

  // Cargar establecimientos al montar
  useEffect(() => {
    api('/registro/establecimientos').then(res => {
      if (res.establecimientos) setEstablecimientos(res.establecimientos)
    }).catch(() => {})
  }, [])

  // Cargar cursos al cambiar establecimiento
  useEffect(() => {
    if (!estId) { setCursos([]); return }
    api(`/registro/cursos/${estId}`).then(res => {
      setCursos(res.cursos || [])
    }).catch(() => setCursos([]))
    setForm(f => ({ ...f, curso_asignado_id: '' }))
  }, [estId])

  // Formulario alumno
  const [form, setForm] = useState({
    curso_asignado_id: '',
    anio_academico: new Date().getFullYear(),
    rut_alumno: '', nombres_alumno: '', apellidos_alumno: '',
    fecha_nacimiento_alumno: '', sexo_alumno: '', nacionalidad_alumno: 'Chilena',
    direccion_alumno: '', comuna_alumno: '', ciudad_alumno: '',
    telefono_alumno: '', email_alumno: '',
    rut_apoderado: '', nombres_apoderado: '', apellidos_apoderado: '',
    email_apoderado: '', telefono_apoderado: '', direccion_apoderado: '',
    parentezco: '',
    contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
    tiene_nee: false, detalle_nee: '',
    alergias: 'Ninguna', enfermedades_cronicas: 'Ninguna',
    colegio_procedencia: '', ultimo_curso_aprobado: '',
    promedio_notas_anterior: '', observaciones: ''
  })
  const [mismaDireccion, setMismaDireccion] = useState(true)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async () => {
    setMsg(null)
    // Validaciones
    if (!estId) { setMsg({ type: 'error', text: 'Selecciona un establecimiento' }); return }
    if (!form.curso_asignado_id) { setMsg({ type: 'error', text: 'Selecciona un curso' }); return }
    if (!form.rut_alumno || !form.nombres_alumno || !form.apellidos_alumno) {
      setMsg({ type: 'error', text: 'RUT, nombres y apellidos del alumno son obligatorios' }); return
    }
    if (!form.fecha_nacimiento_alumno || !form.sexo_alumno || !form.direccion_alumno) {
      setMsg({ type: 'error', text: 'Fecha de nacimiento, sexo y dirección son obligatorios' }); return
    }
    if (!form.rut_apoderado || !form.nombres_apoderado || !form.apellidos_apoderado || !form.parentezco) {
      setMsg({ type: 'error', text: 'Datos del apoderado incompletos (RUT, nombres, apellidos, parentesco)' }); return
    }
    if (!form.email_apoderado || !form.telefono_apoderado) {
      setMsg({ type: 'error', text: 'Email y teléfono del apoderado son obligatorios' }); return
    }
    if (!form.contacto_emergencia_nombre || !form.contacto_emergencia_telefono) {
      setMsg({ type: 'error', text: 'Contacto de emergencia es obligatorio' }); return
    }
    if (!form.colegio_procedencia) { setMsg({ type: 'error', text: 'Colegio de procedencia es obligatorio' }); return }

    setLoading(true)
    try {
      const dirApoderado = mismaDireccion ? form.direccion_alumno : form.direccion_apoderado
      const res = await api('/registro/alumno', {
        method: 'POST',
        body: JSON.stringify({
          establecimiento_id: estId,
          ...form,
          direccion_apoderado: dirApoderado
        })
      })
      if (res.error) throw new Error(res.error)
      setMsg({ type: 'success', text: res.message || 'Alumno registrado con éxito' })
      setForm({
        curso_asignado_id: '', anio_academico: new Date().getFullYear(),
        rut_alumno: '', nombres_alumno: '', apellidos_alumno: '',
        fecha_nacimiento_alumno: '', sexo_alumno: '', nacionalidad_alumno: 'Chilena',
        direccion_alumno: '', comuna_alumno: '', ciudad_alumno: '',
        telefono_alumno: '', email_alumno: '',
        rut_apoderado: '', nombres_apoderado: '', apellidos_apoderado: '',
        email_apoderado: '', telefono_apoderado: '', direccion_apoderado: '',
        parentezco: '',
        contacto_emergencia_nombre: '', contacto_emergencia_telefono: '',
        tiene_nee: false, detalle_nee: '',
        alergias: 'Ninguna', enfermedades_cronicas: 'Ninguna',
        colegio_procedencia: '', ultimo_curso_aprobado: '',
        promedio_notas_anterior: '', observaciones: ''
      })
      setMismaDireccion(true)
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tech-page">
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'agregar' ? 'active' : ''}`} onClick={() => setTab('agregar')}>Agregar alumno</button>
        <button className={`tab-btn ${tab === 'modificar' ? 'active' : ''}`} onClick={() => setTab('modificar')}>Modificar alumno</button>
      </div>

      {tab === 'agregar' && (
        <div className="registro-form-container">
          <div className="registro-form">
            {msg && (
              <div className={`registro-msg ${msg.type}`}>{msg.text}</div>
            )}

            {/* Selección Académica */}
            <div className="estructura-section">
              <label className="estructura-title">Selección académica</label>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Establecimiento *</label>
                  <select value={estId} onChange={e => setEstId(e.target.value)}>
                    <option value="">Seleccione...</option>
                    {establecimientos.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Curso destino *</label>
                  <select name="curso_asignado_id" value={form.curso_asignado_id} onChange={handleChange} disabled={!estId}>
                    <option value="">Seleccione...</option>
                    {cursos.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Año académico</label>
                  <input type="number" name="anio_academico" value={form.anio_academico} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Datos del Alumno */}
            <div className="estructura-section">
              <label className="estructura-title">Datos del alumno</label>
              <div className="form-row-4">
                <div className="form-group">
                  <label>RUT *</label>
                  <input type="text" value={form.rut_alumno} onChange={e => setForm(f => ({ ...f, rut_alumno: formatRut(e.target.value) }))} disabled={!estId} placeholder={estId ? '12.345.678-9' : '—'} maxLength="12" />
                </div>
                <div className="form-group">
                  <label>Nombres *</label>
                  <input type="text" name="nombres_alumno" value={form.nombres_alumno} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Ej: Juan Pablo' : '—'} />
                </div>
                <div className="form-group">
                  <label>Apellidos *</label>
                  <input type="text" name="apellidos_alumno" value={form.apellidos_alumno} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Ej: Pérez López' : '—'} />
                </div>
                <div className="form-group">
                  <label>Fecha nacimiento *</label>
                  <input type="date" name="fecha_nacimiento_alumno" value={form.fecha_nacimiento_alumno} onChange={handleChange} disabled={!estId} />
                </div>
              </div>
              <div className="form-row-4">
                <div className="form-group">
                  <label>Sexo *</label>
                  <select name="sexo_alumno" value={form.sexo_alumno} onChange={handleChange} disabled={!estId}>
                    <option value="">Seleccione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nacionalidad</label>
                  <input type="text" name="nacionalidad_alumno" value={form.nacionalidad_alumno} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Chilena' : '—'} />
                </div>
                <div className="form-group">
                  <label>Dirección *</label>
                  <input type="text" name="direccion_alumno" value={form.direccion_alumno} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Av. Principal 123' : '—'} />
                </div>
                <div className="form-group">
                  <label>Comuna</label>
                  <input type="text" name="comuna_alumno" value={form.comuna_alumno} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Santiago' : '—'} />
                </div>
              </div>
              <div className="form-row-4">
                <div className="form-group">
                  <label>Ciudad</label>
                  <input type="text" name="ciudad_alumno" value={form.ciudad_alumno} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Santiago' : '—'} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" name="telefono_alumno" value={form.telefono_alumno} onChange={handleChange} disabled={!estId} placeholder={estId ? '+56 9 1234 5678' : '—'} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email_alumno" value={form.email_alumno} onChange={handleChange} disabled={!estId} placeholder={estId ? 'alumno@correo.cl' : '—'} />
                </div>
                <div className="form-group" />
              </div>
            </div>

            {/* Datos del Apoderado */}
            <div className="estructura-section">
              <label className="estructura-title">Datos del apoderado</label>
              <div className="form-row-4">
                <div className="form-group">
                  <label>RUT *</label>
                  <input type="text" value={form.rut_apoderado} onChange={e => setForm(f => ({ ...f, rut_apoderado: formatRut(e.target.value) }))} disabled={!estId} placeholder={estId ? '12.345.678-9' : '—'} maxLength="12" />
                </div>
                <div className="form-group">
                  <label>Nombres *</label>
                  <input type="text" name="nombres_apoderado" value={form.nombres_apoderado} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Ej: María' : '—'} />
                </div>
                <div className="form-group">
                  <label>Apellidos *</label>
                  <input type="text" name="apellidos_apoderado" value={form.apellidos_apoderado} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Ej: García Muñoz' : '—'} />
                </div>
                <div className="form-group">
                  <label>Parentesco *</label>
                  <select name="parentezco" value={form.parentezco} onChange={handleChange} disabled={!estId}>
                    <option value="">Seleccione...</option>
                    <option value="Padre">Padre</option>
                    <option value="Madre">Madre</option>
                    <option value="Abuelo/a">Abuelo/a</option>
                    <option value="Tío/a">Tío/a</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              <div className="form-row-4">
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" name="email_apoderado" value={form.email_apoderado} onChange={handleChange} disabled={!estId} placeholder={estId ? 'apoderado@correo.cl' : '—'} />
                </div>
                <div className="form-group">
                  <label>Teléfono *</label>
                  <input type="tel" name="telefono_apoderado" value={form.telefono_apoderado} onChange={handleChange} disabled={!estId} placeholder={estId ? '+56 9 1234 5678' : '—'} />
                </div>
                <div className="form-group">
                  <label>Misma dirección del alumno</label>
                  <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input type="radio" checked={mismaDireccion} onChange={() => setMismaDireccion(true)} disabled={!estId} /> Sí
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input type="radio" checked={!mismaDireccion} onChange={() => setMismaDireccion(false)} disabled={!estId} /> No
                    </label>
                  </div>
                </div>
                {!mismaDireccion ? (
                  <div className="form-group">
                    <label>Dirección apoderado *</label>
                    <input type="text" name="direccion_apoderado" value={form.direccion_apoderado} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Dirección diferente' : '—'} />
                  </div>
                ) : (
                  <div className="form-group" />
                )}
              </div>
            </div>

            {/* Salud y Emergencias */}
            <div className="estructura-section">
              <label className="estructura-title">Salud y emergencias</label>
              <div className="form-row-4">
                <div className="form-group">
                  <label>Contacto emergencia *</label>
                  <input type="text" name="contacto_emergencia_nombre" value={form.contacto_emergencia_nombre} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Nombre completo' : '—'} />
                </div>
                <div className="form-group">
                  <label>Teléfono emergencia *</label>
                  <input type="tel" name="contacto_emergencia_telefono" value={form.contacto_emergencia_telefono} onChange={handleChange} disabled={!estId} placeholder={estId ? '+56 9 1234 5678' : '—'} />
                </div>
                <div className="form-group">
                  <label>Alergias</label>
                  <input type="text" name="alergias" value={form.alergias} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Ninguna' : '—'} />
                </div>
                <div className="form-group">
                  <label>Enfermedades crónicas</label>
                  <input type="text" name="enfermedades_cronicas" value={form.enfermedades_cronicas} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Ninguna' : '—'} />
                </div>
              </div>
              <div className="form-row-4">
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                  <input type="checkbox" name="tiene_nee" checked={form.tiene_nee} onChange={handleChange} disabled={!estId} id="nee-check" />
                  <label htmlFor="nee-check" style={{ margin: 0, cursor: 'pointer' }}>Necesidades Educativas Especiales (NEE)</label>
                </div>
                {form.tiene_nee && (
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label>Detalle NEE</label>
                    <input type="text" name="detalle_nee" value={form.detalle_nee} onChange={handleChange} placeholder="Describa las necesidades" />
                  </div>
                )}
              </div>
            </div>

            {/* Antecedentes Académicos */}
            <div className="estructura-section">
              <label className="estructura-title">Antecedentes académicos</label>
              <div className="form-row-4">
                <div className="form-group">
                  <label>Colegio procedencia *</label>
                  <input type="text" name="colegio_procedencia" value={form.colegio_procedencia} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Nombre del colegio' : '—'} />
                </div>
                <div className="form-group">
                  <label>Último curso aprobado</label>
                  <input type="text" name="ultimo_curso_aprobado" value={form.ultimo_curso_aprobado} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Ej: 4° Básico' : '—'} />
                </div>
                <div className="form-group">
                  <label>Promedio notas anterior</label>
                  <input type="text" name="promedio_notas_anterior" value={form.promedio_notas_anterior} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Ej: 6.2' : '—'} />
                </div>
                <div className="form-group" />
              </div>
              <div className="form-row-4">
                <div className="form-group" style={{ gridColumn: 'span 3' }}>
                  <label>Observaciones</label>
                  <textarea name="observaciones" value={form.observaciones} onChange={handleChange} disabled={!estId} placeholder={estId ? 'Notas adicionales...' : '—'} rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="login-btn"
                    disabled={!estId || loading}
                    onClick={handleSubmit}
                    style={{ width: '100%' }}
                  >
                    {loading ? 'Registrando...' : 'Confirmar matrícula'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {tab === 'modificar' && (
        <div className="registro-form-container">
          <div className="registro-form">
            <p style={{ color: 'var(--text-secondary)' }}>Modificar alumno — pendiente de implementar</p>
          </div>
        </div>
      )}
    </div>
  )
}
