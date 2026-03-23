import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../auth/useAuth'
import { api } from '../../lib/api'
import { PublicFooter } from './PublicFooter'
import { PublicHeader } from './PublicHeader'

type DashboardShellProps = PropsWithChildren<{
  activeItem?: 'panel' | 'profile' | 'my-events' | 'my-venues'
  actions?: ReactNode
  sidebarContent?: ReactNode
}>

export function DashboardShell({
  activeItem = 'panel',
  actions,
  sidebarContent,
  children,
}: DashboardShellProps) {
  const { user, token, refreshUser, logout } = useAuth()
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null)
      return
    }

    const previewUrl = URL.createObjectURL(avatarFile)
    setAvatarPreviewUrl(previewUrl)

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [avatarFile])

  function resetAvatarModal() {
    setShowAvatarModal(false)
    setAvatarFile(null)
    setAvatarError('')
    setIsUploadingAvatar(false)
  }

  async function handleConfirmAvatarChange() {
    if (!token || !avatarFile || user?.role !== 'owner') {
      return
    }

    setAvatarError('')
    setIsUploadingAvatar(true)

    try {
      await api.updateOwnerAvatar(token, avatarFile)
      await refreshUser()
      toast.success('Avatar actualizado correctamente.')
      resetAvatarModal()
    } catch (uploadError) {
      const uploadMessage =
        uploadError instanceof Error ? uploadError.message : 'No se pudo actualizar el avatar.'
      setAvatarError(uploadMessage)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  if (!user) {
    return null
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join('')
  const canChangeAvatar = user.role === 'owner' && Boolean(token)

  return (
    <div className="min-h-screen bg-[#f5f6f7] font-['Inter'] text-[#2c2f30] antialiased">
      <PublicHeader active="panel" />

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="hidden w-[280px] flex-col border-r border-[#e6e8ea] bg-slate-50 px-5 py-6 lg:flex">
          <div className="rounded-2xl bg-white p-4 shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12">
                <div className="h-full w-full overflow-hidden rounded-xl bg-[#2c2f30]">
                  {user.role === 'owner' && user.owner_profile?.avatar_url ? (
                    <img
                      alt={user.owner_profile.organization_name}
                      className="h-full w-full object-cover"
                      src={user.owner_profile.avatar_url}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-black text-white">
                      {initials || 'PA'}
                    </div>
                  )}
                </div>

                {canChangeAvatar ? (
                  <button
                    aria-label="Cambiar avatar"
                    className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#994100] text-white shadow-sm transition-colors hover:bg-[#863800]"
                    onClick={() => setShowAvatarModal(true)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[12px]">edit</span>
                  </button>
                ) : null}
              </div>
              <div>
                <p className="font-bold text-[#2c2f30]">{user.name}</p>
                <p className="text-xs font-medium capitalize text-[#757778]">{user.role}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[#eff1f2] px-3 py-3 text-xs text-[#595c5d]">
              {user.email}
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            <Link
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                activeItem === 'panel'
                  ? 'bg-white font-bold text-[#994100] shadow-sm'
                  : 'font-medium text-[#595c5d] hover:bg-white hover:text-[#2c2f30]'
              }`}
              to="/panel"
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              Panel
            </Link>

            {user.role === 'owner' ? (
              <>
                <Link
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                    activeItem === 'my-events'
                      ? 'bg-white font-bold text-[#994100] shadow-sm'
                      : 'font-medium text-[#595c5d] hover:bg-white hover:text-[#2c2f30]'
                  }`}
                  to="/mis-partidas"
                >
                  <span className="material-symbols-outlined text-[20px]">event_note</span>
                  Mis partidas
                </Link>
                <Link
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                    activeItem === 'my-venues'
                      ? 'bg-white font-bold text-[#994100] shadow-sm'
                      : 'font-medium text-[#595c5d] hover:bg-white hover:text-[#2c2f30]'
                  }`}
                  to="/mis-predios"
                >
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                  Mis predios
                </Link>
              </>
            ) : null}

            {user.role === 'player' ? (
              <div>
                <Link
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                    activeItem === 'profile'
                      ? 'bg-white font-bold text-[#994100] shadow-sm'
                      : 'font-medium text-[#595c5d] hover:bg-white hover:text-[#2c2f30]'
                  }`}
                  to="/completar-perfil"
                >
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                  Perfil
                </Link>

                {activeItem === 'profile' && sidebarContent ? (
                  <div className="mt-2 space-y-1 pl-4">{sidebarContent}</div>
                ) : null}
              </div>
            ) : null}
          </nav>

          <div className="mt-auto pt-8">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dadddf] px-4 py-3 font-bold text-[#595c5d] transition-colors hover:bg-white hover:text-[#2c2f30]"
              onClick={() => void logout()}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Salir
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <main className="flex-1 px-5 py-8 md:px-8 md:py-10">
            {actions ? <div className="mb-8 flex justify-end">{actions}</div> : null}

            {children}
          </main>

          <PublicFooter />
        </div>
      </div>

      {showAvatarModal && canChangeAvatar ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-[0px_12px_32px_rgba(44,47,48,0.2)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#595c5d]">
              Edicion rapida
            </p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-[#2c2f30]">
              Cambiar avatar
            </h3>
            <p className="mt-1 text-sm text-[#595c5d]">
              Elegi una imagen para tu perfil dentro del panel.
            </p>

            <div className="mt-5 space-y-3">
              <input
                accept="image/*"
                className="hidden"
                onChange={(eventInput) => {
                  const selectedFile = eventInput.target.files?.[0] ?? null
                  setAvatarFile(selectedFile)
                  setAvatarError('')
                }}
                ref={avatarInputRef}
                type="file"
              />

              <button
                className="inline-flex items-center gap-2 rounded-lg border border-[#dadddf] bg-white px-3 py-2 text-xs font-bold text-[#595c5d] transition-colors hover:border-[#994100] hover:text-[#994100]"
                onClick={() => avatarInputRef.current?.click()}
                type="button"
              >
                Adjuntar imagen
                <span className="material-symbols-outlined text-[16px]">upload</span>
              </button>

              <div className="flex items-center gap-4 rounded-xl border border-[#e6e8ea] bg-[#f8f6f6] p-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl bg-[#eff1f2]">
                  {avatarPreviewUrl || user.owner_profile?.avatar_url ? (
                    <img
                      alt="Preview avatar"
                      className="h-full w-full object-cover"
                      src={avatarPreviewUrl ?? user.owner_profile?.avatar_url ?? undefined}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-black text-[#994100]">
                      {initials || 'PA'}
                    </div>
                  )}
                </div>
                <p className="text-sm text-[#595c5d]">
                  Vista previa del avatar que se mostrara en tu cuenta.
                </p>
              </div>

              {avatarError ? (
                <p className="rounded-lg border border-[#f95630] bg-[#ffefec] px-3 py-2 text-xs font-bold text-[#b02500]">
                  {avatarError}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-[#ff7a23] py-3 text-sm font-bold text-white transition-colors hover:bg-[#994100] disabled:opacity-60"
                disabled={!avatarFile || isUploadingAvatar}
                onClick={() => void handleConfirmAvatarChange()}
                type="button"
              >
                {isUploadingAvatar ? 'Actualizando...' : 'Guardar avatar'}
              </button>
              <button
                className="rounded-xl border border-[#dadddf] px-4 py-3 text-sm font-bold text-[#595c5d] transition-colors hover:bg-[#eff1f2]"
                onClick={resetAvatarModal}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
