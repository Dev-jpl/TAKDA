-- TAKDA Module Creator V2 — schema_v23
-- Run this migration before deploying the new creator routes.

-- ── module_definitions additions ─────────────────────────────────────────────

ALTER TABLE public.module_definitions
  ADD COLUMN IF NOT EXISTS schemas            JSONB        DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS computed_properties JSONB       DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS behaviors          JSONB        DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mobile_config      JSONB        DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS web_config         JSONB        DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version            INTEGER      NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS category           TEXT,
  ADD COLUMN IF NOT EXISTS brand_color        TEXT,
  ADD COLUMN IF NOT EXISTS icon_name          TEXT,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ  DEFAULT now();

-- ── module_entries additions ──────────────────────────────────────────────────

ALTER TABLE public.module_entries
  ADD COLUMN IF NOT EXISTS schema_key TEXT NOT NULL DEFAULT 'default';

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_module_entries_schema_key
  ON public.module_entries(module_def_id, schema_key, hub_id, created_at DESC);

-- ── Back-fill existing definitions ───────────────────────────────────────────

UPDATE public.module_definitions
SET updated_at = created_at
WHERE updated_at IS NULL;
