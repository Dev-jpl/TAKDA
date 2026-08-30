// Barrel — one import path for the rest of the app.
export * from "./schema";
export * from "./spaces";
export * from "./hubs";
export * from "./outbox";
export * from "./modules";
export * from "./entries";
export { drainOutbox, pendingCount } from "./sync";
export type { DrainResult } from "./sync";
export { getDb } from "./db";

// Convenience hook: triggers DB init at component mount so the user never
// sees a "no such table" flash on first render.
import { useEffect, useState } from "react";
import { getDb } from "./db";

export function useStoreReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getDb()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        console.warn("[store] init failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}
