import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { PublicShell } from '../components/layouts/PublicShell'
import { api } from '../lib/api'
import { mockEvents } from '../lib/mockEvents'
import type { Event } from '../lib/types'

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const { isAuthenticated, token } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    void api
      .getEvent(eventId)
      .then((response) => {
        setEvent(response.data)
      })
      .catch(() => {
        const fallback = mockEvents.find((item) => String(item.id) === eventId) ?? null

        if (fallback) {
          setEvent(fallback)
          return
        }

        setError('No pudimos encontrar esa partida.')
      })
  }, [eventId])

  async function handleRegister() {
    if (!event || !token) {
      return
    }

    const firstCategory = event.categories[0]

    if (!firstCategory?.id) {
      setError('Esta partida todavía no tiene categorías listas para inscripción.')
      return
    }

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const response = await api.createRegistration(token, event.id, {
        event_category_id: firstCategory.id,
      })

      setMessage(response.message)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo completar la inscripción.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PublicShell>
      <section className="section">
        {!event && !error && <div className="empty-state">Cargando detalle...</div>}
        {error && <div className="empty-state">{error}</div>}

        {event && (
          <div className="split-panel">
            <div className="detail-card">
              <div className="eyebrow">{event.format ?? 'Partida publicada'}</div>
              <h1 className="page-title">{event.title}</h1>
              <p className="section-copy">
                {event.long_description ?? event.short_description}
              </p>
              <div className="detail-meta">
                <span>{event.event_date}</span>
                <span>
                  {event.starts_at} a {event.ends_at}
                </span>
                <span>{event.venue.address}</span>
              </div>
              <div className="list">
                {event.categories.map((category) => (
                  <div className="list-item" key={category.name}>
                    <strong>{category.name}</strong>
                    <p className="muted">
                      ${category.price} · {category.capacity} cupos
                      {category.description ? ` · ${category.description}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="detail-card">
              <div className="eyebrow">Inscripción y acceso</div>
              <h2 style={{ marginTop: 14 }}>Confirmá tu lugar con un flujo simple</h2>
              <p className="section-copy">
                El detalle ya muestra categorías, política de pago y organizador para reducir dudas antes de anotarte.
              </p>
              <div className="list" style={{ marginTop: 18 }}>
                <div className="list-item">Predio: {event.venue.name}</div>
                <div className="list-item">
                  Organiza: {event.owner_profile?.organization_name ?? 'Owner'}
                </div>
                <div className="list-item">
                  Pago requerido para confirmar:{' '}
                  {event.requires_payment_to_confirm ? 'Sí' : 'No'}
                </div>
              </div>
              {message && <div className="success-text" style={{ marginTop: 14 }}>{message}</div>}
              {error && <div className="error-text" style={{ marginTop: 14 }}>{error}</div>}
              <div className="hero-actions" style={{ marginTop: 20 }}>
                {isAuthenticated ? (
                  <button className="button-primary" disabled={isSubmitting} onClick={handleRegister}>
                    {isSubmitting ? 'Procesando...' : 'Reservar lugar'}
                  </button>
                ) : (
                  <Link className="button-primary" to="/registro">
                    Crear cuenta para reservar
                  </Link>
                )}
                <Link className="button-ghost" to="/partidas">
                  Volver al catálogo
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  )
}
