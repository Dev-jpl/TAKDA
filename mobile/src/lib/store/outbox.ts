import { exec, nowIso, selectAll } from "./db";
import type { OutboxEntry } from "./schema";

/** Append a pending change. The sync worker drains entries when the network
 *  and the related hub's sync flag both allow it. */
export async function enqueueOutbox(input: {
  hubId: string | null;
  op: OutboxEntry["op"];
  entity: OutboxEntry["entity"];
  payload: unknown;
}): Promise<void> {
  await exec(
    `INSERT INTO outbox (hub_id, op, entity, payload, created_at, attempts, last_error)
     VALUES (?, ?, ?, ?, ?, 0, NULL)`,
    [input.hubId, input.op, input.entity, JSON.stringify(input.payload), nowIso()],
  );
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  const rows = await selectAll<{
    id: number;
    hub_id: string | null;
    op: OutboxEntry["op"];
    entity: OutboxEntry["entity"];
    payload: string;
    created_at: string;
    attempts: number;
    last_error: string | null;
  }>(`SELECT * FROM outbox ORDER BY created_at ASC`);
  return rows.map((r) => ({
    id: r.id,
    hubId: r.hub_id,
    op: r.op,
    entity: r.entity,
    payload: r.payload,
    createdAt: r.created_at,
    attempts: r.attempts,
    lastError: r.last_error,
  }));
}

export async function clearOutbox(id: number): Promise<void> {
  await exec(`DELETE FROM outbox WHERE id = ?`, [id]);
}

// The actual sync worker (Supabase upserts/deletes) lands in a later turn.
// This file establishes the queue surface so the rest of the app can write
// against it today.
