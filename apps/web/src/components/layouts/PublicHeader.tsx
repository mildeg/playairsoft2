import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { api } from '../../lib/api'
import type { UserNotification } from '../../lib/types'

type PublicHeaderProps = {
  active?: 'home' | 'events' | 'login' | 'register' | 'panel' | 'none'
}

function navItemClass(isActive: boolean) {
  if (isActive) {
    return 'border-b-2 border-orange-600 pb-1 text-orange-600'
  }

  return 'rounded px-3 py-1 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900'
}

export function PublicHeader({ active = 'none' }: PublicHeaderProps) {
  const { user, token, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsError, setNotificationsError] = useState('')
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const notificationsRef = useRef<HTMLDivElement | null>(null)
  const userInitials = useMemo(() => {
    if (!user) return 'PA'

    return (
      user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'PA'
    )
  }, [user])

  useEffect(() => {
    if (!isNotificationsOpen || !token) {
      return
    }

    setIsLoadingNotifications(true)
    setNotificationsError('')

    void api
      .getNotifications(token)
      .then((response) => {
        setNotifications(response.data)
        setUnreadCount(response.unread_count ?? 0)
      })
      .catch((requestError) => {
        setNotificationsError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron cargar las notificaciones.',
        )
      })
      .finally(() => {
        setIsLoadingNotifications(false)
      })
  }, [isNotificationsOpen, token])

  useEffect(() => {
    if (!isNotificationsOpen) {
      return
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isNotificationsOpen])

  async function handleMarkAllAsRead() {
    if (!token) {
      return
    }

    try {
      const response = await api.markAllNotificationsAsRead(token)
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? new Date().toISOString(),
        })),
      )
      setUnreadCount(response.unread_count)
    } catch (requestError) {
      setNotificationsError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudieron actualizar las notificaciones.',
      )
    }
  }

  async function handleNotificationClick(notification: UserNotification) {
    if (!token) {
      return
    }

    if (!notification.read_at) {
      try {
        const response = await api.markNotificationAsRead(token, notification.id)
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? response.data : item,
          ),
        )
        setUnreadCount(response.unread_count)
      } catch {
        // Avoid blocking navigation/open behavior for a failed read mark.
      }
    }

    setIsNotificationsOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link className="text-xl font-black tracking-tighter text-slate-900" to="/">
            PlayAirsoft
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium tracking-tight md:flex">
            <Link className={navItemClass(active === 'home')} to="/">
              Inicio
            </Link>
            <Link className={navItemClass(active === 'events')} to="/partidas">
              Partidas
            </Link>
            {user ? (
              <Link className={navItemClass(active === 'panel')} to="/panel">
                Mi panel
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {user.role === 'owner' ? (
                <Link
                  className="hidden rounded-lg bg-[#ff7a23] px-4 py-2 text-sm font-bold text-[#3f1700] transition-colors hover:bg-[#994100] hover:text-[#fff0e9] lg:inline-flex"
                  to="/mis-partidas/nueva"
                >
                  Publicar
                </Link>
              ) : null}

              <div className="relative" ref={notificationsRef}>
                <button
                  aria-expanded={isNotificationsOpen}
                  aria-haspopup="menu"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsNotificationsOpen((current) => !current)
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 ? (
                    <span className="absolute right-1 top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ff7a23] px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </button>

                {isNotificationsOpen ? (
                  <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Notificaciones</p>
                        <p className="text-xs text-slate-500">
                          {unreadCount > 0
                            ? `${unreadCount} sin leer`
                            : 'Sin pendientes'}
                        </p>
                      </div>
                      <button
                        className="text-xs font-bold text-[#994100] transition-colors hover:text-[#863800] disabled:opacity-50"
                        disabled={unreadCount === 0}
                        onClick={() => void handleMarkAllAsRead()}
                        type="button"
                      >
                        Marcar todas
                      </button>
                    </div>

                    {notificationsError ? (
                      <div className="px-4 py-4 text-sm text-[#b02500]">
                        {notificationsError}
                      </div>
                    ) : isLoadingNotifications ? (
                      <div className="px-4 py-5 text-sm text-slate-500">
                        Cargando notificaciones...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-5 text-sm text-slate-500">
                        No hay notificaciones todavia.
                      </div>
                    ) : (
                      <div className="max-h-[420px] overflow-y-auto">
                        {notifications.map((notification) => {
                          const content = (
                            <>
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#eff1f2] text-[#994100]">
                                  <span className="material-symbols-outlined text-[18px]">
                                    {notification.icon || 'notifications'}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-bold text-slate-900">
                                      {notification.title}
                                    </p>
                                    {!notification.read_at ? (
                                      <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#ff7a23]" />
                                    ) : null}
                                  </div>
                                  {notification.body ? (
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                      {notification.body}
                                    </p>
                                  ) : null}
                                  {notification.action_label ? (
                                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[#994100]">
                                      {notification.action_label}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </>
                          )

                          return notification.action_url ? (
                            <Link
                              key={notification.id}
                              className={`block border-b border-slate-100 px-4 py-4 transition-colors hover:bg-slate-50 ${
                                notification.read_at ? 'bg-white' : 'bg-[#fff8f3]'
                              }`}
                              onClick={() => void handleNotificationClick(notification)}
                              to={notification.action_url}
                            >
                              {content}
                            </Link>
                          ) : (
                            <button
                              key={notification.id}
                              className={`block w-full border-b border-slate-100 px-4 py-4 text-left transition-colors hover:bg-slate-50 ${
                                notification.read_at ? 'bg-white' : 'bg-[#fff8f3]'
                              }`}
                              onClick={() => void handleNotificationClick(notification)}
                              type="button"
                            >
                              {content}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  aria-expanded={isMenuOpen}
                  aria-haspopup="menu"
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#dadddf] bg-gradient-to-br from-[#ff7a23] to-[#994100] text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.03]"
                  onClick={() => {
                    setIsNotificationsOpen(false)
                    setIsMenuOpen((current) => !current)
                  }}
                  type="button"
                >
                  {user.role === 'owner' && user.owner_profile?.avatar_url ? (
                    <img
                      alt={user.owner_profile.organization_name}
                      className="h-full w-full object-cover"
                      src={user.owner_profile.avatar_url}
                    />
                  ) : (
                    userInitials
                  )}
                </button>

                {isMenuOpen ? (
                  <div className="absolute right-0 mt-3 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-bold text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>

                    <div className="p-2">
                      <Link
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        onClick={() => setIsMenuOpen(false)}
                        to="/panel"
                      >
                        <span className="material-symbols-outlined text-[18px]">dashboard</span>
                        Panel
                      </Link>

                      {user.role === 'owner' ? (
                        <>
                          <Link
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setIsMenuOpen(false)}
                            to={user.owner_profile?.slug ? `/owners/${user.owner_profile.slug}` : '/mis-predios'}
                          >
                            <span className="material-symbols-outlined text-[18px]">public</span>
                            Perfil publico
                          </Link>

                          <Link
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setIsMenuOpen(false)}
                            to="/mis-partidas/nueva"
                          >
                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                            Publicar
                          </Link>
                        </>
                      ) : null}

                      <button
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#b02500] transition-colors hover:bg-[#ffefec]"
                        onClick={() => {
                          setIsMenuOpen(false)
                          void logout()
                        }}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Cerrar sesion
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              {active !== 'login' ? (
                <Link
                  className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 sm:block"
                  to="/ingresar"
                >
                  Iniciar sesion
                </Link>
              ) : null}

              {active !== 'register' ? (
                <Link
                  className="rounded-lg bg-[#ff7a23] px-4 py-2 text-sm font-bold text-[#3f1700] transition-colors hover:bg-[#994100] hover:text-[#fff0e9]"
                  to="/registro"
                >
                  Crear cuenta
                </Link>
              ) : (
                <Link
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  to="/ingresar"
                >
                  Iniciar sesion
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
