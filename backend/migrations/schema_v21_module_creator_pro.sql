-- Migration: schema_v21_module_creator_pro
-- Adds Pro-tier fields to module_definitions:
--   aly_config  — intent keywords, context hint, log prompt
--   is_private  — true = only creator can see (Pro), false = published (Creator)
-- Updates RLS so private modules are only visible to their owner.

ALTER TABLE public.module_definitions
  ADD COLUMN IF NOT EXISTS aly_config  JSONB    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_private  BOOLEAN  NOT NULL DEFAULT true;

-- Replace the permissive "Anyone can view" policy with one that
-- respects is_private: global OR published OR own module.
DROP POLICY IF EXISTS "Anyone can view module definitions" ON public.module_definitions;

CREATE POLICY "View module definitions"
  ON public.module_definitions FOR SELECT
  USING (
    is_global   = true
    OR is_private = false
    OR user_id  = auth.uid()
  );
