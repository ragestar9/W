import { useFetch } from '@/hooks/use-fetch'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from './AdminLayout'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export function AdminUsersPage() {
  const users = useFetch(
    () => supabase.from('profiles').select('id, email, display_name, role, status, credit_balance_usd, monthly_budget_usd, created_at').order('created_at', { ascending: false }),
    []
  )

  async function setField(id, field, value) {
    await supabase.from('profiles').update({ [field]: value }).eq('id', id)
    users.refetch()
  }

  return (
    <AdminLayout path="/admin/users">
      <h2 className="mb-6 text-2xl font-bold text-foreground">Users</h2>

      {users.status === 'loading' && <LoadingState message="Loading users..." />}
      {users.status === 'error' && <ErrorState message="Could not load users" onRetry={users.refetch} />}
      {users.status === 'ready' && (!users.data || users.data.length === 0) && (
        <EmptyState message="No users yet." />
      )}
      {users.status === 'ready' && users.data?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.data.map((u) => (
                <tr key={u.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={(e) => setField(u.id, 'role', e.target.value)}
                      className="rounded border border-border bg-canvas px-2 py-1 text-xs text-foreground">
                      {['user', 'early_access', 'admin'].map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setField(u.id, 'status', u.status === 'active' ? 'suspended' : 'active')}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.status === 'active' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                      {u.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted">${Number(u.credit_balance_usd ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
