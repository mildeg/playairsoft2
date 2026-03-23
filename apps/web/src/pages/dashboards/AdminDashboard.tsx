import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { DashboardSkeleton } from '../../components/feedback/DashboardSkeleton'
import { DashboardShell } from '../../components/layouts/DashboardShell'
import { api } from '../../lib/api'
import type { User } from '../../lib/types'

const initialOwnerForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  organization_name: '',
  bio: '',
}

export function AdminDashboard() {
  const { token } = useAuth()
  const [owners, setOwners] = useState<User[]>([])
  const [form, setForm] = useState(initialOwnerForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return

    setIsLoading(true)

    void api
      .getAdminOwners(token)
      .then((response) => {
        setOwners(response.data)
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar el listado de owners.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token])

  function updateField(field: keyof typeof initialOwnerForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleCreateOwner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) return

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const response = await api.createAdminOwner(token, form)
      setOwners((current) => [response.data, ...current])
      setForm(initialOwnerForm)
      setMessage('Owner creado correctamente.')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo crear el owner.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivateOwner(ownerId: number) {
    if (!token) return

    setError('')
    setMessage('')

    try {
      await api.deactivateAdminOwner(token, ownerId)
      setOwners((current) =>
        current.map((owner) =>
          owner.id === ownerId ? { ...owner, status: 'inactive' } : owner,
        ),
      )
      setMessage('Owner desactivado correctamente.')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo desactivar el owner.',
      )
    }
  }

  const stats = useMemo(() => {
    const activeOwners = owners.filter((owner) => owner.status === 'active').length
    const inactiveOwners = owners.filter((owner) => owner.status !== 'active').length

    return {
      total: owners.length,
      activeOwners,
      inactiveOwners,
    }
  }, [owners])

  if (isLoading) {
    return <DashboardSkeleton blocks={4} />
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

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
            Owners
          </p>
          <p className="mt-3 text-3xl font-black text-[#2c2f30]">{stats.total}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
            Activos
          </p>
          <p className="mt-3 text-3xl font-black text-[#2c2f30]">{stats.activeOwners}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
            Inactivos
          </p>
          <p className="mt-3 text-3xl font-black text-[#2c2f30]">{stats.inactiveOwners}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <div className="mb-5">
            <h2 className="text-2xl font-black tracking-tight text-[#2c2f30]">
              Crear owner
            </h2>
            <p className="mt-1 text-sm text-[#595c5d]">
              Alta manual de nuevos organizadores dentro de la plataforma.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleCreateOwner}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="w-full rounded-2xl border-none bg-[#eff1f2] px-4 py-4 text-sm focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Nombre"
                type="text"
                value={form.name}
              />
              <input
                className="w-full rounded-2xl border-none bg-[#eff1f2] px-4 py-4 text-sm focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
                onChange={(event) => updateField('organization_name', event.target.value)}
                placeholder="Organizacion"
                type="text"
                value={form.organization_name}
              />
            </div>

            <input
              className="w-full rounded-2xl border-none bg-[#eff1f2] px-4 py-4 text-sm focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="Email"
              type="email"
              value={form.email}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="w-full rounded-2xl border-none bg-[#eff1f2] px-4 py-4 text-sm focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="Contrasena"
                type="password"
                value={form.password}
              />
              <input
                className="w-full rounded-2xl border-none bg-[#eff1f2] px-4 py-4 text-sm focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
                onChange={(event) =>
                  updateField('password_confirmation', event.target.value)
                }
                placeholder="Confirmar contrasena"
                type="password"
                value={form.password_confirmation}
              />
            </div>

            <textarea
              className="min-h-28 w-full rounded-2xl border-none bg-[#eff1f2] px-4 py-4 text-sm focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
              onChange={(event) => updateField('bio', event.target.value)}
              placeholder="Bio opcional"
              value={form.bio}
            />

            <button
              className="w-full rounded-xl bg-[#ff7a23] px-5 py-3 font-bold text-[#3f1700] transition-colors hover:bg-[#994100] hover:text-[#fff0e9] disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Creando...' : 'Crear owner'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
          <div className="mb-5">
            <h2 className="text-2xl font-black tracking-tight text-[#2c2f30]">
              Owners registrados
            </h2>
            <p className="mt-1 text-sm text-[#595c5d]">
              Lista actual de organizadores dados de alta.
            </p>
          </div>

          {owners.length === 0 ? (
            <div className="rounded-2xl bg-[#eff1f2] p-6 text-sm text-[#595c5d]">
              No hay owners cargados todavia.
            </div>
          ) : (
            <div className="space-y-3">
              {owners.map((owner) => (
                <article
                  key={owner.id}
                  className="rounded-2xl border border-[#e6e8ea] bg-[#f8f6f6] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#2c2f30]">
                        {owner.owner_profile?.organization_name ?? owner.name}
                      </h3>
                      <p className="mt-1 text-sm text-[#595c5d]">{owner.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                        {owner.status}
                      </span>
                      {owner.status === 'active' ? (
                        <button
                          className="rounded-lg border border-[#f95630] px-3 py-2 text-xs font-bold text-[#b02500] transition-colors hover:bg-[#ffefec]"
                          onClick={() => void handleDeactivateOwner(owner.id)}
                          type="button"
                        >
                          Dar de baja
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  )
}
