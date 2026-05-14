import type { Id } from "./types";

export interface Entry {
  id: Id;
  moduleId: Id;
  collectionId: Id;
  values: Record<string, unknown>; // keyed by field id
  createdAt: string;
  updatedAt: string;
}

type EntriesByCollection = Record<Id, Entry[]>;

function storageKey(moduleId: Id): string {
  return `takda.entries.${moduleId}`;
}

function uid(): Id {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowIso(): string {
  return new Date().toISOString();
}

function readAll(moduleId: Id): EntriesByCollection {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(moduleId));
    if (!raw) return {};
    return JSON.parse(raw) as EntriesByCollection;
  } catch {
    return {};
  }
}

function writeAll(moduleId: Id, store: EntriesByCollection): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(moduleId), JSON.stringify(store));
}

export function listEntries(moduleId: Id, collectionId: Id): Entry[] {
  const store = readAll(moduleId);
  return (store[collectionId] ?? []).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function createEntry(
  moduleId: Id,
  collectionId: Id,
  values: Record<string, unknown>,
): Entry {
  const now = nowIso();
  const entry: Entry = {
    id: uid(),
    moduleId,
    collectionId,
    values,
    createdAt: now,
    updatedAt: now,
  };
  const store = readAll(moduleId);
  store[collectionId] = [...(store[collectionId] ?? []), entry];
  writeAll(moduleId, store);
  // Fire-and-forget remote push (no-op when offline / not signed in).
  void import("./sync").then(({ pushEntry }) => pushEntry(entry));
  return entry;
}

export function deleteEntry(
  moduleId: Id,
  collectionId: Id,
  entryId: Id,
): void {
  const store = readAll(moduleId);
  store[collectionId] = (store[collectionId] ?? []).filter(
    (e) => e.id !== entryId,
  );
  writeAll(moduleId, store);
  void import("./sync").then(({ deleteRemoteEntry }) =>
    deleteRemoteEntry(entryId),
  );
}

/** Replace the (assumed-singleton) entry of a collection with a new values map,
 *  preserving id + createdAt of the existing entry if any. */
export function setSingletonEntry(
  moduleId: Id,
  collectionId: Id,
  values: Record<string, unknown>,
): Entry {
  const store = readAll(moduleId);
  const existing = (store[collectionId] ?? [])[0];
  const now = nowIso();
  const entry: Entry = {
    id: existing?.id ?? uid(),
    moduleId,
    collectionId,
    values,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  store[collectionId] = [entry];
  writeAll(moduleId, store);
  void import("./sync").then(({ pushEntry }) => pushEntry(entry));
  return entry;
}

/** Used by the sync reconciler — write an entry as-is into local storage. */
export function createEntryAt(entry: Entry): void {
  const store = readAll(entry.moduleId);
  store[entry.collectionId] = [...(store[entry.collectionId] ?? []), entry];
  writeAll(entry.moduleId, store);
}

/** Replace an entry by id in local storage with the provided record. */
export function replaceLocalEntry(entry: Entry): void {
  const store = readAll(entry.moduleId);
  store[entry.collectionId] = (store[entry.collectionId] ?? []).map((e) =>
    e.id === entry.id ? entry : e,
  );
  writeAll(entry.moduleId, store);
}

export function countEntries(moduleId: Id, collectionId: Id): number {
  return readAll(moduleId)[collectionId]?.length ?? 0;
}
