import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/panel" replace />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/panel')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo iniciar sesion.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="eyebrow">Ingreso</div>
        <h1 className="page-title">Entrá a tu panel</h1>
        <p className="section-copy">
          Accedé con tu cuenta para gestionar inscripciones, predios, partidas o administración general.
        </p>

        <form className="form-grid" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button className="button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="auth-switch" style={{ marginTop: 18 }}>
          <span className="muted">¿No tenés cuenta?</span>
          <Link to="/registro">Crear cuenta de player</Link>
        </div>
      </div>
    </div>
  )
}
