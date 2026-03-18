import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicShell } from '../components/layouts/PublicShell'
import { api } from '../lib/api'
import { mockEvents } from '../lib/mockEvents'
import type { Event } from '../lib/types'

export function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    void api
      .getPublicEvents()
      .then((response) => {
        setEvents(response.data)
      })
      .catch(() => {
        setEvents(mockEvents)
      })
  }, [])

  const featuredEvents = (events.length > 0 ? events : mockEvents).slice(0, 3)

  return (
    <PublicShell>
      <section className="hero">
        <div className="hero-card hero-copy">
          <div className="eyebrow">Próximas partidas</div>
          <h1>Encontrá dónde jugar este fin de semana.</h1>
          <p>
            Buscá por zona o modalidad, revisá el detalle y anotate sin vueltas.
          </p>

          <div className="hero-grid">
            <div className="stat">
              <strong>Partidas publicadas</strong>
              <span>Agenda clara con fecha, modalidad, predio y cupos.</span>
            </div>
            <div className="stat">
              <strong>Inscripción simple</strong>
              <span>Entrá al detalle, elegí categoría y reservá tu lugar.</span>
            </div>
            <div className="stat">
              <strong>Todo en un lugar</strong>
              <span>Tu historial y tickets quedan guardados en tu panel.</span>
            </div>
          </div>
        </div>

        <div className="hero-card hero-panel">
          <div>
            <div className="eyebrow">Buscador</div>
            <h2 style={{ margin: '14px 0 8px' }}>Elegí zona, modalidad o nombre</h2>
            <p className="muted">
              Empezá por una búsqueda simple y pasá directo al calendario de partidas.
            </p>
          </div>

          <div className="search-grid">
            <div className="field">
              <label htmlFor="busqueda">Zona o modalidad</label>
              <input
                id="busqueda"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pilar, CQB, bosque, nocturna..."
              />
            </div>
            <div className="field">
              <label htmlFor="fecha">Fecha</label>
              <input id="fecha" type="date" />
            </div>
          </div>

          <Link
            className="button-primary"
            to={`/partidas${search ? `?q=${encodeURIComponent(search)}` : ''}`}
          >
            Buscar partidas
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <div className="eyebrow">Calendario</div>
            <h2 className="section-title">Partidas destacadas</h2>
          </div>
          <Link className="button-ghost" to="/partidas">
            Ver todas
          </Link>
        </div>

        <div className="cards-grid">
          {featuredEvents.map((event) => (
            <article className="event-card" key={event.id}>
              <div className="event-media">
                <span className="event-badge">{event.format ?? 'Partida abierta'}</span>
              </div>
              <div className="event-content">
                <h3>{event.title}</h3>
                <div className="event-meta">
                  <span className="chip">{event.venue.name}</span>
                  <span className="chip">{event.event_date}</span>
                  <span className="chip">${event.base_price}</span>
                </div>
                <p className="muted">{event.short_description}</p>
                <div className="hero-actions" style={{ marginTop: 18 }}>
                  <Link className="button-secondary" to={`/partidas/${event.id}`}>
                    Ver detalle
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
