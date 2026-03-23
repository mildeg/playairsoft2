import { Link } from 'react-router-dom'

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          © 2026 PlayAirsoft. Todos los derechos reservados.
        </p>

        <div className="flex items-center gap-8">
          <Link
            className="text-xs font-semibold uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600 hover:underline"
            to="/"
          >
            Privacidad
          </Link>
          <Link
            className="text-xs font-semibold uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600 hover:underline"
            to="/"
          >
            Terminos
          </Link>
          <Link
            className="text-xs font-semibold uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600 hover:underline"
            to="/"
          >
            Soporte
          </Link>
        </div>
      </div>
    </footer>
  )
}
