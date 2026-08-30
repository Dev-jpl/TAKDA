import { exec, newId, nowIso, selectAll, selectFirst } from "./db";
import type { ModuleInstance } from "./schema";

interface ModuleRow {
  id: string;
  hub_id: string;
  source: string;
  definition: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function rowToModule(r: ModuleRow): ModuleInstance {
  let definition: unknown = null;
  try {
    definition = JSON.parse(r.definition);
  } catch {
    definition = null;
  }
  return {
    id: r.id,
    hubId: r.hub_id,
    source: r.source,
    definition,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listModulesInHub(
  hubId: string,
): Promise<ModuleInstance[]> {
  const rows = await selectAll<ModuleRow>(
    `SELECT * FROM modules WHERE hub_id = ? ORDER BY position ASC, created_at ASC`,
    [hubId],
  );
  return rows.map(rowToModule);
}

export async function getModule(id: string): Promise<ModuleInstance | null> {
  const row = await selectFirst<ModuleRow>(
    `SELECT * FROM modules WHERE id = ?`,
    [id],
  );
  return row ? rowToModule(row) : null;
}

export async function installModule(input: {
  hubId: string;
  source: string;
  definition: unknown;
}): Promise<ModuleInstance> {
  const now = nowIso();
  const m: ModuleInstance = {
    id: newId(),
    hubId: input.hubId,
    source: input.source,
    definition: input.definition,
    position: await nextPosition(input.hubId),
    createdAt: now,
    updatedAt: now,
  };
  await exec(
    `INSERT INTO modules (id, hub_id, source, definition, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      m.id,
      m.hubId,
      m.source,
      JSON.stringify(m.definition),
      m.position,
      m.createdAt,
      m.updatedAt,
    ],
  );
  return m;
}

export async function deleteModule(id: string): Promise<void> {
  // ON DELETE CASCADE on module_entries drops the entries with us.
  await exec(`DELETE FROM modules WHERE id = ?`, [id]);
}

async function nextPosition(hubId: string): Promise<number> {
  const row = await selectFirst<{ max_pos: number | null }>(
    `SELECT MAX(position) AS max_pos FROM modules WHERE hub_id = ?`,
    [hubId],
  );
  return (row?.max_pos ?? -1) + 1;
}
