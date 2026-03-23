import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AppScreenLoader } from '../components/feedback/AppScreenLoader'
import { PublicFooter } from '../components/layouts/PublicFooter'
import { PublicHeader } from '../components/layouts/PublicHeader'
import { api } from '../lib/api'
import type { TermsDocument } from '../lib/types'

const initialForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [terms, setTerms] = useState<TermsDocument | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState('')
  const [isLoadingTerms, setIsLoadingTerms] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    void api
      .getActiveTerms()
      .then((response) => {
        setTerms(response.data)
      })
      .catch(() => {
        setError('No se pudo cargar el documento de terminos vigente.')
      })
      .finally(() => {
        setIsLoadingTerms(false)
      })
  }, [])

  if (isAuthenticated) {
    return <Navigate to="/panel" replace />
  }

  if (isLoadingTerms) {
    return <AppScreenLoader message="Cargando registro..." />
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleGoogleRegister() {
    setError('')
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!terms) {
      setError('Falta cargar el documento de terminos.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await register({
        ...form,
        terms_document_id: terms.id,
        accept_terms: acceptTerms,
      })
      navigate('/panel')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo completar el registro.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6f7] font-['Inter'] text-[#2c2f30] antialiased">
      <PublicHeader active="register" />

      <main className="flex min-h-screen items-center justify-center bg-[#f5f6f7] px-4 pb-8 pt-20 [background-image:radial-gradient(#dadddf_0.5px,transparent_0.5px)] [background-size:24px_24px] md:px-8">
        <div className="grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-xl bg-white shadow-[0px_12px_32px_rgba(44,47,48,0.06)] md:grid-cols-2">
          <section className="relative flex flex-col justify-between overflow-hidden bg-[#2c2f30] p-7 text-white md:p-12">
            <div className="absolute inset-0 z-0 opacity-40">
              <img
                alt="Jugador de airsoft con equipo tactico"
                className="h-full w-full object-cover grayscale mix-blend-overlay"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC48Ph1w1sHri_T7ZwCQZ_mWGprpP4k9z6Ta59rSrZQ1qUbnJI8IQFZoX4gWvfgfbCRr6WKdnAu_vL6binXa7lxHb4PAQo9M2cw34dMu3NOHL6FJrxRnVvmJHceeyC7m26w_t9NfeORGU8UXRJokPHVWWseHsIW6FoWtpBSfD8YzyOlkogTtrOeHlRJM324nzu2EklX7nTnqVMi_hkWYVxu-3k3wgGMm12anaNdrnosTkrzb_2uOUarIfQalWjYTcftknITQelVHdo"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2c2f30] via-transparent to-transparent" />
            </div>

            <div className="relative z-10 space-y-12">
              <div>
                <span className="mb-3 inline-block rounded-full bg-[#994100] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#fff0e9]">
                  Nuevo jugador
                </span>
                <h1 className="mb-5 text-4xl font-black leading-none tracking-tighter md:text-6xl">
                  SUMATE A LA
                  <br />
                  PROXIMA PARTIDA
                </h1>
              </div>

              <div className="space-y-8">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d1d5d7]">
                  Lo que vas a poder hacer
                </h2>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                      <span className="material-symbols-outlined text-[20px] text-[#ff7a23]">
                        search
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold leading-tight">
                        Encontrar partidas por zona
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#d1d5d7]">
                        Explora eventos por fecha, ubicacion y modalidad sin depender de
                        mensajes por WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                      <span className="material-symbols-outlined text-[20px] text-[#ff7a23]">
                        qr_code_2
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold leading-tight">
                        Recibir tu ticket digital
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#d1d5d7]">
                        Ten tu inscripcion organizada y lista para el check-in con ticket y
                        validacion en el predio.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                      <span className="material-symbols-outlined text-[20px] text-[#ff7a23]">
                        notifications_active
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold leading-tight">
                        Enterarte de cambios importantes
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#d1d5d7]">
                        Recibi avisos sobre confirmaciones, cambios de horario y novedades
                        de las partidas a las que te anotes.
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
                Registro seguro
              </span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>PlayAirsoft</span>
            </div>
          </section>

          <section className="flex flex-col justify-center bg-white p-8 md:p-16">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <h2 className="mb-2 text-[28px] font-black tracking-tight text-[#2c2f30]">
                  Crear cuenta
                </h2>
                <p className="text-[13px] text-[#595c5d]">
                  Registrate con tus datos basicos. El perfil del jugador se completa antes
                  de tu primera inscripcion.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="ml-1 block text-[9px] font-bold uppercase tracking-widest text-[#595c5d]">
                    Nombre completo
                  </label>
                  <div className="group relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[#757778] transition-colors group-focus-within:text-[#994100]">
                      person
                    </span>
                    <input
                      className="w-full rounded-xl border-b-2 border-transparent bg-[#eff1f2] py-3.5 pl-11 pr-4 text-[13px] text-[#2c2f30] transition-all focus:border-[#994100] focus:bg-white focus:ring-0"
                      onChange={(event) => updateField('name', event.target.value)}
                      placeholder="Tu nombre y apellido"
                      required
                      type="text"
                      value={form.name}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="ml-1 block text-[9px] font-bold uppercase tracking-widest text-[#595c5d]">
                    Email
                  </label>
                  <div className="group relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[#757778] transition-colors group-focus-within:text-[#994100]">
                      alternate_email
                    </span>
                    <input
                      className="w-full rounded-xl border-b-2 border-transparent bg-[#eff1f2] py-3.5 pl-11 pr-4 text-[13px] text-[#2c2f30] transition-all focus:border-[#994100] focus:bg-white focus:ring-0"
                      onChange={(event) => updateField('email', event.target.value)}
                      placeholder="tuemail@ejemplo.com"
                      required
                      type="email"
                      value={form.email}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="ml-1 block text-[9px] font-bold uppercase tracking-widest text-[#595c5d]">
                    Contrasena
                  </label>
                  <div className="group relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[#757778] transition-colors group-focus-within:text-[#994100]">
                      lock
                    </span>
                    <input
                      className="w-full rounded-xl border-b-2 border-transparent bg-[#eff1f2] py-3.5 pl-11 pr-11 text-[13px] text-[#2c2f30] transition-all focus:border-[#994100] focus:bg-white focus:ring-0"
                      onChange={(event) => updateField('password', event.target.value)}
                      placeholder="••••••••••••"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
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

                <div className="space-y-1">
                  <label className="ml-1 block text-[9px] font-bold uppercase tracking-widest text-[#595c5d]">
                    Confirmar contrasena
                  </label>
                  <div className="group relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-[#757778] transition-colors group-focus-within:text-[#994100]">
                      verified_user
                    </span>
                    <input
                      className="w-full rounded-xl border-b-2 border-transparent bg-[#eff1f2] py-3.5 pl-11 pr-4 text-[13px] text-[#2c2f30] transition-all focus:border-[#994100] focus:bg-white focus:ring-0"
                      onChange={(event) =>
                        updateField('password_confirmation', event.target.value)
                      }
                      placeholder="Repite tu contrasena"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={form.password_confirmation}
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl bg-[#eff1f2] px-4 py-3.5">
                  <input
                    checked={acceptTerms}
                    className="mt-1 rounded border-[#abadae] text-[#994100] focus:ring-[#994100]"
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-[13px] leading-relaxed text-[#595c5d]">
                    Acepto los terminos vigentes {terms ? `(v${terms.version})` : ''} para
                    crear mi cuenta y usar la plataforma.
                  </span>
                </label>

                {terms ? (
                  <div className="max-h-28 overflow-y-auto rounded-xl bg-[#eff1f2] px-4 py-3 text-[11px] leading-relaxed text-[#595c5d]">
                    {terms.content}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-xl border border-[#f95630] bg-[#ffefec] px-4 py-3 text-[13px] font-medium text-[#b02500]">
                    {error}
                  </div>
                ) : null}

                <div className="space-y-3 pt-2">
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-[#994100] to-[#ff7a23] px-6 py-3.5 text-[13px] font-bold tracking-tight text-[#3f1700] shadow-[0px_4px_12px_rgba(255,122,35,0.2)] transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting || !terms || !acceptTerms}
                    type="submit"
                  >
                    {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </button>

                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px flex-grow bg-[#dadddf]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#757778]">
                      o
                    </span>
                    <div className="h-px flex-grow bg-[#dadddf]" />
                  </div>

                  <button
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dadddf] bg-white px-4 shadow-[0px_2px_8px_rgba(44,47,48,0.06)] transition-all hover:border-[#c6c9ca] hover:bg-[#f8f9fa]"
                    onClick={handleGoogleRegister}
                    type="button"
                  >
                    {googleButton}
                  </button>

                  <Link
                    className="group flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#2c2f30] transition-colors hover:bg-[#eff1f2]"
                    to="/ingresar"
                  >
                    Ya tenes cuenta?
                    <span className="text-[#994100] underline decoration-2 underline-offset-4 transition-colors group-hover:text-[#863800]">
                      Ingresa aca
                    </span>
                  </Link>
                </div>
              </form>

              <p className="mt-6 px-4 text-center text-[10px] leading-relaxed text-[#595c5d]">
                Al registrarte aceptas nuestras{' '}
                <Link className="underline" to="/">
                  reglas de juego
                </Link>{' '}
                y{' '}
                <Link className="underline" to="/">
                  politicas de privacidad
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
