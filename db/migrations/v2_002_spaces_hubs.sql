-- TAKDA v2 — mobile Spaces + Hubs
-- Run this against your Supabase project (SQL editor) once. Idempotent.
--
-- IDs are text (not uuid) because the mobile client mints sortable base36
-- ids locally and treats its on-device SQLite store as the source of truth.
-- The remote rows are mirrors of whatever the client decides; we'd lose
-- nothing by keeping them as text.

-- ─── Spaces ─────────────────────────────────────────────────────────────────

create table if not exists public.spaces (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,

  name text not null,
  description text,
  icon text,
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spaces_user_id_idx on public.spaces (user_id);
create index if not exists spaces_updated_at_idx on public.spaces (updated_at desc);

alter table public.spaces enable row level security;

drop policy if exists "spaces_owner_select" on public.spaces;
create policy "spaces_owner_select" on public.spaces
  for select using (auth.uid() = user_id);

drop policy if exists "spaces_owner_insert" on public.spaces;
create policy "spaces_owner_insert" on public.spaces
  for insert with check (auth.uid() = user_id);

drop policy if exists "spaces_owner_update" on public.spaces;
create policy "spaces_owner_update" on public.spaces
  for update using (auth.uid() = user_id);

drop policy if exists "spaces_owner_delete" on public.spaces;
create policy "spaces_owner_delete" on public.spaces
  for delete using (auth.uid() = user_id);

-- ─── Hubs ────────────────────────────────────────────────────────────────────
-- A hub belongs to exactly one space. `settings` is the same JSON blob the
-- client stores locally (syncToCloud, extras). We mirror it verbatim so the
-- client can round-trip without information loss.

create table if not exists public.hubs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  space_id text not null references public.spaces (id) on delete cascade,

  name text not null,
  description text,
  icon text,
  position integer not null default 0,
  settings jsonb not null default '{"syncToCloud": false}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hubs_user_id_idx on public.hubs (user_id);
create index if not exists hubs_space_id_idx on public.hubs (space_id);
create index if not exists hubs_updated_at_idx on public.hubs (updated_at desc);

alter table public.hubs enable row level security;

drop policy if exists "hubs_owner_select" on public.hubs;
create policy "hubs_owner_select" on public.hubs
  for select using (auth.uid() = user_id);

drop policy if exists "hubs_owner_insert" on public.hubs;
create policy "hubs_owner_insert" on public.hubs
  for insert with check (auth.uid() = user_id);

drop policy if exists "hubs_owner_update" on public.hubs;
create policy "hubs_owner_update" on public.hubs
  for update using (auth.uid() = user_id);

drop policy if exists "hubs_owner_delete" on public.hubs;
create policy "hubs_owner_delete" on public.hubs
  for delete using (auth.uid() = user_id);
