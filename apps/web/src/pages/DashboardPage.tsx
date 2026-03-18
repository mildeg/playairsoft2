import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { DashboardShell } from '../components/layouts/DashboardShell'
import { api } from '../lib/api'
import type { Event, User, Venue } from '../lib/types'

type PlayerRegistration = {
  id: number
  status: string
  payment_status: string
  event: Event
  category: {
    id: number
    name: string
    price: number
    capacity: number
  }
  ticket?: {
    code: string
  } | null
}

type OwnerRegistration = {
  id: number
  status: string
  payment_status: string
  event: Event
  player: User & {
    player_profile?: {
      city: string
      phone: string
    } | null
  }
  category: {
    id: number
    name: string
    price: number
  }
  ticket?: {
    code: string
  } | null
}

const initialVenueForm = {
  name: '',
  address: '',
  description: '',
  amenities: '',
}

const initialEventForm = {
  venue_id: '',
  title: '',
  format: 'Bosque',
  short_description: '',
  long_description: '',
  event_date: '',
  starts_at: '09:00',
  ends_at: '17:00',
  base_price: '18000',
  capacity: '40',
  status: 'draft',
  rules: '',
  category_name: 'Entrada general',
  category_price: '18000',
  category_capacity: '40',
}

const initialOwnerForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  organization_name: '',
  bio: '',
}

const initialCheckinForm = {
  ticket_code: '',
}

