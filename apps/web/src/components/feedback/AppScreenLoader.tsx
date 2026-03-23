type AppScreenLoaderProps = {
  message?: string
}

export function AppScreenLoader({
  message = 'Cargando contenido...',
}: AppScreenLoaderProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f7] px-6 py-10 font-['Inter'] text-[#2c2f30] antialiased">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-[#e6e8ea] bg-white px-8 py-10 text-center shadow-[0px_12px_32px_rgba(44,47,48,0.06)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2c2f30]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#994100]">
            PlayAirsoft
          </p>
          <p className="text-sm font-medium text-[#595c5d]">{message}</p>
        </div>
      </div>
    </main>
  )
}
