import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  }).format(parsedDate)
}

export function HomePage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void api
      .getPublicEvents()
      .then((response) => {
        setEvents(response.data)
      })
      .catch(() => {
        setEvents(mockEvents)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const featuredEvents = (events.length > 0 ? events : mockEvents).slice(0, 3)

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const params = new URLSearchParams()

    if (location.trim()) {
      params.set('q', location.trim())
    }

    if (date) {
      params.set('fecha', date)
    }

    navigate(`/partidas${params.toString() ? `?${params.toString()}` : ''}`)
  }

  if (isLoading) {
    return <AppScreenLoader message="Cargando inicio..." />
  }

  return (
    <div className="min-h-screen bg-[#f5f6f7] font-['Inter'] text-[#2c2f30] antialiased">
      <PublicHeader active="home" />

      <section className="relative flex h-[360px] items-center justify-center overflow-hidden bg-[#0c0f10] md:h-[400px]">
        <div className="absolute inset-0 z-0">
          <img
            alt="Equipo de airsoft tactico"
            className="h-full w-full object-cover opacity-30 grayscale"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvOvtHu1ddccaS8D9C1R9uwGpGM3a5HWBxU1GkDjO5pgZw7RbCD9iMoZf50rMiwYQAr0GznwRLtpvuu4waS4jIyunOG_voQzYUHn_q4w7w7VbUqME2mFgpAIdIfBIkVu-9QgWmouGBACpd1Qv2VbNVNi8G9WDJ1XR3RV2PnsbtOba-VEULVFbl2nXQEu4y-3TlQLy-AQQhM0VKZRO47rEbsxXTpKNzQo8fTpwum2K6hxuf-bVDXp3uqu6TY1lrv2-0QckZkVVGcmI"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0c0f10]/80" />
        </div>

        <div className="relative z-10 max-w-4xl px-6 text-center">
          <h1 className="mb-4 text-4xl font-black uppercase tracking-tight text-white md:text-5xl">
            Encontra tu proxima partida
          </h1>
          <p className="text-lg font-medium tracking-wide text-slate-300 md:text-xl">
            Busca por zona y fecha
          </p>
        </div>
      </section>

      <div className="relative z-20 mx-auto -mt-12 max-w-5xl px-6 md:-mt-16">
        <form
          className="flex flex-col gap-2 rounded-2xl border border-[#abadae]/10 bg-white/80 p-2 shadow-[0px_12px_32px_rgba(44,47,48,0.06)] backdrop-blur-[20px] md:flex-row md:items-stretch"
          onSubmit={handleSearch}
        >
          <div className="group flex flex-1 items-center gap-3 rounded-xl bg-[#eff1f2] px-4 py-3 transition-all focus-within:bg-white">
            <span className="material-symbols-outlined text-[#757778]">location_on</span>
            <input
              className="w-full border-none bg-transparent p-0 font-medium text-[#2c2f30] placeholder:text-[#abadae] focus:ring-0"
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Donde queres jugar?"
              type="text"
              value={location}
            />
          </div>

          <div className="group flex flex-1 items-center gap-3 rounded-xl bg-[#eff1f2] px-4 py-3 transition-all focus-within:bg-white">
            <span className="material-symbols-outlined text-[#757778]">calendar_today</span>
            <input
              className="w-full border-none bg-transparent p-0 font-medium text-[#2c2f30] focus:ring-0"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </div>

          <button
            className="flex items-center justify-center gap-2 rounded-xl bg-[#ff7a23] px-8 py-4 font-black uppercase tracking-tighter text-[#3f1700] shadow-[0px_12px_32px_rgba(44,47,48,0.06)] transition-all hover:scale-[1.02] active:scale-95"
            type="submit"
          >
            <span className="material-symbols-outlined">search</span>
            Buscar
          </button>
        </form>
      </div>

      <main className="mx-auto max-w-screen-2xl px-6 py-20 md:px-12 md:py-24">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#994100]">
              Operaciones activas
            </span>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[#2c2f30]">
              Proximas partidas
            </h2>
          </div>
          <div className="hidden h-1 w-24 rounded-full bg-[#ff7a23] md:block" />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featuredEvents.map((event) => (
            <article
              key={event.id}
              className="group overflow-hidden rounded-2xl bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)] transition-all hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  alt={event.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={`https://picsum.photos/seed/${event.slug}/900/600`}
                />
                <div className="absolute left-4 top-4">
                  <span className="rounded-full bg-[#bbf37c] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#355c00]">
                    {event.requires_payment_to_confirm ? 'Pago online' : 'Inscripciones abiertas'}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold leading-tight tracking-tight text-[#2c2f30]">
                    {event.title}
                  </h3>
                  <span className="text-lg font-black text-[#994100]">${event.base_price}</span>
                </div>
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-[#595c5d]">
                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                    <span className="font-medium">{formatEventDate(event.event_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#595c5d]">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span className="font-medium">
                      {event.starts_at} - {event.ends_at} HS
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#595c5d]">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    <span className="font-medium">{event.venue.address}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#e6e8ea] pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                    Precio desde
                  </span>
                  <Link
                    className="rounded-lg bg-[#dadddf] px-5 py-2 text-sm font-bold text-[#2c2f30] transition-all hover:bg-[#ff7a23] hover:text-[#3f1700]"
                    to={`/partidas/${event.public_id}`}
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-20 text-center">
          <Link
            className="group inline-flex items-center gap-3 text-lg font-black uppercase tracking-tighter text-[#994100]"
            to="/partidas"
          >
            Ver todas las partidas
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </Link>
          <div className="mx-auto mt-2 h-0.5 w-40 bg-[#ff7a23]" />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
