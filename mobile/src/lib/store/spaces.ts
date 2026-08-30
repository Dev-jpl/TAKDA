import { exec, newId, nowIso, selectAll, selectFirst } from "./db";
import type { Space } from "./schema";

// Row shape from SQLite — snake_case columns mapped to the typed Space.
interface SpaceRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

function rowToSpace(r: SpaceRow): Space {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    icon: r.icon,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listSpaces(): Promise<Space[]> {
  const rows = await selectAll<SpaceRow>(
    `SELECT * FROM spaces ORDER BY position ASC, created_at ASC`,
  );
  return rows.map(rowToSpace);
}

export async function getSpace(id: string): Promise<Space | null> {
  const row = await selectFirst<SpaceRow>(`SELECT * FROM spaces WHERE id = ?`, [
    id,
  ]);
  return row ? rowToSpace(row) : null;
}

export async function createSpace(input: {
  name: string;
  description?: string | null;
  icon?: string | null;
}): Promise<Space> {
  const now = nowIso();
  const space: Space = {
    id: newId(),
    name: input.name,
    description: input.description ?? null,
    icon: input.icon ?? null,
    position: await nextPosition(),
    createdAt: now,
    updatedAt: now,
  };
  await exec(
    `INSERT INTO spaces (id, name, description, icon, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      space.id,
      space.name,
      space.description,
      space.icon,
      space.position,
      space.createdAt,
      space.updatedAt,
    ],
  );
  return space;
}

export async function updateSpace(
  id: string,
  patch: Partial<Pick<Space, "name" | "description" | "icon" | "position">>,
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
  await exec(`UPDATE spaces SET ${fields.join(", ")} WHERE id = ?`, params);
}

export async function deleteSpace(id: string): Promise<void> {
  // ON DELETE CASCADE on hubs (and later items) drops the subtree with us.
  await exec(`DELETE FROM spaces WHERE id = ?`, [id]);
}

async function nextPosition(): Promise<number> {
  const row = await selectFirst<{ max_pos: number | null }>(
    `SELECT MAX(position) AS max_pos FROM spaces`,
  );
  return (row?.max_pos ?? -1) + 1;
}
