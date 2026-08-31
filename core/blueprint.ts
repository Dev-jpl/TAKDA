// ─── Module Blueprint ────────────────────────────────────────────────────────
// The canonical, editable source of a Module's INTENT (ADR-001).
//
// Three surfaces write to this one document: an external AI over Studio MCP
// (primary), the visual builder (refinement), and a structured editor
// (fallback). MDL is compiled from it. Nobody authors MDL.
//
// The altitude rule, which is the whole point: a Blueprint says WHAT the tool
// is for and WHAT it must know. It never says how many pixels anything is.
// If a property would change on a redesign but not on a rethink, it does not
// belong here — it belongs in the Presentation layer (deferred).
//
// Read this file as the answer to: what is the least a person can state such
// that a working personal tool can be derived from it?

import type {
  ActionId,
  FieldId,
  ModuleId,
  QuestionId,
  RecordId,
  ViewId,
} from "./ids";

// ─── Provenance ──────────────────────────────────────────────────────────────
// Concept doc §6: the Blueprint must visibly distinguish what the user asked
// for from what TAKDA decided on their behalf. Without this, generated defaults
// quietly masquerade as requirements and nobody can tell what is safe to change.

export type Provenance =
  | "user_stated"   // the user asked for this in so many words
  | "generated"     // TAKDA's opinionated default; safe to overrule
  | "inferred"      // deduced from something the user said
  | "optional"      // offered as an enhancement, not load-bearing
  | "unresolved";   // TAKDA needs an answer before this is trustworthy

interface Authored {
  /** Where this decision came from. Absent means user_stated. */
  from?: Provenance;
  /** Why TAKDA chose this, shown when the user inspects a generated default. */
  because?: string;
}

// ─── Fields ──────────────────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "long_text"
  | "number"
  | "money"      // distinct from number: carries currency, fixed precision
  | "date"
  | "boolean"
  | "select"
  | "relation";

interface FieldBase extends Authored {
  id: FieldId;
  /** Machine alias. Renameable — the id is what everything joins on. */
  key: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Computed rather than entered. Presence of this makes the field read-only. */
  derived?: { expression: string };
}

export interface TextField extends FieldBase {
  type: "text" | "long_text";
}

export interface NumberField extends FieldBase {
  type: "number";
  unit?: string;
  min?: number;
  max?: number;
}

export interface MoneyField extends FieldBase {
  type: "money";
  /** ISO 4217. Module-wide default lives on the Blueprint. */
  currency?: string;
}

export interface DateField extends FieldBase {
  type: "date";
  /** Default to the day the record is created. */
  defaultsToToday?: boolean;
}

export interface BooleanField extends FieldBase {
  type: "boolean";
}

export interface SelectField extends FieldBase {
  type: "select";
  options: { value: string; label: string }[];
  /** Let the user add options as they go rather than locking the list. */
  openEnded?: boolean;
}

export interface RelationField extends FieldBase {
  type: "relation";
  to: RecordId;
}

export type Field =
  | TextField
  | NumberField
  | MoneyField
  | DateField
  | BooleanField
  | SelectField
  | RelationField;

// ─── Records ─────────────────────────────────────────────────────────────────

export interface RecordDef extends Authored {
  id: RecordId;
  key: string;
  /** Singular and plural, because generated UI copy needs both and guessing
   *  the plural of "entry" or "person" from code is a losing game. */
  name: string;
  plural: string;
  describes?: string;
  fields: Field[];
  /** Lifecycle states, when the domain genuinely has them. Omit otherwise —
   *  a status field nobody transitions is just a select. */
  states?: { key: string; label: string; initial?: boolean }[];
}

// ─── Actions ─────────────────────────────────────────────────────────────────
// The meaningful things a user can DO, as opposed to what they can store.
// Each one becomes a typed capability at compile time (ADR-005).

export type Effect =
  | { kind: "set_field"; field: FieldId; value: string }
  | { kind: "transition"; to: string }
  | {
      kind: "create_record";
      record: RecordId;
      /** Target field id → expression evaluated against the acting record. */
      values: Partial<Record<FieldId, string>>;
    };

export interface ActionDef extends Authored {
  id: ActionId;
  key: string;
  name: string;
  /** The record this action operates on. */
  on: RecordId;
  /** Must hold before the action may run. */
  guard?: string;
  effects: Effect[];
  /** Names the invariant that makes this action safe to invoke twice.
   *  `mark_paid` must create exactly one Expense however many times it fires,
   *  and this is where that requirement is stated rather than assumed. */
  idempotentBy?: string;
  /** Default exposure to non-UI actors. Destructive operations should ask.
   *  `never` means the capability exists but is not emitted as an MCP tool. */
  exposure?: "always" | "ask" | "never";
}

// ─── Questions ───────────────────────────────────────────────────────────────
// Concept doc §5.12: desired insight drives captured data. Stating the question
// in the Blueprint lets the validator check the module can actually answer it —
// which is what stops a module becoming an attractive form that captured the
// wrong things.

export type Period = "all_time" | "today" | "this_week" | "this_month";

export interface QuestionDef extends Authored {
  id: QuestionId;
  key: string;
  /** In the user's own words. */
  ask: string;
  on: RecordId;
  aggregate: "sum" | "count" | "average" | "min" | "max";
  /** Required for every aggregate except count; must be numeric or money. */
  field?: FieldId;
  /** Which date field the period is measured against. */
  over?: FieldId;
  period?: Period;
  where?: Filter;
}

export type Filter =
  | { field: FieldId; op: "equals" | "not_equals"; value: string | boolean }
  | { field: FieldId; op: "before" | "after"; value: string }
  | { field: FieldId; op: "is_set" | "is_empty" };

// ─── Views ───────────────────────────────────────────────────────────────────
// Intent, not layout. "capture" compiles to a form, "browse" to a list,
// "summarise" to stats — but the Blueprint states the intent and lets the
// compiler choose the primitives. This is the seam that keeps pixels out.

export type ViewIntent = "capture" | "browse" | "summarise";

interface ViewBase extends Authored {
  id: ViewId;
  key: string;
  name: string;
  intent: ViewIntent;
  on: RecordId;
}

export interface CaptureView extends ViewBase {
  intent: "capture";
  /** Which fields to ask for, in the order worth asking them. Omit for all. */
  fields?: FieldId[];
  submitLabel?: string;
}

export interface BrowseView extends ViewBase {
  intent: "browse";
  /** What identifies a row at a glance. */
  row: { primary: FieldId; secondary?: FieldId; trailing?: FieldId };
  sort?: { field: FieldId; direction: "asc" | "desc" };
  where?: Filter;
  limit?: number;
  /** Actions offered on each row. */
  rowActions?: ActionId[];
}

export interface SummariseView extends ViewBase {
  intent: "summarise";
  /** The questions this view answers. */
  answers: QuestionId[];
}

export type View = CaptureView | BrowseView | SummariseView;

// ─── Blueprint ───────────────────────────────────────────────────────────────

export interface Blueprint {
  id: ModuleId;
  key: string;
  name: string;
  /** The user need, in one sentence, in their words. */
  purpose: string;
  scope?: { includes?: string[]; excludes?: string[] };
  /** Bumped on publish. The compile output inherits it. */
  version: number;
  /** Module-wide default for money fields. */
  currency?: string;

  records: RecordDef[];
  actions?: ActionDef[];
  questions?: QuestionDef[];
  views: View[];

  /** Which views belong together on the way in, in priority order. A statement
   *  about what goes together, not about how it is arranged — the compiler
   *  chooses the primitives and the Presentation layer (deferred) moves them. */
  home?: ViewId[];
}
