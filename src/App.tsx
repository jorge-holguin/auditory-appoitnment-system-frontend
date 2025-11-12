import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/login/page'
import AuditPage from '@/pages/audit/page'
import PackagesPage from '@/pages/packages/page'
import PlotPage from '@/pages/plot/page'
import { AuthProvider } from '@/components/autentication/AuthProvider'
import { ProtectedRoute } from '@/components/autentication/ProtectedRoute'
import ProtectedAppLayout from '@/layouts/ProtectedAppLayout'
import { CatalogosProvider } from '@/contexts/CatalogosContext'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CatalogosProvider>
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
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/plot" element={<PlotPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </CatalogosProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
