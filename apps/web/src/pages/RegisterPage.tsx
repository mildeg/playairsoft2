import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import type { TermsDocument } from '../lib/types'

const initialForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  dni: '',
  age: 18,
  phone: '',
  city: '',
  emergency_contact: '',
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [terms, setTerms] = useState<TermsDocument | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    void api
      .getActiveTerms()
      .then((response) => {
        setTerms(response.data)
      })
      .catch(() => {
        setError('No se pudo cargar el documento de términos vigente.')
      })
  }, [])

  if (isAuthenticated) {
    return <Navigate to="/panel" replace />
  }

  function updateField(field: keyof typeof form, value: string | number) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!terms) {
      setError('Falta cargar el documento de términos.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await register({
        ...form,
        age: Number(form.age),
        terms_document_id: terms.id,
        accept_terms: acceptTerms,
      })
      navigate('/panel')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo completar el registro.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="eyebrow">Registro de player</div>
        <h1 className="page-title">Creá tu acceso táctico</h1>
        <p className="section-copy">
          El alta pública genera tu perfil de jugador y deja trazabilidad de términos aceptados para operar con confianza.
        </p>

        <form className="form-grid two" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input id="name" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password_confirmation">Confirmación</label>
            <input id="password_confirmation" type="password" value={form.password_confirmation} onChange={(event) => updateField('password_confirmation', event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="dni">DNI</label>
            <input id="dni" value={form.dni} onChange={(event) => updateField('dni', event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="age">Edad</label>
            <input id="age" min="18" type="number" value={form.age} onChange={(event) => updateField('age', Number(event.target.value))} required />
          </div>
          <div className="field">
            <label htmlFor="phone">Teléfono</label>
            <input id="phone" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="city">Ciudad</label>
            <input id="city" value={form.city} onChange={(event) => updateField('city', event.target.value)} required />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="emergency_contact">Contacto de emergencia</label>
            <input id="emergency_contact" value={form.emergency_contact} onChange={(event) => updateField('emergency_contact', event.target.value)} required />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>
              <input
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                style={{ marginRight: 10, width: 18, minHeight: 18 }}
                type="checkbox"
              />
              Acepto los términos vigentes {terms ? `(v${terms.version})` : ''}
            </label>
            {terms && <div className="muted">{terms.content}</div>}
          </div>

          {error && (
            <div className="error-text" style={{ gridColumn: '1 / -1' }}>
              {error}
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <button className="button-primary" disabled={isSubmitting || !terms} type="submit">
              {isSubmitting ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        <div className="auth-switch" style={{ marginTop: 18 }}>
          <span className="muted">¿Ya tenés cuenta?</span>
          <Link to="/ingresar">Ingresar</Link>
        </div>
      </div>
    </div>
  )
}
