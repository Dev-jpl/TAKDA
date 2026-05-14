"use client";

import { useEffect, useState } from "react";
import { reconcileOnLoad } from "@/lib/module/sync";

type State = "idle" | "syncing" | "synced" | "offline" | "error";

export function SyncStatus() {
  const [state, setState] = useState<State>("idle");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setState("offline");
        return;
      }
      setState("syncing");
      try {
        const res = await reconcileOnLoad();
        if (cancelled) return;
        if (!res.ok) {
          setState("error");
          setDetail("not signed in or remote unreachable");
          return;
        }
        const total =
          res.modulesPulled +
          res.modulesPushed +
          res.entriesPulled +
          res.entriesPushed;
        setState("synced");
        setDetail(
          total === 0
            ? "in sync"
            : `↓${res.modulesPulled + res.entriesPulled} ↑${res.modulesPushed + res.entriesPushed}`,
        );
      } catch {
        if (!cancelled) {
          setState("error");
          setDetail("sync failed");
        }
      }
    };
    run();

    const onOffline = () => setState("offline");
    const onOnline = () => run();
    if (typeof window !== "undefined") {
      window.addEventListener("offline", onOffline);
      window.addEventListener("online", onOnline);
    }
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
      }
    };
  }, []);

  const dot =
    state === "synced"
      ? "bg-emerald-500"
      : state === "syncing"
        ? "bg-amber-500 animate-pulse"
        : state === "offline"
          ? "bg-ink-faint"
          : state === "error"
            ? "bg-red-500"
            : "bg-rule";

  const label =
    state === "synced"
      ? `Synced${detail ? ` · ${detail}` : ""}`
      : state === "syncing"
        ? "Syncing…"
        : state === "offline"
          ? "Offline"
          : state === "error"
            ? `Sync error${detail ? ` · ${detail}` : ""}`
            : "";

  if (!label) return null;
  return (
    <div
      className="inline-flex items-center gap-2 text-[11px] text-ink-faint"
      title={label}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span>{label}</span>
    </div>
  );
}
