import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { DashboardSkeleton } from '../components/feedback/DashboardSkeleton'
import { DashboardShell } from '../components/layouts/DashboardShell'
import { api } from '../lib/api'
import type { Venue, VenueImage } from '../lib/types'

const MAX_VENUE_IMAGES = 10
const MAX_IMAGE_WIDTH = 1920
const MAX_IMAGE_HEIGHT = 1920
const THUMBNAIL_SIZE = 320
const JPEG_QUALITY = 0.82

const initialForm = {
  name: '',
  address: '',
  description: '',
  amenitiesText: '',
  rental_equipment: false,
  parking: false,
  buffet: false,
}

type FormState = typeof initialForm
type VenueImageDraft = {
  id: string
  file: File
  thumbnailFile: File
  originalName: string
  optimizedUrl: string
  thumbnailUrl: string
  originalSize: number
  processedSize: number
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

async function processImage(file: File): Promise<VenueImageDraft> {
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

  const safeBaseName = file.name.replace(/\.[^.]+$/, '') || 'predio'
  const optimizedFile = new File([optimizedBlob], `${safeBaseName}.jpg`, {
    type: 'image/jpeg',
  })
  const thumbFile = new File([thumbBlob], `${safeBaseName}-thumb.jpg`, {
    type: 'image/jpeg',
  })

  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file: optimizedFile,
    thumbnailFile: thumbFile,
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

export function OwnerVenueEditPage() {
  const { token, user } = useAuth()
  const { venueId = '' } = useParams()
  const navigate = useNavigate()
  const numericVenueId = Number(venueId)

  const [venue, setVenue] = useState<Venue | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [images, setImages] = useState<VenueImage[]>([])
  const [newImages, setNewImages] = useState<VenueImageDraft[]>([])
  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingImages, setIsUpdatingImages] = useState(false)
  const [draggingImageId, setDraggingImageId] = useState<number | null>(null)
  const [dragOverImageId, setDragOverImageId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageDraftsRef = useRef<VenueImageDraft[]>([])

  useEffect(() => {
    imageDraftsRef.current = newImages
  }, [newImages])

  useEffect(() => {
    return () => {
      for (const image of imageDraftsRef.current) {
        URL.revokeObjectURL(image.optimizedUrl)
        URL.revokeObjectURL(image.thumbnailUrl)
      }
    }
  }, [])

  useEffect(() => {
    if (!token || user?.role !== 'owner' || !Number.isFinite(numericVenueId)) {
      return
    }

    setIsLoading(true)
    setError('')

    void api
      .getOwnerVenue(token, numericVenueId)
      .then((response) => {
        const loadedVenue = response.data
        setVenue(loadedVenue)
        setImages(loadedVenue.images ?? [])
        setForm({
          name: loadedVenue.name,
          address: loadedVenue.address,
          description: loadedVenue.description ?? '',
          amenitiesText: Array.isArray(loadedVenue.amenities)
            ? loadedVenue.amenities.join(', ')
            : '',
          rental_equipment: loadedVenue.rental_equipment,
          parking: loadedVenue.parking,
          buffet: loadedVenue.buffet,
        })
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar el predio para edicion.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [numericVenueId, token, user?.role])

  if (!user) {
    return null
  }

  if (user.role !== 'owner') {
    return <Navigate replace to="/panel" />
  }

  if (!Number.isFinite(numericVenueId)) {
    return <Navigate replace to="/mis-predios" />
  }

  if (isLoading) {
    return <DashboardSkeleton blocks={5} />
  }

  async function addImages(files: File[]) {
    if (files.length === 0) {
      return
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      toast.error('Solo se permiten archivos de imagen.')
      return
    }

    const usedSlots = images.length + newImages.length
    const remainingSlots = Math.max(0, MAX_VENUE_IMAGES - usedSlots)
    const filesToProcess = imageFiles.slice(0, remainingSlots)

    if (filesToProcess.length === 0) {
      toast.error(`Ya alcanzaste el maximo de ${MAX_VENUE_IMAGES} imagenes.`)
      return
    }

    setIsProcessingImages(true)

    try {
      const processed = await Promise.all(filesToProcess.map((file) => processImage(file)))
      setNewImages((current) => [...current, ...processed].slice(0, MAX_VENUE_IMAGES))

      if (imageFiles.length > filesToProcess.length) {
        toast.error(`Solo se cargaron ${filesToProcess.length} por limite de ${MAX_VENUE_IMAGES}.`)
      }
    } catch (processingError) {
      toast.error(
        processingError instanceof Error
          ? processingError.message
          : 'No se pudieron procesar las imagenes.',
      )
    } finally {
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

  function handleRemoveDraftImage(index: number) {
    setNewImages((current) => {
      const imageToRemove = current[index]
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.optimizedUrl)
        URL.revokeObjectURL(imageToRemove.thumbnailUrl)
      }

      return current.filter((_, currentIndex) => currentIndex !== index)
    })
  }

  async function handleDeleteExistingImage(image: VenueImage) {
    if (!token) {
      return
    }

    try {
      await api.deleteOwnerVenueImage(token, numericVenueId, image.id)
      setImages((current) => current.filter((item) => item.id !== image.id))
      toast.success('Imagen eliminada.')
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo eliminar la imagen.',
      )
    }
  }

  async function persistImageOrder(nextImages: VenueImage[]) {
    if (!token) {
      return
    }

    setIsUpdatingImages(true)

    try {
      const response = await api.reorderOwnerVenueImages(token, numericVenueId, {
        image_ids: nextImages.map((image) => image.id),
      })
      setImages(response.data)
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo actualizar el orden de imagenes.',
      )
      throw requestError
    } finally {
      setIsUpdatingImages(false)
    }
  }

  async function handleDropImage(targetImageId: number) {
    const sourceImageId = draggingImageId
    setDragOverImageId(null)
    setDraggingImageId(null)

    if (!sourceImageId || sourceImageId === targetImageId) {
      return
    }

    const sourceIndex = images.findIndex((image) => image.id === sourceImageId)
    const targetIndex = images.findIndex((image) => image.id === targetImageId)

    if (sourceIndex === -1 || targetIndex === -1) {
      return
    }

    const previousImages = images
    const nextImages = [...images]
    const [moved] = nextImages.splice(sourceIndex, 1)
    nextImages.splice(targetIndex, 0, moved)

    setImages(nextImages)

    try {
      await persistImageOrder(nextImages)
    } catch {
      setImages(previousImages)
    }
  }

  async function handleSetPrimary(imageId: number) {
    if (!token) {
      return
    }

    setIsUpdatingImages(true)

    try {
      const response = await api.setOwnerVenueBanner(token, numericVenueId, imageId)
      setImages(response.data)
      toast.success('Imagen principal actualizada.')
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo actualizar la imagen principal.',
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
      const amenities = form.amenitiesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

      const venueResponse = await api.updateOwnerVenue(token, numericVenueId, {
        name: form.name.trim(),
        address: form.address.trim(),
        description: form.description.trim() || null,
        rental_equipment: form.rental_equipment,
        parking: form.parking,
        buffet: form.buffet,
        amenities,
      })

      if (newImages.length > 0) {
        await api.uploadOwnerVenueImages(token, numericVenueId, {
          images: newImages.map((image) => image.file),
          thumbnails: newImages.map((image) => image.thumbnailFile),
        })
      }

      toast.success('Predio actualizado correctamente.')
      setVenue(venueResponse.data)
      navigate('/mis-predios')
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'No se pudo actualizar el predio.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardShell activeItem="my-venues">
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#757778]">
              Edicion de predio
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#2c2f30]">
              {venue?.name ?? 'Editar predio'}
            </h1>
          </div>
          <Link
            className="rounded-xl border border-[#dadddf] px-4 py-2 text-sm font-bold text-[#595c5d] transition-colors hover:bg-white hover:text-[#2c2f30]"
            to="/mis-predios"
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
                Nombre
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(eventInput) =>
                  setForm((current) => ({ ...current, name: eventInput.target.value }))
                }
                required
                type="text"
                value={form.name}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Direccion
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                onChange={(eventInput) =>
                  setForm((current) => ({ ...current, address: eventInput.target.value }))
                }
                required
                type="text"
                value={form.address}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
              Descripcion
            </label>
            <textarea
              className="min-h-24 w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
              onChange={(eventInput) =>
                setForm((current) => ({ ...current, description: eventInput.target.value }))
              }
              value={form.description}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
              Amenities (separadas por coma)
            </label>
            <input
              className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
              onChange={(eventInput) =>
                setForm((current) => ({ ...current, amenitiesText: eventInput.target.value }))
              }
              type="text"
              value={form.amenitiesText}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl bg-[#f8f6f6] p-4 md:grid-cols-3">
            <label className="flex items-center gap-3 text-sm text-[#2c2f30]">
              <input
                checked={form.rental_equipment}
                onChange={(eventInput) =>
                  setForm((current) => ({
                    ...current,
                    rental_equipment: eventInput.target.checked,
                  }))
                }
                type="checkbox"
              />
              Alquiler de equipo
            </label>
            <label className="flex items-center gap-3 text-sm text-[#2c2f30]">
              <input
                checked={form.parking}
                onChange={(eventInput) =>
                  setForm((current) => ({ ...current, parking: eventInput.target.checked }))
                }
                type="checkbox"
              />
              Estacionamiento
            </label>
            <label className="flex items-center gap-3 text-sm text-[#2c2f30]">
              <input
                checked={form.buffet}
                onChange={(eventInput) =>
                  setForm((current) => ({ ...current, buffet: eventInput.target.checked }))
                }
                type="checkbox"
              />
              Buffet
            </label>
          </div>

          <section className="space-y-3 rounded-xl border border-[#e6e8ea] bg-[#f8f6f6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-[#2c2f30]">Imagenes del predio</h2>
                <p className="text-xs text-[#595c5d]">
                  Carga fotos del campo para la vista publica.
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
                {isProcessingImages ? 'Procesando imagenes...' : 'Arrastra y suelta imagenes aqui'}
              </p>
              <p className="mt-1 text-xs text-[#757778]">
                JPG, PNG o WEBP · maximo {MAX_VENUE_IMAGES} imagenes
              </p>
              <button
                className="mt-3 rounded-lg border border-[#dadddf] px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Seleccionar desde equipo
              </button>
            </div>

            {images.length === 0 && newImages.length === 0 ? (
              <p className="rounded-lg bg-white px-3 py-4 text-xs text-[#595c5d]">
                No cargaste imagenes todavia.
              </p>
            ) : null}

            {images.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                  Imagenes publicadas
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {images.map((image, index) => (
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
                          void handleDropImage(image.id)
                        }
                      }}
                    >
                      <img
                        alt={`Imagen ${image.id}`}
                        className="h-28 w-full object-cover"
                        src={image.thumbnail_url ?? image.url}
                      />
                      <div className="space-y-2 px-2 py-2">
                        <div className="flex items-center justify-between gap-2">
                          {index === 0 ? (
                            <span className="rounded-full bg-[#bbf37c] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#355c00]">
                              Principal
                            </span>
                          ) : (
                            <button
                              className="rounded-md border border-[#dadddf] px-2 py-1 text-[10px] font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100] disabled:opacity-60"
                              disabled={isUpdatingImages}
                              onClick={() => void handleSetPrimary(image.id)}
                              type="button"
                            >
                              Marcar como principal
                            </button>
                          )}
                          <a
                            className="text-[10px] font-bold text-[#595c5d] hover:text-[#994100]"
                            href={image.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Ver
                          </a>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-[#757778]">
                            Arrastrar para reordenar
                          </span>
                          <button
                            className="rounded-md bg-[#ffefec] px-2 py-1 text-[10px] font-bold text-[#b02500] transition-colors hover:bg-[#f95630]/20"
                            onClick={() => void handleDeleteExistingImage(image)}
                            type="button"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {newImages.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[#595c5d]">
                  Nuevas imagenes (se guardan al enviar)
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {newImages.map((image, index) => (
                    <article key={image.id} className="overflow-hidden rounded-lg bg-white">
                      <img
                        alt={image.originalName}
                        className="h-28 w-full object-cover"
                        src={image.thumbnailUrl}
                      />
                      <div className="space-y-1 px-2 py-2">
                        <p className="line-clamp-1 text-[10px] font-medium text-[#595c5d]">
                          {image.originalName}
                        </p>
                        <p className="text-[10px] text-[#757778]">
                          {formatSize(image.originalSize)} {'->'} {formatSize(image.processedSize)}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <a
                            className="text-[10px] font-bold text-[#595c5d] hover:text-[#994100]"
                            href={image.optimizedUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Ver
                          </a>
                          <button
                            className="rounded-md bg-[#ffefec] px-2 py-1 text-[10px] font-bold text-[#b02500] transition-colors hover:bg-[#f95630]/20"
                            onClick={() => handleRemoveDraftImage(index)}
                            type="button"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="text-[11px] text-[#595c5d]">
              {images.length + newImages.length}/{MAX_VENUE_IMAGES} imagenes utilizadas.
            </p>
          </section>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              className="rounded-xl border border-[#dadddf] px-5 py-3 text-sm font-bold text-[#595c5d] transition-colors hover:bg-[#eff1f2]"
              to="/mis-predios"
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
