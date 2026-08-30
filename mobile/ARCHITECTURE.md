# TAKDA Mobile — Architecture

## Principles

1. **Local-first.** Every write lands in the on-device SQLite store before
   anything else. The UI reads from local only. Cloud sync is an explicit,
   per-hub opt-in.
2. **One canonical store.** All reads/writes go through `src/lib/store/`.
   No data access elsewhere. This keeps the surface a native module can
   wrap cleanly.
3. **LLM-shareable schema.** Stable column names, ISO timestamps, opaque
   IDs, JSON for free-form `settings`. A future Swift Expo Module can open
   the same `takda.db` file from native code and expose rows to
   `AppIntents` / `Foundation Models` (iOS 18.1+) without going through the
   JS bridge.

## Storage

- **Engine:** SQLite via `expo-sqlite`, file name `takda.db`.
- **Tables** (see `src/lib/store/schema.ts` for DDL):
  - `meta(key, value)` — bookkeeping (schema version, future flags).
  - `spaces` — top-level domains.
  - `hubs` — focused areas inside a space. `settings` is a JSON blob;
    `syncToCloud: boolean` controls whether mutations enqueue.
  - `outbox` — append-only queue of pending mutations destined for
    Supabase. Drained by the sync worker (next iteration).
- **Foreign keys** enforced via PRAGMA. `ON DELETE CASCADE` from
  `spaces → hubs` (and later → items) so deletes are clean.

## Data hierarchy

```
Space
  └─ Hub (settings: { syncToCloud, extras })
       └─ Items (to be defined per hub kind — next turn)
```

## Sync

- **Default state:** OFF for every new hub.
- **Toggle location:** Spaces tab → Space → Hub → "Hub settings" →
  "Sync to cloud".
- **Mechanics:**
  - Flipping ON enqueues an `upsert` of the hub's current snapshot into
    `outbox` so the remote learns it exists.
  - Subsequent mutations on a sync-enabled hub enqueue additional
    `upsert`/`delete` rows.
  - A future worker drains the outbox to Supabase when the network is
    available and the auth session is valid.
- **Conflict policy** (to be implemented): last-write-wins by
  `updated_at`. Items inside a hub inherit the hub's sync flag.

## Native / LLM bridge (planned)

The store file lives at the standard Expo SQLite location. A future Swift
Expo Module will:

1. Open `takda.db` read-only from the same app bundle.
2. Expose typed queries via `AppIntents` (so Siri / Apple Intelligence can
   answer "what's in my Workouts hub last week?").
3. Provide `EntityQueryProvider` + `IntentResult` returning summaries for
   on-device `Foundation Models` chat.

Keeping the schema relational and the IDs/timestamps stable means that
module can be added later without breaking the JS layer.

## Folder layout

```
src/
  app/
    (auth)/login.tsx
    (app)/
      _layout.tsx        — NativeTabs (Home / Timeline / Spaces / Quick Tools)
      home.tsx
      timeline.tsx
      quick-tools.tsx
      spaces/
        _layout.tsx      — Stack
        index.tsx        — list of spaces
        [spaceId]/
          index.tsx      — list of hubs in that space
          [hubId]/
            index.tsx    — hub detail (placeholder content)
            settings.tsx — sync toggle lives here
  components/
    Screen.tsx           — shared editorial page shell
  lib/
    auth.tsx             — Supabase auth context
    supabase.ts          — Supabase client (with AsyncStorage session)
    theme.ts             — paper/ink tokens shared with the web app
    store/
      schema.ts          — TS types + DDL + version
      db.ts              — singleton SQLite handle, migrations, helpers
      spaces.ts          — Space repository
      hubs.ts            — Hub repository + settings updates
      outbox.ts          — sync queue
      index.ts           — barrel + useStoreReady() hook
```
