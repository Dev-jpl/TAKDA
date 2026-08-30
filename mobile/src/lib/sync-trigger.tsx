import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuth } from "./auth";
import { drainOutbox } from "./store/sync";

// Hook into the root tree once. Runs a sync drain whenever:
//   - the user signs in (or rehydrates a session on launch)
//   - the app returns to the foreground
// Single-flighted inside drainOutbox so overlapping triggers collapse.
export function SyncTrigger() {
  const { state } = useAuth();

  // Auth-state-driven drain.
  useEffect(() => {
    if (state.status === "signedIn") {
      void drainOutbox().catch((err) =>
        console.warn("[sync] drain (auth) failed", err),
      );
    }
  }, [state.status]);

  // Foreground-driven drain.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== "active") return;
      if (state.status !== "signedIn") return;
      void drainOutbox().catch((err) =>
        console.warn("[sync] drain (focus) failed", err),
      );
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [state.status]);

  return null;
}
