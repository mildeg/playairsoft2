import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { CompleteProfilePage } from './pages/CompleteProfilePage'
import { DashboardPage } from './pages/DashboardPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsPage } from './pages/EventsPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { GoogleAuthCallbackPage } from './pages/GoogleAuthCallbackPage'
import { HomePage } from './pages/HomePage'
import { OwnerEventCreatePage } from './pages/OwnerEventCreatePage'
import { OwnerEventEditPage } from './pages/OwnerEventEditPage'
import { LoginPage } from './pages/LoginPage'
import { OwnerEventsPage } from './pages/OwnerEventsPage'
import { OwnerVenueEditPage } from './pages/OwnerVenueEditPage'
import { OwnerVenuesPage } from './pages/OwnerVenuesPage'
import { RegisterPage } from './pages/RegisterPage'
import { VenueDetailPage } from './pages/VenueDetailPage'
import { OwnerPublicProfilePage } from './pages/OwnerPublicProfilePage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/partidas" element={<EventsPage />} />
        <Route path="/partidas/:eventId" element={<EventDetailPage />} />
        <Route path="/campos/:venueId" element={<VenueDetailPage />} />
        <Route path="/owners/:ownerSlug" element={<OwnerPublicProfilePage />} />
        <Route path="/ingresar" element={<LoginPage />} />
        <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />
        <Route
          path="/completar-perfil"
          element={
            <ProtectedRoute>
              <CompleteProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/olvide-mi-contrasena" element={<ForgotPasswordPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route
          path="/panel"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-partidas"
          element={
            <ProtectedRoute>
              <OwnerEventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-partidas/nueva"
          element={
            <ProtectedRoute>
              <OwnerEventCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-partidas/:eventId/editar"
          element={
            <ProtectedRoute>
              <OwnerEventEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-predios"
          element={
            <ProtectedRoute>
              <OwnerVenuesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-predios/:venueId/editar"
          element={
            <ProtectedRoute>
              <OwnerVenueEditPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </>
  )
}

export default App
