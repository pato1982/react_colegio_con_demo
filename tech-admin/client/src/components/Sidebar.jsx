import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'

const REGISTRO_ITEMS = [
  { path: '/registros/administrador', label: 'Administrador' },
  { path: '/registros/docente', label: 'Docente' },
  { path: '/registros/alumno', label: 'Alumno' },
  { path: '/registros/apoderado', label: 'Apoderado' },
]

export default function Sidebar({ onLogout }) {
  const location = useLocation()
  const isRegistros = location.pathname.startsWith('/registros')
  const [registrosOpen, setRegistrosOpen] = useState(false)

  return (
    <aside className="tech-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">TCP</span>
        <span className="sidebar-title">TechPanel</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-link sidebar-expand${isRegistros ? ' active' : ''}`}
          onClick={() => setRegistrosOpen(o => !o)}
        >
          <span className="sidebar-icon">⊟</span>
          <span>Registros</span>
          <span className="sidebar-arrow">{registrosOpen ? '▾' : '▸'}</span>
        </button>

        {registrosOpen && (
          <div className="sidebar-sub">
            {REGISTRO_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link sidebar-sublink${isActive ? ' active' : ''}`}
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
