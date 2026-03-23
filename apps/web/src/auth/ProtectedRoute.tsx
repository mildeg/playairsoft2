import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f5f6f7] px-6 py-10">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-16 rounded-2xl bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-24 rounded-xl bg-white" />
            <div className="h-24 rounded-xl bg-white" />
            <div className="h-24 rounded-xl bg-white" />
          </div>
          <div className="space-y-3">
            <div className="h-20 rounded-xl bg-white" />
            <div className="h-20 rounded-xl bg-white" />
            <div className="h-20 rounded-xl bg-white" />
          </div>
        </div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/ingresar" replace />
  }

  return <>{children}</>
}
