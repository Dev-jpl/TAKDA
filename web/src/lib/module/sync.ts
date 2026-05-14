"use client";

import { createClient } from "@/lib/supabase/client";
import type { Module } from "./types";
import type { Entry } from "./entries";

// ─── DB row shapes ───────────────────────────────────────────────────────────

interface ModuleRow {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  status: "draft" | "published";
  version: number;
  has_unpublished_changes: boolean;
  profile: Module["profile"];
  collections: Module["collections"];
  computed: Module["computed"];
  screens: Module["screens"];
  wires: Module["wires"];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface EntryRow {
  id: string;
  user_id: string;
  module_id: string;
  collection_id: string;
  values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Type adapters ───────────────────────────────────────────────────────────

function rowToModule(r: ModuleRow): Module {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    version: r.version,
    hasUnpublishedChanges: r.has_unpublished_changes,
    profile: r.profile,
    collections: r.collections,
    computed: r.computed,
    screens: r.screens,
    wires: r.wires,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at ?? undefined,
  };
}

function moduleToRow(m: Module, userId: string): Omit<ModuleRow, "user_id"> & {
  user_id: string;
} {
  return {
    id: m.id,
    user_id: userId,
    name: m.name,
    slug: m.slug,
    status: m.status,
    version: m.version,
    has_unpublished_changes: !!m.hasUnpublishedChanges,
    profile: m.profile,
    collections: m.collections,
    computed: m.computed,
    screens: m.screens,
    wires: m.wires,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    published_at: m.publishedAt ?? null,
  };
}

function rowToEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    moduleId: r.module_id,
    collectionId: r.collection_id,
    values: r.values,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── User context ────────────────────────────────────────────────────────────

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Module sync ─────────────────────────────────────────────────────────────

export async function fetchAllModules(): Promise<Module[] | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("user_id", userId);
  if (error) {
    console.warn("[sync] fetchAllModules failed", error);
    return null;
  }
  return (data as ModuleRow[]).map(rowToModule);
}

export async function pushModule(m: Module): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const supabase = createClient();
  const { error } = await supabase
    .from("modules")
    .upsert(moduleToRow(m, userId), { onConflict: "id" });
  if (error) {
    console.warn("[sync] pushModule failed", error);
    return false;
  }
  return true;
}

export async function deleteRemoteModule(id: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const supabase = createClient();
  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.warn("[sync] deleteRemoteModule failed", error);
    return false;
  }
  return true;
}

// ─── Entry sync ──────────────────────────────────────────────────────────────

export async function fetchEntries(
  moduleId: string,
): Promise<Entry[] | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", userId)
    .eq("module_id", moduleId);
  if (error) {
    console.warn("[sync] fetchEntries failed", error);
    return null;
  }
  return (data as EntryRow[]).map(rowToEntry);
}

export async function pushEntry(e: Entry): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const supabase = createClient();
  const { error } = await supabase.from("entries").upsert(
    {
      id: e.id,
      user_id: userId,
      module_id: e.moduleId,
      collection_id: e.collectionId,
      values: e.values,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    },
    { onConflict: "id" },
  );
  if (error) {
    console.warn("[sync] pushEntry failed", error);
    return false;
  }
  return true;
}

export async function deleteRemoteEntry(id: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const supabase = createClient();
  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.warn("[sync] deleteRemoteEntry failed", error);
    return false;
  }
  return true;
}

// ─── Initial reconciliation (local ↔ remote) ────────────────────────────────
// Strategy: for each id present on either side, keep the one with the newer
// updated_at. Push winners to remote, write winners to local.

import { listModules as localListModules, saveModule as localSaveModule } from "./draft";

export type SyncResult = {
  modulesPulled: number;
  modulesPushed: number;
  entriesPulled: number;
  entriesPushed: number;
  ok: boolean;
};

export async function reconcileOnLoad(): Promise<SyncResult> {
  const userId = await currentUserId();
  if (!userId) {
    return {
      modulesPulled: 0,
      modulesPushed: 0,
      entriesPulled: 0,
      entriesPushed: 0,
      ok: false,
    };
  }

  let modulesPulled = 0;
  let modulesPushed = 0;
  let entriesPulled = 0;
  let entriesPushed = 0;

  const remote = await fetchAllModules();
  if (remote == null) {
    return {
      modulesPulled,
      modulesPushed,
      entriesPulled,
      entriesPushed,
      ok: false,
    };
  }

  const local = localListModules();
  const localById = new Map(local.map((m) => [m.id, m]));
  const remoteById = new Map(remote.map((m) => [m.id, m]));
  const allIds = new Set([...localById.keys(), ...remoteById.keys()]);

  for (const id of allIds) {
    const l = localById.get(id);
    const r = remoteById.get(id);
    if (l && !r) {
      const ok = await pushModule(l);
      if (ok) modulesPushed++;
    } else if (r && !l) {
      localSaveModule(r);
      modulesPulled++;
    } else if (l && r) {
      const lTime = Date.parse(l.updatedAt);
      const rTime = Date.parse(r.updatedAt);
      if (rTime > lTime) {
        localSaveModule(r);
        modulesPulled++;
      } else if (lTime > rTime) {
        const ok = await pushModule(l);
        if (ok) modulesPushed++;
      }
    }
  }

  // Entries reconciliation per module.
  const entries = await import("./entries");
  for (const m of [...remoteById.values(), ...local]) {
    if (allIds.has(m.id) === false) continue;
    const remoteEntries = await fetchEntries(m.id);
    if (remoteEntries == null) continue;
    const localEntries: Entry[] = [];
    for (const coll of m.collections) {
      for (const e of entries.listEntries(m.id, coll.id)) {
        localEntries.push(e);
      }
    }
    const lMap = new Map(localEntries.map((e) => [e.id, e]));
    const rMap = new Map(remoteEntries.map((e) => [e.id, e]));
    const allEntryIds = new Set([...lMap.keys(), ...rMap.keys()]);
    for (const id of allEntryIds) {
      const l = lMap.get(id);
      const r = rMap.get(id);
      if (l && !r) {
        const ok = await pushEntry(l);
        if (ok) entriesPushed++;
      } else if (r && !l) {
        entries.createEntryAt(r);
        entriesPulled++;
      } else if (l && r) {
        const lTime = Date.parse(l.updatedAt);
        const rTime = Date.parse(r.updatedAt);
        if (rTime > lTime) {
          entries.replaceLocalEntry(r);
          entriesPulled++;
        } else if (lTime > rTime) {
          const ok = await pushEntry(l);
          if (ok) entriesPushed++;
        }
      }
    }
  }

  return { modulesPulled, modulesPushed, entriesPulled, entriesPushed, ok: true };
}
