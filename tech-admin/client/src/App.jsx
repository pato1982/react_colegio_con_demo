import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { isAuthenticated } from './api'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import RegistroAdmin from './pages/RegistroAdmin'

function Layout({ children, onLogout }) {
  return (
    <div className="tech-layout">
      <Sidebar onLogout={onLogout} />
      <main className="tech-main">{children}</main>
    </div>
  )
}

function Placeholder({ title }) {
  return <div className="tech-page"><h1>{title}</h1></div>
}

export default function App() {
  const [, setRefresh] = useState(0)

  const handleLogin = () => setRefresh(r => r + 1)
  const handleLogout = () => {
    localStorage.removeItem('tech_token')
    setRefresh(r => r + 1)
  }

  if (!isAuthenticated()) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Layout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/registros/administrador" replace />} />
        <Route path="/registros/administrador" element={<RegistroAdmin />} />
        <Route path="/registros/docente" element={<Placeholder title="Registros — Docente" />} />
        <Route path="/registros/alumno" element={<Placeholder title="Registros — Alumno" />} />
        <Route path="/registros/apoderado" element={<Placeholder title="Registros — Apoderado" />} />
        <Route path="*" element={<Navigate to="/registros/administrador" replace />} />
      </Routes>
    </Layout>
  )
}
