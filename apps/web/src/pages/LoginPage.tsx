import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { PublicFooter } from '../components/layouts/PublicFooter'
import { PublicHeader } from '../components/layouts/PublicHeader'
import { api } from '../lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/panel" replace />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setInfo('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/panel')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo iniciar sesion.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const oauthError = searchParams.get('error')

    if (oauthError) {
      setError(oauthError)
    }
  }, [searchParams])

  function handleGoogleLogin() {
    setError('')
    setInfo('')
    window.location.href = api.getGoogleAuthUrl()
  }

  const googleButton = (
    <>
      <span className="flex h-5 w-5 items-center justify-center">
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 18 18">
          <path
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
            fill="#34A853"
          />
          <path
            d="M3.97 10.73A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.18.28-1.73V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.06l3.01-2.33Z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.32 0 2.5.45 3.43 1.33l2.57-2.57C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.33c.7-2.12 2.69-3.69 5.03-3.69Z"
            fill="#EA4335"
          />
        </svg>
      </span>
      <span className="text-[13px] font-semibold tracking-tight text-[#2c2f30]">
        Continuar con Google
      </span>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f5f6f7] font-['Inter'] text-[#2c2f30] antialiased">
      <PublicHeader active="login" />

      <main className="flex min-h-screen items-center justify-center bg-[#f5f6f7] px-4 pb-8 pt-20 [background-image:radial-gradient(#dadddf_0.5px,transparent_0.5px)] [background-size:24px_24px] md:px-8">
        <div className="grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-xl bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)] md:grid-cols-2">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#2c2f30] p-7 text-white md:p-12">
          <img
            alt="Jugador de airsoft en silueta"
            className="absolute inset-0 h-full w-full object-cover opacity-40 grayscale mix-blend-overlay"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-PLL1nhsAzeIu7d1hahbT_FdAPY2YZksPr3y86KlPkhMSLXhPzEiNwtJ21_bHHBRsn_eBzYE2dtq1vz0PpiiAOC46Si_nejBk19BPBrsU2_oDBNV7Ee0t4Zhl7qY_UA7aV1QTDQq7gUiTsesjPUwoKQlH15TSBGrJaQ7aXb8MPcTl_NhbiHo8E1iLVIiiKrAVJP_ubVn7n2ZPL9tRiqaB5MLLwMYgtmc73X0GG9RBhGQVMQ-8wR65p44xV0RlD_217YyFr0dVdxI"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2c2f30] via-transparent to-transparent" />

          <div className="relative z-10 space-y-12">
            <div>
              <span className="mb-3 inline-block rounded-full bg-[#994100] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#fff0e9]">
                Acceso de jugadores
              </span>
              <h1 className="mb-5 text-4xl font-black leading-none tracking-tighter md:text-6xl">
                VOLVE A TUS
                <br />
                PARTIDAS
              </h1>
            </div>

            <div className="space-y-8">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d1d5d7]">
                Cuando ingresas
              </h2>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[20px] text-[#ff7a23]">
                      confirmation_number
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">Ves tus tickets</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#d1d5d7]">
                      Accede rápido a tus inscripciones y al código de ticket de cada
                      partida.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[20px] text-[#ff7a23]">
                      event_available
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">Seguís tus partidas</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#d1d5d7]">
                      Revisa estado de inscripción, confirmación y cambios de horario desde
                      tu panel.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[20px] text-[#ff7a23]">
                      search
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">
                      Retomas tu próxima reserva
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#d1d5d7]">
                      Vuelve a explorar partidas y completa tu inscripción sin empezar de
                      cero.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-12 flex items-center gap-4 border-t border-white/10 pt-8 text-xs font-bold uppercase tracking-widest text-white/60">
            <span className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              Acceso seguro
            </span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>PlayAirsoft</span>
          </div>
        </section>

        <section className="flex flex-col justify-center bg-white p-8 md:p-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <h2 className="mb-2 text-[28px] font-black tracking-tight text-[#2c2f30]">
                Iniciar sesion
              </h2>
              <p className="text-[13px] text-[#595c5d]">
                Ingresa con tu email y contraseña para continuar.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="pl-1 text-[9px] font-bold uppercase tracking-widest text-[#595c5d]">
                  Email
                </label>
                <input
                  className="h-12 w-full rounded-xl border-none bg-[#eff1f2] px-4 text-[13px] font-medium text-[#2c2f30] placeholder:text-[#abadae] transition-all focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tuemail@ejemplo.com"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-end">
                  <label className="pl-1 text-[9px] font-bold uppercase tracking-widest text-[#595c5d]">
                    Contraseña
                  </label>
                  <Link
                    className="text-[9px] font-bold uppercase tracking-wider text-[#994100] hover:underline"
                    to="/olvide-mi-contrasena"
                  >
                    Olvide mi contraseña
                  </Link>
                </div>

                <div className="relative">
                  <input
                    className="h-12 w-full rounded-xl border-none bg-[#eff1f2] px-4 pr-12 text-[13px] font-medium text-[#2c2f30] placeholder:text-[#abadae] transition-all focus:border-b-2 focus:border-[#994100] focus:bg-white focus:ring-0"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••••"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#757778] transition-colors hover:text-[#2c2f30]"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-[#f95630] bg-[#ffefec] px-4 py-3 text-[13px] font-medium text-[#b02500]">
                  {error}
                </div>
              )}

              {info && (
                <div className="rounded-xl border border-[#dadddf] bg-white px-4 py-3 text-[13px] font-medium text-[#595c5d]">
                  {info}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-[#994100] to-[#ff7a23] px-6 text-[13px] font-bold tracking-tight text-[#fff0e9] shadow-[0px_4px_12px_rgba(255,122,35,0.2)] transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Ingresando...' : 'Entrar'}
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            </form>

            <div className="mt-8">
              <div className="flex items-center gap-4 py-2">
                <div className="flex-grow border-t border-[#abadae]/30" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                  o
                </span>
                <div className="flex-grow border-t border-[#abadae]/30" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dadddf] bg-white px-4 shadow-[0px_2px_8px_rgba(44,47,48,0.06)] transition-all hover:border-[#c6c9ca] hover:bg-[#f8f9fa]"
                  onClick={handleGoogleLogin}
                  type="button"
                >
                  {googleButton}
                </button>
              </div>
            </div>

            <p className="mt-6 px-4 text-center text-[10px] leading-relaxed text-[#595c5d]">
              ¿Todavia no tenes cuenta?{' '}
              <Link className="underline" to="/registro">
                Crear cuenta
              </Link>
            </p>
          </div>
        </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
