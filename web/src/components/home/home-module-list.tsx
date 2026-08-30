"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listModules } from "@/lib/module/draft";
import { moduleActivity } from "@/lib/module/entries";
import { ModuleIcon } from "@/components/module-icon";
import type { Module } from "@/lib/module/types";

export function HomeModuleList() {
  const [modules, setModules] = useState<Module[] | null>(null);

  useEffect(() => {
    setModules(listModules());
  }, []);

  // Sort by recent activity (last entry > updatedAt > createdAt).
  const sorted = useMemo(() => {
    if (!modules) return null;
    return [...modules].sort((a, b) => {
      const aT = Date.parse(moduleActivity(a.id).lastAt ?? a.updatedAt);
      const bT = Date.parse(moduleActivity(b.id).lastAt ?? b.updatedAt);
      return bT - aT;
    });
  }, [modules]);

  return (
    <div className="flex flex-col">
      <div className="px-8 py-6 border-b border-rule bg-paper flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-ink">Home</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your modules. Open one to start capturing.
          </p>
        </div>
        <Link
          href="/module-creator"
          className="rounded-md border border-rule px-4 py-2 text-sm text-ink-muted hover:text-ink hover:border-ink transition-colors"
        >
          Module Creator →
        </Link>
      </div>

      <div className="px-8 py-8">
        {sorted == null ? null : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((m) => (
              <li key={m.id}>
                <ModuleCard module={m} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ModuleCard({ module }: { module: Module }) {
  const usable =
    module.collections.length > 0 && module.screens.length > 0;

  const [activity, setActivity] = useState<{
    total: number;
    lastAt: string | null;
  }>({ total: 0, lastAt: null });

  useEffect(() => {
    setActivity(moduleActivity(module.id));
  }, [module.id]);

  // Find a "quick log" target — first modal screen, fallback to first page.
  const quickLogScreen = useMemo(() => {
    if (!usable) return null;
    const modal = module.screens.find((s) => s.kind === "modal");
    return modal ?? module.screens[0] ?? null;
  }, [usable, module]);

  return (
    <div className="group relative rounded-md border border-rule bg-paper p-5 hover:border-ink transition-colors">
      {usable && (
        <Link href={`/m/${module.id}`} className="absolute inset-0 rounded-md" />
      )}
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-md border border-rule flex items-center justify-center text-ink-muted shrink-0"
          style={
            module.profile.coverColor
              ? { background: module.profile.coverColor }
              : undefined
          }
        >
          {module.profile.icon ? (
            <ModuleIcon icon={module.profile.icon} size={20} />
          ) : (
            <span className="text-xs text-ink-faint">·</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-ink truncate">
            {module.name}
          </h3>
          <p className="text-xs text-ink-muted truncate mt-0.5">
            {module.profile.tagline ?? (
              <span className="italic">no tagline</span>
            )}
          </p>
        </div>
      </div>

      {usable && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded border border-rule px-2.5 py-1.5">
            <div className="text-[9px] uppercase tracking-[0.15em] text-ink-faint">
              Entries
            </div>
            <div className="text-ink font-medium tabular-nums">
              {activity.total}
            </div>
          </div>
          <div className="rounded border border-rule px-2.5 py-1.5">
            <div className="text-[9px] uppercase tracking-[0.15em] text-ink-faint">
              Last
            </div>
            <div className="text-ink font-medium">
              {formatLastActivity(activity.lastAt)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {!usable && <span>· needs schema + screen</span>}
        {usable && module.status === "draft" && <span>· draft</span>}
        {usable && module.status === "published" && (
          <span>✓ published v{module.version}</span>
        )}
      </div>

      <div className="relative mt-4 flex items-center gap-2">
        {usable ? (
          <>
            <Link
              href={`/m/${module.id}`}
              className="rounded-md border border-ink bg-ink text-paper px-3 py-1.5 text-xs hover:opacity-90 transition-opacity"
            >
              Open
            </Link>
            {quickLogScreen && (
              <Link
                href={`/m/${module.id}?screen=${quickLogScreen.id}`}
                title={`Quick log → ${quickLogScreen.name}`}
                className="rounded-md border border-rule px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:border-ink transition-colors"
              >
                + Log
              </Link>
            )}
          </>
        ) : (
          <span className="text-xs text-ink-faint italic">
            Add a collection + screen to open
          </span>
        )}
        <Link
          href={`/module-creator/${module.id}`}
          className="ml-auto rounded-md border border-rule px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:border-ink transition-colors"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

function formatLastActivity(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diffMs = Date.now() - t;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="border border-dashed border-rule rounded-md py-16 text-center">
      <p className="text-base text-ink">No modules yet.</p>
      <p className="text-sm text-ink-muted mt-1">
        Start your first one in the Module Creator.
      </p>
      <Link
        href="/module-creator"
        className="mt-6 inline-block rounded-md border border-ink bg-ink text-paper px-4 py-2 text-sm hover:opacity-90 transition-opacity"
      >
        + New module
      </Link>
    </div>
  );
}