export function DashboardPage() {
  const { user, token } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [owners, setOwners] = useState<User[]>([])
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([])
  const [ownerRegistrations, setOwnerRegistrations] = useState<OwnerRegistration[]>([])
  const [ownerForm, setOwnerForm] = useState(initialOwnerForm)
  const [checkinForm, setCheckinForm] = useState(initialCheckinForm)
  const [venueForm, setVenueForm] = useState(initialVenueForm)
  const [eventForm, setEventForm] = useState(initialEventForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !user) {
      return
    }

    if (user.role === 'owner') {
      void Promise.all([
        api.getOwnerVenues(token),
        api.getOwnerEvents(token),
        api.getOwnerRegistrations(token),
      ])
        .then(([venuesResponse, eventsResponse, registrationsResponse]) => {
          setVenues(venuesResponse.data)
          setEvents(eventsResponse.data)
          setOwnerRegistrations(registrationsResponse.data)
        })
        .catch(() => undefined)
      return
    }

    if (user.role === 'admin') {
      void api.getAdminOwners(token).then((response) => {
        setOwners(response.data)
      })
      return
    }

    void api.getPlayerRegistrations(token).then((response) => {
      setRegistrations(response.data)
    })
  }, [token, user])

  async function handleVenueSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    setError('')
    setMessage('')

    try {
      const response = await api.createOwnerVenue(token, {
        name: venueForm.name,
        address: venueForm.address,
        description: venueForm.description,
        amenities: venueForm.amenities.split(',').map((item) => item.trim()).filter(Boolean),
      })

      setVenues((current) => [response.data, ...current])
      setVenueForm(initialVenueForm)
      setMessage('Predio creado correctamente.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear el predio.')
    }
  }

  async function handleEventSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    setError('')
    setMessage('')

    try {
      const response = await api.createOwnerEvent(token, {
        venue_id: Number(eventForm.venue_id),
        title: eventForm.title,
        format: eventForm.format,
        short_description: eventForm.short_description,
        long_description: eventForm.long_description,
        event_date: eventForm.event_date,
        starts_at: eventForm.starts_at,
        ends_at: eventForm.ends_at,
        base_price: Number(eventForm.base_price),
        capacity: Number(eventForm.capacity),
        status: eventForm.status,
        rules: eventForm.rules,
        categories: [
          {
            name: eventForm.category_name,
            price: Number(eventForm.category_price),
            capacity: Number(eventForm.category_capacity),
          },
        ],
      })

      setEvents((current) => [response.data, ...current])
      setEventForm(initialEventForm)
      setMessage('Partida creada correctamente.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la partida.')
    }
  }

  async function handleCancelRegistration(registrationId: number) {
    if (!token) {
      return
    }

    setError('')
    setMessage('')

    try {
      const response = await api.cancelRegistration(token, registrationId)

      setRegistrations((current) =>
        current.map((registration) =>
          registration.id === registrationId
            ? { ...registration, status: response.data.status }
            : registration,
        ),
      )
      setMessage(response.message)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo cancelar la inscripción.',
      )
    }
  }

  async function handleCheckinSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    setError('')
    setMessage('')

    try {
      const response = await api.createOwnerCheckin(token, checkinForm)

      setOwnerRegistrations((current) =>
        current.map((registration) =>
          registration.ticket?.code === checkinForm.ticket_code
            ? { ...registration, status: response.data.status }
            : registration,
        ),
      )
      setCheckinForm(initialCheckinForm)
      setMessage(response.message)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo registrar el check-in.',
      )
    }
  }

  async function handleOwnerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    setError('')
    setMessage('')

    try {
      const response = await api.createAdminOwner(token, ownerForm)

      setOwners((current) => [response.data, ...current])
      setOwnerForm(initialOwnerForm)
      setMessage('Owner creado correctamente.')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear el owner.',
      )
    }
  }

  async function handleDeactivateOwner(ownerId: number) {
    if (!token) {
      return
    }

    setError('')
    setMessage('')

    try {
      const response = await api.deactivateAdminOwner(token, ownerId)

      setOwners((current) =>
        current.map((owner) =>
          owner.id === ownerId
            ? {
                ...owner,
                status: 'inactive',
                owner_profile: owner.owner_profile
                  ? { ...owner.owner_profile, status: 'inactive' }
                  : owner.owner_profile,
              }
            : owner,
        ),
      )
      setMessage(response.message)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo desactivar el owner.',
      )
    }
  }

  if (!user) return null

  if (user.role === 'owner') {
    return (
      <DashboardShell
        title="Owner workspace"
        subtitle="Cargá predios, armá partidas y empezá a operar la versión web del MVP."
        actions={<div className="chip">{user.owner_profile?.organization_name ?? user.name}</div>}
      >
        {message && <div className="success-text">{message}</div>}
        {error && <div className="error-text">{error}</div>}

        <section className="owner-grid section">
          <form className="dashboard-card form-grid" onSubmit={handleVenueSubmit}>
            <div className="eyebrow">Nuevo predio</div>
            <div className="field">
              <label htmlFor="venue-name">Nombre</label>
              <input id="venue-name" value={venueForm.name} onChange={(event) => setVenueForm((current) => ({ ...current, name: event.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="venue-address">Dirección</label>
              <input id="venue-address" value={venueForm.address} onChange={(event) => setVenueForm((current) => ({ ...current, address: event.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="venue-description">Descripción</label>
              <textarea id="venue-description" value={venueForm.description} onChange={(event) => setVenueForm((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="venue-amenities">Amenities</label>
              <input id="venue-amenities" value={venueForm.amenities} onChange={(event) => setVenueForm((current) => ({ ...current, amenities: event.target.value }))} placeholder="estacionamiento, buffet, alquiler" />
            </div>
            <button className="button-secondary" type="submit">
              Crear predio
            </button>
          </form>

          <form className="dashboard-card form-grid" onSubmit={handleEventSubmit}>
            <div className="eyebrow">Nueva partida</div>
            <div className="field">
              <label htmlFor="event-venue">Predio</label>
              <select id="event-venue" value={eventForm.venue_id} onChange={(event) => setEventForm((current) => ({ ...current, venue_id: event.target.value }))} required>
                <option value="">Seleccionar predio</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="event-title">Título</label>
              <input id="event-title" value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} required />
            </div>
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="event-format">Modalidad</label>
                <select id="event-format" value={eventForm.format} onChange={(event) => setEventForm((current) => ({ ...current, format: event.target.value }))}>
                  <option>Bosque</option>
                  <option>CQB</option>
                  <option>Milsim</option>
                  <option>Nocturna</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="event-status">Estado</label>
                <select id="event-status" value={eventForm.status} onChange={(event) => setEventForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="event-short-description">Descripción corta</label>
              <textarea id="event-short-description" value={eventForm.short_description} onChange={(event) => setEventForm((current) => ({ ...current, short_description: event.target.value }))} required />
            </div>
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="event-date">Fecha</label>
                <input id="event-date" type="date" value={eventForm.event_date} onChange={(event) => setEventForm((current) => ({ ...current, event_date: event.target.value }))} required />
              </div>
              <div className="field">
                <label htmlFor="event-price">Precio base</label>
                <input id="event-price" type="number" min="0" value={eventForm.base_price} onChange={(event) => setEventForm((current) => ({ ...current, base_price: event.target.value }))} required />
              </div>
            </div>
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="event-starts-at">Inicio</label>
                <input id="event-starts-at" type="time" value={eventForm.starts_at} onChange={(event) => setEventForm((current) => ({ ...current, starts_at: event.target.value }))} required />
              </div>
              <div className="field">
                <label htmlFor="event-ends-at">Fin</label>
                <input id="event-ends-at" type="time" value={eventForm.ends_at} onChange={(event) => setEventForm((current) => ({ ...current, ends_at: event.target.value }))} required />
              </div>
            </div>
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="event-category-name">Categoría inicial</label>
                <input id="event-category-name" value={eventForm.category_name} onChange={(event) => setEventForm((current) => ({ ...current, category_name: event.target.value }))} required />
              </div>
              <div className="field">
                <label htmlFor="event-category-price">Precio categoría</label>
                <input id="event-category-price" type="number" min="0" value={eventForm.category_price} onChange={(event) => setEventForm((current) => ({ ...current, category_price: event.target.value }))} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="event-category-capacity">Cupos categoría</label>
              <input id="event-category-capacity" type="number" min="1" value={eventForm.category_capacity} onChange={(event) => setEventForm((current) => ({ ...current, category_capacity: event.target.value }))} required />
            </div>
            <button className="button-primary" disabled={venues.length === 0} type="submit">
              Crear partida
            </button>
          </form>
        </section>

        <section className="dashboard-grid section">
          <div className="dashboard-card">
            <div className="eyebrow">Predios cargados</div>
            {venues.length === 0 ? (
              <div className="empty-state">Todavía no cargaste predios.</div>
            ) : (
              <div className="list">
                {venues.map((venue) => (
                  <div className="list-item" key={venue.id}>
                    <strong>{venue.name}</strong>
                    <p className="muted">{venue.address}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <div className="eyebrow">Partidas cargadas</div>
            {events.length === 0 ? (
              <div className="empty-state">Todavía no cargaste partidas.</div>
            ) : (
              <div className="list">
                {events.map((item) => (
                  <div className="list-item" key={item.id}>
                    <strong>{item.title}</strong>
                    <p className="muted">
                      {item.event_date} · {item.venue.name} · {item.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="owner-grid section">
          <form className="dashboard-card form-grid" onSubmit={handleCheckinSubmit}>
            <div className="eyebrow">Check-in operativo</div>
            <div className="field">
              <label htmlFor="ticket-code">Código de ticket</label>
              <input
                id="ticket-code"
                value={checkinForm.ticket_code}
                onChange={(event) =>
                  setCheckinForm((current) => ({
                    ...current,
                    ticket_code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="Ingresá el código del ticket"
                required
              />
            </div>
            <button className="button-primary" type="submit">
              Registrar check-in
            </button>
          </form>

          <div className="dashboard-card">
            <div className="eyebrow">Inscriptos recientes</div>
            {ownerRegistrations.length === 0 ? (
              <div className="empty-state">Todavía no hay inscripciones para tus partidas.</div>
            ) : (
              <div className="list">
                {ownerRegistrations.slice(0, 8).map((registration) => (
                  <div className="list-item" key={registration.id}>
                    <strong>{registration.player.name}</strong>
                    <p className="muted">
                      {registration.event.title} · {registration.category.name}
                    </p>
                    <div className="keyfacts" style={{ marginTop: 12 }}>
                      <span>{registration.status}</span>
                      <span>{registration.payment_status}</span>
                      {registration.ticket?.code ? <span>{registration.ticket.code}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </DashboardShell>
    )
  }

  if (user.role === 'admin') {
    return (
      <DashboardShell
        title="Admin workspace"
        subtitle="Alta y seguimiento inicial de organizadores habilitados en la plataforma."
      >
        {message && <div className="success-text">{message}</div>}
        {error && <div className="error-text">{error}</div>}

        <section className="owner-grid section">
          <form className="dashboard-card form-grid" onSubmit={handleOwnerSubmit}>
            <div className="eyebrow">Nuevo owner</div>
            <div className="field">
              <label htmlFor="owner-name">Nombre</label>
              <input
                id="owner-name"
                value={ownerForm.name}
                onChange={(event) =>
                  setOwnerForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="owner-email">Email</label>
              <input
                id="owner-email"
                type="email"
                value={ownerForm.email}
                onChange={(event) =>
                  setOwnerForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="owner-password">Contraseña</label>
              <input
                id="owner-password"
                type="password"
                value={ownerForm.password}
                onChange={(event) =>
                  setOwnerForm((current) => ({ ...current, password: event.target.value }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="owner-password-confirmation">Confirmación</label>
              <input
                id="owner-password-confirmation"
                type="password"
                value={ownerForm.password_confirmation}
                onChange={(event) =>
                  setOwnerForm((current) => ({
                    ...current,
                    password_confirmation: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="organization-name">Organización</label>
              <input
                id="organization-name"
                value={ownerForm.organization_name}
                onChange={(event) =>
                  setOwnerForm((current) => ({
                    ...current,
                    organization_name: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="owner-bio">Bio</label>
              <textarea
                id="owner-bio"
                value={ownerForm.bio}
                onChange={(event) =>
                  setOwnerForm((current) => ({ ...current, bio: event.target.value }))
                }
              />
            </div>
            <button className="button-primary" type="submit">
              Crear owner
            </button>
          </form>

          <div className="dashboard-card">
            <div className="eyebrow">Owners habilitados</div>
            {owners.length === 0 ? (
              <div className="empty-state">Todavía no hay owners cargados.</div>
            ) : (
              <div className="list">
                {owners.map((owner) => (
                  <div className="list-item" key={owner.id}>
                    <strong>{owner.owner_profile?.organization_name ?? owner.name}</strong>
                    <p className="muted">
                      {owner.email} · estado {owner.status}
                    </p>
                    <div className="hero-actions" style={{ marginTop: 14 }}>
                      <button
                        className="button-ghost"
                        disabled={owner.status === 'inactive'}
                        onClick={() => void handleDeactivateOwner(owner.id)}
                      >
                        {owner.status === 'inactive' ? 'Owner inactivo' : 'Desactivar owner'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      title="Panel player"
      subtitle="Base de sesión lista. El siguiente bloque puede sumar historial, inscripciones y ticket QR."
    >
      <section className="section">
        <div className="dashboard-card">
          <div className="eyebrow">Cuenta activa</div>
          <h2>Hola, {user.name}</h2>
          <p className="section-copy">
            Ya podés navegar el catálogo, iniciar sesión y quedar listo para el próximo paso: inscripción y ticket digital.
          </p>
          <div className="keyfacts" style={{ marginTop: 18 }}>
            <span>{user.player_profile?.city ?? 'Argentina'}</span>
            <span>DNI {user.player_profile?.dni ?? 'pendiente'}</span>
            <span>Rol {user.role}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="dashboard-card">
          <div className="eyebrow">Mis inscripciones</div>
          {message && <div className="success-text" style={{ marginTop: 14 }}>{message}</div>}
          {error && <div className="error-text" style={{ marginTop: 14 }}>{error}</div>}
          {registrations.length === 0 ? (
            <div className="empty-state">Todavía no te anotaste a ninguna partida.</div>
          ) : (
            <div className="list" style={{ marginTop: 18 }}>
              {registrations.map((registration) => (
                <div className="list-item" key={registration.id}>
                  <strong>{registration.event.title}</strong>
                  <p className="muted">
                    {registration.event.event_date} · {registration.event.venue.name} · {registration.category.name}
                  </p>
                  <div className="keyfacts" style={{ marginTop: 12 }}>
                    <span>Estado {registration.status}</span>
                    <span>Pago {registration.payment_status}</span>
                    {registration.ticket?.code ? <span>Ticket {registration.ticket.code}</span> : null}
                  </div>
                  {registration.status !== 'cancelled_by_player' ? (
                    <div className="hero-actions" style={{ marginTop: 14 }}>
                      <button className="button-ghost" onClick={() => void handleCancelRegistration(registration.id)}>
                        Cancelar inscripción
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  )
}
