import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { DashboardSkeleton } from '../components/feedback/DashboardSkeleton'
import { DashboardShell } from '../components/layouts/DashboardShell'
import { api, type ApiRequestError } from '../lib/api'
import type { Event, Venue } from '../lib/types'

type CategoryForm = {
  name: string
  description: string
  price: string
  capacity: string
}

const initialCategory = (): CategoryForm => ({
  name: 'General',
  description: '',
  price: '0',
  capacity: '1',
})

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
  status: 'published',
  requires_payment_to_confirm: false,
  allows_waitlist: true,
  cancellation_deadline: '',
}

type FormState = typeof initialForm
type FieldErrors = Record<string, string>

function getTodayDateInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDateInput(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 10)
}

function extractFieldErrors(requestError: unknown): FieldErrors {
  if (
    !requestError ||
    typeof requestError !== 'object' ||
    !('errors' in requestError) ||
    !requestError.errors ||
    typeof requestError.errors !== 'object'
  ) {
    return {}
  }

  const normalized: FieldErrors = {}
  const apiErrors = requestError.errors as Record<string, string[]>

  for (const [field, messages] of Object.entries(apiErrors)) {
    const message = Array.isArray(messages) ? messages[0] : null

    if (typeof message === 'string' && message.trim()) {
      normalized[field] = message
    }
  }

  return normalized
}

