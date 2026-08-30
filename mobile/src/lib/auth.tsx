import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";

// Tri-state: we explicitly track "loading" so route guards don't bounce the
// user to login while the persisted session is still being rehydrated.
type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; session: Session };

interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    // Read whatever Supabase pulled from AsyncStorage on startup.
    supabase.auth.getSession().then(({ data }) => {
      setState(
        data.session
          ? { status: "signedIn", session: data.session }
          : { status: "signedOut" },
      );
    });

    // Stay in sync with sign-in / sign-out / token-refresh events.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: "signedIn", session }
          : { status: "signedOut" },
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { error: error?.message ?? null };
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
