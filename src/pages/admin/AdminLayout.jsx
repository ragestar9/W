import { useAuth } from '@/context/auth-context'
import { Link, navigate } from '@/lib/router'
import { LoadingState } from '@/components/States'
import { useEffect } from 'react'

const NAV = [
  { to: '/admin', label: 'Upstreams', exact: true },
  { to: '/admin/keys', label: 'Provider Keys' },
  { to: '/admin/models', label: 'Models' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/logs', label: 'Request Logs' },
  { to: '/admin/settings', label: 'Settings' },
]

export function AdminLayout({ path, children }) {
  const { loading, isAuthenticated, isAdmin } = useAuth()

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) navigate('/dashboard')
  }, [loading, isAuthenticated, isAdmin])

  if (loading) return <LoadingState message="Loading admin..." />
  if (!isAdmin) return null

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-6 py-12">
      <aside className="w-44 shrink-0">
        <h1 className="mb-4 text-lg font-bold text-foreground">Admin</h1>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to)
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-primary/10 font-medium text-primary' : 'text-muted hover:bg-surface-raised hover:text-foreground'
                }`}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