export function OwnerEventCreatePage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [venues, setVenues] = useState<Venue[]>([])
  const [templates, setTemplates] = useState<Event[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [form, setForm] = useState<FormState>(initialForm)
  const [categories, setCategories] = useState<CategoryForm[]>([initialCategory()])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const todayDate = getTodayDateInputValue()
  const formRef = useRef<HTMLFormElement | null>(null)
  const templateOptions = useMemo(() => {
    const replacedTemplateIds = new Set(
      templates
        .map((template) => template.template_source_event_id)
        .filter((templateId): templateId is number => typeof templateId === 'number'),
    )

    return templates.filter((template) => !replacedTemplateIds.has(template.id))
  }, [templates])

  function getFieldError(field: string) {
    return fieldErrors[field] ?? ''
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function resolveFocusField(field: string) {
    if (field === 'categories') {
      return 'categories.0.name'
    }

    return field
  }

  function focusField(field: string) {
    const resolvedField = resolveFocusField(field)
    const selector = `[data-field="${resolvedField}"]`
    const target = formRef.current?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)
    target?.focus()
  }

  function renderFieldError(field: string) {
    const message = getFieldError(field)

    return (
      <div className="min-h-[16px]">
        {message ? <p className="text-[11px] font-bold text-[#b02500]">{message}</p> : null}
      </div>
    )
  }

  function validateForm(): FieldErrors {
    const nextErrors: FieldErrors = {}
    const allowedStatuses = new Set(['draft', 'published'])
    const capacityValue = Number(form.capacity)
    const basePriceValue = form.base_price === '' ? null : Number(form.base_price)

    if (!form.venue_id) {
      nextErrors.venue_id = 'Selecciona un predio.'
    }

    if (!form.title.trim()) {
      nextErrors.title = 'Ingresa un titulo.'
    } else if (form.title.trim().length < 6) {
      nextErrors.title = 'El titulo debe tener al menos 6 caracteres.'
    } else if (form.title.trim().length > 255) {
      nextErrors.title = 'El titulo no puede superar 255 caracteres.'
    }

    if (form.format.trim().length > 255) {
      nextErrors.format = 'El formato no puede superar 255 caracteres.'
    }

    if (!form.short_description.trim()) {
      nextErrors.short_description = 'Ingresa una descripcion corta.'
    } else if (form.short_description.trim().length > 1000) {
      nextErrors.short_description = 'La descripcion corta no puede superar 1000 caracteres.'
    }

    if (!form.event_date) {
      nextErrors.event_date = 'Selecciona una fecha.'
    } else if (form.event_date < todayDate) {
      nextErrors.event_date = 'No puedes publicar una partida con fecha anterior a hoy.'
    }

    if (!form.starts_at) {
      nextErrors.starts_at = 'Ingresa el horario de inicio.'
    }

    if (!form.ends_at) {
      nextErrors.ends_at = 'Ingresa el horario de cierre.'
    } else if (form.starts_at && form.ends_at <= form.starts_at) {
      nextErrors.ends_at = 'La hora de cierre debe ser posterior a la de inicio.'
    }

    if (!Number.isFinite(capacityValue) || capacityValue < 1) {
      nextErrors.capacity = 'La capacidad debe ser mayor o igual a 1.'
    }

    if (basePriceValue !== null && (!Number.isFinite(basePriceValue) || basePriceValue < 0)) {
      nextErrors.base_price = 'El precio base no puede ser negativo.'
    }

    if (!allowedStatuses.has(form.status)) {
      nextErrors.status = 'Selecciona un estado valido.'
    }

    if (form.cancellation_deadline) {
      if (form.cancellation_deadline < todayDate) {
        nextErrors.cancellation_deadline = 'La fecha de cancelacion no puede ser anterior a hoy.'
      } else if (form.event_date && form.cancellation_deadline > form.event_date) {
        nextErrors.cancellation_deadline = 'Debe ser igual o anterior a la fecha de partida.'
      }
    }

    if (categories.length === 0) {
      nextErrors.categories = 'Agrega al menos una categoria.'
    }

    let categoriesCapacity = 0

    categories.forEach((category, index) => {
      if (!category.name.trim()) {
        nextErrors[`categories.${index}.name`] = 'Ingresa un nombre.'
      } else if (category.name.trim().length > 255) {
        nextErrors[`categories.${index}.name`] = 'Maximo 255 caracteres.'
      }

      const categoryPrice = Number(category.price)
      if (!Number.isFinite(categoryPrice) || categoryPrice < 0) {
        nextErrors[`categories.${index}.price`] = 'El precio debe ser mayor o igual a 0.'
      }

      const categoryCapacity = Number(category.capacity)
      if (!Number.isFinite(categoryCapacity) || categoryCapacity < 1) {
        nextErrors[`categories.${index}.capacity`] = 'Los cupos deben ser mayor o igual a 1.'
      } else {
        categoriesCapacity += categoryCapacity
      }
    })

    if (Number.isFinite(capacityValue) && capacityValue > 0 && categoriesCapacity > capacityValue) {
      nextErrors.categories = 'La suma de cupos por categoria no puede superar la capacidad total.'
    }

    return nextErrors
  }

  useEffect(() => {
    if (!token || user?.role !== 'owner') {
      return
    }

    setIsLoading(true)
    setError('')

    void Promise.all([api.getOwnerVenues(token), api.getOwnerEvents(token)])
      .then(([venuesResponse, eventsResponse]) => {
        setVenues(venuesResponse.data)
        setTemplates(eventsResponse.data)

        if (venuesResponse.data.length > 0) {
          setForm((current) => ({
            ...current,
            venue_id: String(venuesResponse.data[0].id),
          }))
        }
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar tus datos para crear la partida.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token, user?.role])

  if (!user) {
    return null
  }

  if (user.role !== 'owner') {
    return <Navigate to="/panel" replace />
  }

  if (isLoading) {
    return <DashboardSkeleton blocks={5} />
  }

  function updateCategory(index: number, field: keyof CategoryForm, value: string) {
    clearFieldError(`categories.${index}.${field}`)
    clearFieldError('categories')
    setCategories((current) =>
      current.map((category, currentIndex) =>
        currentIndex === index ? { ...category, [field]: value } : category,
      ),
    )
  }

  function addCategory() {
    setCategories((current) => [...current, initialCategory()])
  }

  function removeCategory(index: number) {
    setCategories((current) => {
      if (current.length <= 1) {
        return current
      }
      return current.filter((_, currentIndex) => currentIndex !== index)
    })
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((eventTemplate) => String(eventTemplate.id) === templateId)

    if (!template) {
      return
    }

    setForm((current) => ({
      ...current,
      venue_id: String(template.venue.id),
      title: template.title,
      format: template.format ?? '',
      short_description: template.short_description,
      long_description: template.long_description ?? '',
      event_date: (() => {
        const templateDate = toDateInput(template.event_date)
        return templateDate < todayDate ? todayDate : templateDate
      })(),
      starts_at: template.starts_at.slice(0, 5),
      ends_at: template.ends_at.slice(0, 5),
      base_price:
        template.base_price === null || template.base_price === undefined
          ? ''
          : String(template.base_price),
      capacity: String(template.capacity),
      rules: template.rules ?? '',
      status: current.status,
      requires_payment_to_confirm: template.requires_payment_to_confirm,
      allows_waitlist: template.allows_waitlist,
      cancellation_deadline: toDateInput(template.cancellation_deadline),
    }))

    const nextCategories =
      template.categories.length > 0
        ? template.categories.map((category) => ({
            name: category.name,
            description: category.description ?? '',
            price: String(category.price),
            capacity: String(category.capacity),
          }))
        : [initialCategory()]

    setCategories(nextCategories)
    clearFieldError('event_date')
    toast.success('Plantilla aplicada. Ajusta fecha y detalles antes de publicar.')
  }

  async function handleSubmit(eventSubmit: React.FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault()

    if (!token) {
      return
    }

    setError('')
    const nextFieldErrors = validateForm()
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length > 0) {
      const firstErrorField = Object.keys(nextFieldErrors)[0]
      focusField(firstErrorField)
      toast.error(nextFieldErrors[firstErrorField] ?? 'Revisa los campos marcados.')
      return
    }

    setFieldErrors({})

    setIsSubmitting(true)

    try {
      const payload = {
        venue_id: Number(form.venue_id),
        template_source_event_id: selectedTemplateId ? Number(selectedTemplateId) : null,
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
        categories: categories.map((category, index) => ({
          name: category.name.trim(),
          description: category.description.trim() || null,
          price: Number(category.price),
          capacity: Number(category.capacity),
          sort_order: index,
          is_active: true,
        })),
      }

      const response = await api.createOwnerEvent(token, payload)
      toast.success(response.message)
      navigate(`/partidas/${response.data.public_id}`)
    } catch (submitError) {
      const requestFieldErrors = extractFieldErrors(submitError)
      if (Object.keys(requestFieldErrors).length > 0) {
        setFieldErrors(requestFieldErrors)
      }

      const submitMessage =
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo publicar la partida.'

      setError(submitMessage)
      toast.error(submitMessage)

      if ((submitError as ApiRequestError)?.status === 422 && Object.keys(requestFieldErrors).length > 0) {
        focusField(Object.keys(requestFieldErrors)[0])
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardShell activeItem="my-events">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#757778]">
              Nueva publicacion
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#2c2f30]">
              Publicar partida
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
          noValidate
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <section className="space-y-3 rounded-xl border border-[#e6e8ea] bg-[#f8f6f6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                  Plantilla
                </p>
                <p className="text-xs text-[#595c5d]">
                  Reutiliza una partida anterior para acelerar la carga.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                <select
                  className="min-w-[260px] rounded-lg border-none bg-white px-4 py-2.5 text-sm focus:ring-0"
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedTemplateId(value)
                    applyTemplate(value)
                  }}
                  value={selectedTemplateId}
                >
                  <option value="">Seleccionar partida</option>
                  {templateOptions.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {templateOptions.length === 0 ? (
              <p className="text-xs font-medium text-[#757778]">
                Aun no tienes partidas previas para usar como plantilla.
              </p>
            ) : null}
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              {renderFieldError('title')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Titulo
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                data-field="title"
                onChange={(e) => {
                  clearFieldError('title')
                  setForm((current) => ({ ...current, title: e.target.value }))
                }}
                minLength={6}
                required
                type="text"
                value={form.title}
              />
            </div>

            <div className="space-y-1.5">
              {renderFieldError('venue_id')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Predio
              </label>
              <select
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                data-field="venue_id"
                onChange={(e) => {
                  clearFieldError('venue_id')
                  setForm((current) => ({ ...current, venue_id: e.target.value }))
                }}
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
              {renderFieldError('format')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Formato
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                data-field="format"
                onChange={(e) => {
                  clearFieldError('format')
                  setForm((current) => ({ ...current, format: e.target.value }))
                }}
                type="text"
                value={form.format}
              />
            </div>

            <div className="space-y-1.5">
              {renderFieldError('status')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Estado inicial
              </label>
              <select
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                data-field="status"
                onChange={(e) => {
                  clearFieldError('status')
                  setForm((current) => ({ ...current, status: e.target.value }))
                }}
                value={form.status}
              >
                <option value="published">Activa</option>
                <option value="draft">Borrador</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            {renderFieldError('short_description')}
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
              Descripcion corta
            </label>
            <textarea
              className="min-h-20 w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
              data-field="short_description"
              onChange={(e) => {
                clearFieldError('short_description')
                setForm((current) => ({ ...current, short_description: e.target.value }))
              }}
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
              {renderFieldError('event_date')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Fecha
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                data-field="event_date"
                min={todayDate}
                onChange={(e) =>
                  setForm((current) => {
                    const nextDate = e.target.value

                    clearFieldError('event_date')
                    clearFieldError('cancellation_deadline')

                    return { ...current, event_date: nextDate }
                  })
                }
                required
                type="date"
                value={form.event_date}
              />
            </div>
            <div className="space-y-1.5">
              {renderFieldError('starts_at')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Inicio
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                data-field="starts_at"
                onChange={(e) => {
                  clearFieldError('starts_at')
                  clearFieldError('ends_at')
                  setForm((current) => ({ ...current, starts_at: e.target.value }))
                }}
                required
                type="time"
                value={form.starts_at}
              />
            </div>
            <div className="space-y-1.5">
              {renderFieldError('ends_at')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Cierre
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                data-field="ends_at"
                onChange={(e) => {
                  clearFieldError('ends_at')
                  setForm((current) => ({ ...current, ends_at: e.target.value }))
                }}
                required
                type="time"
                value={form.ends_at}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              {renderFieldError('capacity')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Capacidad
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                min={1}
                data-field="capacity"
                onChange={(e) => {
                  clearFieldError('capacity')
                  clearFieldError('categories')
                  setForm((current) => ({ ...current, capacity: e.target.value }))
                }}
                required
                type="number"
                value={form.capacity}
              />
            </div>
            <div className="space-y-1.5">
              {renderFieldError('base_price')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Precio base
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                min={0}
                data-field="base_price"
                onChange={(e) => {
                  clearFieldError('base_price')
                  setForm((current) => ({ ...current, base_price: e.target.value }))
                }}
                type="number"
                value={form.base_price}
              />
            </div>
            <div className="space-y-1.5">
              {renderFieldError('cancellation_deadline')}
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#595c5d]">
                Cierre de cancelacion
              </label>
              <input
                className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm focus:ring-0"
                data-field="cancellation_deadline"
                onChange={(e) => {
                  clearFieldError('cancellation_deadline')
                  setForm((current) => ({
                    ...current,
                    cancellation_deadline: e.target.value,
                  }))
                }}
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

          <section className="space-y-3 rounded-xl border border-[#e6e8ea] bg-[#f8f6f6] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#2c2f30]">Categorias</h2>
              <button
                className="rounded-lg border border-[#dadddf] bg-white px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                onClick={addCategory}
                type="button"
              >
                Agregar categoria
              </button>
            </div>
            {renderFieldError('categories')}

            <div className="space-y-3">
              {categories.map((category, index) => (
                <div
                  key={`category-${index}`}
                  className="grid grid-cols-1 gap-3 rounded-lg bg-white p-3 md:grid-cols-5"
                >
                  <div className="space-y-1">
                    {renderFieldError(`categories.${index}.name`)}
                    <input
                      className="rounded-lg border-none bg-[#eff1f2] px-3 py-2 text-sm focus:ring-0"
                      data-field={`categories.${index}.name`}
                      onChange={(e) => updateCategory(index, 'name', e.target.value)}
                      placeholder="Nombre"
                      required
                      type="text"
                      value={category.name}
                    />
                  </div>
                  <div className="space-y-1">
                    {renderFieldError(`categories.${index}.price`)}
                    <input
                      className="rounded-lg border-none bg-[#eff1f2] px-3 py-2 text-sm focus:ring-0"
                      data-field={`categories.${index}.price`}
                      min={0}
                      onChange={(e) => updateCategory(index, 'price', e.target.value)}
                      placeholder="Precio"
                      required
                      type="number"
                      value={category.price}
                    />
                  </div>
                  <div className="space-y-1">
                    {renderFieldError(`categories.${index}.capacity`)}
                    <input
                      className="rounded-lg border-none bg-[#eff1f2] px-3 py-2 text-sm focus:ring-0"
                      data-field={`categories.${index}.capacity`}
                      min={1}
                      onChange={(e) => updateCategory(index, 'capacity', e.target.value)}
                      placeholder="Cupos"
                      required
                      type="number"
                      value={category.capacity}
                    />
                  </div>
                  <input
                    className="rounded-lg border-none bg-[#eff1f2] px-3 py-2 text-sm focus:ring-0"
                    onChange={(e) => updateCategory(index, 'description', e.target.value)}
                    placeholder="Descripcion"
                    type="text"
                    value={category.description}
                  />
                  <button
                    className="rounded-lg bg-[#ffefec] px-3 py-2 text-xs font-bold text-[#b02500] transition-colors hover:bg-[#f95630]/20 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={categories.length <= 1}
                    onClick={() => removeCategory(index)}
                    type="button"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </section>

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
              {isSubmitting ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </section>
    </DashboardShell>
  )
}
