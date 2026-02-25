import { useState } from 'react'
import { login as apiLogin } from '../api'

export default function Login({ onLogin }) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiLogin(user, password)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-header">
          <span className="login-logo">TCP</span>
          <h1>TechPanel</h1>
          <p className="text-muted">Administración Técnica</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="form-group">
          <label>Usuario</label>
          <input
            type="text"
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="admin"
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
