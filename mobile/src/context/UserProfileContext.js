import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const FALLBACK_NAME = 'Aly'

const UserProfileContext = createContext({ assistantName: FALLBACK_NAME })

export function UserProfileProvider({ children }) {
  const [assistantName, setAssistantName] = useState(FALLBACK_NAME)

  useEffect(() => {
    // Fetch on mount and whenever auth state changes
    const fetchProfile = async (userId) => {
      if (!userId) return
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('assistant_name')
          .eq('id', userId)
          .maybeSingle()
        if (data?.assistant_name) setAssistantName(data.assistant_name)
        else setAssistantName(FALLBACK_NAME)
      } catch { /* silent */ }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id)
      else setAssistantName(FALLBACK_NAME)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <UserProfileContext.Provider value={{ assistantName }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  return useContext(UserProfileContext)
}
