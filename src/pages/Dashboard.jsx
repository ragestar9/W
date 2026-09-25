import { useAuth } from '@/context/auth-context'
import { LoadingState } from '@/components/States'
import { Link, navigate } from '@/lib/router'
import { useEffect } from 'react'

const TILES = [
  { to: '/dashboard/keys', title: 'API Keys', desc: 'Create and manage your vg_live_ keys.' },
  { to: '/dashboard/usage', title: 'Usage', desc: 'Requests, tokens, and spend across your keys.' },
  { to: '/dashboard/playground', title: 'Playground', desc: 'Send a test request through the gateway.' },
  { to: '/dashboard/billing', title: 'Billing', desc: 'Credit balance and monthly budget.' },
]

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

      <div className="grid gap-6 md:grid-cols-2">
        {TILES.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-primary/50 hover:bg-surface-raised"
          >
            <h2 className="mb-1 text-lg font-semibold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
