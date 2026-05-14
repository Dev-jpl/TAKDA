// ─── Module Definition Language (MDL) ─────────────────────────────────────────
// A Module is fully described by this JSON-shaped object. The Renderer reads it,
// the Creator writes it. Nothing about a module lives in code outside of this
// shape — adding a new tool/field type/view = extending the types here +
// teaching the registry how to handle it.

// ─── Identity ────────────────────────────────────────────────────────────────

export type Id = string;

export type ModuleStatus = "draft" | "published";

export type Visibility = "private" | "public";

export interface ModuleProfile {
  icon?: string;             // emoji
  tagline?: string;          // one-liner
  description?: string;      // long-form
  category?: string;
  tags?: string[];
  coverColor?: string;       // hex
  coverImage?: string;       // url
  visibility: Visibility;
  versionNotes?: string;
}

export interface Module {
  id: Id;
  name: string;
  slug: string;
  status: ModuleStatus;
  version: number;
  hasUnpublishedChanges?: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;

  profile: ModuleProfile;
  collections: Collection[];
  computed: ComputedProperty[];
  screens: Screen[];
  wires: Wire[];
}

// Validation report for publish-readiness.
export interface PublishCheck {
  ok: boolean;
  items: {
    key: string;
    label: string;
    status: "ok" | "missing";
    hint?: string;
  }[];
}

// ─── Schema: Collections + Fields ────────────────────────────────────────────

export interface Collection {
  id: Id;
  key: string;           // machine name (snake_case)
  name: string;          // display name
  description?: string;
  fields: Field[];
}

export type FieldType =
  | "text"
  | "long_text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "multi_select"
  | "relation"
  | "file";

export interface FieldBase {
  id: Id;
  key: string;
  label: string;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
}

export interface TextField extends FieldBase {
  type: "text" | "long_text";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface NumberField extends FieldBase {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface BooleanField extends FieldBase {
  type: "boolean";
}

export interface DateField extends FieldBase {
  type: "date" | "datetime";
}

export interface SelectField extends FieldBase {
  type: "select" | "multi_select";
  options: { value: string; label: string }[];
}

export interface RelationField extends FieldBase {
  type: "relation";
  targetCollection: Id;   // points to another Collection by id
  many?: boolean;         // one-to-many vs one-to-one
}

export interface FileField extends FieldBase {
  type: "file";
  accept?: string;        // e.g. "image/*"
  multiple?: boolean;
}

export type Field =
  | TextField
  | NumberField
  | BooleanField
  | DateField
  | SelectField
  | RelationField
  | FileField;

// ─── Computed Properties ─────────────────────────────────────────────────────

export interface ComputedProperty {
  id: Id;
  key: string;
  label: string;
  resultType: "number" | "text" | "boolean" | "date";
  collectionId?: Id;     // scope: per-entry, or module-wide if undefined
  expression: string;     // DSL string; parsed at runtime
}

// ─── Interface: Screens + Layout ─────────────────────────────────────────────

export type ScreenKind = "page" | "modal";

export interface Screen {
  id: Id;
  key: string;
  name: string;
  kind: ScreenKind;
  root: Container;        // every screen has a single root container
}

// Auto-layout containers (Figma-style auto-layout, CSS-flex underneath).
export type Direction = "row" | "column";
export type Justify = "start" | "center" | "end" | "between";
export type Align = "start" | "center" | "end" | "stretch";

export interface Container {
  kind: "container";
  id: Id;
  direction: Direction;
  gap?: number;            // px
  padding?: number;        // px
  justify?: Justify;
  align?: Align;
  wrap?: boolean;
  background?: string;
  /** When true, runtime shows a header bar that toggles children visibility. */
  collapsible?: boolean;
  /** Title shown in the collapsible header (and as a label in the editor). */
  title?: string;
  /** Initial expanded state at runtime; defaults to true. */
  defaultExpanded?: boolean;
  children: LayoutNode[];
}

export type LayoutNode = Container | Element;

// ─── Elements (Tools) ────────────────────────────────────────────────────────
// Each element is an instance of a Tool from the registry. Tool config is
// validated at design time; binding ties it to a schema field or collection.

export type ElementKind =
  | "text_input"
  | "long_text_input"
  | "number_input"
  | "boolean_toggle"
  | "date_input"
  | "select_input"
  | "relation_picker"
  | "file_input"
  | "label"
  | "heading"
  | "paragraph"
  | "button"
  | "divider"
  | "spacer"
  | "list"
  | "stat"
  | "chart"
  | "calendar"
  | "image";

export interface ElementBase {
  kind: "element";
  id: Id;
  type: ElementKind;
  /** Grow factor in flex parent (0 = natural size, 1+ = grow). */
  grow?: number;
  /** Width override: number = px, string = CSS (e.g. "50%"). */
  width?: number | string;
  /** Binding to a field (per-entry context) or a collection (list/chart). */
  binding?: Binding;
  /** Free-form config consumed by the renderer for this element type. */
  config?: Record<string, unknown>;
}

export type Binding =
  | { kind: "field"; collectionId: Id; fieldId: Id }
  | { kind: "collection"; collectionId: Id }
  | { kind: "computed"; computedId: Id }
  | { kind: "static"; value: unknown };

export type Element = ElementBase;

// ─── Behavior: Wires ─────────────────────────────────────────────────────────
// Wires connect events on elements to actions in the runtime.

export type EventKind =
  | "tap"
  | "submit"
  | "change"
  | "entry_saved"
  | "screen_opened";

export type ActionKind =
  | "open_screen"
  | "open_modal"
  | "close_modal"
  | "navigate_back"
  | "save_entry"
  | "delete_entry"
  | "set_field"
  | "agent_call";

export interface Wire {
  id: Id;
  source: { screenId: Id; elementId?: Id; event: EventKind };
  action: WireAction;
  condition?: string;     // optional DSL guard
}

export type WireAction =
  | { kind: "open_screen"; screenId: Id }
  | { kind: "open_modal"; screenId: Id }
  | { kind: "close_modal" }
  | { kind: "navigate_back" }
  | { kind: "save_entry"; collectionId: Id }
  | { kind: "delete_entry"; collectionId: Id }
  | { kind: "set_field"; collectionId: Id; fieldId: Id; expression: string }
  | { kind: "agent_call"; prompt: string };

// ─── Creator workspace state ─────────────────────────────────────────────────

export type CreatorMode = "schema" | "interface" | "behavior" | "profile";

export type DevicePreview = "phone" | "tablet" | "desktop";

export interface CreatorState {
  module: Module;
  mode: CreatorMode;
  device: DevicePreview;
  selectedCollectionId?: Id;
  selectedScreenId?: Id;
  selectedNodeId?: Id;
}
