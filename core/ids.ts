// ─── Stable identity ─────────────────────────────────────────────────────────
// IDs are minted ONCE, at the Blueprint layer, and are the durable join key for
// everything downstream: MDL nodes, presentation overrides, capability ids and
// storage columns.
//
// The rule that makes this worth doing: human-facing names and keys are
// ALIASES. Renaming "Bills" to "Payables" changes the name and the key; it
// changes no id, so layout, automations and existing records all survive.
//
// Consequence: ids are never derived from names. They live in the Blueprint
// document itself, which is why the Blueprint — not the MDL — is the thing
// worth version-controlling.

/** Branded so a FieldId can't be passed where a RecordId is wanted. */
type Branded<T extends string> = string & { readonly __brand: T };

export type ModuleId = Branded<"module">;
export type RecordId = Branded<"record">;
export type FieldId = Branded<"field">;
export type ViewId = Branded<"view">;
export type ActionId = Branded<"action">;
export type QuestionId = Branded<"question">;

export type AnyId =
  | ModuleId
  | RecordId
  | FieldId
  | ViewId
  | ActionId
  | QuestionId;

export const ID_PREFIX = {
  module: "mod",
  record: "rec",
  field: "fld",
  view: "viw",
  action: "act",
  question: "qst",
} as const;

export type IdKind = keyof typeof ID_PREFIX;

/** Lexicographically sortable: base36 millis + base36 randomness. Opaque on
 *  purpose — nothing downstream may parse meaning out of an id. */
export function mintId<K extends IdKind>(kind: K): string {
  const time = Date.now().toString(36).padStart(9, "0");
  const rand = Math.random().toString(36).slice(2, 10).padStart(8, "0");
  return `${ID_PREFIX[kind]}_${time}${rand}`;
}

export const asModuleId = (s: string) => s as ModuleId;
export const asRecordId = (s: string) => s as RecordId;
export const asFieldId = (s: string) => s as FieldId;
export const asViewId = (s: string) => s as ViewId;
export const asActionId = (s: string) => s as ActionId;
export const asQuestionId = (s: string) => s as QuestionId;

/** Shape check only — ids are opaque, so this deliberately does not decode. */
export function isId(kind: IdKind, value: string): boolean {
  return new RegExp(`^${ID_PREFIX[kind]}_[0-9a-z]{17}$`).test(value);
}
