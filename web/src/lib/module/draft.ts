import type { Module, PublishCheck } from "./types";

const STORAGE_KEY = "takda.modules";
const LEGACY_KEY = "takda.module.draft";

type Store = Record<string, Module>;

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function emptyModule(name = "Untitled module"): Module {
  const now = nowIso();
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "untitled";
  return {
    id: uid(),
    name,
    slug,
    status: "draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
    profile: {
      visibility: "private",
    },
    collections: [],
    computed: [],
    screens: [],
    wires: [],
  };
}

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Store;

    // Legacy migration: single-draft → keyed store.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<Module>;
      const m: Module = {
        ...emptyModule(parsed.name ?? "Untitled module"),
        ...parsed,
        profile: {
          visibility: "private",
          ...(parsed.profile ?? {}),
        },
      } as Module;
      const store: Store = { [m.id]: m };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      window.localStorage.removeItem(LEGACY_KEY);
      return store;
    }

    return {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function listModules(): Module[] {
  const store = readStore();
  return Object.values(store).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function loadModule(id: string): Module | null {
  const store = readStore();
  return store[id] ?? null;
}

export function saveModule(module: Module): void {
  const store = readStore();
  const next: Module = { ...module, updatedAt: nowIso() };
  if (module.status === "published" && hasMaterialEdits(store[module.id], next)) {
    next.hasUnpublishedChanges = true;
  }
  store[module.id] = next;
  writeStore(store);
  void import("./sync").then(({ pushModule }) => pushModule(next));
}

export function createModule(name = "Untitled module"): Module {
  const m = emptyModule(name);
  const store = readStore();
  store[m.id] = m;
  writeStore(store);
  void import("./sync").then(({ pushModule }) => pushModule(m));
  return m;
}

export function deleteModule(id: string): void {
  const store = readStore();
  delete store[id];
  writeStore(store);
  void import("./sync").then(({ deleteRemoteModule }) =>
    deleteRemoteModule(id),
  );
}

export function publishModule(id: string, versionNotes?: string): Module | null {
  const store = readStore();
  const m = store[id];
  if (!m) return null;
  const now = nowIso();
  const next: Module = {
    ...m,
    status: "published",
    hasUnpublishedChanges: false,
    publishedAt: now,
    updatedAt: now,
    version: m.status === "published" ? m.version + 1 : m.version,
    profile: { ...m.profile, versionNotes },
  };
  store[id] = next;
  writeStore(store);
  void import("./sync").then(({ pushModule }) => pushModule(next));
  return next;
}

// ─── Publish validation ──────────────────────────────────────────────────────

export function checkPublishable(m: Module): PublishCheck {
  const items: PublishCheck["items"] = [
    {
      key: "icon",
      label: "Icon set",
      status: m.profile.icon ? "ok" : "missing",
      hint: "Pick an emoji on the Profile tab",
    },
    {
      key: "name",
      label: "Module name",
      status: m.name && m.name !== "Untitled module" ? "ok" : "missing",
    },
    {
      key: "tagline",
      label: "Tagline",
      status: m.profile.tagline?.trim() ? "ok" : "missing",
      hint: "A one-line summary",
    },
    {
      key: "category",
      label: "Category",
      status: m.profile.category ? "ok" : "missing",
    },
    {
      key: "collections",
      label: "At least one collection",
      status: m.collections.length > 0 ? "ok" : "missing",
    },
    {
      key: "screens",
      label: "At least one screen",
      status: m.screens.length > 0 ? "ok" : "missing",
    },
  ];
  return { ok: items.every((i) => i.status === "ok"), items };
}

// ─── Internals ───────────────────────────────────────────────────────────────

function hasMaterialEdits(prev: Module | undefined, next: Module): boolean {
  if (!prev) return false;
  // Compare without timestamps to detect actual content change.
  const strip = (m: Module) => {
    const { updatedAt: _u, hasUnpublishedChanges: _h, ...rest } = m;
    return rest;
  };
  return JSON.stringify(strip(prev)) !== JSON.stringify(strip(next));
}
