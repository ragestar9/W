import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth as fbAuth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async (uid) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
    if (data) setProfile(data)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(fbAuth, async (fbUser) => {
      setUser(fbUser)
      if (fbUser) {
        await fetchProfile(fbUser.uid)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [fetchProfile])

  const signIn = useCallback(async (email, password) => {
    setError(null)
    try {
      await signInWithEmailAndPassword(fbAuth, email, password)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const signUp = useCallback(async (email, password) => {
    setError(null)
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(fbAuth, email, password)
      await supabase.from('profiles').insert({
        id: newUser.uid,
        email: newUser.email,
        role: 'user',
        status: 'active',
      })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      const { user: gUser } = await signInWithPopup(fbAuth, provider)
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', gUser.uid)
        .single()
      if (!existing) {
        await supabase.from('profiles').insert({
          id: gUser.uid,
          email: gUser.email,
          role: 'user',
          status: 'active',
        })
      }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const signOut = useCallback(async () => {
    await fbSignOut(fbAuth)
    setUser(null)
    setProfile(null)
  }, [])

  const value = {
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    isAdmin: profile?.role === 'admin',
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
