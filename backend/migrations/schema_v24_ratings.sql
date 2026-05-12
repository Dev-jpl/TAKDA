-- TAKDA Sprint 5 — Module ratings & reviews
-- Run in Supabase SQL editor after schema_v23.

-- ── module_ratings ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.module_ratings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_def_id UUID        NOT NULL REFERENCES public.module_definitions(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (module_def_id, user_id)
);

ALTER TABLE public.module_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ratings"
  ON public.module_ratings FOR SELECT USING (true);

CREATE POLICY "Users manage own ratings"
  ON public.module_ratings FOR ALL USING (auth.uid() = user_id);

-- ── Denormalized stats on module_definitions ──────────────────────────────────

ALTER TABLE public.module_definitions
  ADD COLUMN IF NOT EXISTS avg_rating   NUMERIC(3,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER      DEFAULT 0;

-- ── Function: recalculate stats after upsert / delete ─────────────────────────

CREATE OR REPLACE FUNCTION refresh_module_rating_stats(target_def_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.module_definitions
  SET
    avg_rating   = sub.avg,
    rating_count = sub.cnt
  FROM (
    SELECT
      AVG(rating)::NUMERIC(3,2) AS avg,
      COUNT(*)::INTEGER         AS cnt
    FROM public.module_ratings
    WHERE module_def_id = target_def_id
  ) sub
  WHERE id = target_def_id;
END;
$$;

-- ── Trigger: keep stats in sync ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_refresh_rating_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM refresh_module_rating_stats(
    COALESCE(NEW.module_def_id, OLD.module_def_id)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_module_rating_stats ON public.module_ratings;

CREATE TRIGGER trg_module_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.module_ratings
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_rating_stats();
