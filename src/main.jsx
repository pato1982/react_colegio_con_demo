import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary'
import { PageErrorFallback } from './components/common/ErrorFallback'
import { MensajeProvider, AuthProvider } from './contexts'
import config from './config/env'
import { instalarDemoInterceptor } from './services/demoInterceptor'
import './styles/colegio.css'

// En modo demo, interceptar todos los fetch a /api/ con datos estáticos locales
// No necesita servidor backend - todo funciona desde el frontend
if (config.isDemoMode()) {
  instalarDemoInterceptor();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ErrorBoundary global: captura cualquier error no manejado */}
    <ErrorBoundary FallbackComponent={PageErrorFallback}>
      {/* AuthProvider: maneja el estado de autenticación */}
      <AuthProvider>
        {/* MensajeProvider: maneja notificaciones en toda la app */}
        <MensajeProvider>
          <App />
        </MensajeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
