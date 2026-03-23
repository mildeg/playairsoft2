import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AppScreenLoader } from '../components/feedback/AppScreenLoader'

export function GoogleAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { completeTokenLogin, isAuthenticated } = useAuth()
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      return
    }

    started.current = true

    const token = searchParams.get('token')

    if (!token) {
      setError('No recibimos un token valido desde Google.')
      return
    }

    void completeTokenLogin(token)
      .then(() => {
        navigate('/panel', { replace: true })
      })
      .catch(() => {
        setError('No se pudo completar el acceso con Google.')
      })
  }, [completeTokenLogin, navigate, searchParams])

  if (isAuthenticated && !error) {
    return <Navigate to="/panel" replace />
  }

  if (!error) {
    return <AppScreenLoader message="Conectando tu cuenta..." />
  }

  return (
    <main className="min-h-screen bg-[#f5f6f7] px-6 py-24 text-center">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
        <h1 className="text-2xl font-black tracking-tight text-[#2c2f30]">
          {error ? 'No pudimos ingresar con Google' : 'Conectando tu cuenta'}
        </h1>
        <p className="mt-3 text-sm text-[#595c5d]">
          {error || 'Estamos validando tu acceso para llevarte al panel.'}
        </p>
      </div>
    </main>
  )
}
