"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { ASSISTANT_NAME } from '@/constants/brand';

export interface UserProfile {
  assistant_name: string | null;
  context_bio: string | null;
  home_screen_id: string | null;
}

interface UserProfileContextValue {
  profile: UserProfile | null;
  assistantName: string;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refetch: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profile: null,
  assistantName: ASSISTANT_NAME,
  loading: true,
  updateProfile: async () => {},
  refetch: async () => {},
});

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('user_profiles')
      .select('assistant_name,context_bio,home_screen_id')
      .eq('id', user.id)
      .maybeSingle();
    setProfile(data ?? { assistant_name: null, context_bio: null, home_screen_id: null });
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, []);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_profiles').upsert({ id: user.id, ...updates });
    setProfile(prev => prev ? { ...prev, ...updates } : { assistant_name: null, context_bio: null, home_screen_id: null, ...updates });
  };

  return (
    <UserProfileContext.Provider value={{
      profile,
      assistantName: profile?.assistant_name || ASSISTANT_NAME,
      loading,
      updateProfile,
      refetch: fetchProfile,
    }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
