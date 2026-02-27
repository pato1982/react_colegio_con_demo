import { Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { isAuthenticated } from './api'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import RegistroAdmin from './pages/RegistroAdmin'
import RegistroDocente from './pages/RegistroDocente'

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

function WelcomeCube() {
  return (
    <div className="tech-page">
      <div className="tech-cube-container">
        <div className="tech-cube">
          <div className="tech-cube-face tech-cube-front"><span>E</span></div>
          <div className="tech-cube-face tech-cube-back"><span>E</span></div>
          <div className="tech-cube-face tech-cube-right"><span>E</span></div>
          <div className="tech-cube-face tech-cube-left"><span>E</span></div>
          <div className="tech-cube-face tech-cube-top"><span>E</span></div>
          <div className="tech-cube-face tech-cube-bottom"><span>E</span></div>
        </div>
      </div>
    </div>
  )
}

function AuthenticatedApp({ onLogout }) {
  const navigate = useNavigate()
  const redirected = useRef(false)

  useEffect(() => {
    if (!redirected.current) {
      redirected.current = true
      navigate('/', { replace: true })
    }
  }, [])

  return (
    <Layout onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<WelcomeCube />} />
        <Route path="/registros/administrador" element={<RegistroAdmin />} />
        <Route path="/registros/docente" element={<RegistroDocente />} />
        <Route path="/registros/alumno" element={<Placeholder title="Registros — Alumno" />} />
        <Route path="/registros/apoderado" element={<Placeholder title="Registros — Apoderado" />} />
        <Route path="*" element={<WelcomeCube />} />
      </Routes>
    </Layout>
  )
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

  return <AuthenticatedApp onLogout={handleLogout} />
}
