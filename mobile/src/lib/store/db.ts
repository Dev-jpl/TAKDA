import * as SQLite from "expo-sqlite";

import { DDL, SCHEMA_VERSION } from "./schema";

const DB_NAME = "takda.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Singleton handle. Opens on first call; subsequent callers reuse it. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // PRAGMAs first — foreign keys aren't enforced by default in SQLite.
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
      `);
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Runs DDL in order, then stamps the schema version. Idempotent — safe to
 *  call on every launch. */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const stmt of DDL) {
    await db.execAsync(stmt);
  }
  await db.runAsync(
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?);`,
    String(SCHEMA_VERSION),
  );
}

// Tiny helpers so the repository files don't have to import expo-sqlite.

export async function exec(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getDb();
  await db.runAsync(sql, params as SQLite.SQLiteBindParams);
}

export async function selectAll<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params as SQLite.SQLiteBindParams);
}

export async function selectFirst<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params as SQLite.SQLiteBindParams);
}

/** Generates a sortable, URL-safe id. Not a real UUID v4 but uniqueness here
 *  is plenty — we collide-check on insert via the primary key. */
export function newId(): string {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
  );
}

export function nowIso(): string {
  return new Date().toISOString();
}
