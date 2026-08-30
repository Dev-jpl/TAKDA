"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ModuleIcon } from "@/components/module-icon";
import { resolveDefault, validateValue } from "@/lib/module/validation";
import {
  dispatchEdgeTrigger,
  dispatchGraph,
  flowsFor,
  runFlow,
  type FlowRuntime,
} from "@/lib/module/flows";
import { loadModule } from "@/lib/module/draft";
import {
  createEntry,
  deleteEntry,
  listEntries,
  setSingletonEntry,
  type Entry,
} from "@/lib/module/entries";
import type {
  Collection,
  Container,
  Element,
  LayoutNode,
  Module,
  Screen,
} from "@/lib/module/types";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  FormErrorsProvider,
  LiveContainer,
  bindingKey,
  type FormErrors,
  type FormState,
} from "./live-renderer";

const MODAL_MAX_W: Record<NonNullable<Screen["modalSize"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const MODAL_BACKDROP_ALIGN: Record<NonNullable<Screen["modalPosition"]>, string> = {
  top: "items-start justify-center pt-16",
  center: "items-center justify-center",
  bottom: "items-end justify-center pb-16",
};

// Tailwind tokens for the page max-width. A page declares its target viewport
// via `pageWidth`; the runtime constrains the content column to that and
// reflows below it. Unset = desktop.
const PAGE_MAX_W: Record<NonNullable<Screen["pageWidth"]>, string> = {
  mobile: "max-w-md",
  tablet: "max-w-2xl",
  desktop: "max-w-5xl",
};

export function ModuleRuntime({
  moduleId,
  chromeless = false,
}: {
  moduleId: string;
  chromeless?: boolean;
}) {
  const [module, setModuleState] = useState<Module | null>(null);
  const [screenIdx, setScreenIdx] = useState(0);
  const [history, setHistory] = useState<number[]>([0]);
  const [modalStack, setModalStack] = useState<string[]>([]);
  const [modalFormState, setModalFormState] = useState<
    Record<string, FormState>
  >({});
  const [formState, setFormState] = useState<FormState>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [modalFormErrors, setModalFormErrors] = useState<
    Record<string, FormErrors>
  >({});

  const clearFormError = (key: string) =>
    setFormErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const clearModalError = (modalId: string) => (key: string) =>
    setModalFormErrors((m) => {
      const inner = m[modalId] ?? {};
      if (!(key in inner)) return m;
      const next = { ...inner };
      delete next[key];
      return { ...m, [modalId]: next };
    });

  // Toast state for show_toast flow action.
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    tone: "info" | "success" | "warn";
  } | null>(null);
  const pushToast = (
    message: string,
    tone: "info" | "success" | "warn" = "info",
  ) => {
    const id = Date.now() + Math.random();
    setToast({ id, message, tone });
    setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, 3000);
  };
  const [entriesVersion, setEntriesVersion] = useState(0);

  const prefillForScreen = (idx: number, m: Module | null): FormState => {
    if (!m) return {};
    const screen = m.screens[idx];
    if (!screen) return {};
    const state: FormState = {};
    walkScreen(screen.root, (n) => {
      if (n.kind !== "element") return;
      const b = n.binding;
      if (!b || b.kind !== "field") return;
      const coll = m.collections.find((c) => c.id === b.collectionId);
      if (!coll) return;
      const field = coll.fields.find((f) => f.id === b.fieldId);
      if (!field) return;

      // 1. Singletons prefer the existing entry's value.
      if (coll.singleton) {
        const entry = listEntries(m.id, coll.id)[0];
        if (entry && entry.values[b.fieldId] !== undefined) {
          state[bindingKey(coll.id, b.fieldId)] = entry.values[b.fieldId];
          return;
        }
      }

      // 2. Fall back to the field's default (resolves "__today__" etc.).
      const def = resolveDefault(field);
      if (def !== undefined) {
        state[bindingKey(coll.id, b.fieldId)] = def;
      }
    });
    return state;
  };

  const goToScreen = (idx: number, push = true) => {
    if (idx < 0) return;
    setScreenIdx(idx);
    setFormState(prefillForScreen(idx, module));
    if (push) setHistory((h) => [...h, idx]);
  };

  const goBack = () => {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const next = h.slice(0, -1);
      const idx = next[next.length - 1];
      setScreenIdx(idx);
      setFormState(prefillForScreen(idx, module));
      return next;
    });
  };

  useEffect(() => {
    const m = loadModule(moduleId);
    setModuleState(m);
    if (m) {
      // Honor ?screen=<id> from the URL (used by home's "+ Log" shortcut).
      // If the target is a modal, open it on top of the first page;
      // otherwise just land on that page.
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const requestedId = params?.get("screen") ?? null;
      const firstPageIdx = m.screens.findIndex((s) => s.kind !== "modal");
      const baseIdx = firstPageIdx >= 0 ? firstPageIdx : 0;

      const requested = requestedId
        ? m.screens.find((s) => s.id === requestedId)
        : null;

      if (requested && requested.kind === "modal") {
        setScreenIdx(baseIdx);
        setHistory([baseIdx]);
        setFormState(prefillForScreen(baseIdx, m));
        setModalStack([requested.id]);
        setModalFormState({ [requested.id]: {} });
      } else {
        const idx = requested
          ? m.screens.findIndex((s) => s.id === requested.id)
          : baseIdx;
        const finalIdx = idx >= 0 ? idx : baseIdx;
        setScreenIdx(finalIdx);
        setHistory([finalIdx]);
        setFormState(prefillForScreen(finalIdx, m));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const screen = useMemo(
    () => module?.screens[screenIdx] ?? null,
    [module, screenIdx],
  );

  // Which collections are referenced by inputs on this screen?
  const targetCollections = useMemo<Collection[]>(() => {
    if (!module || !screen) return [];
    const ids = new Set<string>();
    walkScreen(screen.root, (n) => {
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

  // ── Flow dispatch ───────────────────────────────────────────────────────
  const flowRuntime: FlowRuntime = {
    showToast: (message, tone) => pushToast(message, tone),
    openModal: (screenId) => {
      const target = module.screens.find((s) => s.id === screenId);
      if (!target) return;
      setModalStack((s) => [...s, target.id]);
      setModalFormState((m) => ({ ...m, [target.id]: {} }));
    },
    navigateScreen: (screenId) => {
      const idx = module.screens.findIndex((s) => s.id === screenId);
      if (idx >= 0) goToScreen(idx);
    },
    createEntry: (collectionId, values) => {
      const coll = module.collections.find((c) => c.id === collectionId);
      if (!coll) return;
      const entry = coll.singleton
        ? setSingletonEntry(module.id, collectionId, values)
        : createEntry(module.id, collectionId, values);
      setEntriesVersion((v) => v + 1);
      // Don't recurse — only dispatch flows for *user-initiated* saves to
      // keep cascades manageable. If we ever want chained flows, gate this
      // explicitly behind an opt-in.
      void entry;
    },
    submit: () => onAction("save_entry"),
    compute: ({ targetComputedId, inputs }) => {
      const prop = module.computed?.find((c) => c.id === targetComputedId);
      if (!prop) {
        pushToast(`Compute: unknown property`, "warn");
        return;
      }
      // Evaluator placeholder — collect the chosen input field values from
      // current form state and surface them next to the property's formula.
      // Replace with a real expression evaluator once the DSL lands; the
      // result should then be written back to the computed property's cache.
      const values: string[] = [];
      for (const inp of inputs) {
        const coll = module.collections.find((c) => c.id === inp.collectionId);
        const field = coll?.fields.find((f) => f.id === inp.fieldId);
        if (!field) continue;
        const key = bindingKey(inp.collectionId, inp.fieldId);
        const v = formState[key];
        values.push(
          `${field.key}=${v === undefined ? "—" : JSON.stringify(v)}`,
        );
      }
      const ctx = values.length > 0 ? ` (${values.join(", ")})` : "";
      pushToast(
        `Compute → ${prop.label}: ${prop.expression || "(no formula)"}${ctx}`,
        "info",
      );
    },
  };

  const dispatchScreenOpened = (screenId: string) => {
    const match = (t: import("@/lib/module/types").Trigger) =>
      t.kind === "screen_opened" && t.screenId === screenId;
    if (module.flowGraph && module.flowGraph.nodes.length > 0) {
      dispatchGraph(module.flowGraph, match, { module }, flowRuntime);
      return;
    }
    const matched = flowsFor(module, match);
    for (const f of matched) runFlow(f, {}, flowRuntime);
  };
  // Suppress unused warning in builds where the dispatch hasn't been wired yet.
  void dispatchScreenOpened;

  const dispatchEntrySaved = (
    collectionId: string,
    entry: import("@/lib/module/entries").Entry,
    kind: "created" | "updated",
  ) => {
    const triggerMatch = (t: import("@/lib/module/types").Trigger) => {
      if (t.kind === "entry_created" && kind === "created")
        return t.collectionId === collectionId;
      if (t.kind === "entry_updated" && kind === "updated")
        return t.collectionId === collectionId;
      return false;
    };
    // Prefer the visual graph when it has nodes; fall back to linear flows.
    if (module.flowGraph && module.flowGraph.nodes.length > 0) {
      dispatchGraph(module.flowGraph, triggerMatch, { entry, module }, flowRuntime);
      return;
    }
    const matched = flowsFor(module, triggerMatch);
    for (const f of matched) runFlow(f, { entry }, flowRuntime);
  };

  const onAction = (kind: string, params?: Record<string, unknown>) => {
    if (kind === "element_clicked") {
      const elementId = params?.elementId as string | undefined;
      const fallback = params?.fallback as
        | {
            action?: string;
            targetScreenId?: string;
            thenAction?: string;
            thenTargetScreenId?: string;
          }
        | undefined;
      let fired = 0;
      if (elementId && module.flowGraph && module.flowGraph.nodes.length > 0) {
        fired = dispatchEdgeTrigger(
          module.flowGraph,
          (t) => t.kind === "element_clicked" && t.elementId === elementId,
          { module },
          flowRuntime,
        );
      }
      // No graph edges matched — run the legacy cfg-based action so older
      // buttons (and brand-new ones without wiring yet) still do something.
      if (fired === 0 && fallback) {
        if (fallback.action) {
          onAction(fallback.action, {
            targetScreenId: fallback.targetScreenId,
          });
        }
        if (fallback.thenAction && fallback.thenAction !== "none") {
          onAction(fallback.thenAction, {
            targetScreenId: fallback.thenTargetScreenId,
          });
        }
      }
      return;
    }
    if (kind === "save_entry") {
      // Validate against each bound field's rules first.
      const errMap = collectErrors(module, formState);
      if (Object.keys(errMap).length > 0) {
        setFormErrors(errMap);
        return;
      }
      setFormErrors({});
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
        const coll = module.collections.find((c) => c.id === collectionId);
        if (coll?.singleton) {
          const entry = setSingletonEntry(module.id, collectionId, values);
          dispatchEntrySaved(collectionId, entry, "updated");
        } else {
          const entry = createEntry(module.id, collectionId, values);
          dispatchEntrySaved(collectionId, entry, "created");
        }
      }
      setEntriesVersion((v) => v + 1);
      // Keep singleton values in form; clear non-singleton form keys.
      setFormState((cur) => {
        const next: FormState = {};
        for (const [key, value] of Object.entries(cur)) {
          const [collectionId] = key.split("::");
          const coll = module.collections.find((c) => c.id === collectionId);
          if (coll?.singleton) next[key] = value;
        }
        return next;
      });
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
    if (kind === "open_modal") {
      const targetId = params?.targetScreenId as string | undefined;
      if (!targetId) return;
      const target = module.screens.find((s) => s.id === targetId);
      if (!target) return;
      setModalStack((s) => [...s, target.id]);
      setModalFormState((m) => ({ ...m, [target.id]: {} }));
      return;
    }
    if (kind === "close_modal") {
      setModalStack((s) => {
        if (s.length === 0) return s;
        const popped = s[s.length - 1];
        setModalFormState((m) => {
          const next = { ...m };
          delete next[popped];
          return next;
        });
        return s.slice(0, -1);
      });
      return;
    }
  };

  const topModalId = modalStack[modalStack.length - 1];
  const topModal = topModalId
    ? module.screens.find((s) => s.id === topModalId)
    : null;

  return (
    <div className={`flex flex-col ${chromeless ? "flex-1 min-h-0" : "h-screen"}`}>
      {/* Header */}
      {!chromeless && (
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
            <ModuleIcon
              icon={module.profile.icon}
              size={16}
              className="text-ink-muted"
            />
          )}
          <span className="text-sm font-medium text-ink">{module.name}</span>
        </div>

        {module.screens.filter((s) => s.kind !== "modal").length > 1 && (
          <div className="flex items-center rounded-md border border-rule overflow-hidden">
            {module.screens
              .map((s, i) => ({ s, i }))
              .filter(({ s }) => s.kind !== "modal")
              .map(({ s, i }) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setScreenIdx(i);
                    setHistory([i]);
                    setFormState(prefillForScreen(i, module));
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
      )}

      {/* Main */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="overflow-auto">
          <div
            className={`${
              screen ? PAGE_MAX_W[screen.pageWidth ?? "desktop"] : "max-w-5xl"
            } mx-auto px-6 py-8 transition-all`}
          >
            <div className="rounded-md border border-rule bg-paper shadow-sm">
              {screen && (
                <FormErrorsProvider
                  errors={formErrors}
                  onClear={clearFormError}
                >
                  <LiveContainer
                    container={screen.root}
                    module={module}
                    formState={formState}
                    setFormState={setFormState}
                    onAction={onAction}
                    entriesVersion={entriesVersion}
                    onEntriesChange={() => setEntriesVersion((v) => v + 1)}
                  />
                </FormErrorsProvider>
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

      {topModal && (
        <div
          className={`fixed inset-0 z-40 flex ${MODAL_BACKDROP_ALIGN[topModal.modalPosition ?? "center"]} bg-ink/40 backdrop-blur-sm px-4`}
          onClick={() => onAction("close_modal")}
        >
          <div
            className={`w-full ${MODAL_MAX_W[topModal.modalSize ?? "md"]} rounded-md border border-rule bg-paper shadow-xl max-h-[80vh] overflow-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b border-rule flex items-center justify-between bg-paper sticky top-0 z-10">
              <span className="text-sm font-medium">{topModal.name}</span>
              <button
                onClick={() => onAction("close_modal")}
                className="text-xs text-ink-muted hover:text-ink"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <FormErrorsProvider
              errors={modalFormErrors[topModal.id] ?? {}}
              onClear={clearModalError(topModal.id)}
            >
            <LiveContainer
              container={topModal.root}
              module={module}
              formState={modalFormState[topModal.id] ?? {}}
              setFormState={(next) =>
                setModalFormState((m) => ({ ...m, [topModal.id]: next }))
              }
              onAction={(kind, params) => {
                if (kind === "save_entry") {
                  // Save from modal — use that modal's form state.
                  const state = modalFormState[topModal.id] ?? {};
                  const errMap = collectErrors(module, state);
                  if (Object.keys(errMap).length > 0) {
                    setModalFormErrors((m) => ({
                      ...m,
                      [topModal.id]: errMap,
                    }));
                    return;
                  }
                  setModalFormErrors((m) => ({ ...m, [topModal.id]: {} }));
                  const perCollection: Record<
                    string,
                    Record<string, unknown>
                  > = {};
                  for (const [key, value] of Object.entries(state)) {
                    const [collectionId, fieldId] = key.split("::");
                    if (!collectionId || !fieldId) continue;
                    if (value === undefined || value === null || value === "")
                      continue;
                    perCollection[collectionId] = {
                      ...(perCollection[collectionId] ?? {}),
                      [fieldId]: value,
                    };
                  }
                  for (const [collectionId, values] of Object.entries(
                    perCollection,
                  )) {
                    const coll = module.collections.find(
                      (c) => c.id === collectionId,
                    );
                    if (coll?.singleton) {
                      const entry = setSingletonEntry(
                        module.id,
                        collectionId,
                        values,
                      );
                      dispatchEntrySaved(collectionId, entry, "updated");
                    } else {
                      const entry = createEntry(
                        module.id,
                        collectionId,
                        values,
                      );
                      dispatchEntrySaved(collectionId, entry, "created");
                    }
                  }
                  setEntriesVersion((v) => v + 1);
                  setModalFormState((m) => {
                    const next: FormState = {};
                    for (const [key, value] of Object.entries(
                      m[topModal.id] ?? {},
                    )) {
                      const [collectionId] = key.split("::");
                      const coll = module.collections.find(
                        (c) => c.id === collectionId,
                      );
                      if (coll?.singleton) next[key] = value;
                    }
                    return { ...m, [topModal.id]: next };
                  });
                  return;
                }
                onAction(kind, params);
              }}
              entriesVersion={entriesVersion}
              onEntriesChange={() => setEntriesVersion((v) => v + 1)}
            />
            </FormErrorsProvider>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className={`pointer-events-auto rounded-md border px-4 py-2.5 shadow-lg text-sm backdrop-blur-sm ${
              toast.tone === "success"
                ? "border-green-600/40 bg-green-500/10 text-ink"
                : toast.tone === "warn"
                  ? "border-amber-600/40 bg-amber-500/10 text-ink"
                  : "border-rule bg-paper/95 text-ink"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
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

function collectErrors(module: Module, state: FormState): FormErrors {
  const errors: FormErrors = {};
  const seenByColl: Record<string, Set<string>> = {};
  for (const key of Object.keys(state)) {
    const [c, f] = key.split("::");
    if (!c || !f) continue;
    seenByColl[c] = seenByColl[c] ?? new Set();
    seenByColl[c].add(f);
  }

  for (const [key, value] of Object.entries(state)) {
    const [collectionId, fieldId] = key.split("::");
    if (!collectionId || !fieldId) continue;
    const coll = module.collections.find((c) => c.id === collectionId);
    if (!coll) continue;
    const field = coll.fields.find((f) => f.id === fieldId);
    if (!field) continue;
    const err = validateValue(field, value);
    if (err) errors[key] = err;
  }

  for (const [collectionId, fieldSet] of Object.entries(seenByColl)) {
    const coll = module.collections.find((c) => c.id === collectionId);
    if (!coll) continue;
    for (const field of coll.fields) {
      if (!field.required) continue;
      if (fieldSet.has(field.id)) continue;
      const err = validateValue(field, undefined);
      if (err) errors[bindingKey(collectionId, field.id)] = err;
    }
  }
  return errors;
}

function walkScreen(node: LayoutNode, fn: (n: LayoutNode) => void): void {
  fn(node);
  if (node.kind === "container") {
    for (const child of (node as Container).children) walkScreen(child, fn);
  }
}
