-- Migration: schema_v18_assistant_name
-- Adds assistant_name to user_profiles.
-- NULL means the user hasn't named their assistant yet (triggers first-login prompt).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS assistant_name TEXT;
