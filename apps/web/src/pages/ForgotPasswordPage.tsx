import { Link } from 'react-router-dom'
import { PublicFooter } from '../components/layouts/PublicFooter'
import { PublicHeader } from '../components/layouts/PublicHeader'

export function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f5f6f7] font-['Inter'] text-[#2c2f30] antialiased">
      <PublicHeader active="login" />

      <main className="flex min-h-screen items-center justify-center px-4 pb-8 pt-20 md:px-8">
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-[0px_12px_32px_rgba(44,47,48,0.06)] md:p-10">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#994100]">
            Recuperacion de acceso
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#2c2f30]">
            Restablecer contrasena
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#595c5d]">
            La recuperacion completa todavia no esta habilitada en esta version del
            MVP.
          </p>

          <div className="mt-6 rounded-xl border border-[#dadddf] bg-[#eff1f2] px-4 py-4 text-sm text-[#595c5d]">
            Mientras terminamos esta integracion, el acceso se recupera desde soporte.
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="flex items-center justify-center rounded-xl bg-[#ff7a23] px-6 py-3 font-bold text-[#3f1700] transition-colors hover:bg-[#994100] hover:text-[#fff0e9]"
              to="/ingresar"
            >
              Volver al login
            </Link>
            <Link
              className="flex items-center justify-center rounded-xl border border-[#dadddf] px-6 py-3 font-bold text-[#2c2f30] transition-colors hover:bg-[#eff1f2]"
              to="/"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
