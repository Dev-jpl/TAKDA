-- Migration: schema_v22_module_creator_ui
-- Adds ui_definition and status to module_definitions
-- Adds performance indexes to module_entries

ALTER TABLE public.module_definitions
  ADD COLUMN IF NOT EXISTS ui_definition JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_module_entries_def_hub
  ON public.module_entries(module_def_id, hub_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_module_entries_user
  ON public.module_entries(user_id, module_def_id, created_at DESC);
