import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

type DashboardShellProps = PropsWithChildren<{
  title: string
  subtitle: string
  actions?: ReactNode
}>

export function DashboardShell({
  title,
  subtitle,
  actions,
  children,
}: DashboardShellProps) {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard-shell">
      <div className="shell">
        <header className="topbar">
          <Link className="brand" to="/">
            <div className="brand-mark">PA</div>
            <div className="brand-copy">
              <strong>PlayAirsoft</strong>
              <span>Workspace operativo</span>
            </div>
          </Link>

          <div className="topnav">
            <Link to="/partidas">Catalogo</Link>
            <button className="button-ghost" onClick={() => void logout()}>
              Salir
            </button>
          </div>
        </header>

        <section className="dashboard-top section">
          <div>
            <div className="eyebrow">Panel {user?.role}</div>
            <h1 className="page-title">{title}</h1>
            <p className="section-copy">{subtitle}</p>
          </div>

          {actions}
        </section>

        {children}
      </div>
    </div>
  )
}
