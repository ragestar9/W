import { useAuth } from '@/context/auth-context'
import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { LoadingState, ErrorState } from '@/components/States'

export function BillingPage() {
  const { user, profile } = useAuth()
  const logs = useFetch(
    () => supabase.from('request_logs').select('cost_usd, created_at').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    [user?.uid]
  )

  if (logs.status === 'loading') return <LoadingState message="Loading billing..." />
  if (logs.status === 'error') return <ErrorState message="Could not load billing" onRetry={logs.refetch} />

  const monthSpend = (logs.data || []).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)
  const balance = Number(profile?.credit_balance_usd ?? 0)
  const budget = Number(profile?.monthly_budget_usd ?? 0)
  const pct = budget > 0 ? Math.min(100, (monthSpend / budget) * 100) : 0

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Billing</h1>
      <p className="mb-8 text-muted">Balance, budget, and this month's spend.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Credit balance</p>
          <p className="mt-1 text-3xl font-bold text-foreground">${balance.toFixed(2)}</p>
          <p className="mt-1 text-xs text-muted">Prepaid credits remaining</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">This month</p>
          <p className="mt-1 text-3xl font-bold text-foreground">${monthSpend.toFixed(4)}</p>
          <p className="mt-1 text-xs text-muted">{budget > 0 ? `of $${budget.toFixed(2)} budget` : 'No monthly budget set'}</p>
          {budget > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised">
              <div
                className={`h-full rounded-full ${pct > 90 ? 'bg-danger' : pct > 70 ? 'bg-warning' : 'bg-primary'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Top up</h2>
        <p className="text-sm text-muted">Credit purchases are handled by the operator. Contact support to add credit to your account.</p>
      </div>
    </div>
  )
}
