import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from './AdminLayout'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export function AdminLogsPage() {
  const logs = useFetch(
    () => supabase.from('request_logs').select('id, model_public_id, ok, status_code, error_code, latency_ms, client_ip, failover_count, created_at, api_keys(key_prefix), profiles(email)').order('created_at', { ascending: false }).limit(200),
    []
  )

  return (
    <AdminLayout path="/admin/logs">
      <h2 className="mb-6 text-2xl font-bold text-foreground">Request Logs</h2>

      {logs.status === 'loading' && <LoadingState message="Loading logs..." />}
      {logs.status === 'error' && <ErrorState message="Could not load logs" onRetry={logs.refetch} />}
      {logs.status === 'ready' && (!logs.data || logs.data.length === 0) && (
        <EmptyState message="No requests logged yet." />
      )}
      {logs.status === 'ready' && logs.data?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Failovers</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.data.map((r) => (
                <tr key={r.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-4 py-3 text-muted">{r.profiles?.email || '\u2014'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{r.api_keys?.key_prefix || '\u2014'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{r.model_public_id || '\u2014'}</td>
                  <td className={`px-4 py-3 ${r.ok ? 'text-success' : 'text-danger'}`}>{r.status_code}</td>
                  <td className="px-4 py-3 text-xs text-muted">{r.error_code || '\u2014'}</td>
                  <td className="px-4 py-3 text-muted">{r.latency_ms}ms</td>
                  <td className="px-4 py-3 text-muted">{r.failover_count ?? 0}</td>
                  <td className="px-4 py-3 text-muted">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
