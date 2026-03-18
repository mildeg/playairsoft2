import type { PropsWithChildren } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function PublicShell({ children }: PropsWithChildren) {
  const { user } = useAuth()

  return (
    <div className="public-shell">
      <div className="shell">
        <header className="topbar">
          <Link className="brand" to="/">
            <div className="brand-mark">PA</div>
            <div className="brand-copy">
              <strong>PlayAirsoft</strong>
              <span>Partidas, predios y organizadores</span>
            </div>
          </Link>

          <nav className="topnav">
            <NavLink to="/">Inicio</NavLink>
            <NavLink to="/partidas">Partidas</NavLink>
            {user ? (
              <Link className="button-secondary" to="/panel">
                Mi panel
              </Link>
            ) : (
              <Link className="button-primary" to="/ingresar">
                Iniciar sesión
              </Link>
            )}
          </nav>
        </header>

        {children}

        <footer className="footer-note">
          PlayAirsoft MVP web. Preparado para Argentina, PWA primero y mobile nativo en la siguiente etapa.
        </footer>
      </div>
    </div>
  )
}
