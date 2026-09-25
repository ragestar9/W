import { useState, useEffect } from 'react'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export function ModelsPage() {
  const [models, setModels] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchModels = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error('Supabase not configured')
      const res = await fetch(`${url}/rest/v1/public_models?select=*`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setModels(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchModels() }, [])

  if (loading) return <LoadingState message="Loading models..." />
  if (error) return <ErrorState message={error} onRetry={fetchModels} />
  if (!models || models.length === 0) return <EmptyState message="No models available yet" />

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Available Models</h1>
      <p className="mb-8 text-muted">Public models you can use with your API key.</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Context</th>
              <th className="px-4 py-3">Input price</th>
              <th className="px-4 py-3">Output price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {models.map((m) => (
              <tr key={m.public_id} className="hover:bg-surface-raised/50 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{m.public_id}</td>
                <td className="px-4 py-3 text-muted">{m.model_type || '—'}</td>
                <td className="px-4 py-3 text-muted">{m.context_length ? `${(m.context_length / 1000).toFixed(0)}k` : '—'}</td>
                <td className="px-4 py-3 text-muted">{m.input_price != null ? `$${m.input_price}` : '—'}</td>
                <td className="px-4 py-3 text-muted">{m.output_price != null ? `$${m.output_price}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
