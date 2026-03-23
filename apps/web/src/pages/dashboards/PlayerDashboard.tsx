import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { DashboardSkeleton } from '../../components/feedback/DashboardSkeleton'
import { DashboardShell } from '../../components/layouts/DashboardShell'
import { api } from '../../lib/api'
import type { Event } from '../../lib/types'

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

function formatDashboardDate(date: string) {
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

function formatShortDate(date: string) {
  const normalizedDate = date.includes('T') ? date : `${date}T12:00:00`
  const parsedDate = new Date(normalizedDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha a confirmar'
  }

  const isCurrentYear = parsedDate.getFullYear() === new Date().getFullYear()

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    ...(isCurrentYear ? {} : { year: 'numeric' as const }),
  }).format(parsedDate)
}

function formatTime(time: string) {
  return time?.slice(0, 5) || '--:--'
}

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Confirmada'
  if (status === 'waitlisted') return 'Lista de espera'
  if (status === 'cancelled' || status === 'cancelled_by_player' || status === 'cancelled_by_owner') {
    return 'Cancelada'
  }
  if (status === 'checked_in') return 'Asistencia'

  return 'Pendiente de pago'
}

function paymentLabel(status: string) {
  if (status === 'paid') return 'Pagado'
  if (status === 'pending') return 'Pendiente de pago'
  if (status === 'failed') return 'Fallido'
  if (status === 'refunded') return 'Reintegrado'

  return 'No requerido'
}

function badgeClass(status: string) {
  if (status === 'confirmed' || status === 'checked_in') {
    return 'bg-[#bbf37c] text-[#355c00]'
  }

  if (status === 'cancelled' || status === 'cancelled_by_player' || status === 'cancelled_by_owner') {
    return 'bg-[#dadddf] text-[#595c5d]'
  }

  if (status === 'waitlisted') {
    return 'bg-[#febb28] text-[#563b00]'
  }

  return 'bg-[#ffefec] text-[#b02500]'
}

