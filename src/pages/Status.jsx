import { useState, useEffect } from 'react'
import { LoadingState, ErrorState } from '@/components/States'

export function StatusPage() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const check = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      if (!url) throw new Error('Supabase not configured')
      const start = performance.now()
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      })
      const latency = Math.round(performance.now() - start)
      setStatus({ ok: res.ok, latency, code: res.status })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { check() }, [])

  if (loading) return <LoadingState message="Checking status..." />
  if (error) return <ErrorState message={error} onRetry={check} />

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-foreground">System Status</h1>
      <p className="mb-8 text-muted">Current health of the Vanguard gateway.</p>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${status.ok ? 'bg-success' : 'bg-danger'}`} />
          <span className="text-lg font-semibold text-foreground">
            {status.ok ? 'All systems operational' : 'Degraded performance'}
          </span>
        </div>
        <div className="mt-4 flex gap-6 text-sm text-muted">
          <span>API: HTTP {status.code}</span>
          <span>Latency: {status.latency}ms</span>
        </div>
        <button
          onClick={check}
          className="mt-6 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm text-foreground hover:opacity-90 transition-opacity"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
