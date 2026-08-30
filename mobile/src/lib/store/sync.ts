import { supabase } from "@/lib/supabase";

import { exec, nowIso, selectAll, selectFirst } from "./db";
import type { Hub, OutboxEntry, Space } from "./schema";

// ─── Sync worker ─────────────────────────────────────────────────────────────
// Drains the outbox, pushing each pending mutation up to Supabase. Local is
// the source of truth — we never pull from remote here (that'd risk
// overwriting un-synced offline work). Pull-based reconciliation is a future
// feature; this layer only pushes.
//
// The worker is intentionally simple: in-order, one-at-a-time, transient
// failures bump `attempts`. Anything that fails 5 times sits in the outbox
// until manual intervention.

const MAX_ATTEMPTS = 5;

let runningPromise: Promise<DrainResult> | null = null;

export interface DrainResult {
  attempted: number;
  pushed: number;
  failed: number;
  skipped: number; // signed-out or no user
}

/** Single-flight drain — if a drain is already in progress, the second
 *  caller awaits the same result instead of racing. */
export function drainOutbox(): Promise<DrainResult> {
  if (runningPromise) return runningPromise;
  runningPromise = doDrain().finally(() => {
    runningPromise = null;
  });
  return runningPromise;
}

async function doDrain(): Promise<DrainResult> {
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id;
  if (!userId) {
    return { attempted: 0, pushed: 0, failed: 0, skipped: 1 };
  }

  const entries = await pendingEntries();
  let pushed = 0;
  let failed = 0;
  for (const entry of entries) {
    try {
      await push(entry, userId);
      await clear(entry.id);
      // Stamp the related hub's "last synced" so the UI can show freshness.
      if (entry.hubId) await touchHubLastSynced(entry.hubId);
      pushed++;
    } catch (err) {
      failed++;
      await recordFailure(entry.id, errMessage(err));
    }
  }
  return { attempted: entries.length, pushed, failed, skipped: 0 };
}

async function push(entry: OutboxEntry, userId: string): Promise<void> {
  const payload = JSON.parse(entry.payload) as Hub | Space | { id: string };

  if (entry.entity === "hub") {
    if (entry.op === "delete") {
      const { error } = await supabase
        .from("hubs")
        .delete()
        .eq("id", (payload as { id: string }).id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return;
    }
    const hub = payload as Hub;
    const { error } = await supabase.from("hubs").upsert(
      {
        id: hub.id,
        user_id: userId,
        space_id: hub.spaceId,
        name: hub.name,
        description: hub.description,
        icon: hub.icon,
        position: hub.position,
        // Persist the same JSON blob the client uses locally.
        settings: hub.settings,
        created_at: hub.createdAt,
        updated_at: hub.updatedAt,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    return;
  }

  if (entry.entity === "space") {
    if (entry.op === "delete") {
      const { error } = await supabase
        .from("spaces")
        .delete()
        .eq("id", (payload as { id: string }).id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return;
    }
    const space = payload as Space;
    const { error } = await supabase.from("spaces").upsert(
      {
        id: space.id,
        user_id: userId,
        name: space.name,
        description: space.description,
        icon: space.icon,
        position: space.position,
        created_at: space.createdAt,
        updated_at: space.updatedAt,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    return;
  }

  // entity === "item" — not in the schema yet; surfaces will be added when
  // hub item types land.
  throw new Error(`unsupported outbox entity: ${entry.entity}`);
}

async function pendingEntries(): Promise<OutboxEntry[]> {
  const rows = await selectAll<{
    id: number;
    hub_id: string | null;
    op: OutboxEntry["op"];
    entity: OutboxEntry["entity"];
    payload: string;
    created_at: string;
    attempts: number;
    last_error: string | null;
  }>(
    `SELECT * FROM outbox WHERE attempts < ? ORDER BY created_at ASC`,
    [MAX_ATTEMPTS],
  );
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

async function clear(id: number): Promise<void> {
  await exec(`DELETE FROM outbox WHERE id = ?`, [id]);
}

async function recordFailure(id: number, message: string): Promise<void> {
  await exec(
    `UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
    [message, id],
  );
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// Persist a "lastSyncedAt" timestamp inside the hub's settings JSON so the
// UI can show it without a new column.
async function touchHubLastSynced(hubId: string): Promise<void> {
  const row = await selectFirst<{ settings: string }>(
    `SELECT settings FROM hubs WHERE id = ?`,
    [hubId],
  );
  if (!row) return;
  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(row.settings) as Record<string, unknown>;
  } catch {
    /* fall through with empty */
  }
  settings.lastSyncedAt = nowIso();
  await exec(`UPDATE hubs SET settings = ? WHERE id = ?`, [
    JSON.stringify(settings),
    hubId,
  ]);
}

// ─── Pending-count helper (for the UI badge) ────────────────────────────────

export async function pendingCount(): Promise<number> {
  const row = await selectFirst<{ n: number }>(
    `SELECT COUNT(*) AS n FROM outbox`,
  );
  return row?.n ?? 0;
}
