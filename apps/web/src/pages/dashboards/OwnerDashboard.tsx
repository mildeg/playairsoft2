import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { DashboardSkeleton } from '../../components/feedback/DashboardSkeleton'
import { DashboardShell } from '../../components/layouts/DashboardShell'
import { api } from '../../lib/api'
import type { Event, User } from '../../lib/types'

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

function formatDashboardDate(date: string) {
  const normalizedDate = date.includes('T') ? date : `${date}T12:00:00`
  const parsedDate = new Date(normalizedDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha a confirmar'
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
  }).format(parsedDate)
}

export function OwnerDashboard() {
  const { user, token } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [registrations, setRegistrations] = useState<OwnerRegistration[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    setIsLoading(true)
    setError('')

    void Promise.all([
      api.getOwnerEvents(token),
      api.getOwnerRegistrations(token, false, 30),
    ])
      .then(([eventsResponse, registrationsResponse]) => {
        setEvents(eventsResponse.data)
        setRegistrations(registrationsResponse.data)
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la informacion del owner.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token])

  const stats = useMemo(() => {
    const publishedEvents = events.filter((item) => item.status === 'published').length

    return {
      events: events.length,
      publishedEvents,
    }
  }, [events])

  if (!user) return null

  if (isLoading) {
    return <DashboardSkeleton blocks={4} />
  }

  return (
    <DashboardShell
      actions={
        <Link
          className="inline-flex items-center justify-center rounded-xl bg-[#ff7a23] px-5 py-3 font-bold text-[#3f1700] transition-colors hover:bg-[#994100] hover:text-[#fff0e9]"
          to="/partidas"
        >
          Ver catalogo publico
        </Link>
      }
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-[#f95630] bg-[#ffefec] p-4 text-sm font-medium text-[#b02500]">
          {error}
        </div>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
            Partidas
          </p>
          <p className="mt-3 text-3xl font-black text-[#2c2f30]">{stats.events}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
            Publicadas
          </p>
          <p className="mt-3 text-3xl font-black text-[#2c2f30]">{stats.publishedEvents}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <div className="mb-5">
            <h2 className="text-2xl font-black tracking-tight text-[#2c2f30]">
              Partidas activas
            </h2>
            <p className="mt-1 text-sm text-[#595c5d]">
              Resumen rapido de tus publicaciones actuales.
            </p>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl bg-[#eff1f2] p-6 text-sm text-[#595c5d]">
              Aun no hay partidas cargadas para esta organizacion.
            </div>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 6).map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-[#e6e8ea] bg-[#f8f6f6] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#2c2f30]">{event.title}</h3>
                      <p className="mt-1 text-sm text-[#595c5d]">
                        {formatDashboardDate(event.event_date)} · {event.venue.name}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                      {event.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <div className="mb-5">
            <h2 className="text-2xl font-black tracking-tight text-[#2c2f30]">
              Inscriptos
            </h2>
            <p className="mt-1 text-sm text-[#595c5d]">
              Inscriptos en los ultimos 30 dias (todos los estados de partida).
            </p>
          </div>

          {registrations.length === 0 ? (
            <div className="rounded-2xl bg-[#eff1f2] p-6 text-sm text-[#595c5d]">
              Aun no hay inscripciones registradas.
            </div>
          ) : (
            <div className="space-y-3">
              {registrations.slice(0, 6).map((registration) => (
                <article
                  key={registration.id}
                  className="rounded-2xl border border-[#e6e8ea] bg-[#f8f6f6] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#2c2f30]">{registration.player.name}</h3>
                      <p className="mt-1 text-sm text-[#595c5d]">
                        {registration.event.title} · {registration.category.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
                        Ticket
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#2c2f30]">
                        {registration.ticket?.code ?? 'Sin ticket'}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  )
}
