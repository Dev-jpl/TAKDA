import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { fitnessService } from '../services/fitness';
import { supabase } from '../services/supabase';

export function useFitnessSync() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    async function syncIfAuthenticated() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fitnessService.syncWithBackend(session.user.id);
        }
      } catch (e) {
        console.warn('[FitnessSync] Auto-sync failed:', e);
      }
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        syncIfAuthenticated();
      }
      appState.current = nextAppState;
    });

    syncIfAuthenticated();

    return () => subscription.remove();
  }, []);
}
