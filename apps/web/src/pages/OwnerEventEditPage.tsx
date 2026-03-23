import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { DashboardSkeleton } from '../components/feedback/DashboardSkeleton'
import { DashboardShell } from '../components/layouts/DashboardShell'
import { api } from '../lib/api'
import type { Event, EventImage, Venue } from '../lib/types'

const initialForm = {
  venue_id: '',
  title: '',
  format: '',
  short_description: '',
  long_description: '',
  event_date: '',
  starts_at: '',
  ends_at: '',
  base_price: '',
  capacity: '1',
  rules: '',
  status: 'draft',
  requires_payment_to_confirm: false,
  allows_waitlist: true,
  cancellation_deadline: '',
}

type FormState = typeof initialForm
type EventImageDraft = {
  id: string
  file: File
  thumbnailFile: File
  originalName: string
  optimizedUrl: string
  thumbnailUrl: string
  originalSize: number
  processedSize: number
}

const MAX_EVENT_IMAGES = 8
const MAX_IMAGE_WIDTH = 1920
const MAX_IMAGE_HEIGHT = 1920
const THUMBNAIL_SIZE = 320
const JPEG_QUALITY = 0.82

function toDateInput(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 10)
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
          reject(new Error('No se pudo generar la imagen procesada.'))
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

