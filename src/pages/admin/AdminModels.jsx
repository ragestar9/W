import { useState } from 'react'
import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from './AdminLayout'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export function AdminModelsPage() {
  const upstreams = useFetch(() => supabase.from('upstreams').select('id, name'), [])
  const models = useFetch(
    () => supabase.from('models').select('id, public_id, display_name, upstream_model_id, access_tier, is_active, status, input_price_per_million, output_price_per_million, upstreams(name)').order('sort_order'),
    []
  )

  const [form, setForm] = useState({ public_id: '', display_name: '', upstream_id: '', upstream_model_id: '', access_tier: 'public' })
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function add(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const { error } = await supabase.from('models').insert({ ...form, status: 'active' })
      if (error) throw error
      setForm({ public_id: '', display_name: '', upstream_id: '', upstream_model_id: '', access_tier: 'public' })
      models.refetch()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row) {
    await supabase.from('models').update({ is_active: !row.is_active }).eq('id', row.id)
    models.refetch()
  }

  return (
    <AdminLayout path="/admin/models">
      <h2 className="mb-6 text-2xl font-bold text-foreground">Models</h2>

      {upstreams.status === 'ready' && (
        <form onSubmit={add} className="mb-8 grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-2">
          <input value={form.public_id} onChange={(e) => setForm({ ...form, public_id: e.target.value })} placeholder="Public id (vanguard-4-mini)" required
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
          <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Display name"
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
          <select value={form.upstream_id} onChange={(e) => setForm({ ...form, upstream_id: e.target.value })} required
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="" disabled>Upstream</option>
            {(upstreams.data || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input value={form.upstream_model_id} onChange={(e) => setForm({ ...form, upstream_model_id: e.target.value })} placeholder="Upstream model id (hidden)" required
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
          <select value={form.access_tier} onChange={(e) => setForm({ ...form, access_tier: e.target.value })}
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="public">public</option>
            <option value="early_access">early_access</option>
          </select>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? 'Adding...' : 'Add model'}
            </button>
            {formError && <p className="text-sm text-danger">{formError}</p>}
          </div>
        </form>
      )}

      {models.status === 'loading' && <LoadingState message="Loading models..." />}
      {models.status === 'error' && <ErrorState message="Could not load models" onRetry={models.refetch} />}
      {models.status === 'ready' && (!models.data || models.data.length === 0) && (
        <EmptyState message="No models mapped yet." />
      )}
      {models.status === 'ready' && models.data?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Public id</th>
                <th className="px-4 py-3">Upstream model</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">In / 1M</th>
                <th className="px-4 py-3">Out / 1M</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {models.data.map((m) => (
                <tr key={m.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{m.public_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{m.upstream_model_id}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.access_tier === 'early_access' ? 'bg-warning/15 text-warning' : 'bg-surface-raised text-muted'}`}>
                      {m.access_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{m.input_price_per_million != null ? `$${m.input_price_per_million}` : '\u2014'}</td>
                  <td className="px-4 py-3 text-muted">{m.output_price_per_million != null ? `$${m.output_price_per_million}` : '\u2014'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(m)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.is_active ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                      {m.is_active ? 'active' : 'off'}
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
