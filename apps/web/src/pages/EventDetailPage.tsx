import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AppScreenLoader } from '../components/feedback/AppScreenLoader'
import { PublicFooter } from '../components/layouts/PublicFooter'
import { PublicHeader } from '../components/layouts/PublicHeader'
import { api } from '../lib/api'
import { mockEvents } from '../lib/mockEvents'
import type { Event } from '../lib/types'

type PlayerRegistrationSummary = {
  id: number
  status: string
  payment_status: string
}

function formatLongDate(date: string) {
  const normalizedDate = date.includes('T') ? date : `${date}T12:00:00`
  const parsedDate = new Date(normalizedDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha a confirmar'
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(parsedDate)
}

function getEventCoverImage(event: Event) {
  const images = event.images ?? []
  const primary = images.find((image) => image.is_primary)
  return primary?.url ?? images[0]?.url ?? null
}

function buildEventGallery(event: Event) {
  const images = event.images ?? []
  const sortedImages = [...images].sort((left, right) => {
    if (left.is_primary && !right.is_primary) {
      return -1
    }
    if (!left.is_primary && right.is_primary) {
      return 1
    }
    return left.sort_order - right.sort_order
  })

  const galleryFromImages = sortedImages
    .map((image) => ({
      key: `event-image-${image.id}`,
      src: image.url,
      thumbnail: image.thumbnail_url ?? image.url,
    }))
    .filter((image) => Boolean(image.src))

  if (galleryFromImages.length > 0) {
    return galleryFromImages
  }

  return [
    {
      key: `event-fallback-${event.id}`,
      src: getEventCoverImage(event) ?? `https://picsum.photos/seed/${event.slug}/1600/900`,
      thumbnail: getEventCoverImage(event) ?? `https://picsum.photos/seed/${event.slug}/480/270`,
    },
  ]
}

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, token, user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [currentRegistration, setCurrentRegistration] =
    useState<PlayerRegistrationSummary | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    let isMounted = true

    setError('')
    setEvent(null)

    const loadEvent = async () => {
      try {
        const response = await api.getEvent(eventId)

        if (isMounted) {
          setEvent(response.data)
        }

        return
      } catch {
        if (token) {
          try {
            const registrationsResponse = await api.getPlayerRegistrations(token)
            const registrationMatch =
              registrationsResponse.data.find((item) => String(item.event.id) === eventId)?.event ??
              null

            if (registrationMatch) {
              if (isMounted) {
                setEvent(registrationMatch)
              }

              return
            }
          } catch {
            // If the private fallback also fails, continue to mock/not-found handling below.
          }
        }

        const fallback = mockEvents.find((item) => String(item.id) === eventId) ?? null

        if (fallback) {
          if (isMounted) {
            setEvent(fallback)
          }

          return
        }

        if (isMounted) {
          setError('No pudimos encontrar esa partida.')
        }
      }
    }

    void loadEvent()

    return () => {
      isMounted = false
    }
  }, [eventId, token])

  useEffect(() => {
    if (!token || !isAuthenticated || !event) {
      setCurrentRegistration(null)
      return
    }

    void api
      .getPlayerRegistrations(token)
      .then((response) => {
        const match = response.data.find((item) => item.event.id === event.id)

        if (!match) {
          setCurrentRegistration(null)
          return
        }

        setCurrentRegistration({
          id: match.id,
          status: match.status,
          payment_status: match.payment_status,
        })
      })
      .catch(() => {
        setCurrentRegistration(null)
      })
  }, [event, isAuthenticated, token])

  const galleryImages = useMemo(() => (event ? buildEventGallery(event) : []), [event])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [event?.id])

  const hasActiveRegistration =
    currentRegistration !== null &&
    !['cancelled', 'cancelled_by_player', 'cancelled_by_owner'].includes(
      currentRegistration.status,
    )

  async function submitRegistration(categoryId: number) {
    if (!event || !token) {
      return
    }

    if (!user?.player_profile) {
      navigate('/completar-perfil', {
        state: { returnTo: `/partidas/${event.public_id}` },
      })
      return
    }

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const response = await api.createRegistration(token, event.id, {
        event_category_id: categoryId,
      })

      setMessage(response.message)
      setShowCategoryPicker(false)
      setCurrentRegistration((previous) => ({
        id: previous?.id ?? 0,
        status: 'pending',
        payment_status: event.requires_payment_to_confirm ? 'pending' : 'not_required',
      }))
    } catch (submitError) {
      const messageFromError =
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo completar la inscripcion.'

      if (messageFromError.includes('Ya estas inscripto')) {
        setShowCategoryPicker(false)
        setError('Ya tenes una inscripcion activa para esta partida.')
        return
      }

      setError(messageFromError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegister() {
    if (!event) {
      return
    }

    if (hasActiveRegistration) {
      setError('Ya tenes una inscripcion activa para esta partida.')
      return
    }

    const availableCategories = event.categories.filter(
      (category): category is typeof category & { id: number } =>
        typeof category.id === 'number',
    )

    if (availableCategories.length === 0) {
      setError('Esta partida todavia no tiene categorias listas para inscripcion.')
      return
    }

    if (availableCategories.length === 1) {
      await submitRegistration(availableCategories[0].id)
      return
    }

    setSelectedCategoryId(availableCategories[0].id)
    setShowCategoryPicker(true)
  }

  const totalCategoryCapacity =
    event?.categories.reduce((sum, category) => sum + category.capacity, 0) ?? 0
  const topPrice = Number(event?.base_price ?? event?.categories?.[0]?.price ?? 0)
  const canEditEventFromDetail =
    Boolean(event) &&
    user?.role === 'owner' &&
    Boolean(user.owner_profile?.id) &&
    user.owner_profile?.id === event?.owner_profile?.id
  const hasGalleryNavigation = galleryImages.length > 1
  const currentGalleryImage = galleryImages[activeImageIndex] ?? null

  function showPreviousImage() {
    if (!hasGalleryNavigation) {
      return
    }

    setActiveImageIndex((current) =>
      current === 0 ? galleryImages.length - 1 : current - 1,
    )
  }

  function showNextImage() {
    if (!hasGalleryNavigation) {
      return
    }

    setActiveImageIndex((current) =>
      current === galleryImages.length - 1 ? 0 : current + 1,
    )
  }

  if (!event && !error) {
    return <AppScreenLoader message="Cargando detalle..." />
  }

  if (error && !event) {
    return (
      <main className="min-h-screen bg-[#f5f6f7] px-6 py-24 text-center text-sm font-bold text-[#b02500]">
        {error}
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f6f7] font-['Inter'] text-[#2c2f30] antialiased">
      <PublicHeader active="events" />

      <main className="mx-auto flex max-w-7xl flex-col gap-12 px-8 pb-16 pt-24 lg:flex-row">
        {event ? (
          <>
            <div className="flex-1 space-y-10">
              <section className="relative space-y-6">
                {canEditEventFromDetail ? (
                  <div className="pointer-events-none absolute left-0 top-0 z-20 -translate-y-[calc(100%+12px)]">
                    <Link
                      className="pointer-events-auto inline-flex items-center rounded-xl border border-[#dadddf] bg-white px-4 py-2 text-sm font-bold text-[#2c2f30] transition-colors hover:bg-[#eff1f2]"
                      to={`/mis-partidas/${event.id}/editar`}
                    >
                      Ir a vista de edición
                    </Link>
                  </div>
                ) : null}
                <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl bg-[#eff1f2]">
                  <img
                    alt={event.title}
                    className="h-full w-full object-cover"
                    src={
                      currentGalleryImage?.src ??
                      getEventCoverImage(event) ??
                      `https://picsum.photos/seed/${event.slug}/1600/900`
                    }
                  />
                  {hasGalleryNavigation ? (
                    <>
                      <button
                        aria-label="Imagen anterior"
                        className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
                        onClick={showPreviousImage}
                        type="button"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <button
                        aria-label="Imagen siguiente"
                        className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
                        onClick={showNextImage}
                        type="button"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </>
                  ) : null}
                  <div className="absolute left-6 top-6">
                    <span className="flex items-center gap-2 rounded-full bg-[#bbf37c] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#355c00]">
                      <span className="h-2 w-2 rounded-full bg-[#3c6600]" />
                      {event.status === 'published' ? 'Inscripciones abiertas' : event.status}
                    </span>
                  </div>
                  {hasGalleryNavigation ? (
                    <div className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white">
                      {activeImageIndex + 1} / {galleryImages.length}
                    </div>
                  ) : null}
                </div>
                {hasGalleryNavigation ? (
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                    {galleryImages.map((image, index) => (
                      <button
                        className={`overflow-hidden rounded-lg border-2 transition-all ${
                          index === activeImageIndex
                            ? 'border-[#ff7a23] shadow-[0px_8px_20px_rgba(44,47,48,0.15)]'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        key={image.key}
                        onClick={() => setActiveImageIndex(index)}
                        type="button"
                      >
                        <img
                          alt={`${event.title} miniatura ${index + 1}`}
                          className="h-16 w-full object-cover"
                          src={image.thumbnail}
                        />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <h1 className="text-5xl font-black leading-none tracking-tight text-[#2c2f30]">
                    {event.title}
                  </h1>
                  <div className="flex flex-wrap gap-6 pt-2">
                    <div className="flex items-center gap-2 text-[#595c5d]">
                      <span className="material-symbols-outlined text-[#994100]">
                        calendar_today
                      </span>
                      <span className="text-sm font-medium">
                        {formatLongDate(event.event_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#595c5d]">
                      <span className="material-symbols-outlined text-[#994100]">
                        schedule
                      </span>
                      <span className="text-sm font-medium">
                        {event.starts_at} - {event.ends_at} HS
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#595c5d]">
                      <span className="material-symbols-outlined text-[#994100]">
                        location_on
                      </span>
                      <span className="text-sm font-medium">{event.venue.name}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-8 rounded-xl bg-white p-10 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
                <div className="space-y-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#994100]">
                    Briefing de la partida
                  </h2>
                  <p className="leading-relaxed text-[#595c5d]">
                    {event.long_description ?? event.short_description}
                  </p>
                </div>

                <div className="grid gap-8 pt-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[#3c6600]">verified</span>
                      Datos principales
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm text-[#595c5d]">
                        <span className="material-symbols-outlined text-lg text-[#3c6600]">
                          check_circle
                        </span>
                        {event.short_description}
                      </li>
                      <li className="flex items-start gap-3 text-sm text-[#595c5d]">
                        <span className="material-symbols-outlined text-lg text-[#3c6600]">
                          check_circle
                        </span>
                        Organiza {event.owner_profile?.organization_name ?? 'organizador verificado'}
                      </li>
                      <li className="flex items-start gap-3 text-sm text-[#595c5d]">
                        <span className="material-symbols-outlined text-lg text-[#757778]">
                          radio_button_unchecked
                        </span>
                        {event.allows_waitlist ? 'Lista de espera habilitada' : 'Sin lista de espera'}
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-r-lg border-l-4 border-[#994100] bg-orange-50 p-6">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#994100]">
                      <span className="material-symbols-outlined">info</span>
                      Aviso importante
                    </h3>
                    <p className="text-xs leading-relaxed text-[#4e1e00]">
                      {event.requires_payment_to_confirm
                        ? 'Esta partida requiere pago para confirmar tu lugar.'
                        : 'La reserva se realiza desde la plataforma y el pago puede definirse con el organizador.'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4 rounded-xl bg-[#eff1f2] p-8">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                    Organizador
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
                      <span className="material-symbols-outlined">groups</span>
                    </div>
                    <div>
                      {event.owner_profile?.slug ? (
                        <Link
                          className="inline-block cursor-pointer font-bold text-[#2c2f30] transition-colors hover:text-[#994100] hover:underline"
                          to={`/owners/${event.owner_profile.slug}`}
                        >
                          {event.owner_profile.organization_name}
                        </Link>
                      ) : (
                        <p className="font-bold text-[#2c2f30]">
                          {event.owner_profile?.organization_name ?? 'Organizador verificado'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl bg-[#eff1f2] p-8">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                    Predio y servicios
                  </h2>
                  <div className="space-y-3 text-sm text-[#595c5d]">
                    <Link
                      className="inline-block cursor-pointer font-bold text-[#2c2f30] transition-colors hover:text-[#994100] hover:underline"
                      to={`/campos/${event.venue.id}`}
                    >
                      {event.venue.name}
                    </Link>
                    <p>{event.venue.address}</p>
                    <p>
                      {[
                        event.venue.rental_equipment ? 'Alquiler disponible' : null,
                        event.venue.parking ? 'Estacionamiento' : null,
                        event.venue.buffet ? 'Buffet' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Sin servicios destacados'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                  Categorías y cupos
                </h2>
                <div className="grid gap-4">
                  {event.categories.map((category) => (
                    <div
                      key={category.name}
                      className="rounded-xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold uppercase text-[#2c2f30]">{category.name}</p>
                          <p className="mt-1 text-sm text-[#595c5d]">
                            {category.description ?? 'Categoría disponible para esta partida'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[#994100]">ARS {category.price}</p>
                          <p className="text-xs font-medium text-[#595c5d]">
                            {category.capacity} cupos
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="w-full lg:w-[400px]">
              <div className="sticky top-24 space-y-6">
                <div className="overflow-hidden rounded-xl bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
                  <div className="space-y-6 p-8">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                          Precio desde
                        </span>
                        <p className="text-4xl font-black tracking-tighter text-[#2c2f30]">
                          ${topPrice}{' '}
                          <span className="text-sm font-medium text-[#595c5d]">ARS</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-[#eff1f2] pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#595c5d]">Capacidad total</span>
                        <span className="font-bold text-[#2c2f30]">
                          {totalCategoryCapacity || event.capacity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#595c5d]">Formato</span>
                        <span className="font-bold text-[#2c2f30]">
                          {event.format ?? 'Airsoft'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#595c5d]">Estado</span>
                        <span className="font-bold uppercase text-[#3c6600]">
                          {event.status}
                        </span>
                      </div>
                    </div>

                    {message ? (
                      <div className="rounded-lg border border-green-500/40 bg-green-50 p-4 text-sm font-bold text-green-700">
                        {message}
                      </div>
                    ) : null}

                    {error ? (
                      <div className="rounded-lg border border-[#f95630] bg-[#ffefec] p-4 text-sm font-bold text-[#b02500]">
                        {error}
                      </div>
                    ) : null}

                    <div className="space-y-3 pt-4">
                      {isAuthenticated && event.status === 'published' && hasActiveRegistration ? (
                        <div className="rounded-xl border border-[#bbf37c] bg-[#f2ffe2] px-4 py-4 text-center text-sm font-bold text-[#355c00]">
                          Ya estas inscripto en esta partida.
                        </div>
                      ) : isAuthenticated && event.status === 'published' ? (
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff7a23] py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                          disabled={isSubmitting}
                          onClick={handleRegister}
                        >
                          <span className="material-symbols-outlined">
                            {isSubmitting ? 'sync' : 'military_tech'}
                          </span>
                          {isSubmitting ? 'Procesando...' : 'Inscribirme'}
                        </button>
                      ) : isAuthenticated ? (
                        <div className="rounded-xl border border-[#dadddf] bg-[#eff1f2] px-4 py-4 text-center text-sm font-bold text-[#595c5d]">
                          Esta partida no admite nuevas inscripciones.
                        </div>
                      ) : (
                        <Link
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff7a23] py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-95"
                          to="/registro"
                        >
                          <span className="material-symbols-outlined">person_add</span>
                          Crear cuenta para jugar
                        </Link>
                      )}

                      <Link
                        className="flex w-full items-center justify-center rounded-xl border border-[#dadddf] py-3 font-bold text-[#2c2f30] transition-all hover:bg-[#eff1f2]"
                        to="/partidas"
                      >
                        Volver a partidas
                      </Link>
                    </div>

                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center space-y-2 rounded-xl bg-white p-6 text-center shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
                    <span className="material-symbols-outlined text-3xl text-[#994100]">
                      sports_kabaddi
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                        Modalidad
                      </p>
                      <p className="font-bold text-[#2c2f30]">
                        {event.format ?? 'Airsoft'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-2 rounded-xl bg-white p-6 text-center shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
                    <span className="material-symbols-outlined text-3xl text-[#994100]">
                      place_item
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                        Predio
                      </p>
                      <p className="font-bold text-[#2c2f30]">{event.venue.name}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl bg-[#eff1f2] p-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                    Datos rápidos
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#595c5d]">Requiere pago</span>
                      <span className="text-xs font-bold text-[#2c2f30]">
                        {event.requires_payment_to_confirm ? 'Sí' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#595c5d]">Lista de espera</span>
                      <span className="text-xs font-bold text-[#2c2f30]">
                        {event.allows_waitlist ? 'Disponible' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#595c5d]">Edad mínima</span>
                      <span className="text-xs font-bold text-[#2c2f30]">18+</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </>
        ) : null}
      </main>

      {showCategoryPicker && event ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.2)]">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
                Tipo de inscripcion
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-[#2c2f30]">
                Elegi una categoria
              </h3>
              <p className="mt-1 text-sm text-[#595c5d]">{event.title}</p>
            </div>

            <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {event.categories
                .filter(
                  (category): category is typeof category & { id: number } =>
                    typeof category.id === 'number',
                )
                .map((category) => (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dadddf] bg-[#f8f6f6] px-3 py-3 transition-colors hover:bg-white"
                    key={category.id}
                  >
                    <input
                      checked={selectedCategoryId === category.id}
                      className="mt-1"
                      name="event-category"
                      onChange={() => setSelectedCategoryId(category.id)}
                      type="radio"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-[#2c2f30]">
                        {category.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#595c5d]">
                        ARS {category.price} · {category.capacity} cupos
                      </span>
                      {category.description ? (
                        <span className="mt-1 block text-xs text-[#595c5d]">
                          {category.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-[#ff7a23] py-3 text-sm font-bold text-white transition-colors hover:bg-[#994100] disabled:opacity-60"
                disabled={isSubmitting || selectedCategoryId === null}
                onClick={() =>
                  selectedCategoryId !== null
                    ? void submitRegistration(selectedCategoryId)
                    : undefined
                }
                type="button"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar inscripcion'}
              </button>
              <button
                className="rounded-xl border border-[#dadddf] px-4 py-3 text-sm font-bold text-[#595c5d] transition-colors hover:bg-[#eff1f2]"
                onClick={() => {
                  setShowCategoryPicker(false)
                  setSelectedCategoryId(null)
                }}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PublicFooter />
    </div>
  )
}
