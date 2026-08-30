// ─── TAKDA mobile local store schema ─────────────────────────────────────────
// Single canonical SQLite file. Every read/write goes through the typed
// repositories in this folder. The schema is intentionally relational + JSON
// for settings, so a future native Expo Module can open the same DB file
// from Swift and expose rows to App Intents / Foundation Models without
// going through the JS bridge.

export type ISODate = string; // "2024-12-01T12:34:56.789Z"

export interface Space {
  id: string;
  name: string;
  description: string | null;
  // Optional icon token. Same "ph:Name" convention as the web app so a future
  // shared icon registry can resolve both sides.
  icon: string | null;
  position: number; // user-controlled ordering
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface HubSettings {
  /** When true, writes to this hub are mirrored to Supabase. Off by default
   *  — the whole app is local-first; cloud sync is an explicit choice. */
  syncToCloud: boolean;
  /** Free-form per-hub config bag. Lives here so each hub kind can store
   *  what it needs without schema migrations. */
  extras?: Record<string, unknown>;
}

export interface Hub {
  id: string;
  spaceId: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
  settings: HubSettings;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Pending change destined for Supabase. Drained by the sync worker when
 *  network + the hub's `syncToCloud` flag are both true. */
export interface OutboxEntry {
  id: number;
  hubId: string | null; // null = space-level operation
  op: "upsert" | "delete";
  entity: "space" | "hub" | "module" | "entry";
  payload: string; // JSON snapshot of the entity at the time of the change
  createdAt: ISODate;
  attempts: number;
  lastError: string | null;
}

// ─── Modules + entries ──────────────────────────────────────────────────────
// A module is an instance of a Module-Definition-Language JSON installed
// into a hub. The definition itself (collections + screens) lives in the
// `definition` JSON column; per-row entries from the user logging through
// the module land in `module_entries`.

export interface ModuleInstance {
  id: string;
  hubId: string;
  /** Source identifier for the catalog/template this was installed from.
   *  Useful for upgrades and analytics. */
  source: string;
  /** Full Module JSON (matches mobile/src/lib/module-runtime/types.ts). */
  definition: unknown;
  position: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ModuleEntry {
  id: string;
  moduleId: string;
  /** Collection id inside the module the entry belongs to. */
  collectionId: string;
  /** Field-id → value map. */
  values: Record<string, unknown>;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ─── DDL ─────────────────────────────────────────────────────────────────────
// Bumped with each schema change. `db.ts` runs migrations idempotently.

export const SCHEMA_VERSION = 2;

export const DDL = [
  `CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS hubs (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    settings TEXT NOT NULL DEFAULT '{"syncToCloud":false}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_hubs_space ON hubs(space_id);`,
  `CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hub_id TEXT,
    op TEXT NOT NULL,
    entity TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    hub_id TEXT NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    definition TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_modules_hub ON modules(hub_id);`,
  `CREATE TABLE IF NOT EXISTS module_entries (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    collection_id TEXT NOT NULL,
    values_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_module_entries_module
    ON module_entries(module_id);`,
  `CREATE INDEX IF NOT EXISTS idx_module_entries_collection
    ON module_entries(module_id, collection_id);`,
];
