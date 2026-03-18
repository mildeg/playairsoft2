import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="auth-wrap">Cargando sesion...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/ingresar" replace />
  }

  return <>{children}</>
}
