-- TAKDA v2 — initial schema
-- Run this against your Supabase project (SQL editor) once. Idempotent.

-- ─── Modules ─────────────────────────────────────────────────────────────────

create table if not exists public.modules (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,

  name text not null,
  slug text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1,
  has_unpublished_changes boolean not null default false,

  profile jsonb not null default '{"visibility": "private"}'::jsonb,
  collections jsonb not null default '[]'::jsonb,
  computed jsonb not null default '[]'::jsonb,
  screens jsonb not null default '[]'::jsonb,
  wires jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists modules_user_id_idx on public.modules (user_id);
create index if not exists modules_updated_at_idx on public.modules (updated_at desc);

alter table public.modules enable row level security;

drop policy if exists "modules_owner_select" on public.modules;
create policy "modules_owner_select" on public.modules
  for select using (auth.uid() = user_id);

drop policy if exists "modules_owner_insert" on public.modules;
create policy "modules_owner_insert" on public.modules
  for insert with check (auth.uid() = user_id);

drop policy if exists "modules_owner_update" on public.modules;
create policy "modules_owner_update" on public.modules
  for update using (auth.uid() = user_id);

drop policy if exists "modules_owner_delete" on public.modules;
create policy "modules_owner_delete" on public.modules
  for delete using (auth.uid() = user_id);

-- ─── Entries ─────────────────────────────────────────────────────────────────
-- collection_id is the in-module Collection.id (a uuid string we generate
-- client-side). Not a foreign key — collections live inside the module JSON.

create table if not exists public.entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  module_id uuid not null references public.modules (id) on delete cascade,
  collection_id text not null,

  values jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entries_user_module_idx
  on public.entries (user_id, module_id);
create index if not exists entries_module_collection_idx
  on public.entries (module_id, collection_id, created_at desc);

alter table public.entries enable row level security;

drop policy if exists "entries_owner_select" on public.entries;
create policy "entries_owner_select" on public.entries
  for select using (auth.uid() = user_id);

drop policy if exists "entries_owner_insert" on public.entries;
create policy "entries_owner_insert" on public.entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "entries_owner_update" on public.entries;
create policy "entries_owner_update" on public.entries
  for update using (auth.uid() = user_id);

drop policy if exists "entries_owner_delete" on public.entries;
create policy "entries_owner_delete" on public.entries
  for delete using (auth.uid() = user_id);

-- ─── Triggers: keep updated_at fresh ─────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists modules_touch_updated_at on public.modules;
create trigger modules_touch_updated_at before update on public.modules
  for each row execute function public.touch_updated_at();

drop trigger if exists entries_touch_updated_at on public.entries;
create trigger entries_touch_updated_at before update on public.entries
  for each row execute function public.touch_updated_at();
