import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { navigate } from '@/lib/router'

export function SignUpPage() {
  const { signUp, signInWithGoogle, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signUp(email, password)
      navigate('/dashboard')
    } catch {
      // error set in context
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
      navigate('/dashboard')
    } catch {
      // error set in context
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Create account</h1>
        <p className="mb-6 text-sm text-muted">Get started with Vanguard</p>

        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-canvas px-4 py-2.5 text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-canvas px-4 py-2.5 text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Min 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary py-2.5 font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full rounded-lg border border-border bg-surface-raised py-2.5 text-sm font-medium text-foreground hover:opacity-90 transition-opacity"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <a href="#/sign-in" className="text-primary hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
