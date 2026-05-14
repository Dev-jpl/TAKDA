"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadModule } from "@/lib/module/draft";
import {
  createEntry,
  deleteEntry,
  listEntries,
  type Entry,
} from "@/lib/module/entries";
import type {
  Collection,
  Container,
  Element,
  LayoutNode,
  Module,
} from "@/lib/module/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiveContainer, bindingKey, type FormState } from "./live-renderer";

export function ModuleRuntime({ moduleId }: { moduleId: string }) {
  const [module, setModuleState] = useState<Module | null>(null);
  const [screenIdx, setScreenIdx] = useState(0);
  const [history, setHistory] = useState<number[]>([0]);
  const [formState, setFormState] = useState<FormState>({});
  const [entriesVersion, setEntriesVersion] = useState(0);

  const goToScreen = (idx: number, push = true) => {
    if (idx < 0) return;
    setScreenIdx(idx);
    setFormState({});
    if (push) setHistory((h) => [...h, idx]);
  };

  const goBack = () => {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const next = h.slice(0, -1);
      const idx = next[next.length - 1];
      setScreenIdx(idx);
      setFormState({});
      return next;
    });
  };

  useEffect(() => {
    setModuleState(loadModule(moduleId));
  }, [moduleId]);

  const screen = useMemo(
    () => module?.screens[screenIdx] ?? null,
    [module, screenIdx],
  );

  // Which collections are referenced by inputs on this screen?
  const targetCollections = useMemo<Collection[]>(() => {
    if (!module || !screen) return [];
    const ids = new Set<string>();
    walk(screen.root, (n) => {
      if (n.kind === "element" && n.binding?.kind === "field") {
        ids.add(n.binding.collectionId);
      }
    });
    return module.collections.filter((c) => ids.has(c.id));
  }, [module, screen]);

  if (!module) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-ink-muted">
          <p className="text-sm">Module not found.</p>
          <Link
            href="/home"
            className="text-xs text-ink underline underline-offset-2 mt-2 inline-block"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (module.screens.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-ink-muted">
          <p className="text-sm">This module has no screens yet.</p>
          <Link
            href={`/module-creator/${module.id}`}
            className="text-xs text-ink underline underline-offset-2 mt-2 inline-block"
          >
            Open in editor
          </Link>
        </div>
      </div>
    );
  }

  const onAction = (kind: string, params?: Record<string, unknown>) => {
    if (kind === "save_entry") {
      // Group form values per collection and persist one entry per collection.
      const perCollection: Record<string, Record<string, unknown>> = {};
      for (const [key, value] of Object.entries(formState)) {
        const [collectionId, fieldId] = key.split("::");
        if (!collectionId || !fieldId) continue;
        if (value === undefined || value === null || value === "") continue;
        perCollection[collectionId] = {
          ...(perCollection[collectionId] ?? {}),
          [fieldId]: value,
        };
      }
      for (const [collectionId, values] of Object.entries(perCollection)) {
        createEntry(module.id, collectionId, values);
      }
      setFormState({});
      setEntriesVersion((v) => v + 1);
      return;
    }
    if (kind === "navigate_screen") {
      const targetId = params?.targetScreenId as string | undefined;
      if (!targetId) return;
      const idx = module.screens.findIndex((s) => s.id === targetId);
      if (idx >= 0) goToScreen(idx);
      return;
    }
    if (kind === "navigate_back") {
      goBack();
      return;
    }
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-rule bg-paper">
        <Link
          href="/home"
          className="text-ink-muted hover:text-ink text-sm shrink-0"
          title="Back to home"
        >
          ←
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          {module.profile.icon && (
            <span className="text-base leading-none">{module.profile.icon}</span>
          )}
          <span className="text-sm font-medium text-ink">{module.name}</span>
        </div>

        {module.screens.length > 1 && (
          <div className="flex items-center rounded-md border border-rule overflow-hidden">
            {module.screens.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setScreenIdx(i);
                  setHistory([i]);
                  setFormState({});
                }}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  i === screenIdx
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Link
            href={`/module-creator/${module.id}`}
            className="rounded-md border border-rule px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:border-ink transition-colors"
          >
            Open in editor
          </Link>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="rounded-md border border-rule bg-paper shadow-sm">
              {screen && (
                <LiveContainer
                  container={screen.root}
                  module={module}
                  formState={formState}
                  setFormState={setFormState}
                  onAction={onAction}
                  entriesVersion={entriesVersion}
                  onEntriesChange={() => setEntriesVersion((v) => v + 1)}
                />
              )}
            </div>
          </div>
        </div>

        <aside className="border-l border-rule bg-paper overflow-auto">
          <div className="px-5 py-4 border-b border-rule">
            <h3 className="text-xs uppercase tracking-[0.18em] text-ink-faint">
              Recent entries
            </h3>
          </div>
          <div className="px-3 py-3 space-y-5">
            {targetCollections.length === 0 ? (
              <div className="px-2 py-4 text-xs text-ink-faint">
                No collections bound on this screen.
              </div>
            ) : (
              targetCollections.map((c) => (
                <EntriesList
                  key={c.id}
                  module={module}
                  collection={c}
                  version={entriesVersion}
                  onChange={() => setEntriesVersion((v) => v + 1)}
                />
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function EntriesList({
  module,
  collection,
  version,
  onChange,
}: {
  module: Module;
  collection: Collection;
  version: number;
  onChange: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    setEntries(listEntries(module.id, collection.id));
  }, [module.id, collection.id, version]);

  return (
    <div>
      <div className="px-2 pb-1 text-[11px] text-ink-muted flex items-center justify-between">
        <span>{collection.name}</span>
        <span className="text-ink-faint">{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <div className="px-2 py-3 text-xs text-ink-faint italic">
          No entries yet.
        </div>
      ) : (
        <ul className="space-y-1">
          {entries.slice(0, 20).map((e) => (
            <li
              key={e.id}
              className="group rounded border border-rule px-3 py-2 hover:border-ink-faint transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  {collection.fields.slice(0, 3).map((f) => {
                    const v = e.values[f.id];
                    if (v == null || v === "") return null;
                    return (
                      <div
                        key={f.id}
                        className="text-xs text-ink-muted flex gap-2"
                      >
                        <span className="text-ink-faint shrink-0">
                          {f.label}:
                        </span>
                        <span className="text-ink truncate">
                          {Array.isArray(v) ? v.join(", ") : String(v)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="text-[10px] text-ink-faint mt-1">
                    {new Date(e.createdAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    deleteEntry(module.id, collection.id, e.id);
                    onChange();
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-ink-faint hover:text-ink"
                  aria-label="Delete entry"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function walk(node: LayoutNode, fn: (n: LayoutNode) => void): void {
  fn(node);
  if (node.kind === "container") {
    for (const child of (node as Container).children) walk(child, fn);
  }
}
