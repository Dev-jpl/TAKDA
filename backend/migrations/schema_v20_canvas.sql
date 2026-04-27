-- Migration: schema_v20_canvas
-- Adds layout_type to screens (grid | canvas) and canvas_position to screen_widgets.
-- canvas_position stores free-form {x, y, w, h} for Canvas layout; NULL = grid widget.

ALTER TABLE public.screens
  ADD COLUMN IF NOT EXISTS layout_type TEXT NOT NULL DEFAULT 'grid';

ALTER TABLE public.screen_widgets
  ADD COLUMN IF NOT EXISTS canvas_position JSONB DEFAULT NULL;