function getEventDateTime(eventDate: string, startsAt: string) {
  const normalizedDate = eventDate.includes('T') ? eventDate : `${eventDate}T${startsAt || '00:00:00'}`
  const parsedDate = new Date(normalizedDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

export function PlayerDashboard() {
  const { user, token } = useAuth()
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showMoreUpcoming, setShowMoreUpcoming] = useState(false)
  const [showHiddenUpcomingList, setShowHiddenUpcomingList] = useState(false)
  const [hiddenUpcomingPage, setHiddenUpcomingPage] = useState(1)
  const [activityPage, setActivityPage] = useState(1)

  useEffect(() => {
    if (!token || !user) return

    setIsLoading(true)

    void api
      .getPlayerRegistrations(token)
      .then((response) => {
        setRegistrations(response.data)
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar tus inscripciones.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token, user])

  async function handleCancelRegistration(registrationId: number) {
    if (!token) return

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
          : 'No se pudo cancelar la inscripcion.',
      )
    }
  }

  const activeRegistrations = useMemo(
    () =>
      registrations.filter(
        (registration) =>
          registration.status !== 'cancelled' &&
          registration.status !== 'cancelled_by_player' &&
          registration.status !== 'cancelled_by_owner' &&
          registration.status !== 'checked_in',
      ),
    [registrations],
  )

  const upcomingRegistrations = useMemo(() => {
    const now = new Date()

    return activeRegistrations.filter((registration) => {
      const eventDateTime = getEventDateTime(
        registration.event.event_date,
        registration.event.starts_at,
      )

      if (!eventDateTime) {
        return false
      }

      return eventDateTime >= now
    })
  }, [activeRegistrations])

  const activityRegistrations = useMemo(() => {
    const cutoffDate = new Date()
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2)
    cutoffDate.setHours(0, 0, 0, 0)

    return registrations
      .filter((registration) => {
        const normalizedDate = registration.event.event_date.includes('T')
          ? registration.event.event_date
          : `${registration.event.event_date}T12:00:00`
        const eventDate = new Date(normalizedDate)

        if (Number.isNaN(eventDate.getTime())) {
          return true
        }

        return eventDate >= cutoffDate
      })
      .slice()
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
  }, [registrations])

  const visibleUpcomingRegistrations = useMemo(
    () => upcomingRegistrations.slice(0, showMoreUpcoming ? 4 : 2),
    [showMoreUpcoming, upcomingRegistrations],
  )
  const hiddenUpcomingRegistrations = useMemo(
    () => upcomingRegistrations.slice(visibleUpcomingRegistrations.length),
    [upcomingRegistrations, visibleUpcomingRegistrations.length],
  )

  const canShowMoreUpcoming = upcomingRegistrations.length > 2 && !showMoreUpcoming
  const hiddenUpcomingCount = hiddenUpcomingRegistrations.length
  const totalHiddenUpcomingPages = Math.max(1, Math.ceil(hiddenUpcomingCount / 5))
  const paginatedHiddenUpcoming = useMemo(
    () => hiddenUpcomingRegistrations.slice((hiddenUpcomingPage - 1) * 5, hiddenUpcomingPage * 5),
    [hiddenUpcomingPage, hiddenUpcomingRegistrations],
  )
  const totalActivityPages = Math.max(1, Math.ceil(activityRegistrations.length / 5))
  const paginatedActivity = useMemo(
    () => activityRegistrations.slice((activityPage - 1) * 5, activityPage * 5),
    [activityPage, activityRegistrations],
  )

  if (!user) return null

  if (isLoading) {
    return <DashboardSkeleton blocks={5} />
  }

  return (
    <DashboardShell>
      {message ? (
        <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-50 p-4 text-sm font-medium text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-2xl border border-[#f95630] bg-[#ffefec] p-4 text-sm font-medium text-[#b02500]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 flex flex-col gap-10">
          <section>
            <div className="mb-6 flex justify-between items-end">
              <h2 className="text-2xl font-black tracking-tight text-[#2c2f30] uppercase">
                Proximas partidas
              </h2>
              <Link
                className="text-xs font-bold text-[#994100] hover:underline underline-offset-4"
                to="/partidas"
              >
                Ver todas las partidas
              </Link>
            </div>

            {upcomingRegistrations.length === 0 ? (
              <div className="rounded-xl bg-white p-10 text-center shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
                <h3 className="text-lg font-bold text-[#2c2f30]">No tenes partidas activas</h3>
                <p className="mt-2 text-sm text-[#595c5d]">
                  Explora el catalogo para encontrar tu proxima fecha.
                </p>
                <Link
                  className="mt-5 inline-flex rounded-xl bg-[#ff7a23] px-5 py-3 font-bold text-[#3f1700] transition-colors hover:bg-[#994100] hover:text-[#fff0e9]"
                  to="/partidas"
                >
                  Explorar partidas
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleUpcomingRegistrations.map((registration) => (
                  <article
                    key={registration.id}
                    className="overflow-hidden rounded-xl bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)] transition-transform group hover:scale-[1.01]"
                  >
                    <div className="relative h-32 bg-slate-200">
                      <img
                        alt={registration.event.title}
                        className="h-full w-full object-cover grayscale transition-all group-hover:grayscale-0"
                        src={`https://picsum.photos/seed/${registration.event.slug}/900/500`}
                      />
                      <div className="absolute top-3 left-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${badgeClass(registration.status)}`}
                        >
                          {statusLabel(registration.status)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <div>
                        <h4 className="text-base font-bold text-[#2c2f30]">
                          {registration.event.title}
                        </h4>
                        <div className="mt-1 flex items-center gap-2 text-[#595c5d]">
                          <span className="material-symbols-outlined text-sm">
                            calendar_today
                          </span>
                          <span className="text-[11px] font-medium">
                            {formatDashboardDate(registration.event.event_date)} ·{' '}
                            {formatTime(registration.event.starts_at)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[#595c5d]">
                          <span className="material-symbols-outlined text-sm">
                            location_on
                          </span>
                          <span className="text-[11px] font-medium">
                            {registration.event.venue.name}, {registration.event.venue.address}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[#595c5d]">
                          <span className="material-symbols-outlined text-sm">
                            payments
                          </span>
                          <span className="text-[11px] font-medium">
                            {paymentLabel(registration.payment_status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          className="flex-1 rounded-lg bg-[#994100] py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#fff0e9] transition-colors hover:bg-[#863800]"
                          to={`/partidas/${registration.event.public_id}`}
                        >
                          Ver detalle
                        </Link>
                        {registration.status !== 'cancelled' ? (
                          <button
                            className="rounded-lg bg-[#eff1f2] px-3 text-[#595c5d] transition-colors hover:text-[#b02500]"
                            onClick={() => void handleCancelRegistration(registration.id)}
                            title="Cancelar inscripcion"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-sm">cancel</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                  ))}
                </div>

                {hiddenUpcomingCount > 0 ? (
                  <div className="relative flex justify-center">
                    <button
                      className="rounded-full bg-[#eff1f2] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#595c5d] transition-colors hover:bg-[#dadddf] hover:text-[#2c2f30]"
                      onClick={() => {
                        setHiddenUpcomingPage(1)
                        setShowHiddenUpcomingList((current) => !current)
                      }}
                      type="button"
                    >
                      +{hiddenUpcomingCount} mas
                    </button>
                    {showHiddenUpcomingList ? (
                      <div className="absolute top-full z-20 mt-3 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#e6e8ea] bg-white shadow-[0px_18px_40px_rgba(44,47,48,0.16)]">
                        <div className="flex items-center justify-between border-b border-[#eff1f2] px-5 py-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                            Otras proximas partidas
                          </p>
                          <button
                            className="rounded-full p-1 text-[#595c5d] transition-colors hover:bg-[#eff1f2] hover:text-[#2c2f30]"
                            onClick={() => setShowHiddenUpcomingList(false)}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="bg-[#eff1f2]">
                              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                                Partida
                              </th>
                              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                                Fecha
                              </th>
                              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                                Lugar
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#eff1f2]">
                            {paginatedHiddenUpcoming.map((registration) => (
                              <tr
                                key={`hidden-${registration.id}`}
                                className="transition-colors hover:bg-[#fafafa]"
                              >
                                <td className="px-5 py-4">
                                  <Link
                                    className="text-xs font-bold text-[#994100] transition-colors hover:text-[#863800] hover:underline"
                                    to={`/partidas/${registration.event.public_id}`}
                                  >
                                    {registration.event.title}
                                  </Link>
                                </td>
                                <td className="px-5 py-4 text-[11px] font-medium text-[#595c5d]">
                                  {formatDashboardDate(registration.event.event_date)} ·{' '}
                                  {formatTime(registration.event.starts_at)}
                                </td>
                                <td className="px-5 py-4 text-[11px] font-medium text-[#595c5d]">
                                  {registration.event.venue.name}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {hiddenUpcomingCount > 5 ? (
                          <div className="flex items-center justify-between border-t border-[#eff1f2] px-5 py-4">
                            <p className="text-xs font-medium text-[#595c5d]">
                              Pagina {hiddenUpcomingPage} de {totalHiddenUpcomingPages}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                className="rounded-lg border border-[#dadddf] bg-white px-4 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100] disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={hiddenUpcomingPage === 1}
                                onClick={() =>
                                  setHiddenUpcomingPage((current) => Math.max(1, current - 1))
                                }
                                type="button"
                              >
                                Anterior
                              </button>
                              <button
                                className="rounded-lg border border-[#dadddf] bg-white px-4 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100] disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={hiddenUpcomingPage === totalHiddenUpcomingPages}
                                onClick={() =>
                                  setHiddenUpcomingPage((current) =>
                                    Math.min(totalHiddenUpcomingPages, current + 1),
                                  )
                                }
                                type="button"
                              >
                                Siguiente
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {canShowMoreUpcoming ? (
                  <div className="flex justify-center">
                    <button
                      className="rounded-xl border border-[#dadddf] bg-white px-5 py-3 text-sm font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                      onClick={() => setShowMoreUpcoming(true)}
                      type="button"
                    >
                      Ver mas
                    </button>
                  </div>
                ) : null}

                {showMoreUpcoming && upcomingRegistrations.length > 2 ? (
                  <div className="flex justify-center">
                    <button
                      className="rounded-xl border border-[#dadddf] bg-white px-5 py-3 text-sm font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                      onClick={() => setShowMoreUpcoming(false)}
                      type="button"
                    >
                      Ver menos
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#595c5d]">
              Actividad reciente
            </h3>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#eff1f2]">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                      Partida
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#595c5d] text-right">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eff1f2]">
                  {activityRegistrations.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-sm text-[#595c5d]" colSpan={3}>
                        No hay actividad registrada en los ultimos 2 anos.
                      </td>
                    </tr>
                  ) : (
                    paginatedActivity.map((registration) => (
                      <tr
                        key={registration.id}
                        className="transition-colors hover:bg-[#eff1f2]"
                      >
                        <td className="px-6 py-4">
                          {registration.event.status === 'published' ? (
                            <Link
                              className="text-xs font-bold text-[#994100] transition-colors hover:text-[#863800] hover:underline"
                              to={`/partidas/${registration.event.public_id}`}
                            >
                              {registration.event.title}
                            </Link>
                          ) : (
                            <p className="text-xs font-bold text-[#2c2f30]">
                              {registration.event.title}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-[#595c5d]">
                            {registration.category.name}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs text-[#595c5d]">
                          {formatShortDate(registration.event.event_date)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${badgeClass(registration.status)}`}
                          >
                            {statusLabel(registration.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {activityRegistrations.length > 0 ? (
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-xs font-medium text-[#595c5d]">
                  Pagina {activityPage} de {totalActivityPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border border-[#dadddf] bg-white px-4 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={activityPage === 1}
                    onClick={() => setActivityPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    Anterior
                  </button>
                  <button
                    className="rounded-lg border border-[#dadddf] bg-white px-4 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={activityPage === totalActivityPages}
                    onClick={() =>
                      setActivityPage((current) =>
                        Math.min(totalActivityPages, current + 1),
                      )
                    }
                    type="button"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </DashboardShell>
  )
}
