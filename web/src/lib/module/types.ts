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
  flows?: Flow[];
  flowGraph?: FlowGraph;
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
  /** When true, the runtime keeps exactly one entry per user (upsert on save,
   *  capture screens pre-fill with current values). Use for module-level
   *  settings / preferences (e.g. a Variables collection of targets). */
  singleton?: boolean;
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
export type ModalSize = "sm" | "md" | "lg" | "xl";
export type ModalPosition = "top" | "center" | "bottom";
export type PageWidth = "mobile" | "tablet" | "desktop";

export interface Screen {
  id: Id;
  key: string;
  name: string;
  kind: ScreenKind;
  modalSize?: ModalSize;         // only meaningful when kind === "modal"
  modalPosition?: ModalPosition; // only meaningful when kind === "modal"
  /** Target viewport this page is designed for. Used by the canvas mock and
   *  runtime to size the page. When undefined, the canvas falls back to the
   *  global device toggle and the runtime defaults to desktop. */
  pageWidth?: PageWidth;         // only meaningful when kind === "page"
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
  /** Tinted background from the palette (renders as soft fill, ~14% alpha). */
  bgColor?: string;
  /** Show a border around the container. Defaults to false (groups are seamless). */
  border?: boolean;
  /** Palette token for the border color (only used when border=true). */
  borderColor?: string;
  /** When true, runtime shows a header bar that toggles children visibility. */
  collapsible?: boolean;
  /** Title shown in the collapsible header (and as a label in the editor). */
  title?: string;
  /** Initial expanded state at runtime; defaults to true. */
  defaultExpanded?: boolean;
  /** Width override: number = px, string = CSS (e.g. "50%", "20rem"). When
   *  unset, the container takes its natural size in its flex parent. */
  width?: number | string;
  /** Flex-grow factor inside the parent. Mirrors `Element.grow`. */
  grow?: number;
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
  | "progress_bar"
  | "chart"
  | "calendar"
  | "image"
  | "icon";

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
  /** Surface controls (background, border) — shared across elements. */
  surface?: ElementSurface;
  /** Spacing controls (padding inside, margin outside) — shared. */
  spacing?: ElementSpacing;
  /** Conditional visibility — element renders only when rule passes. */
  visibleIf?: VisibilityRule;
}

export type VisibilityOp =
  | "equals"
  | "not_equals"
  | "truthy"
  | "falsy"
  | "gt"
  | "lt";

export interface VisibilityRule {
  collectionId: Id;
  fieldId: Id;
  op: VisibilityOp;
  value?: string | number | boolean;
}

export interface ElementSurface {
  /** Palette token (e.g. "sage", "clay_soft"); renders as soft tint. */
  bgColor?: string;
  /** Show a border around the element. */
  border?: boolean;
  /** Palette token for the border color. */
  borderColor?: string;
  /** Corner radius in px. Defaults to the element's natural radius. */
  radius?: number;
}

export interface ElementSpacing {
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}

export type TextSize = "xs" | "sm" | "md" | "lg" | "xl";
export type TextWeight = "normal" | "medium" | "semibold" | "bold";
export type TextAlign = "left" | "center" | "right";

export interface TextStyle {
  size?: TextSize;
  weight?: TextWeight;
  align?: TextAlign;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
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

// ─── Flows: event-driven automations ─────────────────────────────────────────
// A Flow is a small program triggered by something happening in the runtime
// (entry saved, screen opened, …). v1 supports linear action lists with an
// optional filter; richer branching can come later.

export type TriggerKind =
  | "entry_created"
  | "entry_updated"
  | "screen_opened";

export type Trigger =
  | { kind: "entry_created"; collectionId: Id }
  | { kind: "entry_updated"; collectionId: Id }
  | { kind: "screen_opened"; screenId: Id };

export type ActionKindV2 =
  | "show_toast"
  | "open_modal"
  | "navigate_screen"
  | "create_entry"
  | "compute"
  | "submit_entry";

export type FlowAction =
  | { kind: "show_toast"; message: string; tone?: "info" | "success" | "warn" }
  | { kind: "open_modal"; screenId: Id }
  | { kind: "navigate_screen"; screenId: Id }
  | { kind: "create_entry"; collectionId: Id; values: Record<Id, unknown> }
  /** Run a formula over a chosen set of field values, then assign the result
   *  to a target computed property. `inputs` lists the fields the expression
   *  may reference (their `key` is the variable name); `targetComputedId`
   *  receives the result. The expression itself lives on the target
   *  ComputedProperty (its `expression`). */
  | {
      kind: "compute";
      inputs: { collectionId: Id; fieldId: Id }[];
      targetComputedId: Id;
    }
  /** Persist the current page's bound form inputs as entries in their
   *  respective collections (one entry per collection, grouped from the form
   *  state). Equivalent to the legacy `save_entry` runtime action. */
  | { kind: "submit_entry" };

export interface FlowFilter {
  collectionId: Id;
  fieldId: Id;
  op: VisibilityOp; // reuse equals/not_equals/truthy/falsy/gt/lt
  value?: string | number | boolean;
}

export interface Flow {
  id: Id;
  name: string;
  enabled?: boolean;
  trigger: Trigger;
  filter?: FlowFilter;
  actions: FlowAction[];
}

// ─── Flow graph (visual editor) ──────────────────────────────────────────────
// Branching graph layered over the same primitives. `module.flowGraph` is what
// the visual editor reads/writes. `module.flows` (linear) stays for the
// list-style editor and current runtime dispatch — runtime prefers `flowGraph`
// when present.

export type FlowNodeData =
  | { kind: "trigger"; trigger: Trigger }
  | { kind: "condition"; filter: FlowFilter }
  | { kind: "action"; action: FlowAction }
  | { kind: "page"; screenId: Id };

export interface FlowNode {
  id: Id;
  position: { x: number; y: number };
  data: FlowNodeData;
}

/** Edge-level trigger: pins a transition to a specific element interaction on
 *  the source page. Only meaningful when the edge originates from a page node. */
export type EdgeTrigger =
  | { kind: "element_clicked"; elementId: Id }
  | { kind: "element_submitted"; elementId: Id };

export interface FlowEdgeData {
  /** What user interaction fires this edge (only used for page → * edges). */
  trigger?: EdgeTrigger;
  /** Inline action steps run in order before reaching the target node. These
   *  are the "mini pills" rendered on the edge in the canvas. */
  steps?: FlowAction[];
  /** When the target is a page node, whether to navigate or open as modal.
   *  Inferred from the target screen's kind if absent. */
  transition?: "navigate" | "modal";
  /** Where the vertical mid-segment of a left/right-flowing smoothstep edge
   *  sits. Lets users slide the elbow horizontally for cleaner layouts.
   *  Purely visual — runtime ignores. */
  centerX?: number;
  /** Where the horizontal mid-segment of an up/down-flowing smoothstep edge
   *  sits. Lets users slide the elbow vertically. Purely visual. */
  centerY?: number;
  /** Index signature so react-flow accepts this as edge.data (it expects a
   *  `Record<string, unknown>`). The fields above are the real schema. */
  [k: string]: unknown;
}

export interface FlowEdge {
  id: Id;
  source: Id;
  /** "true" / "false" for condition node outputs; undefined for unconditional. */
  sourceHandle?: "true" | "false";
  target: Id;
  data?: FlowEdgeData;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
