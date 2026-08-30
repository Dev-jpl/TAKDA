// Minimal subset of the web's Module Definition Language. This is the wire
// shape — the web authors it, mobile renders it. Keep ONLY the fields the
// mobile renderer actually consumes; add more as the renderer grows.
//
// When the web's types in web/src/lib/module/types.ts evolve, mirror the
// changes here too — we intentionally don't import across packages so the
// mobile bundle stays self-contained.

export type Id = string;

// ─── Schema ─────────────────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "long_text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select";

export interface Field {
  id: Id;
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  unit?: string;
  options?: { value: string; label: string }[];
}

export interface Collection {
  id: Id;
  key: string;
  name: string;
  /** When true, the runtime keeps exactly one entry per user (upsert on
   *  save, log screens pre-fill with current values). For module-level
   *  preferences like goals/targets. */
  singleton?: boolean;
  fields: Field[];
}

// ─── Interface (screens + layout) ───────────────────────────────────────────

export type ScreenKind = "page" | "modal";

export interface Screen {
  id: Id;
  key: string;
  name: string;
  kind: ScreenKind;
  root: Container;
}

export type Direction = "row" | "column";

export interface Container {
  kind: "container";
  id: Id;
  direction: Direction;
  gap?: number;
  padding?: number;
  /** When true, the container renders as a bordered, rounded card.
   *  Inherits the theme's paper/rule tokens so it slots into any screen
   *  without per-module styling. */
  card?: boolean;
  children: LayoutNode[];
}

export type LayoutNode = Container | Element;

export type ElementKind =
  | "heading"
  | "paragraph"
  | "text_input"
  | "number_input"
  | "select_input"
  | "button"
  | "stat"
  | "progress_bar"
  | "list"
  | "goal_preview"
  | "divider"
  | "spacer";

export type Binding =
  | { kind: "field"; collectionId: Id; fieldId: Id }
  | { kind: "collection"; collectionId: Id };

export interface Element {
  kind: "element";
  id: Id;
  type: ElementKind;
  binding?: Binding;
  config?: Record<string, unknown>;
}

// ─── Module ─────────────────────────────────────────────────────────────────

export interface Module {
  id: Id;
  name: string;
  slug: string;
  /** Which screen the renderer opens by default. Defaults to screens[0]. */
  defaultScreenKey?: string;
  collections: Collection[];
  screens: Screen[];
}
