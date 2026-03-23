import { useAuth } from '../auth/useAuth'
import { PlayerDashboard } from './dashboards/PlayerDashboard'
import { OwnerDashboard } from './dashboards/OwnerDashboard'
import { AdminDashboard } from './dashboards/AdminDashboard'

export function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  if (user.role === 'owner') return <OwnerDashboard />
  if (user.role === 'admin') return <AdminDashboard />

  return <PlayerDashboard />
}
