import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { useFetch } from '@/hooks/use-fetch'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export function PlaygroundPage() {
  const { user } = useAuth()
  const models = useFetch(async () => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(`${url}/rest/v1/public_models?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { data: await res.json() }
  }, [])

  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [prompt, setPrompt] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)

  async function send(e) {
    e.preventDefault()
    setSending(true)
    setSendError(null)
    setReply('')
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${url}/functions/v1/chat-completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
      setReply(data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2))
    } catch (err) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Playground</h1>
      <p className="mb-8 text-muted">Test a request against the gateway with one of your keys.</p>

      {models.status === 'loading' && <LoadingState message="Loading models..." />}
      {models.status === 'error' && <ErrorState message="Could not load models" onRetry={models.refetch} />}
      {models.status === 'ready' && (!models.data || models.data.length === 0) && (
        <EmptyState message="No models available yet." />
      )}

      {models.status === 'ready' && models.data?.length > 0 && (
        <form onSubmit={send} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">API key</span>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="vg_live_..."
              className="rounded-lg border border-border bg-surface px-4 py-2 font-mono text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-foreground focus:border-primary focus:outline-none"
              required
            >
              <option value="" disabled>Select a model</option>
              {models.data.map((m) => (
                <option key={m.public_id} value={m.public_id}>{m.display_name || m.public_id}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Prompt</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="Ask anything..."
              className="rounded-lg border border-border bg-surface px-4 py-2 text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              required
            />
          </label>

          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      )}

      {sendError && (
        <div className="mt-6 rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm text-danger">{sendError}</div>
      )}
      {reply && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Response</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{reply}</p>
        </div>
      )}
    </div>
  )
}
