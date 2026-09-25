import { useAuth } from '@/context/auth-context'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'
import { navigate } from '@/lib/router'
import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'

export function DashboardPage() {
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/sign-in')
  }, [authLoading, isAuthenticated])

  // One shared fetch per data set. Two panels must not issue two queries
  // and report different numbers.
  const keys = useFetch(
    () => supabase.from('api_keys').select('id, name, key_prefix, status, request_count').order('created_at', { ascending: false }),
    [user?.uid]
  )
  const logs = useFetch(
    () => supabase.from('request_logs').select('id, model_public_id, status_code, latency_ms, created_at').order('created_at', { ascending: false }).limit(10),
    [user?.uid]
  )

  if (authLoading) return <LoadingState message="Loading dashboard..." />
  if (!isAuthenticated) return null

  const balance = profile?.credit_balance_usd

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="mb-8 text-muted">Welcome back, {profile?.display_name || user?.email || 'user'}.</p>

      <div className="grid gap-6 md:grid-cols-3">
        <Card
          title="API Keys"
          value={keys.status === 'ready' ? String(keys.data?.length ?? 0) : '—'}
          sub="Create and manage your keys"
        />
        <Card
          title="Requests"
          value={logs.status === 'ready' ? String(logs.data?.length ?? 0) : '—'}
          sub="Recent requests"
        />
        <Card
          title="Balance"
          value={balance != null ? `$${Number(balance).toFixed(2)}` : '—'}
          sub="Remaining credit balance"
        />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Requests</h2>
        {logs.status === 'loading' && <LoadingState message="Loading requests..." />}
        {logs.status === 'error' && <ErrorState message="Could not load requests" onRetry={logs.refetch} />}
        {logs.status === 'ready' && (!logs.data || logs.data.length === 0) && (
          <EmptyState message="No requests logged yet. Make your first API call to see activity here." />
        )}
        {logs.status === 'ready' && logs.data?.length > 0 && (
          <ul className="divide-y divide-border text-sm">
            {logs.data.map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span className="text-foreground">{r.model_public_id || '—'}</span>
                <span className="text-muted">{r.status_code} · {r.latency_ms}ms</span>
              </li>
            ))}
          </ul>
        )}
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