async function processImage(file: File): Promise<EventImageDraft> {
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

  const safeBaseName = file.name.replace(/\.[^.]+$/, '') || 'imagen'
  const optimizedFile = new File([optimizedBlob], `${safeBaseName}.jpg`, {
    type: 'image/jpeg',
  })
  const thumbnailFile = new File([thumbBlob], `${safeBaseName}.thumb.jpg`, {
    type: 'image/jpeg',
  })

  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file: optimizedFile,
    thumbnailFile,
    originalName: file.name,
    optimizedUrl: URL.createObjectURL(optimizedBlob),
    thumbnailUrl: URL.createObjectURL(thumbBlob),
    originalSize: file.size,
    processedSize: optimizedBlob.size,
  }
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`
  return `${Math.round(size / 104857.6) / 10} MB`
}

function releaseDrafts(drafts: EventImageDraft[]) {
  for (const draft of drafts) {
    URL.revokeObjectURL(draft.optimizedUrl)
    URL.revokeObjectURL(draft.thumbnailUrl)
  }
}

export function OwnerEventEditPage() {
  const { token, user } = useAuth()
  const { eventId = '' } = useParams()
  const navigate = useNavigate()
  const numericEventId = Number(eventId)

  const [event, setEvent] = useState<Event | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [uploadedImages, setUploadedImages] = useState<EventImage[]>([])
  const [processingDrafts, setProcessingDrafts] = useState<EventImageDraft[]>([])
  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingImages, setIsUpdatingImages] = useState(false)
  const [draggingImageId, setDraggingImageId] = useState<number | null>(null)
  const [dragOverImageId, setDragOverImageId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const processingDraftsRef = useRef<EventImageDraft[]>([])

  useEffect(() => {
    processingDraftsRef.current = processingDrafts
  }, [processingDrafts])

  useEffect(() => {
    return () => {
      releaseDrafts(processingDraftsRef.current)
    }
  }, [])

  useEffect(() => {
    if (!token || user?.role !== 'owner' || !Number.isFinite(numericEventId)) {
      return
    }

    setIsLoading(true)
    setError('')

    void Promise.all([api.getOwnerEvent(token, numericEventId), api.getOwnerVenues(token)])
      .then(([eventResponse, venuesResponse]) => {
        const loadedEvent = eventResponse.data
        setEvent(loadedEvent)
        setUploadedImages(loadedEvent.images ?? [])
        setVenues(venuesResponse.data)
        setForm({
          venue_id: String(loadedEvent.venue.id),
          title: loadedEvent.title,
          format: loadedEvent.format ?? '',
          short_description: loadedEvent.short_description,
          long_description: loadedEvent.long_description ?? '',
          event_date: toDateInput(loadedEvent.event_date),
          starts_at: loadedEvent.starts_at.slice(0, 5),
          ends_at: loadedEvent.ends_at.slice(0, 5),
          base_price:
            loadedEvent.base_price !== null && loadedEvent.base_price !== undefined
              ? String(loadedEvent.base_price)
              : '',
          capacity: String(loadedEvent.capacity),
          rules: loadedEvent.rules ?? '',
          status: loadedEvent.status,
          requires_payment_to_confirm: loadedEvent.requires_payment_to_confirm,
          allows_waitlist: loadedEvent.allows_waitlist,
          cancellation_deadline: toDateInput(loadedEvent.cancellation_deadline),
        })
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la partida para edicion.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [numericEventId, token, user?.role])

  if (!user) {
    return null
  }

  if (user.role !== 'owner') {
    return <Navigate to="/panel" replace />
  }

  if (!Number.isFinite(numericEventId)) {
    return <Navigate to="/mis-partidas" replace />
  }

  if (isLoading) {
    return <DashboardSkeleton blocks={5} />
  }

  async function addImages(files: File[]) {
    if (!token || files.length === 0) {
      return
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      toast.error('Solo se permiten archivos de imagen.')
      return
    }

    const usedSlots = uploadedImages.length + processingDrafts.length
    const remainingSlots = Math.max(0, MAX_EVENT_IMAGES - usedSlots)
    const filesToProcess = imageFiles.slice(0, remainingSlots)

    if (filesToProcess.length === 0) {
      toast.error(`Ya alcanzaste el maximo de ${MAX_EVENT_IMAGES} imagenes.`)
      return
    }

    setIsProcessingImages(true)
    setError('')

    try {
      const processed = await Promise.all(filesToProcess.map((file) => processImage(file)))
      releaseDrafts(processingDraftsRef.current)
      setProcessingDrafts(processed)

      const response = await api.uploadOwnerEventImages(token, numericEventId, {
        images: processed.map((item) => item.file),
        thumbnails: processed.map((item) => item.thumbnailFile),
      })

      setUploadedImages(response.data)
      toast.success(response.message)

      if (imageFiles.length > filesToProcess.length) {
        toast.error(`Solo se cargaron ${filesToProcess.length} por limite de ${MAX_EVENT_IMAGES}.`)
      }
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : 'No se pudieron cargar las imagenes.',
      )
      toast.error(
        processingError instanceof Error
          ? processingError.message
          : 'No se pudieron cargar las imagenes.',
      )
    } finally {
      releaseDrafts(processingDraftsRef.current)
      setProcessingDrafts([])
      setIsProcessingImages(false)
    }
  }

  async function handleSelectImages(eventInput: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(eventInput.target.files ?? [])
    await addImages(files)
    eventInput.target.value = ''
  }

  async function handleDrop(eventDrop: React.DragEvent<HTMLDivElement>) {
    eventDrop.preventDefault()
    setIsDragActive(false)
    const files = Array.from(eventDrop.dataTransfer.files ?? [])
    await addImages(files)
  }

  async function handleDeleteUploadedImage(imageId: number) {
    if (!token) {
      return
    }

    try {
      const response = await api.deleteOwnerEventImage(token, numericEventId, imageId)
      setUploadedImages((current) => current.filter((image) => image.id !== imageId))
      toast.success(response.message)
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar la imagen.',
      )
    }
  }

  async function persistImageOrder(nextImages: EventImage[]) {
    if (!token || nextImages.length === 0) {
      return
    }

    const primaryImage = nextImages[0]
    const nextPayload = {
      image_ids: nextImages.map((image) => image.id),
      primary_image_id: primaryImage.id,
    }

    const response = await api.reorderOwnerEventImages(token, numericEventId, nextPayload)
    setUploadedImages(response.data)
  }

  async function handleSetPrimaryImage(imageId: number) {
    const current = [...uploadedImages]
    if (current.length === 0) {
      return
    }

    const selectedIndex = current.findIndex((image) => image.id === imageId)
    if (selectedIndex === -1) {
      return
    }

    const reordered = [...current]
    const [selected] = reordered.splice(selectedIndex, 1)
    reordered.unshift(selected)
    const nextImages = reordered.map((image, index) => ({
      ...image,
      is_primary: index === 0,
    }))

    setUploadedImages(nextImages)
    setIsUpdatingImages(true)

    try {
      await persistImageOrder(nextImages)
      toast.success('Imagen principal actualizada.')
    } catch (reorderError) {
      setUploadedImages(current)
      toast.error(
        reorderError instanceof Error
          ? reorderError.message
          : 'No se pudo actualizar la imagen principal.',
      )
    } finally {
      setIsUpdatingImages(false)
    }
  }

  async function handleDropUploadedImage(targetImageId: number) {
    const sourceImageId = draggingImageId
    setDragOverImageId(null)
    setDraggingImageId(null)

    if (!sourceImageId || sourceImageId === targetImageId) {
      return
    }

    const current = [...uploadedImages]
    const sourceIndex = current.findIndex((image) => image.id === sourceImageId)
    const targetIndex = current.findIndex((image) => image.id === targetImageId)

    if (sourceIndex === -1 || targetIndex === -1) {
      return
    }

    const nextImages = [...current]
    const [moved] = nextImages.splice(sourceIndex, 1)
    nextImages.splice(targetIndex, 0, moved)
    const normalizedNextImages = nextImages.map((image, index) => ({
      ...image,
      is_primary: index === 0,
    }))

    setUploadedImages(normalizedNextImages)
    setIsUpdatingImages(true)

    try {
      await persistImageOrder(normalizedNextImages)
      toast.success('Orden de imagenes actualizado.')
    } catch (reorderError) {
      setUploadedImages(current)
      toast.error(
        reorderError instanceof Error
          ? reorderError.message
          : 'No se pudo reordenar las imagenes.',
      )
    } finally {
      setIsUpdatingImages(false)
    }
  }

  async function handleSubmit(eventSubmit: React.FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault()

    if (!token) {
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        venue_id: Number(form.venue_id),
        title: form.title.trim(),
        format: form.format.trim() || null,
        short_description: form.short_description.trim(),
        long_description: form.long_description.trim() || null,
        event_date: form.event_date,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        base_price: form.base_price ? Number(form.base_price) : null,
        capacity: Number(form.capacity),
        rules: form.rules.trim() || null,
        status: form.status,
        requires_payment_to_confirm: form.requires_payment_to_confirm,
        allows_waitlist: form.allows_waitlist,
        cancellation_deadline: form.cancellation_deadline || null,
      }

      const response = await api.updateOwnerEvent(token, numericEventId, payload)
      setEvent(response.data)
      toast.success(response.message)
      navigate('/mis-partidas')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo actualizar la publicacion.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardShell activeItem="my-events">
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#757778]">
              Edicion de publicacion
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#2c2f30]">
              {event?.title ?? 'Editar partida'}
            </h1>
          </div>
          <Link
            className="rounded-xl border border-[#dadddf] px-4 py-2 text-sm font-bold text-[#595c5d] transition-colors hover:bg-white hover:text-[#2c2f30]"
            to="/mis-partidas"
          >
            Volver
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[#f95630] bg-[#ffefec] p-4 text-sm font-medium text-[#b02500]">
            {error}
          </div>
        ) : null}

        <form
          className="space-y-5 rounded-2xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]"
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Titulo
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                required
                type="text"
                value={form.title}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Predio
              </label>
              <select
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(e) =>
                  setForm((current) => ({ ...current, venue_id: e.target.value }))
                }
                required
                value={form.venue_id}
              >
                <option value="">Seleccionar predio</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Formato
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(e) => setForm((current) => ({ ...current, format: e.target.value }))}
                type="text"
                value={form.format}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Estado
              </label>
              <select
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                value={form.status}
              >
                <option value="draft">Borrador</option>
                <option value="published">Activa</option>
                <option value="cancelled">Cancelada</option>
                <option value="completed">Finalizada</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
              Descripcion corta
            </label>
            <textarea
              className="min-h-20 w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
              onChange={(e) =>
                setForm((current) => ({ ...current, short_description: e.target.value }))
              }
              required
              value={form.short_description}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
              Descripcion extendida
            </label>
            <textarea
              className="min-h-28 w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
              onChange={(e) =>
                setForm((current) => ({ ...current, long_description: e.target.value }))
              }
              value={form.long_description}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Fecha
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(e) =>
                  setForm((current) => ({ ...current, event_date: e.target.value }))
                }
                required
                type="date"
                value={form.event_date}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Inicio
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(e) =>
                  setForm((current) => ({ ...current, starts_at: e.target.value }))
                }
                required
                type="time"
                value={form.starts_at}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Cierre
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(e) =>
                  setForm((current) => ({ ...current, ends_at: e.target.value }))
                }
                required
                type="time"
                value={form.ends_at}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Capacidad
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                min={1}
                onChange={(e) =>
                  setForm((current) => ({ ...current, capacity: e.target.value }))
                }
                required
                type="number"
                value={form.capacity}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Precio base
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                min={0}
                onChange={(e) =>
                  setForm((current) => ({ ...current, base_price: e.target.value }))
                }
                type="number"
                value={form.base_price}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Cierre de cancelacion
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    cancellation_deadline: e.target.value,
                  }))
                }
                type="date"
                value={form.cancellation_deadline}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
              Reglas
            </label>
            <textarea
              className="min-h-24 w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
              onChange={(e) => setForm((current) => ({ ...current, rules: e.target.value }))}
              value={form.rules}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl bg-[#f8f6f6] p-4 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm text-[#2c2f30]">
              <input
                checked={form.requires_payment_to_confirm}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    requires_payment_to_confirm: e.target.checked,
                  }))
                }
                type="checkbox"
              />
              Requiere pago para confirmar
            </label>
            <label className="flex items-center gap-3 text-sm text-[#2c2f30]">
              <input
                checked={form.allows_waitlist}
                onChange={(e) =>
                  setForm((current) => ({ ...current, allows_waitlist: e.target.checked }))
                }
                type="checkbox"
              />
              Permite lista de espera
            </label>
          </div>

          <section className="space-y-3 rounded-xl border border-[#e6e8ea] bg-[#f8f6f6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-[#2c2f30]">Imagenes de la publicacion</h2>
                <p className="text-xs text-[#595c5d]">
                  Arrastra imagenes o selecciona archivos. Se reducen de tamano y se crean thumbnails.
                </p>
              </div>
              <label className="cursor-pointer rounded-lg border border-[#dadddf] bg-white px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]">
                Agregar imagenes
                <input
                  accept="image/*"
                  className="hidden"
                  disabled={isProcessingImages}
                  multiple
                  onChange={handleSelectImages}
                  ref={fileInputRef}
                  type="file"
                />
              </label>
            </div>

            <div
              className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
                isDragActive ? 'border-[#994100] bg-[#fff3ea]' : 'border-[#dadddf] bg-white'
              }`}
              onDragEnter={(eventEnter) => {
                eventEnter.preventDefault()
                setIsDragActive(true)
              }}
              onDragLeave={(eventLeave) => {
                eventLeave.preventDefault()
                setIsDragActive(false)
              }}
              onDragOver={(eventOver) => eventOver.preventDefault()}
              onDrop={(eventDrop) => void handleDrop(eventDrop)}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                {isProcessingImages ? 'Procesando y subiendo imagenes...' : 'Arrastra y suelta imagenes aqui'}
              </p>
              <p className="mt-1 text-xs text-[#757778]">
                JPG, PNG o WEBP · maximo {MAX_EVENT_IMAGES} imagenes
              </p>
              <button
                className="mt-3 rounded-lg border border-[#dadddf] px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Seleccionar desde equipo
              </button>
            </div>

            {processingDrafts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {processingDrafts.map((draft) => (
                  <article key={draft.id} className="overflow-hidden rounded-lg bg-white opacity-80">
                    <img
                      alt={draft.originalName}
                      className="h-28 w-full object-cover"
                      src={draft.thumbnailUrl}
                    />
                    <div className="space-y-1 px-2 py-2">
                      <p className="line-clamp-1 text-[10px] font-medium text-[#595c5d]">
                        {draft.originalName}
                      </p>
                      <p className="text-[10px] text-[#757778]">
                        {formatSize(draft.originalSize)} {'->'} {formatSize(draft.processedSize)}
                      </p>
                      <p className="text-[10px] font-bold text-[#994100]">Subiendo...</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {uploadedImages.length === 0 ? (
              <p className="rounded-lg bg-white px-3 py-4 text-xs text-[#595c5d]">
                No hay imagenes guardadas todavia.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {uploadedImages.map((image) => (
                  <article
                    key={image.id}
                    className={`overflow-hidden rounded-lg bg-white transition-shadow ${
                      dragOverImageId === image.id ? 'ring-2 ring-[#994100]' : ''
                    }`}
                    draggable={!isUpdatingImages}
                    onDragEnd={() => {
                      setDraggingImageId(null)
                      setDragOverImageId(null)
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (!isUpdatingImages && draggingImageId !== image.id) {
                        setDragOverImageId(image.id)
                      }
                    }}
                    onDragStart={() => {
                      if (!isUpdatingImages) {
                        setDraggingImageId(image.id)
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (!isUpdatingImages) {
                        void handleDropUploadedImage(image.id)
                      }
                    }}
                  >
                    <img
                      alt={`Imagen ${image.id}`}
                      className="h-28 w-full object-cover"
                      src={image.thumbnail_url ?? image.url}
                    />
                    <div className="space-y-1 px-2 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            image.is_primary
                              ? 'bg-[#bbf37c] text-[#355c00]'
                              : 'bg-[#eff1f2] text-[#595c5d]'
                          }`}
                        >
                          {image.is_primary ? 'Principal' : 'Secundaria'}
                        </span>
                        <a
                          className="text-[10px] font-bold text-[#595c5d] hover:text-[#994100]"
                          href={image.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Ver
                        </a>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium text-[#757778]">
                          Arrastrar para reordenar
                        </span>
                        <button
                          className="rounded-md border border-[#dadddf] px-2 py-1 text-[10px] font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                          disabled={isUpdatingImages}
                          onClick={() => void handleSetPrimaryImage(image.id)}
                          type="button"
                        >
                          Principal
                        </button>
                        <button
                          className="ml-auto rounded-md bg-[#ffefec] px-2 py-1 text-[10px] font-bold text-[#b02500] transition-colors hover:bg-[#f95630]/20"
                          onClick={() => void handleDeleteUploadedImage(image.id)}
                          type="button"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <p className="text-[11px] text-[#595c5d]">
              {uploadedImages.length}/{MAX_EVENT_IMAGES} imagenes guardadas en la publicacion.
            </p>
          </section>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              className="rounded-xl border border-[#dadddf] px-5 py-3 text-sm font-bold text-[#595c5d] transition-colors hover:bg-[#eff1f2]"
              to="/mis-partidas"
            >
              Cancelar
            </Link>
            <button
              className="rounded-xl bg-[#ff7a23] px-6 py-3 text-sm font-bold text-[#3f1700] transition-colors hover:bg-[#994100] hover:text-[#fff0e9] disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>
    </DashboardShell>
  )
}
