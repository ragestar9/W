export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold text-foreground">Page not found</h1>
      <p className="mt-2 text-muted">The page you're looking for doesn't exist.</p>
      <a
        href="#/"
        className="mt-6 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Go home
      </a>
    </div>
  )
}
