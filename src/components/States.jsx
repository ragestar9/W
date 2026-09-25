export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-surface-raised px-4 py-2 text-sm text-foreground hover:opacity-90"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message = 'Nothing here yet', icon }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
      {icon && <div className="text-3xl text-muted">{icon}</div>}
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}
