import { useState, useEffect, useCallback } from 'react'

// Explicit status machine: 'loading' | 'ready' | 'error'.
// Never conflate "still loading" with "request failed" — a hook that
// returns null for both produces a spinner that never resolves.
export function useFetch(query, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  const refetch = useCallback(async () => {
    setState({ status: 'loading', data: null, error: null })
    try {
      const result = await query()
      if (result?.error) throw result.error
      setState({ status: 'ready', data: result?.data ?? result, error: null })
    } catch (err) {
      setState({ status: 'error', data: null, error: err })
    }
  }, deps)

  useEffect(() => {
    refetch()
  }, [refetch])

  return { ...state, loading: state.status === 'loading', refetch }
}
