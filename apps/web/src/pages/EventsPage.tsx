import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, type SetURLSearchParams } from 'react-router-dom'
import { AppScreenLoader } from '../components/feedback/AppScreenLoader'
import { PublicFooter } from '../components/layouts/PublicFooter'
import { PublicHeader } from '../components/layouts/PublicHeader'
import { api } from '../lib/api'
import { mockEvents } from '../lib/mockEvents'
import type { Event } from '../lib/types'

function formatEventDate(date: string) {
  const normalizedDate = date.includes('T') ? date : `${date}T12:00:00`
  const parsedDate = new Date(normalizedDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha a confirmar'
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  }).format(parsedDate)
}

function formatPrice(value: string | number | null | undefined) {
  const numericValue = Number(value ?? 0)

  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(numericValue)
}

function isClosingSoon(event: Event) {
  if (event.status !== 'published') {
    return false
  }

  const normalizedDate = event.event_date.includes('T')
    ? event.event_date
    : `${event.event_date}T23:59:59`
  const parsedDate = new Date(normalizedDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return false
  }

  const now = new Date()
  const diffInMs = parsedDate.getTime() - now.getTime()
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

  return diffInDays >= 0 && diffInDays <= 3
}

function matchesDate(event: Event, selectedDate: string) {
  if (!selectedDate) {
    return true
  }

  return event.event_date === selectedDate
}

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const initialDate = searchParams.get('fecha') ?? ''

  return (
    <EventsCatalog
      initialDate={initialDate}
      initialQuery={initialQuery}
      setSearchParams={setSearchParams}
    />
  )
}

type EventsCatalogProps = {
  initialDate: string
  initialQuery: string
  setSearchParams: SetURLSearchParams
}

