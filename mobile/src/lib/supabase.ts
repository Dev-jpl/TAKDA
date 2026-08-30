import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Both web and mobile point at the same Supabase project. Auth sessions
// persist locally via AsyncStorage so the app starts signed-in on relaunch.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't throw — let the app render with a clear message so the user can
  // fix the env without a hard crash during onboarding.
  console.warn(
    "[supabase] missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // RN has no URL-based auth callback; we manually exchange codes when we
    // wire OAuth later.
    detectSessionInUrl: false,
  },
});
