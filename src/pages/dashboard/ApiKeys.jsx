import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export function ApiKeysPage() {
  const { user } = useAuth()
  const keys = useFetch(
    () => supabase.from('api_keys').select('id, name, key_prefix, key_last_four, status, request_count, rpm_limit, created_at').order('created_at', { ascending: false }),
    [user?.uid]
  )

  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState(null) // raw key, shown once
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState(null)

  async function createKey(e) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${url}/functions/v1/create-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid, name: name || 'Default' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
      setNewKey(data.raw_key)
      setName('')
      keys.refetch()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function setStatus(id, status) {
    await supabase.from('api_keys').update({ status }).eq('id', id)
    keys.refetch()
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted">Create and manage your Vanguard keys.</p>
        </div>
      </div>

      {newKey && (
        <div className="mb-6 rounded-xl border border-warning/50 bg-warning/10 p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Copy your key now. It will not be shown again.</p>
          <code className="block break-all rounded-lg bg-surface px-3 py-2 font-mono text-sm text-primary">{newKey}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null) }}
            className="mt-3 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Copy and dismiss
          </button>
        </div>
      )}

      <form onSubmit={createKey} className="mb-8 flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. production)"
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create key'}
        </button>
      </form>
      {createError && <p className="mb-4 text-sm text-danger">{createError}</p>}

      {keys.status === 'loading' && <LoadingState message="Loading keys..." />}
      {keys.status === 'error' && <ErrorState message="Could not load keys" onRetry={keys.refetch} />}
      {keys.status === 'ready' && (!keys.data || keys.data.length === 0) && (
        <EmptyState message="No keys yet. Create your first key above." />
      )}
      {keys.status === 'ready' && keys.data?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requests</th>
                <th className="px-4 py-3">RPM</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.data.map((k) => (
                <tr key={k.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-muted">{k.key_prefix}...{k.key_last_four}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      k.status === 'active' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                    }`}>{k.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{k.request_count ?? 0}</td>
                  <td className="px-4 py-3 text-muted">{k.rpm_limit ?? '\u2014'}</td>
                  <td className="px-4 py-3 text-right">
                    {k.status === 'active' ? (
                      <button onClick={() => setStatus(k.id, 'revoked')} className="text-xs text-danger hover:underline">Revoke</button>
                    ) : (
                      <button onClick={() => setStatus(k.id, 'active')} className="text-xs text-primary hover:underline">Re-enable</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
