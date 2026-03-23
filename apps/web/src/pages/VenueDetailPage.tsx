import { useEffect, useMemo, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { AppScreenLoader } from '../components/feedback/AppScreenLoader'
import { PublicFooter } from '../components/layouts/PublicFooter'
import { PublicHeader } from '../components/layouts/PublicHeader'
import { api } from '../lib/api'
import type { Event, OwnerProfile, Venue } from '../lib/types'

type PublicVenue = Venue & {
  upcoming_events: Event[]
  owner_profile?: OwnerProfile | null
}

const MAX_IMAGE_WIDTH = 1920
const MAX_IMAGE_HEIGHT = 1920
const JPEG_QUALITY = 0.82
const THUMBNAIL_SIZE = 320
const MAX_UPLOAD_BATCH = 10

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

function venueFeatures(venue: Venue) {
  const features: string[] = []

  if (venue.rental_equipment) {
    features.push('Alquiler de equipo')
  }
  if (venue.parking) {
    features.push('Estacionamiento')
  }
  if (venue.buffet) {
    features.push('Buffet')
  }
  if (Array.isArray(venue.amenities) && venue.amenities.length > 0) {
    features.push(...venue.amenities)
  }

  return features
}

function getScaledSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality = JPEG_QUALITY) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo procesar la imagen.'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'))
    image.src = objectUrl
  })

  URL.revokeObjectURL(objectUrl)
  return image
}

async function processVenueImage(file: File) {
  const image = await loadImage(file)

  const optimizedCanvas = document.createElement('canvas')
  const optimizedSize = getScaledSize(
    image.naturalWidth,
    image.naturalHeight,
    MAX_IMAGE_WIDTH,
    MAX_IMAGE_HEIGHT,
  )
  optimizedCanvas.width = optimizedSize.width
  optimizedCanvas.height = optimizedSize.height

  const optimizedContext = optimizedCanvas.getContext('2d')
  if (!optimizedContext) {
    throw new Error('No se pudo inicializar el procesador de imagen.')
  }

  optimizedContext.drawImage(image, 0, 0, optimizedSize.width, optimizedSize.height)
  const optimizedBlob = await canvasToBlob(optimizedCanvas)

  const thumbCanvas = document.createElement('canvas')
  const thumbSize = getScaledSize(
    image.naturalWidth,
    image.naturalHeight,
    THUMBNAIL_SIZE,
    THUMBNAIL_SIZE,
  )
  thumbCanvas.width = thumbSize.width
  thumbCanvas.height = thumbSize.height

  const thumbContext = thumbCanvas.getContext('2d')
  if (!thumbContext) {
    throw new Error('No se pudo generar el thumbnail.')
  }

  thumbContext.drawImage(image, 0, 0, thumbSize.width, thumbSize.height)
  const thumbBlob = await canvasToBlob(thumbCanvas, 0.8)

  const safeBaseName = file.name.replace(/\.[^.]+$/, '') || 'banner'
  return {
    imageFile: new File([optimizedBlob], `${safeBaseName}.jpg`, {
      type: 'image/jpeg',
    }),
    thumbnailFile: new File([thumbBlob], `${safeBaseName}-thumb.jpg`, {
      type: 'image/jpeg',
    }),
  }
}

