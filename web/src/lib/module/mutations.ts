import type {
  Collection,
  Container,
  Element,
  ElementKind,
  Field,
  FieldType,
  Id,
  LayoutNode,
  Module,
  Screen,
  ScreenKind,
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

export function moveField(
  module: Module,
  collectionId: Id,
  fieldId: Id,
  delta: -1 | 1,
): Module {
  return {
    ...module,
    collections: module.collections.map((c) => {
      if (c.id !== collectionId) return c;
      const idx = c.fields.findIndex((f) => f.id === fieldId);
      if (idx < 0) return c;
      const target = idx + delta;
      if (target < 0 || target >= c.fields.length) return c;
      const next = [...c.fields];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...c, fields: next };
    }),
  };
}

export function reorderFields(
  module: Module,
  collectionId: Id,
  fromIdx: number,
  toIdx: number,
): Module {
  return {
    ...module,
    collections: module.collections.map((c) => {
      if (c.id !== collectionId) return c;
      if (fromIdx === toIdx) return c;
      if (fromIdx < 0 || fromIdx >= c.fields.length) return c;
      if (toIdx < 0 || toIdx >= c.fields.length) return c;
      const next = [...c.fields];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...c, fields: next };
    }),
  };
}

export function changeFieldType(
  module: Module,
  collectionId: Id,
  fieldId: Id,
  newType: FieldType,
): Module {
  return {
    ...module,
    collections: module.collections.map((c) => {
      if (c.id !== collectionId) return c;
      return {
        ...c,
        fields: c.fields.map((f) => {
          if (f.id !== fieldId) return f;
          if (f.type === newType) return f;
          // Build a fresh field of the new type, preserving common props.
          const fresh = defaultField(
            newType,
            c.fields.filter((x) => x.id !== fieldId).map((x) => x.key),
          );
          return {
            ...fresh,
            id: f.id,
            key: f.key,
            label: f.label,
            required: f.required,
            description: f.description,
          } as Field;
        }),
      };
    }),
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

// ─── Screens ─────────────────────────────────────────────────────────────────

function uniqueScreenKey(base: string, existing: string[]): string {
  return uniqueKey(toKey(base) || "screen", existing);
}

export function addScreen(
  module: Module,
  name = "New screen",
  kind: ScreenKind = "page",
): { module: Module; screen: Screen } {
  const root: Container = {
    kind: "container",
    id: uid(),
    direction: "column",
    gap: 12,
    padding: 24,
    align: "stretch",
    children: [],
  };
  const screen: Screen = {
    id: uid(),
    key: uniqueScreenKey(
      name,
      module.screens.map((s) => s.key),
    ),
    name,
    kind,
    root,
  };
  return {
    module: { ...module, screens: [...module.screens, screen] },
    screen,
  };
}

export function updateScreen(
  module: Module,
  id: Id,
  patch: Partial<Pick<Screen, "name" | "key" | "kind">>,
): Module {
  return {
    ...module,
    screens: module.screens.map((s) =>
      s.id === id ? { ...s, ...patch } : s,
    ),
  };
}

export function deleteScreen(module: Module, id: Id): Module {
  return {
    ...module,
    screens: module.screens.filter((s) => s.id !== id),
  };
}

// ─── Elements (within a screen's root container) ─────────────────────────────

export function addElement(
  module: Module,
  screenId: Id,
  kind: ElementKind,
): { module: Module; element: Element } {
  const element: Element = {
    kind: "element",
    id: uid(),
    type: kind,
    config: defaultElementConfig(kind),
  };
  return {
    module: mapScreenRoot(module, screenId, (root) => ({
      ...root,
      children: [...root.children, element],
    })),
    element,
  };
}

export function updateElement(
  module: Module,
  screenId: Id,
  elementId: Id,
  patch: Partial<Element>,
): Module {
  return mapScreenRoot(module, screenId, (root) => ({
    ...root,
    children: root.children.map((n) =>
      n.kind === "element" && n.id === elementId
        ? ({ ...n, ...patch } as Element)
        : n,
    ),
  }));
}

export function deleteElement(
  module: Module,
  screenId: Id,
  elementId: Id,
): Module {
  return mapScreenRoot(module, screenId, (root) => ({
    ...root,
    children: root.children.filter(
      (n) => !(n.kind === "element" && n.id === elementId),
    ),
  }));
}

export function clearScreen(module: Module, screenId: Id): Module {
  return mapScreenRoot(module, screenId, (root) => ({ ...root, children: [] }));
}

export function reorderElements(
  module: Module,
  screenId: Id,
  fromIdx: number,
  toIdx: number,
): Module {
  return mapScreenRoot(module, screenId, (root) => {
    if (fromIdx === toIdx) return root;
    if (fromIdx < 0 || fromIdx >= root.children.length) return root;
    if (toIdx < 0 || toIdx >= root.children.length) return root;
    const next = [...root.children];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    return { ...root, children: next };
  });
}

const FIELD_TO_ELEMENT: Record<FieldType, ElementKind> = {
  text: "text_input",
  long_text: "long_text_input",
  number: "number_input",
  boolean: "boolean_toggle",
  date: "date_input",
  datetime: "date_input",
  select: "select_input",
  multi_select: "select_input",
  relation: "relation_picker",
  file: "file_input",
};

export function generateFormFromCollection(
  module: Module,
  screenId: Id,
  collectionId: Id,
  options: { heading?: boolean; saveButton?: boolean } = {},
): Module {
  const collection = module.collections.find((c) => c.id === collectionId);
  if (!collection) return module;

  const additions: Element[] = [];

  if (options.heading) {
    additions.push({
      kind: "element",
      id: uid(),
      type: "heading",
      config: { text: `Log ${collection.name}`, size: "lg" },
    });
  }

  for (const f of collection.fields) {
    additions.push({
      kind: "element",
      id: uid(),
      type: FIELD_TO_ELEMENT[f.type],
      binding: { kind: "field", collectionId, fieldId: f.id },
      config: defaultElementConfig(FIELD_TO_ELEMENT[f.type]),
    });
  }

  if (options.saveButton) {
    additions.push({
      kind: "element",
      id: uid(),
      type: "button",
      config: { text: "Save", variant: "primary" },
    });
  }

  return mapScreenRoot(module, screenId, (root) => ({
    ...root,
    children: [...root.children, ...additions],
  }));
}

export function moveElement(
  module: Module,
  screenId: Id,
  elementId: Id,
  delta: -1 | 1,
): Module {
  return mapScreenRoot(module, screenId, (root) => {
    const idx = root.children.findIndex(
      (n) => n.kind === "element" && n.id === elementId,
    );
    if (idx < 0) return root;
    const target = idx + delta;
    if (target < 0 || target >= root.children.length) return root;
    const next = [...root.children];
    [next[idx], next[target]] = [next[target], next[idx]];
    return { ...root, children: next };
  });
}

function mapScreenRoot(
  module: Module,
  screenId: Id,
  fn: (root: Container) => Container,
): Module {
  return {
    ...module,
    screens: module.screens.map((s) =>
      s.id !== screenId ? s : { ...s, root: fn(s.root) },
    ),
  };
}

// ─── Nested containers ───────────────────────────────────────────────────────
//
// Tree shape: screen.root → (Container | Element)[]
//   - A Container in root.children may hold further Element children
//   - For M1 we limit nesting to one level (containers inside root, elements
//     inside those). The recursive helpers below already support deeper trees;
//     the UI just doesn't expose deeper adds yet.

export function addContainer(
  module: Module,
  screenId: Id,
  parentId: Id,
  direction: "row" | "column",
): { module: Module; container: Container } {
  const container: Container = {
    kind: "container",
    id: uid(),
    direction,
    gap: 12,
    padding: 12,
    align: direction === "row" ? "center" : "stretch",
    children: [],
  };
  return {
    module: mapNodeInScreen(module, screenId, parentId, (parent) => {
      if (parent.kind !== "container") return parent;
      return { ...parent, children: [...parent.children, container] };
    }),
    container,
  };
}

export function addElementTo(
  module: Module,
  screenId: Id,
  parentId: Id,
  kind: ElementKind,
): { module: Module; element: Element } {
  const element: Element = {
    kind: "element",
    id: uid(),
    type: kind,
    config: defaultElementConfig(kind),
  };
  return {
    module: mapNodeInScreen(module, screenId, parentId, (parent) => {
      if (parent.kind !== "container") return parent;
      return { ...parent, children: [...parent.children, element] };
    }),
    element,
  };
}

export function updateContainer(
  module: Module,
  screenId: Id,
  containerId: Id,
  patch: Partial<Container>,
): Module {
  return mapNodeInScreen(module, screenId, containerId, (node) => {
    if (node.kind !== "container") return node;
    return { ...node, ...patch } as Container;
  });
}

/** Patch any node (element or container) by id. */
export function updateNode(
  module: Module,
  screenId: Id,
  nodeId: Id,
  patch: Partial<Element> | Partial<Container>,
): Module {
  return mapNodeInScreen(module, screenId, nodeId, (node) =>
    ({ ...node, ...patch } as LayoutNode),
  );
}

/** Remove any node (container or element) from anywhere in the tree, except the screen root. */
export function deleteNode(module: Module, screenId: Id, nodeId: Id): Module {
  return mapScreenRoot(module, screenId, (root) => stripNode(root, nodeId));
}

function stripNode(c: Container, nodeId: Id): Container {
  return {
    ...c,
    children: c.children
      .filter((child) => child.id !== nodeId)
      .map((child) =>
        child.kind === "container" ? stripNode(child, nodeId) : child,
      ),
  };
}

export function reorderInParent(
  module: Module,
  screenId: Id,
  parentId: Id,
  fromIdx: number,
  toIdx: number,
): Module {
  return mapNodeInScreen(module, screenId, parentId, (parent) => {
    if (parent.kind !== "container") return parent;
    if (fromIdx === toIdx) return parent;
    if (fromIdx < 0 || fromIdx >= parent.children.length) return parent;
    if (toIdx < 0 || toIdx >= parent.children.length) return parent;
    const next = [...parent.children];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    return { ...parent, children: next };
  });
}

/** Walk the tree and return the Container that directly holds nodeId (or null if at root or absent). */
export function findParentOf(root: Container, nodeId: Id): Container | null {
  for (const child of root.children) {
    if (child.id === nodeId) return root;
    if (child.kind === "container") {
      const found = findParentOf(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

function mapNodeInScreen(
  module: Module,
  screenId: Id,
  targetId: Id,
  fn: (node: LayoutNode) => LayoutNode,
): Module {
  return mapScreenRoot(module, screenId, (root) => mapNode(root, targetId, fn));
}

function mapNode(
  c: Container,
  targetId: Id,
  fn: (node: LayoutNode) => LayoutNode,
): Container {
  if (c.id === targetId) {
    const replaced = fn(c);
    return (replaced.kind === "container" ? replaced : c) as Container;
  }
  return {
    ...c,
    children: c.children.map((child) => {
      if (child.id === targetId) return fn(child);
      if (child.kind === "container") return mapNode(child, targetId, fn);
      return child;
    }),
  };
}

// ─── Container catalog (for the picker) ──────────────────────────────────────

export interface ContainerSpec {
  kind: "row" | "column";
  label: string;
  glyph: string;
  direction: "row" | "column";
}

export const CONTAINER_CATALOG: ContainerSpec[] = [
  { kind: "row", label: "Row", glyph: "⇿", direction: "row" },
  { kind: "column", label: "Column", glyph: "⇕", direction: "column" },
];

export function findNode(
  container: Container,
  id: Id,
): LayoutNode | null {
  for (const child of container.children) {
    if (child.kind === "element" && child.id === id) return child;
    if (child.kind === "container") {
      if (child.id === id) return child;
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

// ─── Element catalog (for pickers) ───────────────────────────────────────────

export type ElementCategory = "input" | "display" | "action" | "layout";

export interface ElementSpec {
  kind: ElementKind;
  label: string;
  glyph: string;
  category: ElementCategory;
}

export const ELEMENT_CATALOG: ElementSpec[] = [
  // Inputs
  { kind: "text_input", label: "Text input", glyph: "T", category: "input" },
  { kind: "long_text_input", label: "Long text", glyph: "¶", category: "input" },
  { kind: "number_input", label: "Number", glyph: "#", category: "input" },
  { kind: "boolean_toggle", label: "Toggle", glyph: "◐", category: "input" },
  { kind: "date_input", label: "Date", glyph: "📅", category: "input" },
  { kind: "select_input", label: "Select", glyph: "▾", category: "input" },
  { kind: "relation_picker", label: "Relation", glyph: "→", category: "input" },
  { kind: "file_input", label: "File", glyph: "📎", category: "input" },
  // Display
  { kind: "heading", label: "Heading", glyph: "H", category: "display" },
  { kind: "paragraph", label: "Paragraph", glyph: "P", category: "display" },
  { kind: "label", label: "Label", glyph: "L", category: "display" },
  // Action
  { kind: "button", label: "Button", glyph: "▶", category: "action" },
  // Layout
  { kind: "divider", label: "Divider", glyph: "—", category: "layout" },
  { kind: "spacer", label: "Spacer", glyph: "␣", category: "layout" },
];

function defaultElementConfig(kind: ElementKind): Record<string, unknown> {
  switch (kind) {
    case "heading":
      return { text: "Heading", size: "lg" };
    case "paragraph":
      return { text: "Some paragraph text." };
    case "label":
      return { text: "Label" };
    case "button":
      return { text: "Button", variant: "primary" };
    case "spacer":
      return { size: 16 };
    case "text_input":
    case "long_text_input":
      return { placeholder: "" };
    case "number_input":
      return { placeholder: "0" };
    case "select_input":
      return { placeholder: "Choose..." };
    default:
      return {};
  }
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
