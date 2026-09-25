export function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-6 py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <p>© {new Date().getFullYear()} Vanguard. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#/docs" className="hover:text-foreground transition-colors">Docs</a>
          <a href="#/status" className="hover:text-foreground transition-colors">Status</a>
          <a href="#/privacy" className="hover:text-foreground transition-colors">Privacy</a>
        </div>
      </div>
    </footer>
  )
}
