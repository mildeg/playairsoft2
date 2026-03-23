import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { DashboardSkeleton } from '../components/feedback/DashboardSkeleton'
import { DashboardShell } from '../components/layouts/DashboardShell'
import { api } from '../lib/api'
import type { Venue } from '../lib/types'

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

export function OwnerVenuesPage() {
  const { user, token } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token || user?.role !== 'owner') {
      return
    }

    setIsLoading(true)
    setError('')

    void api
      .getOwnerVenues(token)
      .then((response) => {
        setVenues(response.data)
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar tus predios.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token, user?.role])

  const stats = useMemo(() => {
    const withParking = venues.filter((venue) => venue.parking).length
    const withBuffet = venues.filter((venue) => venue.buffet).length
    const withRentals = venues.filter((venue) => venue.rental_equipment).length

    return {
      total: venues.length,
      withParking,
      withBuffet,
      withRentals,
    }
  }, [venues])

  if (!user) {
    return null
  }

  if (user.role !== 'owner') {
    return <Navigate to="/panel" replace />
  }

  if (isLoading) {
    return <DashboardSkeleton blocks={5} />
  }

  return (
    <DashboardShell activeItem="my-venues">
      {error ? (
        <div className="mb-6 rounded-2xl border border-[#f95630] bg-[#ffefec] p-4 text-sm font-medium text-[#b02500]">
          {error}
        </div>
      ) : null}

      <section className="space-y-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#2c2f30]">Mis predios</h1>
          <p className="mt-1 text-sm text-[#595c5d]">
            Gestiona los campos vinculados a tu organizacion.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
              Total predios
            </p>
            <p className="mt-3 text-3xl font-black text-[#2c2f30]">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
              Con alquiler
            </p>
            <p className="mt-3 text-3xl font-black text-[#2c2f30]">{stats.withRentals}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
              Con parking
            </p>
            <p className="mt-3 text-3xl font-black text-[#2c2f30]">{stats.withParking}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#757778]">
              Con buffet
            </p>
            <p className="mt-3 text-3xl font-black text-[#2c2f30]">{stats.withBuffet}</p>
          </div>
        </div>

        {venues.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-sm text-[#595c5d] shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
            No hay predios cargados para este owner todavia.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {venues.map((venue) => {
              const features = venueFeatures(venue)
              const coverImage =
                venue.images?.[0]?.url ??
                `https://picsum.photos/seed/venue-card-${venue.id}/900/500`

              return (
                <article
                  key={venue.id}
                  className="rounded-2xl bg-white p-5 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]"
                >
                  <div className="mb-4 overflow-hidden rounded-xl bg-[#eff1f2]">
                    <img
                      alt={venue.name}
                      className="h-44 w-full object-cover"
                      src={coverImage}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-[#2c2f30]">{venue.name}</h2>
                      <p className="mt-1 text-sm text-[#595c5d]">{venue.address}</p>
                    </div>
                    <Link
                      className="rounded-lg border border-[#dadddf] bg-white px-3 py-1.5 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                      to={`/mis-predios/${venue.id}/editar`}
                    >
                      Editar
                    </Link>
                  </div>
                  {venue.description ? (
                    <p className="mt-3 text-sm text-[#595c5d]">{venue.description}</p>
                  ) : null}

                  <div className="mt-4">
                    <Link
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#994100] hover:text-[#863800]"
                      to={`/campos/${venue.id}`}
                    >
                      Ver campo
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {features.length === 0 ? (
                      <span className="rounded-full bg-[#eff1f2] px-3 py-1 text-xs font-medium text-[#595c5d]">
                        Sin servicios destacados
                      </span>
                    ) : (
                      features.map((feature) => (
                        <span
                          key={`${venue.id}-${feature}`}
                          className="rounded-full bg-[#eff1f2] px-3 py-1 text-xs font-medium text-[#595c5d]"
                        >
                          {feature}
                        </span>
                      ))
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  )
}
