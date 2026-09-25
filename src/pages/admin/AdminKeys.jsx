import { useState } from 'react'
import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from './AdminLayout'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export function AdminKeysPage() {
  const upstreams = useFetch(() => supabase.from('upstreams').select('id, name').eq('is_active', true), [])
  const keys = useFetch(
    () => supabase.from('upstream_keys').select('id, upstream_id, label, status, is_active, last_checked_at, consecutive_failures, timeout_count, created_at, upstreams(name)').order('created_at', { ascending: false }),
    []
  )

  const [form, setForm] = useState({ upstream_id: '', label: '', secret: '' })
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function add(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const { error } = await supabase.from('upstream_keys').insert({
        upstream_id: form.upstream_id, label: form.label, key_encrypted: form.secret,
      })
      if (error) throw error
      setForm({ upstream_id: form.upstream_id, label: '', secret: '' })
      keys.refetch()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row) {
    await supabase.from('upstream_keys').update({ is_active: !row.is_active }).eq('id', row.id)
    keys.refetch()
  }

  return (
    <AdminLayout path="/admin/keys">
      <h2 className="mb-6 text-2xl font-bold text-foreground">Provider Keys</h2>

      {upstreams.status === 'ready' && (
        <form onSubmit={add} className="mb-8 grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-3">
          <select value={form.upstream_id} onChange={(e) => setForm({ ...form, upstream_id: e.target.value })} required
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="" disabled>Upstream</option>
            {(upstreams.data || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label"
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
          <input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="Provider secret" required type="password"
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
          <div className="md:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? 'Adding...' : 'Add key'}
            </button>
            {formError && <p className="text-sm text-danger">{formError}</p>}
          </div>
        </form>
      )}

      {keys.status === 'loading' && <LoadingState message="Loading keys..." />}
      {keys.status === 'error' && <ErrorState message="Could not load keys" onRetry={keys.refetch} />}
      {keys.status === 'ready' && (!keys.data || keys.data.length === 0) && (
        <EmptyState message="No provider keys yet." />
      )}
      {keys.status === 'ready' && keys.data?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Upstream</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Failures</th>
                <th className="px-4 py-3">Timeouts</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.data.map((k) => (
                <tr key={k.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{k.upstreams?.name || '\u2014'}</td>
                  <td className="px-4 py-3 text-muted">{k.label || '\u2014'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      k.status === 'working' ? 'bg-success/15 text-success'
                      : k.status === 'unknown' ? 'bg-surface-raised text-muted'
                      : 'bg-danger/15 text-danger'
                    }`}>{k.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{k.consecutive_failures}</td>
                  <td className="px-4 py-3 text-muted">{k.timeout_count}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(k)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${k.is_active ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                      {k.is_active ? 'active' : 'off'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
