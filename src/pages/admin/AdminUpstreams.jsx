import { useState } from 'react'
import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from './AdminLayout'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export function AdminUpstreamsPage() {
  const upstreams = useFetch(
    () => supabase.from('upstreams').select('*').order('priority', { ascending: false }),
    []
  )

  const [form, setForm] = useState({ name: '', slug: '', base_url: '', chat_path: '/v1/chat/completions', auth_scheme: 'bearer' })
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function add(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const { error } = await supabase.from('upstreams').insert({
        name: form.name, slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        base_url: form.base_url, chat_path: form.chat_path, auth_scheme: form.auth_scheme,
      })
      if (error) throw error
      setForm({ name: '', slug: '', base_url: '', chat_path: '/v1/chat/completions', auth_scheme: 'bearer' })
      upstreams.refetch()
    } catch (err) {
      // The SSRF trigger message surfaces here.
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row) {
    await supabase.from('upstreams').update({ is_active: !row.is_active }).eq('id', row.id)
    upstreams.refetch()
  }

  return (
    <AdminLayout path="/admin">
      <h2 className="mb-6 text-2xl font-bold text-foreground">Upstreams</h2>

      <form onSubmit={add} className="mb-8 grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. openai)" required
          className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
        <input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="Base URL (https://...)" required
          className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
        <input value={form.chat_path} onChange={(e) => setForm({ ...form, chat_path: e.target.value })} placeholder="Chat path" required
          className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
        <select value={form.auth_scheme} onChange={(e) => setForm({ ...form, auth_scheme: e.target.value })}
          className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
          {['bearer', 'x-api-key', 'api-key', 'header', 'query'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="md:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? 'Adding...' : 'Add upstream'}
          </button>
          {formError && <p className="text-sm text-danger">{formError}</p>}
        </div>
      </form>

      {upstreams.status === 'loading' && <LoadingState message="Loading upstreams..." />}
      {upstreams.status === 'error' && <ErrorState message="Could not load upstreams" onRetry={upstreams.refetch} />}
      {upstreams.status === 'ready' && (!upstreams.data || upstreams.data.length === 0) && (
        <EmptyState message="No upstreams configured yet." />
      )}
      {upstreams.status === 'ready' && upstreams.data?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Base URL</th>
                <th className="px-4 py-3">Auth</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {upstreams.data.map((u) => (
                <tr key={u.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{u.base_url}</td>
                  <td className="px-4 py-3 text-muted">{u.auth_scheme}</td>
                  <td className="px-4 py-3 text-muted">{u.priority}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                      {u.is_active ? 'active' : 'disabled'}
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