export function VenueDetailPage() {
  const { venueId = '' } = useParams()
  const { token, user } = useAuth()
  const [venue, setVenue] = useState<PublicVenue | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [canEditVenue, setCanEditVenue] = useState(false)
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)
  const [bannerError, setBannerError] = useState('')
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [isSavingAbout, setIsSavingAbout] = useState(false)
  const [aboutError, setAboutError] = useState('')
  const [aboutForm, setAboutForm] = useState({
    description: '',
    amenitiesText: '',
    rental_equipment: false,
    parking: false,
    buffet: false,
  })
  const [galleryError, setGalleryError] = useState('')
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0)
  const bannerInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const [modalEmblaRef, modalEmblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
  })

  useEffect(() => {
    const numericVenueId = Number(venueId)
    if (!Number.isFinite(numericVenueId)) {
      setVenue(null)
      setError('No pudimos encontrar ese campo.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    setVenue(null)

    void api
      .getPublicVenue(numericVenueId)
      .then((response) => {
        setVenue(response.data)
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No pudimos encontrar ese campo.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [venueId])

  useEffect(() => {
    if (!token || user?.role !== 'owner' || !venue) {
      setCanEditVenue(false)
      return
    }

    void api
      .getOwnerVenues(token)
      .then((response) => {
        const hasVenueAccess = response.data.some((ownerVenue) => ownerVenue.id === venue.id)
        setCanEditVenue(hasVenueAccess)
      })
      .catch(() => {
        setCanEditVenue(false)
      })
  }, [token, user?.role, venue])

  const features = useMemo(() => (venue ? venueFeatures(venue) : []), [venue])
  const coverImage =
    venue?.images?.[0]?.url ?? `https://picsum.photos/seed/venue-${venueId}/1600/900`

  useEffect(() => {
    if (!venue) {
      return
    }

    setAboutForm({
      description: venue.description ?? '',
      amenitiesText: Array.isArray(venue.amenities) ? venue.amenities.join(', ') : '',
      rental_equipment: venue.rental_equipment,
      parking: venue.parking,
      buffet: venue.buffet,
    })
  }, [venue])

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreviewUrl(null)
      return
    }

    const previewUrl = URL.createObjectURL(bannerFile)
    setBannerPreviewUrl(previewUrl)

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [bannerFile])

  function resetBannerModal() {
    setShowBannerModal(false)
    setBannerFile(null)
    setBannerError('')
    setIsUploadingBanner(false)
  }

  async function refreshVenueData() {
    if (!venue) {
      return
    }

    const refreshedVenue = await api.getPublicVenue(venue.id)
    setVenue(refreshedVenue.data)
  }

  async function handleConfirmBannerChange() {
    if (!token || !venue || !bannerFile) {
      return
    }

    setBannerError('')
    setIsUploadingBanner(true)

    try {
      const processed = await processVenueImage(bannerFile)
      const uploadResponse = await api.uploadOwnerVenueImages(token, venue.id, {
        images: [processed.imageFile],
        thumbnails: [processed.thumbnailFile],
      })

      const newBannerImageId =
        uploadResponse.created?.[0]?.id ??
        uploadResponse.data[uploadResponse.data.length - 1]?.id

      if (!newBannerImageId) {
        throw new Error('No se pudo identificar la imagen subida para usarla como banner.')
      }

      await api.setOwnerVenueBanner(token, venue.id, newBannerImageId)
      await refreshVenueData()
      toast.success('Banner actualizado correctamente.')
      resetBannerModal()
    } catch (uploadError) {
      const uploadMessage =
        uploadError instanceof Error ? uploadError.message : 'No se pudo actualizar el banner.'
      setBannerError(uploadMessage)
    } finally {
      setIsUploadingBanner(false)
    }
  }

  async function handleUploadGalleryImages(fileList: FileList | null) {
    if (!token || !venue || !fileList) {
      return
    }

    const selectedFiles = Array.from(fileList).filter((file) => file.type.startsWith('image/'))
    if (selectedFiles.length === 0) {
      setGalleryError('Selecciona al menos una imagen valida.')
      return
    }

    const filesToUpload = selectedFiles.slice(0, MAX_UPLOAD_BATCH)
    if (selectedFiles.length > filesToUpload.length) {
      toast.error(`Solo se cargaron ${filesToUpload.length} imagenes por tanda.`)
    }

    setGalleryError('')
    setIsUploadingGallery(true)

    try {
      const processed = await Promise.all(filesToUpload.map((file) => processVenueImage(file)))

      await api.uploadOwnerVenueImages(token, venue.id, {
        images: processed.map((item) => item.imageFile),
        thumbnails: processed.map((item) => item.thumbnailFile),
      })

      await refreshVenueData()
      toast.success('Fotos cargadas correctamente.')
    } catch (uploadError) {
      setGalleryError(
        uploadError instanceof Error ? uploadError.message : 'No se pudieron cargar las fotos.',
      )
    } finally {
      setIsUploadingGallery(false)
    }
  }

  async function handleSaveAbout() {
    if (!token || !venue) {
      return
    }

    setAboutError('')
    setIsSavingAbout(true)

    try {
      const amenities = aboutForm.amenitiesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

      await api.updateOwnerVenue(token, venue.id, {
        description: aboutForm.description.trim() || null,
        rental_equipment: aboutForm.rental_equipment,
        parking: aboutForm.parking,
        buffet: aboutForm.buffet,
        amenities,
      })

      await refreshVenueData()
      setIsEditingAbout(false)
      toast.success('Informacion del campo actualizada.')
    } catch (saveError) {
      setAboutError(
        saveError instanceof Error
          ? saveError.message
          : 'No se pudo guardar la informacion del campo.',
      )
    } finally {
      setIsSavingAbout(false)
    }
  }

  useEffect(() => {
    if (!modalEmblaApi || !isGalleryModalOpen) {
      return
    }

    modalEmblaApi.reInit()
    modalEmblaApi.scrollTo(activeGalleryIndex, true)
  }, [activeGalleryIndex, isGalleryModalOpen, modalEmblaApi, venue?.images?.length])

  useEffect(() => {
    if (!modalEmblaApi || !isGalleryModalOpen) {
      return
    }

    const syncSelectedIndex = () => {
      setActiveGalleryIndex(modalEmblaApi.selectedScrollSnap())
    }

    modalEmblaApi.on('select', syncSelectedIndex)
    modalEmblaApi.on('reInit', syncSelectedIndex)
    syncSelectedIndex()

    return () => {
      modalEmblaApi.off('select', syncSelectedIndex)
      modalEmblaApi.off('reInit', syncSelectedIndex)
    }
  }, [isGalleryModalOpen, modalEmblaApi])

  useEffect(() => {
    if (!isGalleryModalOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsGalleryModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isGalleryModalOpen])

  function openGalleryModal(index: number) {
    setActiveGalleryIndex(index)
    setIsGalleryModalOpen(true)
  }

  if (isLoading) {
    return <AppScreenLoader message="Cargando campo..." />
  }

  if (!venue) {
    return (
      <main className="min-h-screen bg-[#f5f6f7] px-6 py-24 text-center text-sm font-bold text-[#b02500]">
        {error || 'No pudimos encontrar ese campo.'}
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f6f7] font-['Inter'] text-[#2c2f30] antialiased">
      <PublicHeader active="events" />

      <main className="mx-auto max-w-7xl space-y-8 px-6 pb-14 pt-20 md:px-8">
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <div className="relative h-[260px] md:h-[360px]">
            <img
              alt={venue.name}
              className="h-full w-full object-cover"
              src={coverImage}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">
                Campo
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{venue.name}</h1>
              <p className="mt-2 text-sm text-white/90">{venue.address}</p>
              {canEditVenue ? (
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-bold text-[#2c2f30] transition-colors hover:bg-white"
                  onClick={() => setShowBannerModal(true)}
                  type="button"
                >
                  Cambiar banner
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="space-y-6 rounded-2xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black tracking-tight text-[#2c2f30]">
                  Sobre el campo
                </h2>
                {canEditVenue ? (
                  <div className="flex items-center gap-2">
                    {isEditingAbout ? (
                      <button
                        className="rounded-lg border border-[#dadddf] px-3 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:bg-[#eff1f2]"
                        onClick={() => {
                          setIsEditingAbout(false)
                          setAboutError('')
                          setAboutForm({
                            description: venue.description ?? '',
                            amenitiesText: Array.isArray(venue.amenities)
                              ? venue.amenities.join(', ')
                              : '',
                            rental_equipment: venue.rental_equipment,
                            parking: venue.parking,
                            buffet: venue.buffet,
                          })
                        }}
                        type="button"
                      >
                        Cancelar
                      </button>
                    ) : null}
                    <button
                      className="rounded-lg border border-[#dadddf] px-3 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                      onClick={() => setIsEditingAbout((current) => !current)}
                      type="button"
                    >
                      {isEditingAbout ? 'Cerrar' : 'Editar'}
                    </button>
                  </div>
                ) : null}
              </div>

              {isEditingAbout ? (
                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                      Descripcion
                    </span>
                    <textarea
                      className="min-h-28 w-full rounded-xl border border-[#dadddf] bg-[#f8f6f6] px-3 py-2 text-sm text-[#2c2f30] focus:border-[#994100] focus:outline-none"
                      onChange={(eventInput) =>
                        setAboutForm((current) => ({
                          ...current,
                          description: eventInput.target.value,
                        }))
                      }
                      value={aboutForm.description}
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                      Amenities (separadas por coma)
                    </span>
                    <input
                      className="w-full rounded-xl border border-[#dadddf] bg-[#f8f6f6] px-3 py-2 text-sm text-[#2c2f30] focus:border-[#994100] focus:outline-none"
                      onChange={(eventInput) =>
                        setAboutForm((current) => ({
                          ...current,
                          amenitiesText: eventInput.target.value,
                        }))
                      }
                      type="text"
                      value={aboutForm.amenitiesText}
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-2 rounded-xl bg-[#f8f6f6] p-3 md:grid-cols-3">
                    <label className="flex items-center gap-2 text-sm text-[#2c2f30]">
                      <input
                        checked={aboutForm.rental_equipment}
                        onChange={(eventInput) =>
                          setAboutForm((current) => ({
                            ...current,
                            rental_equipment: eventInput.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      Alquiler
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[#2c2f30]">
                      <input
                        checked={aboutForm.parking}
                        onChange={(eventInput) =>
                          setAboutForm((current) => ({
                            ...current,
                            parking: eventInput.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      Estacionamiento
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[#2c2f30]">
                      <input
                        checked={aboutForm.buffet}
                        onChange={(eventInput) =>
                          setAboutForm((current) => ({
                            ...current,
                            buffet: eventInput.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      Buffet
                    </label>
                  </div>

                  {aboutError ? (
                    <p className="rounded-lg border border-[#f95630] bg-[#ffefec] px-3 py-2 text-xs font-bold text-[#b02500]">
                      {aboutError}
                    </p>
                  ) : null}

                  <button
                    className="rounded-xl bg-[#ff7a23] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#994100] disabled:opacity-60"
                    disabled={isSavingAbout}
                    onClick={() => void handleSaveAbout()}
                    type="button"
                  >
                    {isSavingAbout ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm text-[#595c5d]">
                    {venue.description?.trim() || 'Este campo no tiene descripcion publica todavia.'}
                  </p>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
                      Servicios y amenities
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {features.length === 0 ? (
                        <span className="rounded-full bg-[#eff1f2] px-3 py-1 text-xs font-medium text-[#595c5d]">
                          Sin servicios destacados
                        </span>
                      ) : (
                        features.map((feature) => (
                          <span
                            className="rounded-full bg-[#eff1f2] px-3 py-1 text-xs font-medium text-[#595c5d]"
                            key={feature}
                          >
                            {feature}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>

          <aside className="space-y-4 rounded-2xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
            <h2 className="text-xl font-black tracking-tight text-[#2c2f30]">
              Proximas partidas
            </h2>
            {venue.upcoming_events.length === 0 ? (
              <p className="rounded-xl bg-[#eff1f2] px-4 py-4 text-sm text-[#595c5d]">
                No hay partidas publicadas proximamente en este campo.
              </p>
            ) : (
              <div className="space-y-3">
                {venue.upcoming_events.map((event) => {
                  const price = event.base_price ?? event.categories?.[0]?.price ?? 0

                  return (
                    <Link
                      key={event.id}
                      className="block rounded-xl border border-[#e6e8ea] bg-[#f8f6f6] p-4 transition-colors hover:border-[#dadddf] hover:bg-white"
                      to={`/partidas/${event.public_id}`}
                    >
                      <p className="font-bold text-[#2c2f30]">{event.title}</p>
                      <p className="mt-1 text-xs text-[#595c5d]">
                        {formatEventDate(event.event_date)} · {event.starts_at.slice(0, 5)} hs
                      </p>
                      <p className="mt-2 text-xs font-bold text-[#994100]">
                        Desde ${formatPrice(price)}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}

          </aside>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
                Organiza
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#2c2f30]">
                {venue.owner_profile?.organization_name ?? 'Organizador verificado'}
              </h2>
              <p className="mt-2 max-w-4xl text-sm text-[#595c5d]">
                {venue.owner_profile?.bio?.trim() || 'Equipo organizador de las partidas publicadas en este campo.'}
              </p>
            </div>
            <div className="rounded-xl border border-[#e6e8ea] bg-[#f8f6f6] px-3 py-2 text-xs">
              <span className="font-medium text-[#595c5d]">Estado: </span>
              <span className="font-bold uppercase text-[#2c2f30]">
                {venue.owner_profile?.status ?? 'activo'}
              </span>
            </div>
          </div>

          {venue.owner_profile?.slug ? (
            <Link
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#994100] hover:text-[#863800]"
              to={`/owners/${venue.owner_profile.slug}`}
            >
              Conocer al organizador
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#757778]">
              Galeria
            </p>
            <div className="flex items-center gap-2">
              {canEditVenue ? (
                <>
                  <input
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={(eventInput) => {
                      void handleUploadGalleryImages(eventInput.target.files)
                      eventInput.target.value = ''
                    }}
                    ref={galleryInputRef}
                    type="file"
                  />
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-[#dadddf] bg-white px-3 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100] disabled:opacity-60"
                    disabled={isUploadingGallery}
                    onClick={() => galleryInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingGallery ? 'Subiendo...' : 'Subir fotos'}
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {galleryError ? (
            <p className="mt-4 rounded-lg border border-[#f95630] bg-[#ffefec] px-3 py-2 text-xs font-bold text-[#b02500]">
              {galleryError}
            </p>
          ) : null}

          {venue.images && venue.images.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {venue.images.map((image, index) => (
                <button
                  className="group relative h-28 overflow-hidden rounded-xl text-left md:h-32"
                  key={image.id}
                  onClick={() => openGalleryModal(index)}
                  type="button"
                >
                  <img
                    alt={`Foto ${image.id}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    src={image.url}
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-[#eff1f2] px-4 py-4 text-sm text-[#595c5d]">
              Aun no hay fotos cargadas para este campo.
            </p>
          )}
        </section>
      </main>

      <PublicFooter />

      {showBannerModal && canEditVenue ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.2)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
              Edicion rapida
            </p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-[#2c2f30]">
              Cambiar banner del campo
            </h3>
            <p className="mt-1 text-sm text-[#595c5d]">
              Selecciona una imagen para reemplazar el banner principal.
            </p>

            <div className="mt-5 space-y-3">
              <input
                accept="image/*"
                className="hidden"
                onChange={(eventInput) => {
                  const selectedFile = eventInput.target.files?.[0] ?? null
                  setBannerFile(selectedFile)
                  setBannerError('')
                }}
                ref={bannerInputRef}
                type="file"
              />

              <button
                className="inline-flex items-center gap-2 rounded-lg border border-[#dadddf] bg-white px-3 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                onClick={() => bannerInputRef.current?.click()}
                type="button"
              >
                Adjuntar imagen
                <span className="material-symbols-outlined text-[16px]">upload</span>
              </button>

              <div className="overflow-hidden rounded-xl border border-[#e6e8ea] bg-[#f8f6f6]">
                <img
                  alt="Preview banner"
                  className="h-44 w-full object-cover"
                  src={bannerPreviewUrl ?? coverImage}
                />
              </div>

              {bannerError ? (
                <p className="rounded-lg border border-[#f95630] bg-[#ffefec] px-3 py-2 text-xs font-bold text-[#b02500]">
                  {bannerError}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-[#ff7a23] py-3 text-sm font-bold text-white transition-colors hover:bg-[#994100] disabled:opacity-60"
                disabled={!bannerFile || isUploadingBanner}
                onClick={() => void handleConfirmBannerChange()}
                type="button"
              >
                {isUploadingBanner ? 'Actualizando...' : 'Guardar banner'}
              </button>
              <button
                className="rounded-xl border border-[#dadddf] px-4 py-3 text-sm font-bold text-[#595c5d] transition-colors hover:bg-[#eff1f2]"
                onClick={resetBannerModal}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isGalleryModalOpen && venue.images && venue.images.length > 0 ? (
        <div
          className="fixed inset-0 z-[70] bg-black/85 px-4 py-6"
          onClick={() => setIsGalleryModalOpen(false)}
          role="presentation"
        >
          <div
            className="mx-auto flex h-full w-full max-w-6xl flex-col"
            onClick={(eventClick) => eventClick.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-white">
                Galeria · {activeGalleryIndex + 1}/{venue.images.length}
              </p>
              <button
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                onClick={() => setIsGalleryModalOpen(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl" ref={modalEmblaRef}>
              <div className="flex h-full">
                {venue.images.map((image, index) => (
                  <div className="min-w-0 flex-[0_0_100%]" key={image.id}>
                    <img
                      alt={`Foto ${index + 1}`}
                      className="h-full w-full object-contain"
                      src={image.url}
                    />
                  </div>
                ))}
              </div>

              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                onClick={() => modalEmblaApi?.scrollPrev()}
                type="button"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                onClick={() => modalEmblaApi?.scrollNext()}
                type="button"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
