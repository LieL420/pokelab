import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseClient, isSupabaseConfigured } from './supabase'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabaseClient) {
      return
    }

    let mounted = true
    void supabaseClient.auth.getSession()
      .then(({ data }) => { if (mounted) setSession(data.session) })
      .catch(() => { if (mounted) setSession(null) })
      .finally(() => { if (mounted) setLoading(false) })

    const { data } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession)
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    signOut: async () => {
      if (!supabaseClient) return
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
    },
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

