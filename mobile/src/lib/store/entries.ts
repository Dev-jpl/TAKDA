import { exec, newId, nowIso, selectAll, selectFirst } from "./db";
import type { ModuleEntry } from "./schema";

interface EntryRow {
  id: string;
  module_id: string;
  collection_id: string;
  values_json: string;
  created_at: string;
  updated_at: string;
}

function rowToEntry(r: EntryRow): ModuleEntry {
  let values: Record<string, unknown> = {};
  try {
    values = JSON.parse(r.values_json) as Record<string, unknown>;
  } catch {
    /* keep default empty */
  }
  return {
    id: r.id,
    moduleId: r.module_id,
    collectionId: r.collection_id,
    values,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listEntries(
  moduleId: string,
  collectionId: string,
): Promise<ModuleEntry[]> {
  const rows = await selectAll<EntryRow>(
    `SELECT * FROM module_entries
     WHERE module_id = ? AND collection_id = ?
     ORDER BY created_at DESC`,
    [moduleId, collectionId],
  );
  return rows.map(rowToEntry);
}

export async function createEntry(input: {
  moduleId: string;
  collectionId: string;
  values: Record<string, unknown>;
}): Promise<ModuleEntry> {
  const now = nowIso();
  const e: ModuleEntry = {
    id: newId(),
    moduleId: input.moduleId,
    collectionId: input.collectionId,
    values: input.values,
    createdAt: now,
    updatedAt: now,
  };
  await exec(
    `INSERT INTO module_entries (id, module_id, collection_id, values_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      e.id,
      e.moduleId,
      e.collectionId,
      JSON.stringify(e.values),
      e.createdAt,
      e.updatedAt,
    ],
  );
  return e;
}

/** Upserts the single entry for a singleton collection. If one exists, its
 *  values are merged + updated_at refreshed; otherwise a new row is inserted. */
export async function setSingletonEntry(input: {
  moduleId: string;
  collectionId: string;
  values: Record<string, unknown>;
}): Promise<ModuleEntry> {
  const existing = await selectFirst<EntryRow>(
    `SELECT * FROM module_entries WHERE module_id = ? AND collection_id = ? LIMIT 1`,
    [input.moduleId, input.collectionId],
  );
  if (!existing) {
    return createEntry(input);
  }
  const merged: Record<string, unknown> = {
    ...rowToEntry(existing).values,
    ...input.values,
  };
  const now = nowIso();
  await exec(
    `UPDATE module_entries SET values_json = ?, updated_at = ? WHERE id = ?`,
    [JSON.stringify(merged), now, existing.id],
  );
  return {
    id: existing.id,
    moduleId: existing.module_id,
    collectionId: existing.collection_id,
    values: merged,
    createdAt: existing.created_at,
    updatedAt: now,
  };
}

export async function deleteEntry(id: string): Promise<void> {
  await exec(`DELETE FROM module_entries WHERE id = ?`, [id]);
}
