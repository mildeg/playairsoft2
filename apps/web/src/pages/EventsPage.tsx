import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicShell } from '../components/layouts/PublicShell'
import { api } from '../lib/api'
import { mockEvents } from '../lib/mockEvents'
import type { Event } from '../lib/types'

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [events, setEvents] = useState<Event[]>(mockEvents)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)

    void api
      .getPublicEvents(initialQuery)
      .then((response) => {
        setEvents(response.data.length > 0 ? response.data : mockEvents)
      })
      .catch(() => {
        setEvents(mockEvents)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [initialQuery])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearchParams(query ? { q: query } : {})
  }

  return (
    <PublicShell>
      <section className="section">
        <div className="section-header">
          <div>
            <div className="eyebrow">Partidas publicadas</div>
            <h1 className="page-title">Explorá el calendario operativo</h1>
            <p className="section-copy">
              Un catálogo claro, legible y pensado para que el player compare rápido ubicación, horario y modalidad.
            </p>
          </div>
        </div>

        <form className="panel-card" onSubmit={handleSubmit}>
          <div className="search-grid">
            <div className="field">
              <label htmlFor="q">Buscar</label>
              <input
                id="q"
                value={query}
                onChange={(input) => setQuery(input.target.value)}
                placeholder="Buscá por zona, modalidad o nombre..."
              />
            </div>
            <div className="stack-inline" style={{ alignItems: 'end' }}>
              <button className="button-primary" type="submit">
                Aplicar búsqueda
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="section">
        {isLoading ? (
          <div className="empty-state">Cargando partidas...</div>
        ) : (
          <div className="cards-grid">
            {events.map((event) => (
              <article className="event-card" key={event.id}>
                <div className="event-media">
                  <span className="event-badge">{event.format ?? 'Airsoft'}</span>
                </div>
                <div className="event-content">
                  <h3>{event.title}</h3>
                  <div className="event-meta">
                    <span className="chip">{event.venue.name}</span>
                    <span className="chip">{event.event_date}</span>
                    <span className="chip">{event.starts_at}</span>
                  </div>
                  <p className="muted">{event.short_description}</p>
                  <div className="hero-actions" style={{ marginTop: 18 }}>
                    <Link className="button-secondary" to={`/partidas/${event.id}`}>
                      Ver briefing
                    </Link>
                    <span className="chip">
                      Desde ${event.base_price ?? event.categories[0]?.price ?? 0}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PublicShell>
  )
}
