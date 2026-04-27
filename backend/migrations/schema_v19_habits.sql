-- Migration: schema_v19_habits
-- Introduces the Habit Module: habit definitions + daily log entries.
-- Streak widget reads from these tables; chart widget visualises completion history.

CREATE TABLE IF NOT EXISTS public.habit_trackers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  icon         TEXT NOT NULL DEFAULT 'Star',
  frequency    TEXT NOT NULL DEFAULT 'daily',   -- 'daily' | 'weekly'
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id     UUID NOT NULL REFERENCES public.habit_trackers(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (habit_id, logged_date)
);

ALTER TABLE public.habit_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own habit_trackers"
  ON public.habit_trackers FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own habit_logs"
  ON public.habit_logs FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
