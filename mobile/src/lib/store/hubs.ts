import { exec, newId, nowIso, selectAll, selectFirst } from "./db";
import { enqueueOutbox } from "./outbox";
import type { Hub, HubSettings } from "./schema";

interface HubRow {
  id: string;
  space_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
  settings: string;
  created_at: string;
  updated_at: string;
}

function parseSettings(raw: string): HubSettings {
  try {
    const parsed = JSON.parse(raw) as Partial<HubSettings>;
    return {
      syncToCloud: !!parsed.syncToCloud,
      extras: parsed.extras ?? {},
    };
  } catch {
    return { syncToCloud: false, extras: {} };
  }
}

function rowToHub(r: HubRow): Hub {
  return {
    id: r.id,
    spaceId: r.space_id,
    name: r.name,
    description: r.description,
    icon: r.icon,
    position: r.position,
    settings: parseSettings(r.settings),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listHubs(spaceId: string): Promise<Hub[]> {
  const rows = await selectAll<HubRow>(
    `SELECT * FROM hubs WHERE space_id = ? ORDER BY position ASC, created_at ASC`,
    [spaceId],
  );
  return rows.map(rowToHub);
}

export async function getHub(id: string): Promise<Hub | null> {
  const row = await selectFirst<HubRow>(`SELECT * FROM hubs WHERE id = ?`, [
    id,
  ]);
  return row ? rowToHub(row) : null;
}

export async function createHub(input: {
  spaceId: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  settings?: Partial<HubSettings>;
}): Promise<Hub> {
  const now = nowIso();
  const settings: HubSettings = {
    syncToCloud: input.settings?.syncToCloud ?? false,
    extras: input.settings?.extras ?? {},
  };
  const hub: Hub = {
    id: newId(),
    spaceId: input.spaceId,
    name: input.name,
    description: input.description ?? null,
    icon: input.icon ?? null,
    position: await nextPosition(input.spaceId),
    settings,
    createdAt: now,
    updatedAt: now,
  };
  await exec(
    `INSERT INTO hubs
       (id, space_id, name, description, icon, position, settings, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      hub.id,
      hub.spaceId,
      hub.name,
      hub.description,
      hub.icon,
      hub.position,
      JSON.stringify(hub.settings),
      hub.createdAt,
      hub.updatedAt,
    ],
  );
  if (hub.settings.syncToCloud) {
    await enqueueOutbox({
      hubId: hub.id,
      op: "upsert",
      entity: "hub",
      payload: hub,
    });
  }
  return hub;
}

export async function updateHub(
  id: string,
  patch: Partial<Pick<Hub, "name" | "description" | "icon" | "position">>,
): Promise<void> {
  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    const col =
      k === "name"
        ? "name"
        : k === "description"
          ? "description"
          : k === "icon"
            ? "icon"
            : k === "position"
              ? "position"
              : null;
    if (!col) continue;
    fields.push(`${col} = ?`);
    params.push(v);
  }
  if (fields.length === 0) return;
  fields.push("updated_at = ?");
  params.push(nowIso());
  params.push(id);
  await exec(`UPDATE hubs SET ${fields.join(", ")} WHERE id = ?`, params);
  await maybeEnqueueAfterChange(id);
}

export async function updateHubSettings(
  id: string,
  patch: Partial<HubSettings>,
): Promise<HubSettings> {
  const current = await getHub(id);
  if (!current) throw new Error(`hub ${id} not found`);
  const next: HubSettings = {
    syncToCloud:
      patch.syncToCloud !== undefined
        ? patch.syncToCloud
        : current.settings.syncToCloud,
    extras: patch.extras ?? current.settings.extras ?? {},
  };
  await exec(
    `UPDATE hubs SET settings = ?, updated_at = ? WHERE id = ?`,
    [JSON.stringify(next), nowIso(), id],
  );
  // When sync flips on, snapshot the current hub so the remote learns it
  // exists. Subsequent edits enqueue normally.
  if (next.syncToCloud && !current.settings.syncToCloud) {
    const refreshed = await getHub(id);
    if (refreshed) {
      await enqueueOutbox({
        hubId: id,
        op: "upsert",
        entity: "hub",
        payload: refreshed,
      });
    }
  }
  return next;
}

export async function deleteHub(id: string): Promise<void> {
  const hub = await getHub(id);
  await exec(`DELETE FROM hubs WHERE id = ?`, [id]);
  if (hub?.settings.syncToCloud) {
    await enqueueOutbox({
      hubId: id,
      op: "delete",
      entity: "hub",
      payload: { id },
    });
  }
}

async function nextPosition(spaceId: string): Promise<number> {
  const row = await selectFirst<{ max_pos: number | null }>(
    `SELECT MAX(position) AS max_pos FROM hubs WHERE space_id = ?`,
    [spaceId],
  );
  return (row?.max_pos ?? -1) + 1;
}

// When a sync-enabled hub mutates, drop an upsert into the outbox.
async function maybeEnqueueAfterChange(id: string): Promise<void> {
  const hub = await getHub(id);
  if (!hub || !hub.settings.syncToCloud) return;
  await enqueueOutbox({
    hubId: id,
    op: "upsert",
    entity: "hub",
    payload: hub,
  });
}
