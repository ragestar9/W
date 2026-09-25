import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// createClient('', '') throws "supabaseUrl is required" at module load and
// crashes the whole app before any page can render. When Supabase is not
// configured, export a stub that resolves to an error only when a caller
// actually awaits a query, so pages can render their error state.
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

function unconfiguredError() {
  return { data: null, error: new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.') }
}

function makeStub() {
  const handler = {
    get(_target, prop) {
      if (prop === 'then') {
        // Allow `await supabase...` to resolve to the error object.
        return (resolve) => resolve(unconfiguredError())
      }
      return () => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler)
}

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : makeStub()
