import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function PublicShell({ children }: PropsWithChildren) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex flex-col antialiased text-white bg-dark">
      <header
        className="fixed top-0 z-50 w-full border-b border-white/10 bg-dark/88 backdrop-blur-md"
        data-purpose="navigation-bar"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-2" to="/">
            <div className="flex h-8 w-8 items-center justify-center rounded-custom bg-primary">
              <span className="text-xl font-extrabold text-dark">P</span>
            </div>
            <span className="text-lg font-extrabold uppercase tracking-tight">
              Play<span className="text-primary">Airsoft</span>
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-5">
            <Link
              className="text-sm font-semibold transition-colors hover:text-primary"
              to="/"
            >
              Inicio
            </Link>
            <Link
              className="text-sm font-semibold transition-colors hover:text-primary"
              to="/partidas"
            >
              Partidas
            </Link>
            {user ? (
              <Link className="button-secondary" to="/panel">
                Mi panel
              </Link>
            ) : (
              <Link className="button-secondary" to="/ingresar">
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mt-16 flex-1">{children}</main>

      <footer className="border-t border-white/5 px-4 py-6" data-purpose="main-footer">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 PlayAirsoft. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link className="transition-colors hover:text-white" to="/">
              Privacidad
            </Link>
            <Link className="transition-colors hover:text-white" to="/">
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