function EventsCatalog({
  initialDate,
  initialQuery,
  setSearchParams,
}: EventsCatalogProps) {
  const [query, setQuery] = useState(initialQuery)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [events, setEvents] = useState<Event[]>(mockEvents)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    setSelectedDate(initialDate)
  }, [initialDate])

  useEffect(() => {
    setIsLoading(true)

    void api
      .getPublicEvents(initialQuery)
      .then((response) => {
        setEvents(response.data)
      })
      .catch(() => {
        setEvents(mockEvents)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [initialQuery])

  const filteredEvents = useMemo(
    () => events.filter((event) => matchesDate(event, selectedDate)),
    [events, selectedDate],
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextParams = new URLSearchParams()

    if (query.trim()) {
      nextParams.set('q', query.trim())
    }

    if (selectedDate) {
      nextParams.set('fecha', selectedDate)
    }

    setSearchParams(nextParams)
  }

  function handleClearFilters() {
    setQuery('')
    setSelectedDate('')
    setSearchParams({})
  }

  if (isLoading) {
    return <AppScreenLoader message="Cargando partidas..." />
  }

  return (
    <div className="min-h-screen bg-[#f5f6f7] font-['Inter'] text-[#2c2f30] antialiased">
      <PublicHeader active="events" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-64 flex-col bg-slate-50 p-4 pt-24 lg:flex">
          <div className="mb-8 px-4">
            <h2 className="text-lg font-bold text-slate-900">Busqueda</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Partidas publicadas
            </p>
          </div>

          <div className="space-y-2">
            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
                Filtros activos
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>{query.trim() ? `Busqueda: ${query}` : 'Sin texto de busqueda'}</p>
                <p>{selectedDate ? `Fecha: ${selectedDate}` : 'Sin fecha seleccionada'}</p>
              </div>
            </div>

            <div className="rounded-lg p-3 text-slate-500 transition-colors">
              <p className="text-xs font-bold uppercase tracking-widest">Resultados</p>
              <p className="mt-2 text-sm">
                {`${filteredEvents.length} partidas visibles`}
              </p>
            </div>

            <div className="rounded-lg p-3 text-slate-500 transition-colors">
              <p className="text-xs font-bold uppercase tracking-widest">Navegacion</p>
              <p className="mt-2 text-sm">
                Usa la busqueda para filtrar y entra al detalle para ver toda la informacion.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-[#f5f6f7] p-6 md:p-8 lg:ml-0">
          <section className="mb-12">
            <form
              className="flex flex-col items-end gap-6 rounded-xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)] md:flex-row"
              onSubmit={handleSubmit}
            >
              <div className="w-full flex-1">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                  Ubicacion
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#757778]">
                    location_on
                  </span>
                  <input
                    className="w-full rounded-lg border-none bg-[#eff1f2] py-3 pl-10 pr-4 text-sm text-[#2c2f30] transition-all focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ciudad, zona, predio u organizador"
                    type="text"
                    value={query}
                  />
                </div>
              </div>

              <div className="w-full flex-1">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                  Fecha
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#757778]">
                    calendar_month
                  </span>
                  <input
                    className="w-full rounded-lg border-none bg-[#eff1f2] py-3 pl-10 pr-4 text-sm text-[#2c2f30] transition-all focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
                    onChange={(event) => setSelectedDate(event.target.value)}
                    type="date"
                    value={selectedDate}
                  />
                </div>
              </div>

              <div className="flex w-full flex-col items-center gap-2 md:w-auto">
                <button
                  className="w-full rounded-xl bg-[#ff7a23] px-10 py-3 font-bold text-[#fff0e9] shadow-[0px_12px_32px_rgba(44,47,48,0.06)] transition-all hover:scale-[1.02] hover:bg-[#994100] active:scale-[0.98] md:w-auto"
                  type="submit"
                >
                  Buscar
                </button>
                <button
                  className="text-[10px] font-bold uppercase tracking-widest text-[#757778] transition-colors hover:text-[#994100]"
                  onClick={handleClearFilters}
                  type="button"
                >
                  Limpiar filtros
                </button>
              </div>
            </form>
          </section>

          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#2c2f30]">
                Partidas encontradas
              </h1>
              <p className="mt-1 text-sm text-[#595c5d]">
                {`${filteredEvents.length} resultados segun tu busqueda actual.`}
              </p>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <span className="material-symbols-outlined text-[#757778]">grid_view</span>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center rounded-2xl bg-[#eff1f2] px-6 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e0e3e4]">
                <span className="material-symbols-outlined text-3xl text-[#757778]">
                  search_off
                </span>
              </div>
              <h3 className="mb-2 text-xl font-bold text-[#2c2f30]">
                Sin resultados
              </h3>
              <p className="mb-6 max-w-sm text-[#595c5d]">
                No encontramos partidas con esos filtros. Proba otra ubicacion o una fecha
                diferente.
              </p>
              <button
                className="rounded-lg border-2 border-[#abadae] px-6 py-2 font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                onClick={handleClearFilters}
                type="button"
              >
                Reajustar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => {
                const price = event.base_price ?? event.categories?.[0]?.price ?? 0
                const showClosingSoon = isClosingSoon(event)

                return (
                  <Link
                    key={event.id}
                    className="group block overflow-hidden rounded-xl border border-transparent bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)] transition-all hover:border-[#abadae]/20"
                    to={`/partidas/${event.public_id}`}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={`https://picsum.photos/seed/${event.slug}/900/600`}
                      />
                      {showClosingSoon ? (
                        <div className="absolute right-4 top-4">
                          <span className="rounded-full bg-[#febb28] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#563b00]">
                            Cierra pronto
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="p-6">
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <h3 className="text-xl font-bold leading-tight text-[#2c2f30]">
                          {event.title}
                        </h3>
                        <span className="text-lg font-black text-[#994100]">
                          ${formatPrice(price)}
                        </span>
                      </div>

                      <div className="mb-6 space-y-3">
                        <div className="flex items-center gap-2 text-[#595c5d]">
                          <span className="material-symbols-outlined text-sm">
                            calendar_today
                          </span>
                          <span className="text-xs font-medium">
                            {formatEventDate(event.event_date)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[#595c5d]">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <span className="text-xs font-medium">
                            {event.starts_at} - {event.ends_at}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[#595c5d]">
                          <span className="material-symbols-outlined text-sm">
                            location_on
                          </span>
                          <span className="text-xs font-medium">
                            {event.venue.name}, {event.venue.address}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </main>
      </div>

      <PublicFooter />
    </div>
  )
}
