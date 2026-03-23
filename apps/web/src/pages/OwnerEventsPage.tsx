import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { DashboardSkeleton } from '../components/feedback/DashboardSkeleton'
import { DashboardShell } from '../components/layouts/DashboardShell'
import { api } from '../lib/api'
import type { Event } from '../lib/types'

type OwnerRegistration = {
  id: number
  status: string
  payment_status: string
  event: Event
  category: {
    id: number
    name: string
    price: number
  }
}

type EventSummary = {
  event: Event
  registrations: number
  occupancy: number
  revenue: number
  remainingSlots: number
  waitlistCount: number
  cancelledCount: number
  paidAmount: number
  pendingAmount: number
}

type EventsViewMode = 'cards' | 'table'

const OWNER_EVENTS_VIEW_STORAGE_KEY = 'owner-events-view-mode'

function getInitialViewMode(): EventsViewMode {
  try {
    const stored = window.localStorage.getItem(OWNER_EVENTS_VIEW_STORAGE_KEY)
    if (stored === 'cards' || stored === 'table') {
      return stored
    }
  } catch {
    // Ignore storage failures and fallback to cards.
  }

  return 'cards'
}

function formatDate(date: string) {
  const normalizedDate = date.includes('T') ? date : `${date}T12:00:00`
  const parsedDate = new Date(normalizedDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha a confirmar'
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

function isCancelledStatus(status: string) {
  return (
    status === 'cancelled' ||
    status === 'cancelled_by_owner' ||
    status === 'cancelled_by_player'
  )
}

function isWaitlistedStatus(status: string) {
  return status === 'waitlisted'
}

function isActiveRegistrationStatus(status: string) {
  return status === 'confirmed' || status === 'checked_in' || status === 'pending'
}

function statusLabel(status: string) {
  if (status === 'published') return 'Activa'
  if (status === 'draft') return 'Borrador'
  if (status === 'cancelled') return 'Cancelada'
  if (status === 'completed') return 'Finalizada'

  return status
}

function statusBadgeClass(status: string) {
  if (status === 'published') {
    return 'bg-[#bbf37c] text-[#355c00]'
  }

  if (status === 'draft') {
    return 'bg-[#febb28] text-[#563b00]'
  }

  if (status === 'cancelled') {
    return 'bg-[#ffefec] text-[#b02500]'
  }

  if (status === 'completed') {
    return 'bg-[#dadddf] text-[#595c5d]'
  }

  return 'bg-[#eff1f2] text-[#595c5d]'
}

function getEventCoverImage(event: Event) {
  const images = event.images ?? []
  const primary = images.find((image) => image.is_primary)
  return primary?.thumbnail_url ?? primary?.url ?? images[0]?.thumbnail_url ?? images[0]?.url ?? null
}

async function copyPublicEventLink(eventPublicId: string) {
  const link = `${window.location.origin}/partidas/${eventPublicId}`

  try {
    await navigator.clipboard.writeText(link)
    toast.success('Enlace copiado al portapapeles.')
  } catch {
    toast.error('No se pudo copiar el enlace.')
  }
}

export function OwnerEventsPage() {
  const { user, token } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [registrations, setRegistrations] = useState<OwnerRegistration[]>([])
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<EventsViewMode>(getInitialViewMode)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token || user?.role !== 'owner') {
      return
    }

    setIsLoading(true)
    setError('')

    void Promise.all([api.getOwnerEvents(token), api.getOwnerRegistrations(token)])
      .then(([eventsResponse, registrationsResponse]) => {
        setEvents(eventsResponse.data)
        setRegistrations(registrationsResponse.data)
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar tus partidas.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token, user?.role])

  const summaries = useMemo<EventSummary[]>(() => {
    const byEvent = new Map<
      number,
      {
        registrations: number
        revenue: number
        waitlistCount: number
        cancelledCount: number
        paidAmount: number
        pendingAmount: number
      }
    >()

    for (const registration of registrations) {
      const eventId = registration.event.id
      const current = byEvent.get(eventId) ?? {
        registrations: 0,
        revenue: 0,
        waitlistCount: 0,
        cancelledCount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      }

      if (isActiveRegistrationStatus(registration.status)) {
        current.registrations += 1
      }

      if (isWaitlistedStatus(registration.status)) {
        current.waitlistCount += 1
      }

      if (isCancelledStatus(registration.status)) {
        current.cancelledCount += 1
      }

      const ticketPrice = Number(registration.category.price ?? 0)

      if (registration.payment_status === 'paid') {
        current.paidAmount += ticketPrice
      }

      if (registration.payment_status === 'pending') {
        current.pendingAmount += ticketPrice
      }

      const canCountRevenue =
        (registration.status === 'confirmed' || registration.status === 'checked_in') &&
        (registration.payment_status === 'paid' || registration.payment_status === 'not_required')

      if (canCountRevenue) {
        current.revenue += Number(registration.category.price ?? 0)
      }

      byEvent.set(eventId, current)
    }

    return events
      .map((event) => {
        const summary = byEvent.get(event.id) ?? {
          registrations: 0,
          revenue: 0,
          waitlistCount: 0,
          cancelledCount: 0,
          paidAmount: 0,
          pendingAmount: 0,
        }
        const occupancy =
          event.capacity > 0
            ? Math.min(100, Math.round((summary.registrations / event.capacity) * 100))
            : 0
        const remainingSlots = Math.max(event.capacity - summary.registrations, 0)

        return {
          event,
          registrations: summary.registrations,
          occupancy,
          revenue: summary.revenue,
          remainingSlots,
          waitlistCount: summary.waitlistCount,
          cancelledCount: summary.cancelledCount,
          paidAmount: summary.paidAmount,
          pendingAmount: summary.pendingAmount,
        }
      })
      .sort((left, right) => {
        const leftDate = new Date(
          left.event.event_date.includes('T')
            ? left.event.event_date
            : `${left.event.event_date}T12:00:00`,
        )
        const rightDate = new Date(
          right.event.event_date.includes('T')
            ? right.event.event_date
            : `${right.event.event_date}T12:00:00`,
        )

        return rightDate.getTime() - leftDate.getTime()
      })
  }, [events, registrations])

  const totalPages = Math.max(1, Math.ceil(summaries.length / 10))
  const paginatedSummaries = useMemo(
    () => summaries.slice((page - 1) * 10, page * 10),
    [page, summaries],
  )

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  useEffect(() => {
    try {
      window.localStorage.setItem(OWNER_EVENTS_VIEW_STORAGE_KEY, viewMode)
    } catch {
      // Ignore storage failures silently.
    }
  }, [viewMode])

  if (!user) {
    return null
  }

  if (user.role !== 'owner') {
    return <Navigate to="/panel" replace />
  }

  if (isLoading) {
    return <DashboardSkeleton blocks={6} />
  }

  return (
    <DashboardShell activeItem="my-events">
      {error ? (
        <div className="mb-6 rounded-2xl border border-[#f95630] bg-[#ffefec] p-4 text-sm font-medium text-[#b02500]">
          {error}
        </div>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#2c2f30]">Mis partidas</h1>
            <p className="mt-1 text-sm text-[#595c5d]">
              Estado operativo y rendimiento de cada publicacion.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-[#dadddf] bg-white p-1 shadow-sm">
            <button
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                viewMode === 'cards'
                  ? 'bg-[#ff7a23] text-[#3f1700]'
                  : 'text-[#595c5d] hover:bg-[#eff1f2] hover:text-[#2c2f30]'
              }`}
              onClick={() => setViewMode('cards')}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              Cards
            </button>
            <button
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#ff7a23] text-[#3f1700]'
                  : 'text-[#595c5d] hover:bg-[#eff1f2] hover:text-[#2c2f30]'
              }`}
              onClick={() => setViewMode('table')}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">table_rows</span>
              Tabla
            </button>
          </div>
        </div>

        {summaries.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-sm text-[#595c5d] shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
            No hay partidas creadas para este owner todavia.
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-hidden rounded-xl bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#eff1f2]">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                      Partida
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                      Ocupacion
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                      Inscriptos
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                      Ganado
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                      Espera / Cancel.
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d] text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eff1f2]">
                  {paginatedSummaries.map((summary) => (
                    <tr key={summary.event.id} className="hover:bg-[#fafafa]">
                      <td className="px-4 py-4">
                        <p className="text-sm font-bold text-[#2c2f30]">{summary.event.title}</p>
                        <p className="mt-1 text-xs text-[#595c5d]">
                          {formatDate(summary.event.event_date)} · {summary.event.starts_at.slice(0, 5)} hs
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${statusBadgeClass(
                            summary.event.status,
                          )}`}
                        >
                          {statusLabel(summary.event.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-black text-[#2c2f30]">{summary.occupancy}%</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-black text-[#2c2f30]">{summary.registrations}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-black text-[#2c2f30]">
                          {formatCurrency(summary.revenue)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-xs text-[#595c5d]">
                        {summary.waitlistCount} / {summary.cancelledCount}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            className="rounded-lg border border-[#dadddf] bg-white px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                            to={`/mis-partidas/${summary.event.id}/editar`}
                          >
                            Editar
                          </Link>
                          {summary.event.status === 'published' ? (
                            <Link
                              className="rounded-lg border border-[#dadddf] bg-white px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                              to={`/partidas/${summary.event.public_id}`}
                            >
                              Ver
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {paginatedSummaries.map((summary) => (
              <article
                key={summary.event.id}
                className="rounded-xl bg-white p-4 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-[#2c2f30]">{summary.event.title}</h2>
                    <p className="mt-1 text-xs text-[#595c5d]">
                      {formatDate(summary.event.event_date)} · {summary.event.starts_at.slice(0, 5)} hs
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusBadgeClass(
                      summary.event.status,
                    )}`}
                  >
                    {statusLabel(summary.event.status)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[88px_1fr]">
                  <div className="h-[88px] w-[88px] overflow-hidden rounded-lg bg-[#eff1f2]">
                    {getEventCoverImage(summary.event) ? (
                      <img
                        alt={summary.event.title}
                        className="h-full w-full object-cover"
                        src={getEventCoverImage(summary.event) ?? ''}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                        Sin foto
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-[#f8f6f6] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                        Ocupacion
                      </p>
                      <p className="mt-1 text-xl font-black text-[#2c2f30]">{summary.occupancy}%</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e6e8ea]">
                        <div
                          className="h-full bg-[#994100]"
                          style={{ width: `${summary.occupancy}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#f8f6f6] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                        Inscriptos
                      </p>
                      <p className="mt-1 text-xl font-black text-[#2c2f30]">
                        {summary.registrations}
                      </p>
                      <p className="text-xs text-[#595c5d]">
                        {summary.remainingSlots} cupos disponibles
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#f8f6f6] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                        Ganado en entradas
                      </p>
                      <p className="mt-1 text-lg font-black text-[#2c2f30]">
                        {formatCurrency(summary.revenue)}
                      </p>
                      <p className="text-xs text-[#595c5d]">
                        Cobrado {formatCurrency(summary.paidAmount)} · Pendiente {formatCurrency(summary.pendingAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f8f6f6] px-3 py-2">
                  <p className="text-xs font-medium text-[#595c5d]">
                    Lista de espera: <strong className="text-[#2c2f30]">{summary.waitlistCount}</strong> · Cancelaciones:{' '}
                    <strong className="text-[#2c2f30]">{summary.cancelledCount}</strong>
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      className="rounded-lg border border-[#dadddf] bg-white px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                      to={`/mis-partidas/${summary.event.id}/editar`}
                    >
                      Editar
                    </Link>
                    {summary.event.status === 'published' ? (
                      <Link
                        className="rounded-lg border border-[#dadddf] bg-white px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                        to={`/partidas/${summary.event.public_id}`}
                      >
                        Ver partida
                      </Link>
                    ) : null}
                    <button
                      className="rounded-lg border border-[#dadddf] bg-white px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                      onClick={() => void copyPublicEventLink(summary.event.public_id)}
                      type="button"
                    >
                      Copiar enlace
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {summaries.length > 10 ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-medium text-[#595c5d]">
              Pagina {page} de {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-[#dadddf] bg-white px-4 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Anterior
              </button>
              <button
                className="rounded-lg border border-[#dadddf] bg-white px-4 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </DashboardShell>
  )
}
