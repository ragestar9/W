import { useState, useEffect } from 'react'
import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from './AdminLayout'
import { LoadingState, ErrorState } from '@/components/States'

export function AdminSettingsPage() {
  const settings = useFetch(() => supabase.from('app_settings').select('*').eq('id', 1).single(), [])
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (settings.status === 'ready' && settings.data) setForm(settings.data)
  }, [settings.status, settings.data])

  async function save(e) {
    e.preventDefault()
    setSaved(false)
    setSaveError(null)
    const { id, created_at, ...rest } = form
    const { error } = await supabase.from('app_settings').update(rest).eq('id', 1)
    if (error) setSaveError(error.message)
    else setSaved(true)
  }

  function field(key, label, type = 'number') {
    return (
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">{label}</span>
        <input
          type={type}
          step="any"
          value={form[key] ?? ''}
          onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
          className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </label>
    )
  }

  function toggle(key, label) {
    return (
      <label className="flex items-center justify-between rounded-lg border border-border bg-canvas px-4 py-3 text-sm">
        <span className="text-foreground">{label}</span>
        <button
          type="button"
          onClick={() => setForm({ ...form, [key]: !form[key] })}
          className={`relative h-6 w-11 rounded-full transition-colors ${form[key] ? 'bg-primary' : 'bg-surface-raised'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-primary-foreground transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </label>
    )
  }

  return (
    <AdminLayout path="/admin/settings">
      <h2 className="mb-6 text-2xl font-bold text-foreground">Settings</h2>

      {settings.status === 'loading' && <LoadingState message="Loading settings..." />}
      {settings.status === 'error' && <ErrorState message="Could not load settings" onRetry={settings.refetch} />}

      {form && (
        <form onSubmit={save} className="flex max-w-xl flex-col gap-4">
          {toggle('failover_enabled', 'Failover across providers')}
          {toggle('credits_enforced', 'Enforce credit balance')}
          {toggle('maintenance_mode', 'Maintenance mode')}
          {field('max_failover_hops', 'Max failover hops')}
          {field('default_timeout_ms', 'Default upstream timeout (ms)')}
          {field('overdraft_limit_usd', 'Permitted overdraft (USD)')}
          {field('global_rpm_ceiling', 'Global requests/minute ceiling')}
          {field('per_ip_rpm_ceiling', 'Per-IP requests/minute ceiling')}
          {field('spend_window_minutes', 'Rolling spend window (minutes)')}
          {field('spend_window_limit_usd', 'Rolling spend window limit (USD)')}
          {field('default_budget_usd', 'Default monthly budget (USD)')}
          {field('default_rpm_limit', 'Default per-key RPM')}

          <div className="flex items-center gap-3">
            <button type="submit"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Save settings
            </button>
            {saved && <span className="text-sm text-success">Saved</span>}
            {saveError && <span className="text-sm text-danger">{saveError}</span>}
          </div>
        </form>
      )}
    </AdminLayout>
  )
}
