import { Link } from '@/lib/router'
import { toggleTheme, getTheme } from '@/lib/theme'
import { useAuth } from '@/context/auth-context'
import { useState, useEffect } from 'react'

export function Navbar() {
  const { isAuthenticated, isAdmin, signOut, user } = useAuth()
  const [theme, setThemeState] = useState(getTheme())

  useEffect(() => {
    const handler = (e) => setThemeState(e.detail)
    window.addEventListener('vg-theme-change', handler)
    return () => window.removeEventListener('vg-theme-change', handler)
  }, [])

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-surface/80 px-6 py-3 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-bold text-primary">Vanguard</Link>
        <div className="hidden items-center gap-4 md:flex">
          <Link to="/models" className="text-sm text-muted hover:text-foreground transition-colors">Models</Link>
          <Link to="/pricing" className="text-sm text-muted hover:text-foreground transition-colors">Pricing</Link>
          <Link to="/docs" className="text-sm text-muted hover:text-foreground transition-colors">Docs</Link>
          <Link to="/status" className="text-sm text-muted hover:text-foreground transition-colors">Status</Link>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => toggleTheme()}
          className="rounded-md p-2 text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="text-sm text-muted hover:text-foreground transition-colors">Dashboard</Link>
            {isAdmin && <Link to="/admin" className="text-sm text-muted hover:text-foreground transition-colors">Admin</Link>}
            <button
              onClick={signOut}
              className="rounded-lg bg-surface-raised px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/sign-in" className="text-sm text-muted hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/sign-up" className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
