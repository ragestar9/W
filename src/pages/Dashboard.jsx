import { useAuth } from '@/context/auth-context'
import { LoadingState } from '@/components/States'
import { navigate } from '@/lib/router'
import { useEffect } from 'react'

export function DashboardPage() {
  const { user, profile, loading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/sign-in')
  }, [loading, isAuthenticated])

  if (loading) return <LoadingState message="Loading dashboard..." />
  if (!isAuthenticated) return null

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="mb-8 text-muted">Welcome back, {profile?.display_name || user?.email || 'user'}.</p>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="API Keys" value="—" sub="Create and manage your keys" />
        <Card title="Requests" value="—" sub="Requests this billing period" />
        <Card title="Balance" value="—" sub="Remaining credit balance" />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Requests</h2>
        <p className="text-sm text-muted">No requests logged yet. Make your first API call to see activity here.</p>
      </div>
    </div>
  )
}

function Card({ title, value, sub }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  )
}
