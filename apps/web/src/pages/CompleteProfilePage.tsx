import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/useAuth'
import { AppScreenLoader } from '../components/feedback/AppScreenLoader'
import { DashboardShell } from '../components/layouts/DashboardShell'
import { api } from '../lib/api'
import type { LocationOption } from '../lib/types'

const initialForm = {
  dni: '',
  alias: '',
  medical_notes: '',
  age: 18,
  phone: '',
  city: '',
  emergency_contact: '',
}

const initialPreferencesForm = {
  email_notifications: true,
  new_event_alerts: true,
  enrollment_reminders: true,
  organizer_messages: true,
}

const preferenceItems = [
  { id: 'email_notifications', label: 'Notificaciones por email', icon: 'mail' },
  { id: 'new_event_alerts', label: 'Alertas de nuevas partidas', icon: 'sports_kabaddi' },
  {
    id: 'enrollment_reminders',
    label: 'Recordatorios de inscripcion',
    icon: 'notifications_active',
  },
  {
    id: 'organizer_messages',
    label: 'Mensajes del organizador',
    icon: 'campaign',
  },
] as const

type ProfileSection = 'personal' | 'security' | 'preferences'

function parseName(fullName: string) {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean)

  if (tokens.length <= 1) {
    return {
      firstName: tokens[0] ?? '',
      surname: '',
    }
  }

  return {
    firstName: tokens.slice(0, -1).join(' '),
    surname: tokens.at(-1) ?? '',
  }
}

function getCompletion(completeCount: number, totalCount: number) {
  if (totalCount === 0) return 0
  return Math.round((completeCount / totalCount) * 100)
}

function sectionButtonClass(isActive: boolean) {
  if (isActive) {
    return 'flex w-full items-center gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm font-bold text-[#994100] shadow-sm'
  }

  return 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#595c5d] transition-colors hover:bg-white hover:text-[#2c2f30]'
}

