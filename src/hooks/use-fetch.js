import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useFetch(query, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await query()
      if (result.error) throw result.error
      setData(result.data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
