import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/login/page'
import ConsultaExternaPage from '@/pages/audit/page'
import VerResumenClinicoPage from '@/pages/resumen-clinico/page'
import DocumentosIpsPage from '@/pages/documentos-ips/page'
import ShlinkViewerPage from '@/pages/shlink/ShlinkViewerPage'
import { AuthProvider } from '@/components/autentication/AuthProvider'
import { ProtectedRoute } from '@/components/autentication/ProtectedRoute'
import ProtectedAppLayout from '@/layouts/ProtectedAppLayout'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected area with shared layout */}
          <Route
            element={
              <ProtectedRoute>
                <ProtectedAppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/consulta-externa" element={<ConsultaExternaPage />} />
            <Route path="/resumen-clinico" element={<VerResumenClinicoPage />} />
            <Route path="/documentos-ips" element={<DocumentosIpsPage />} />
            <Route path="/shlink/viewer" element={<ShlinkViewerPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/consulta-externa" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