export function CompleteProfilePage() {
  const location = useLocation()
  const { user, token, isAuthenticated, refreshUser } = useAuth()
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal')
  const [form, setForm] = useState(initialForm)
  const [preferencesForm, setPreferencesForm] = useState(initialPreferencesForm)
  const [provinces, setProvinces] = useState<LocationOption[]>([])
  const [cities, setCities] = useState<LocationOption[]>([])
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null)
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/panel'

  useEffect(() => {
    let isMounted = true

    setIsLoadingLocations(true)

    void api
      .getCountries()
      .then((response) => {
        if (!isMounted) {
          return
        }

        const defaultCountry =
          response.data.find((country) => country.name.toLowerCase() === 'argentina') ??
          response.data[0] ??
          null

        setSelectedCountryId(defaultCountry?.id ?? null)
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        toast.error('No se pudieron cargar las ubicaciones.')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingLocations(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedCountryId) {
      setProvinces([])
      setSelectedProvinceId(null)
      return
    }

    let isMounted = true

    setIsLoadingLocations(true)

    void api
      .getProvinces(selectedCountryId)
      .then((response) => {
        if (!isMounted) {
          return
        }

        setProvinces(response.data)
        setSelectedProvinceId((currentProvinceId) => {
          if (
            currentProvinceId &&
            response.data.some((province) => province.id === currentProvinceId)
          ) {
            return currentProvinceId
          }

          return null
        })
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        toast.error('No se pudieron cargar las provincias.')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingLocations(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedCountryId])

  useEffect(() => {
    if (!selectedProvinceId) {
      setCities([])
      return
    }

    let isMounted = true

    setIsLoadingCities(true)

    void api
      .getCities(selectedProvinceId)
      .then((response) => {
        if (!isMounted) {
          return
        }

        setCities(response.data)
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        toast.error('No se pudieron cargar las ciudades.')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCities(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedProvinceId])

  useEffect(() => {
    if (!token) {
      return
    }

    setIsLoading(true)

    void api
      .getPlayerProfile(token)
      .then((response) => {
        const loadedForm = {
          dni: response.data?.dni ?? '',
          alias: response.data?.alias ?? '',
          medical_notes: response.data?.medical_notes ?? '',
          age: response.data?.age ?? 18,
          phone: response.data?.phone ?? '',
          city: response.data?.city ?? '',
          emergency_contact: response.data?.emergency_contact ?? '',
        }

        setForm(loadedForm)
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar tu perfil.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token])

  useEffect(() => {
    if (!token || activeSection !== 'preferences') {
      return
    }

    setIsLoadingPreferences(true)

    void api
      .getNotificationPreferences(token)
      .then((response) => {
        setPreferencesForm({
          email_notifications: response.data.email_notifications,
          new_event_alerts: response.data.new_event_alerts,
          enrollment_reminders: response.data.enrollment_reminders,
          organizer_messages: response.data.organizer_messages,
        })
      })
      .catch((requestError) => {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar las preferencias.',
        )
      })
      .finally(() => {
        setIsLoadingPreferences(false)
      })
  }, [activeSection, token])

  const { firstName, surname } = useMemo(() => parseName(user?.name ?? ''), [user?.name])

  const currentCityExistsInCatalog = useMemo(
    () =>
      cities.some(
        (city) => city.name.trim().toLowerCase() === form.city.trim().toLowerCase(),
      ),
    [cities, form.city],
  )

  const profileChecks = useMemo(
    () => [
      Boolean(user?.name?.trim()),
      Boolean(user?.email?.trim()),
      Boolean(form.phone.trim()),
      Boolean(form.city.trim()),
      Boolean(form.age >= 18),
      Boolean(form.dni.trim()),
      Boolean(form.emergency_contact.trim()),
    ],
    [form, user?.email, user?.name],
  )

  const completion = getCompletion(
    profileChecks.filter(Boolean).length,
    profileChecks.length,
  )

  const missingEmergencyContact = !form.emergency_contact.trim()

  if (!isAuthenticated) {
    return <Navigate to="/ingresar" replace />
  }

  if (isLoading) {
    return <AppScreenLoader message="Cargando perfil..." />
  }

  if (!user) {
    return null
  }

  const passwordSetupCompleted = Boolean(user.password_setup_completed)
  const isGoogleOnlyAccount =
    user.social_provider === 'google' && !passwordSetupCompleted
  const requiresCurrentPassword = !isGoogleOnlyAccount

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await api.upsertPlayerProfile(token, {
        ...form,
        age: Number(form.age),
      })

      await refreshUser()
      toast.success('Perfil actualizado correctamente.')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar el perfil.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      return
    }

    setPasswordError('')
    setIsChangingPassword(true)

    try {
      const response = await api.changePassword(token, passwordForm)
      await refreshUser()
      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      })
      setShowPasswordForm(false)
      toast.success(response.message)
    } catch (submitError) {
      setPasswordError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo cambiar la contrasena.',
      )
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleSavePreferences() {
    if (!token) {
      return
    }

    setIsSavingPreferences(true)

    try {
      const response = await api.updateNotificationPreferences(token, preferencesForm)
      setPreferencesForm({
        email_notifications: response.data.email_notifications,
        new_event_alerts: response.data.new_event_alerts,
        enrollment_reminders: response.data.enrollment_reminders,
        organizer_messages: response.data.organizer_messages,
      })
      toast.success(response.message)
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudieron guardar las preferencias.',
      )
    } finally {
      setIsSavingPreferences(false)
    }
  }

  return (
    <DashboardShell
      activeItem="profile"
      sidebarContent={
        <>
          <button
            className={sectionButtonClass(activeSection === 'personal')}
            onClick={() => setActiveSection('personal')}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            Datos Personales
          </button>
          <button
            className={sectionButtonClass(activeSection === 'security')}
            onClick={() => setActiveSection('security')}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">security</span>
            Cuenta y Seguridad
          </button>
          <button
            className={sectionButtonClass(activeSection === 'preferences')}
            onClick={() => setActiveSection('preferences')}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">settings_suggest</span>
            Preferencias
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-6xl space-y-8">
        {error ? (
          <div className="rounded-xl border border-[#f95630] bg-[#ffefec] p-4 text-sm font-medium text-[#b02500]">
            {error}
          </div>
        ) : null}

        <section className="flex flex-col items-start gap-5 rounded-xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="relative group">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-[#2c2f30] text-xl font-black text-white shadow-md">
              {user.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('') || 'PA'}
            </div>
            <button
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-md bg-[#595c5d] text-white shadow-sm transition-transform hover:scale-105"
              disabled
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
            </button>
          </div>

          <div className="flex-1 space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight text-[#2c2f30] md:text-2xl">
              {user.name}
            </h1>
            <p className="text-sm font-medium text-[#595c5d]">{user.email}</p>
            {completion < 100 ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-[#e6e8ea]">
                  <div className="h-full bg-[#994100]" style={{ width: `${completion}%` }} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#994100]">
                  {completion}% completado
                </span>
              </div>
            ) : null}
          </div>

          {missingEmergencyContact ? (
            <div className="flex flex-col gap-3 md:max-w-xs">
              <div className="flex items-start gap-2 rounded-lg border border-[#f95630]/20 bg-[#f95630]/10 p-3">
                <span className="material-symbols-outlined text-[18px] text-[#b02500]">warning</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#520c00]">
                    Perfil incompleto
                  </p>
                  <p className="text-xs text-[#520c00]/80">
                    Falta el contacto de emergencia. Es obligatorio para inscribirte.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {activeSection === 'personal' ? (
            <div className="grid grid-cols-12 gap-8">
              <section className="col-span-12 space-y-6 lg:col-span-7">
                <div className="space-y-6 rounded-xl bg-white p-8 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold tracking-tight">Datos Personales</h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#595c5d]/50">
                      Seccion 01
                        </span>
                      </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        Nombre *
                          </label>
                      <input
                        className="w-full rounded-lg border-none border-b-2 border-transparent bg-[#eff1f2] px-4 py-3 text-sm transition-all focus:border-[#994100] focus:bg-white focus:ring-0 focus:shadow-sm"
                        readOnly
                        type="text"
                        value={firstName}
                      />
                    </div>

                    <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        Apellido *
                          </label>
                      <input
                        className="w-full rounded-lg border-none border-b-2 border-transparent bg-[#eff1f2] px-4 py-3 text-sm transition-all focus:border-[#994100] focus:bg-white focus:ring-0 focus:shadow-sm"
                        readOnly
                        type="text"
                        value={surname}
                      />
                    </div>

                    <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        Email *
                          </label>
                      <input
                        className="w-full rounded-lg border-none border-b-2 border-transparent bg-[#eff1f2] px-4 py-3 text-sm transition-all focus:border-[#994100] focus:bg-white focus:ring-0 focus:shadow-sm"
                        readOnly
                        type="email"
                        value={user.email}
                      />
                    </div>

                    <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        Telefono *
                          </label>
                      <input
                        className="w-full rounded-lg border-none border-b-2 border-transparent bg-[#eff1f2] px-4 py-3 text-sm transition-all focus:border-[#994100] focus:bg-white focus:ring-0 focus:shadow-sm"
                        onChange={(event) =>
                          setForm((current) => ({ ...current, phone: event.target.value }))
                        }
                        placeholder="+54 11 5555 5555"
                        required
                        type="tel"
                        value={form.phone}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        Provincia
                      </label>
                      <select
                        className="w-full rounded-lg border-none border-b-2 border-transparent bg-[#eff1f2] px-4 py-3 text-sm transition-all focus:border-[#994100] focus:bg-white focus:ring-0 focus:shadow-sm"
                        disabled={isLoadingLocations || provinces.length === 0}
                        onChange={(event) => {
                          const nextProvinceId = Number(event.target.value) || null
                          setSelectedProvinceId(nextProvinceId)
                          setForm((current) => ({ ...current, city: '' }))
                        }}
                        value={selectedProvinceId ?? ''}
                      >
                        <option value="">
                          {isLoadingLocations ? 'Cargando provincias...' : 'Seleccionar provincia'}
                        </option>
                        {provinces.map((province) => (
                          <option key={province.id} value={province.id}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        Ciudad
                      </label>
                      <select
                        className="w-full rounded-lg border-none border-b-2 border-transparent bg-[#eff1f2] px-4 py-3 text-sm transition-all focus:border-[#994100] focus:bg-white focus:ring-0 focus:shadow-sm"
                        disabled={isLoadingCities || !selectedProvinceId}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, city: event.target.value }))
                        }
                        value={form.city}
                      >
                        {form.city && !currentCityExistsInCatalog ? (
                          <option value={form.city}>{form.city}</option>
                        ) : null}
                        <option value="">
                          {!selectedProvinceId
                            ? 'Seleccionar provincia primero'
                            : isLoadingCities
                              ? 'Cargando ciudades...'
                              : 'Seleccionar ciudad'}
                        </option>
                        {cities.map((city) => (
                          <option key={city.id} value={city.name}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        DNI / Pasaporte
                          </label>
                      <input
                        className="w-full rounded-lg border-none border-b-2 border-transparent bg-[#eff1f2] px-4 py-3 text-sm transition-all focus:border-[#994100] focus:bg-white focus:ring-0 focus:shadow-sm"
                        onChange={(event) =>
                          setForm((current) => ({ ...current, dni: event.target.value }))
                        }
                        type="text"
                        value={form.dni}
                      />
                    </div>

                    <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        Edad
                          </label>
                      <input
                        className="w-full rounded-lg border-none border-b-2 border-transparent bg-[#eff1f2] px-4 py-3 text-sm transition-all focus:border-[#994100] focus:bg-white focus:ring-0 focus:shadow-sm"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            age: Math.max(18, Number(event.target.value) || 18),
                          }))
                        }
                        type="number"
                        value={form.age}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="col-span-12 lg:col-span-5">
                <div className="space-y-6 rounded-xl bg-white p-8 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight text-[#3c6600]">
                      Datos del Jugador
                    </h3>
                    <span
                      className="material-symbols-outlined text-[#3c6600]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      military_tech
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        Alias
                          </label>
                      <input
                        className="w-full rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm"
                        onChange={(event) =>
                          setForm((current) => ({ ...current, alias: event.target.value }))
                        }
                        placeholder="Tu alias"
                        type="text"
                        value={form.alias}
                      />
                    </div>

                    <div className="space-y-1.5">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-[#994100]">
                        Contacto de emergencia *
                          </label>
                      <input
                        className="w-full rounded-lg border-2 border-dashed border-[#b02500]/20 bg-[#f95630]/5 px-4 py-3 text-sm focus:border-[#b02500] focus:ring-0"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            emergency_contact: event.target.value,
                          }))
                        }
                            placeholder="Obligatorio para la inscripcion"
                        required
                        type="text"
                        value={form.emergency_contact}
                      />
                    </div>

                    <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                        Observaciones medicas
                          </label>
                      <textarea
                        className="h-24 w-full resize-none rounded-lg border-none bg-[#eff1f2] px-4 py-3 text-sm"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            medical_notes: event.target.value,
                          }))
                        }
                        value={form.medical_notes}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {activeSection === 'security' ? (
            <section className="mx-auto max-w-3xl space-y-6 rounded-xl border-t-4 border-orange-500/20 bg-white p-8 shadow-sm">
                  <h3 className="text-lg font-bold tracking-tight">Cuenta y Seguridad</h3>

              {requiresCurrentPassword ? null : (
                <div className="rounded-xl border border-[#febb28]/40 bg-[#febb28]/15 p-4 text-sm text-[#563b00]">
                  Tu cuenta fue creada con Google. Todavia no tenes una contrasena propia de PlayAirsoft.
                  Desde aca podes generar una para ingresar tambien con email y contrasena.
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#e6e8ea] pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                    Rol
                  </span>
                  <span className="text-sm font-bold text-[#2c2f30] capitalize">
                    {user.role}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#e6e8ea] pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                    Estado de cuenta
                  </span>
                  <div className="flex items-center gap-1.5 text-[#3c6600]">
                    <div className="h-2 w-2 rounded-full bg-[#3c6600]" />
                    <span className="text-sm font-bold capitalize">{user.status}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    className="w-full rounded-xl bg-[#dadddf] px-4 py-3 text-sm font-bold text-[#2c2f30] transition-all hover:bg-[#cfd2d5]"
                    onClick={() => {
                      setShowPasswordForm((current) => !current)
                      setPasswordError('')
                    }}
                    type="button"
                  >
                    {requiresCurrentPassword ? 'Cambiar contrasena' : 'Generar contrasena'}
                  </button>

                  {showPasswordForm ? (
                    <form className="space-y-3 rounded-xl bg-[#eff1f2] p-4" onSubmit={handleChangePassword}>
                      {requiresCurrentPassword ? (
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                            Contrasena actual
                          </label>
                          <input
                            className="w-full rounded-lg border-none bg-white px-4 py-3 text-sm"
                            onChange={(event) =>
                              setPasswordForm((current) => ({
                                ...current,
                                current_password: event.target.value,
                              }))
                            }
                            required
                            type="password"
                            value={passwordForm.current_password}
                          />
                        </div>
                      ) : null}

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                          Nueva contrasena
                        </label>
                        <input
                          className="w-full rounded-lg border-none bg-white px-4 py-3 text-sm"
                          minLength={8}
                          onChange={(event) =>
                            setPasswordForm((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          required
                          type="password"
                          value={passwordForm.password}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#595c5d]">
                          Confirmar nueva contrasena
                        </label>
                        <input
                          className="w-full rounded-lg border-none bg-white px-4 py-3 text-sm"
                          minLength={8}
                          onChange={(event) =>
                            setPasswordForm((current) => ({
                              ...current,
                              password_confirmation: event.target.value,
                            }))
                          }
                          required
                          type="password"
                          value={passwordForm.password_confirmation}
                        />
                      </div>

                      {passwordError ? (
                        <div className="rounded-lg border border-[#f95630] bg-[#ffefec] px-3 py-2 text-sm text-[#b02500]">
                          {passwordError}
                        </div>
                      ) : null}

                      <div className="flex justify-end">
                        <button
                          className="rounded-xl bg-gradient-to-b from-[#ff7a23] to-[#994100] px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isChangingPassword}
                          type="submit"
                        >
                          {isChangingPassword ? 'Guardando...' : 'Actualizar contrasena'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'preferences' ? (
            <section className="mx-auto max-w-3xl space-y-6 rounded-xl bg-[#eff1f2] p-8">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold tracking-tight">Preferencias</h3>
              </div>

              <div className="space-y-4">
                {isLoadingPreferences ? (
                  <div className="rounded-lg bg-white p-4 text-sm text-[#595c5d]">
                    Cargando preferencias...
                  </div>
                ) : (
                  preferenceItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#595c5d]">
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>

                    <button
                      className={`relative flex h-5 w-10 items-center rounded-full px-1 ${
                        preferencesForm[item.id] ? 'bg-[#ff7a23]' : 'bg-[#dadddf]'
                      }`}
                      onClick={() =>
                        setPreferencesForm((current) => ({
                          ...current,
                          [item.id]: !current[item.id],
                        }))
                      }
                      type="button"
                    >
                      <div
                        className={`h-3.5 w-3.5 rounded-full bg-white ${
                          preferencesForm[item.id] ? 'ml-auto' : ''
                        }`}
                      />
                    </button>
                  </div>
                  ))
                )}
              </div>

              <div className="flex justify-end">
                <button
                  className="rounded-xl bg-gradient-to-b from-[#ff7a23] to-[#994100] px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoadingPreferences || isSavingPreferences}
                  onClick={() => void handleSavePreferences()}
                  type="button"
                >
                  {isSavingPreferences ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </section>
          ) : null}

          {activeSection === 'personal' ? (
            <div className="flex justify-end">
              <button
                className="rounded-xl bg-gradient-to-b from-[#ff7a23] to-[#994100] px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading || isSubmitting || missingEmergencyContact}
                type="submit"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          ) : null}
        </form>

        <div className="pt-4">
          <Link className="text-sm font-semibold text-[#994100] hover:underline" to={returnTo}>
            Volver al panel
          </Link>
        </div>
      </div>
    </DashboardShell>
  )
}
