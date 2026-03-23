import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppScreenLoader } from '../components/feedback/AppScreenLoader'
import { PublicFooter } from '../components/layouts/PublicFooter'
import { PublicHeader } from '../components/layouts/PublicHeader'
import { api } from '../lib/api'
import type { Event, OwnerProfile, Venue } from '../lib/types'

type PublicOwnerProfile = OwnerProfile & {
  active_events: Event[]
  active_venues: Venue[]
}

const DEFAULT_MEDIA_BG = 'linear-gradient(135deg, #eff1f2 0%, #dadddf 100%)'

function formatEventDate(date: string) {
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

function formatEventTime(time: string) {
  const safeTime = time?.slice(0, 5)
  if (!safeTime || !safeTime.includes(':')) {
    return 'Horario a confirmar'
  }

  return `${safeTime} hs`
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function getVenueImageUrl(venue: Venue) {
  return venue.images?.[0]?.url ?? null
}

function getEventImageUrl(event: Event) {
  const primaryImage = event.images?.find((image) => image.is_primary)?.url
  return primaryImage ?? event.images?.[0]?.url ?? null
}

export function OwnerPublicProfilePage() {
  const { ownerSlug = '' } = useParams()
  const [ownerProfile, setOwnerProfile] = useState<PublicOwnerProfile | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const previewRating = 4

  useEffect(() => {
    if (!ownerSlug.trim()) {
      setOwnerProfile(null)
      setError('No pudimos encontrar este organizador.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    setOwnerProfile(null)

    void api
      .getPublicOwnerProfile(ownerSlug)
      .then((response) => {
        setOwnerProfile(response.data)
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No pudimos cargar el perfil del organizador.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [ownerSlug])

  if (isLoading) {
    return <AppScreenLoader message="Cargando perfil del organizador..." />
  }

  if (!ownerProfile) {
    return (
      <main className="min-h-screen bg-[#f5f6f7] px-6 py-24 text-center text-sm font-bold text-[#b02500]">
        {error || 'No pudimos encontrar este organizador.'}
      </main>
    )
  }

  const heroImage =
    ownerProfile.active_events
      .map((event) => getEventImageUrl(event))
      .find(Boolean) ??
    ownerProfile.active_venues
      .map((venue) => getVenueImageUrl(venue))
      .find(Boolean) ??
    null

  return (
    <div className="min-h-screen bg-[#f5f6f7] font-['Inter'] text-[#2c2f30] antialiased">
      <PublicHeader active="events" />

      <main className="mx-auto max-w-7xl space-y-10 px-6 pb-14 pt-24 md:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)] md:p-8">
          <div className="pointer-events-none absolute -right-28 -top-28 h-64 w-64 rounded-full bg-[#ff7a23]/10" />

          <div className="relative grid grid-cols-1 gap-7 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">Organizador</p>

              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-[#eff1f2]">
                  {ownerProfile.avatar_url ? (
                    <img
                      alt={ownerProfile.organization_name}
                      className="h-full w-full object-cover"
                      src={ownerProfile.avatar_url}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-black text-[#994100]">
                      {getInitials(ownerProfile.organization_name)}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-[#2c2f30] md:text-4xl">
                    {ownerProfile.organization_name}
                  </h1>
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-relaxed text-[#595c5d]">
                {ownerProfile.bio?.trim() ||
                  'Organizador de partidas de airsoft con propuestas activas para jugadores de toda la zona.'}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        index < previewRating ? 'text-[#febb28]' : 'text-[#d1d5d7]'
                      }`}
                      key={index}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="text-sm font-medium text-[#595c5d]">
                  Calificaciones de jugadores (próximamente)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-full bg-[#eff1f2] px-3 py-1 text-xs font-semibold text-[#2c2f30]">
                  {ownerProfile.active_venues.length}{' '}
                  {ownerProfile.active_venues.length === 1 ? 'campo disponible' : 'campos disponibles'}
                </div>
                <div className="rounded-full bg-[#eff1f2] px-3 py-1 text-xs font-semibold text-[#2c2f30]">
                  {ownerProfile.active_events.length}{' '}
                  {ownerProfile.active_events.length === 1
                    ? 'partida publicada'
                    : 'partidas publicadas'}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl">
              {heroImage ? (
                <img
                  alt={ownerProfile.organization_name}
                  className="h-64 w-full object-cover md:h-72"
                  src={heroImage}
                />
              ) : (
                <div
                  className="flex h-64 w-full items-center justify-center md:h-72"
                  style={{ background: DEFAULT_MEDIA_BG }}
                >
                  <span className="material-symbols-outlined text-5xl text-[#757778]">military_tech</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-1">
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-black tracking-tight text-[#2c2f30]">Dónde jugar</h2>
            </div>

            {ownerProfile.active_venues.length === 0 ? (
              <p className="rounded-xl bg-white px-4 py-4 text-sm text-[#595c5d] shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
                Este organizador todavía no publicó campos para mostrar.
              </p>
            ) : (
              <div className="space-y-4">
                {ownerProfile.active_venues.map((venue) => {
                  const venueImageUrl = getVenueImageUrl(venue)

                  return (
                    <Link
                      className="block overflow-hidden rounded-2xl bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)] transition-transform hover:-translate-y-0.5"
                      key={venue.id}
                      to={`/campos/${venue.id}`}
                    >
                      {venueImageUrl ? (
                        <img
                          alt={venue.name}
                          className="h-40 w-full object-cover"
                          src={venueImageUrl}
                        />
                      ) : (
                        <div
                          className="flex h-40 w-full items-center justify-center"
                          style={{ background: DEFAULT_MEDIA_BG }}
                        >
                          <span className="material-symbols-outlined text-4xl text-[#757778]">terrain</span>
                        </div>
                      )}

                      <div className="space-y-3 p-5">
                        <div>
                          <p className="font-bold text-[#2c2f30]">{venue.name}</p>
                          <p className="mt-1 text-sm text-[#595c5d]">{venue.address}</p>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#994100]">
                          Ver campo
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-black tracking-tight text-[#2c2f30]">Próximas partidas</h2>
            </div>

            {ownerProfile.active_events.length === 0 ? (
              <p className="rounded-xl bg-white px-4 py-4 text-sm text-[#595c5d] shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
                Este organizador no tiene partidas publicadas en este momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {ownerProfile.active_events.map((event) => {
                  const eventImageUrl = getEventImageUrl(event)

                  return (
                    <Link
                      className="group block overflow-hidden rounded-2xl bg-white p-4 shadow-[0px_12px_32px_rgba(44,47,48,0.06)] transition-transform hover:-translate-y-0.5"
                      key={event.id}
                      to={`/partidas/${event.public_id}`}
                    >
                      {eventImageUrl ? (
                        <img
                          alt={event.title}
                          className="h-52 w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          src={eventImageUrl}
                        />
                      ) : (
                        <div
                          className="flex h-52 w-full items-center justify-center rounded-xl"
                          style={{ background: DEFAULT_MEDIA_BG }}
                        >
                          <span className="material-symbols-outlined text-4xl text-[#757778]">flag</span>
                        </div>
                      )}

                      <div className="space-y-4 px-1 pb-1 pt-5">
                        <div>
                          <p className="text-xl font-black tracking-tight text-[#2c2f30]">{event.title}</p>
                          <p className="mt-1 text-sm font-medium text-[#595c5d]">{event.venue.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#eff1f2] px-3 py-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                              Fecha
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#2c2f30]">
                              {formatEventDate(event.event_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                              Hora
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#2c2f30]">
                              {formatEventTime(event.starts_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-[#ff7a23] px-4 py-3 text-[#3f1700]">
                          <span className="text-sm font-black uppercase tracking-wider">Ver partida</span>
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
