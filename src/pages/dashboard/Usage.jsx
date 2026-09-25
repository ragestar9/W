import { useAuth } from '@/context/auth-context'
import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export function UsagePage() {
  const { user } = useAuth()
  const logs = useFetch(
    () => supabase.from('request_logs').select('id, model_public_id, ok, status_code, latency_ms, input_tokens, output_tokens, cost_usd, failover_count, created_at').order('created_at', { ascending: false }).limit(100),
    [user?.uid]
  )

  const rows = logs.data || []
  const totalCost = rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)
  const totalIn = rows.reduce((s, r) => s + (r.input_tokens || 0), 0)
  const totalOut = rows.reduce((s, r) => s + (r.output_tokens || 0), 0)
  const okCount = rows.filter((r) => r.ok).length

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Usage</h1>
      <p className="mb-8 text-muted">Spend and request activity across your keys.</p>

      {logs.status === 'loading' && <LoadingState message="Loading usage..." />}
      {logs.status === 'error' && <ErrorState message="Could not load usage" onRetry={logs.refetch} />}
      {logs.status === 'ready' && rows.length === 0 && (
        <EmptyState message="No usage yet. Make your first API call to see activity here." />
      )}
      {logs.status === 'ready' && rows.length > 0 && (
        <>
          <div className="mb-8 grid gap-6 md:grid-cols-4">
            <Stat label="Requests" value={String(rows.length)} />
            <Stat label="Succeeded" value={`${okCount}/${rows.length}`} />
            <Stat label="Tokens" value={`${(totalIn + totalOut).toLocaleString()}`} />
            <Stat label="Spend" value={`$${totalCost.toFixed(4)}`} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">Failovers</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-raised/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{r.model_public_id || '\u2014'}</td>
                    <td className={`px-4 py-3 ${r.ok ? 'text-success' : 'text-danger'}`}>{r.status_code}</td>
                    <td className="px-4 py-3 text-muted">{r.latency_ms}ms</td>
                    <td className="px-4 py-3 text-muted">{(r.input_tokens || 0) + (r.output_tokens || 0)}</td>
                    <td className="px-4 py-3 text-muted">{r.failover_count ?? 0}</td>
                    <td className="px-4 py-3 text-muted">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}
