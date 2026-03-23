import { DashboardShell } from '../layouts/DashboardShell'

type DashboardSkeletonProps = {
  blocks?: number
}

export function DashboardSkeleton({ blocks = 6 }: DashboardSkeletonProps) {
  return (
    <DashboardShell>
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-28 rounded-2xl bg-white" />
          <div className="h-28 rounded-2xl bg-white" />
          <div className="h-28 rounded-2xl bg-white" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: blocks }).map((_, index) => (
            <div className="h-24 rounded-xl bg-white" key={index} />
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
