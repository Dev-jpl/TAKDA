import type {
  Collection,
  Field,
  FieldType,
  Id,
  Module,
} from "./types";

function uid(): Id {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function uniqueKey(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

// ─── Collections ─────────────────────────────────────────────────────────────

export function addCollection(module: Module, name = "New collection"): {
  module: Module;
  collection: Collection;
} {
  const key = uniqueKey(
    toKey(name) || "collection",
    module.collections.map((c) => c.key),
  );
  const collection: Collection = {
    id: uid(),
    key,
    name,
    fields: [],
  };
  return {
    module: { ...module, collections: [...module.collections, collection] },
    collection,
  };
}

export function updateCollection(
  module: Module,
  id: Id,
  patch: Partial<Pick<Collection, "name" | "key" | "description">>,
): Module {
  return {
    ...module,
    collections: module.collections.map((c) =>
      c.id === id ? { ...c, ...patch } : c,
    ),
  };
}

export function deleteCollection(module: Module, id: Id): Module {
  return {
    ...module,
    collections: module.collections.filter((c) => c.id !== id),
  };
}

// ─── Fields ──────────────────────────────────────────────────────────────────

function defaultField(type: FieldType, existingKeys: string[]): Field {
  const id = uid();
  const baseLabel = labelForType(type);
  const key = uniqueKey(toKey(baseLabel), existingKeys);
  const common = { id, key, label: baseLabel };

  switch (type) {
    case "text":
    case "long_text":
      return { ...common, type };
    case "number":
      return { ...common, type };
    case "boolean":
      return { ...common, type };
    case "date":
    case "datetime":
      return { ...common, type };
    case "select":
    case "multi_select":
      return { ...common, type, options: [] };
    case "relation":
      return { ...common, type, targetCollection: "" };
    case "file":
      return { ...common, type };
  }
}

export function labelForType(type: FieldType): string {
  return (
    {
      text: "Text",
      long_text: "Long text",
      number: "Number",
      boolean: "Toggle",
      date: "Date",
      datetime: "Date & time",
      select: "Select",
      multi_select: "Multi-select",
      relation: "Relation",
      file: "File",
    } as Record<FieldType, string>
  )[type];
}

export function addField(
  module: Module,
  collectionId: Id,
  type: FieldType,
): { module: Module; field: Field } {
  const collection = module.collections.find((c) => c.id === collectionId);
  if (!collection) throw new Error(`collection ${collectionId} not found`);
  const field = defaultField(
    type,
    collection.fields.map((f) => f.key),
  );
  const updated: Collection = {
    ...collection,
    fields: [...collection.fields, field],
  };
  return {
    module: {
      ...module,
      collections: module.collections.map((c) =>
        c.id === collectionId ? updated : c,
      ),
    },
    field,
  };
}

export function updateField(
  module: Module,
  collectionId: Id,
  fieldId: Id,
  patch: Partial<Field>,
): Module {
  return {
    ...module,
    collections: module.collections.map((c) =>
      c.id !== collectionId
        ? c
        : {
            ...c,
            fields: c.fields.map((f) =>
              f.id === fieldId ? ({ ...f, ...patch } as Field) : f,
            ),
          },
    ),
  };
}

export function deleteField(
  module: Module,
  collectionId: Id,
  fieldId: Id,
): Module {
  return {
    ...module,
    collections: module.collections.map((c) =>
      c.id !== collectionId
        ? c
        : { ...c, fields: c.fields.filter((f) => f.id !== fieldId) },
    ),
  };
}

// ─── Field types catalog (for pickers) ───────────────────────────────────────

export const FIELD_TYPES: { type: FieldType; label: string; glyph: string }[] = [
  { type: "text", label: "Text", glyph: "T" },
  { type: "long_text", label: "Long text", glyph: "¶" },
  { type: "number", label: "Number", glyph: "#" },
  { type: "boolean", label: "Toggle", glyph: "◐" },
  { type: "date", label: "Date", glyph: "📅" },
  { type: "datetime", label: "Date & time", glyph: "⏱" },
  { type: "select", label: "Select", glyph: "▾" },
  { type: "multi_select", label: "Multi-select", glyph: "≡" },
  { type: "relation", label: "Relation", glyph: "→" },
  { type: "file", label: "File", glyph: "📎" },
];
