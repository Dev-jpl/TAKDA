"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  Collection,
  ComputedProperty,
  Field,
  FieldType,
  Id,
  Module,
  RelationField,
  SelectField,
  NumberField,
  TextField,
} from "@/lib/module/types";
import {
  FIELD_TYPES,
  addCollection,
  addComputed,
  addField,
  changeFieldType,
  deleteCollection,
  deleteComputed,
  deleteField,
  moveField,
  reorderFields,
  updateCollection,
  updateComputed,
  updateField,
} from "@/lib/module/mutations";
import { EmptyState, PanelHeading, ThreePanel } from "../three-panel";
import { Switch } from "@/components/ui/switch";

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function SchemaMode({
  module,
  setModule,
}: {
  module: Module;
  setModule: Dispatch<SetStateAction<Module>>;
}) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<Id | null>(
    null,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<Id | null>(null);
  const [selectedComputedId, setSelectedComputedId] = useState<Id | null>(null);

  // Auto-select first collection when added.
  useEffect(() => {
    if (selectedCollectionId == null && module.collections.length > 0) {
      setSelectedCollectionId(module.collections[0].id);
    }
    if (
      selectedCollectionId &&
      !module.collections.some((c) => c.id === selectedCollectionId)
    ) {
      setSelectedCollectionId(module.collections[0]?.id ?? null);
      setSelectedFieldId(null);
    }
  }, [module.collections, selectedCollectionId]);

  // Drop the computed selection if the property is deleted elsewhere.
  useEffect(() => {
    if (
      selectedComputedId &&
      !(module.computed ?? []).some((c) => c.id === selectedComputedId)
    ) {
      setSelectedComputedId(null);
    }
  }, [module.computed, selectedComputedId]);

  const selectedComputed = useMemo(
    () =>
      (module.computed ?? []).find((c) => c.id === selectedComputedId) ?? null,
    [module.computed, selectedComputedId],
  );

  const selectedCollection = useMemo(
    () => module.collections.find((c) => c.id === selectedCollectionId) ?? null,
    [module.collections, selectedCollectionId],
  );

  const selectedField = useMemo(() => {
    if (!selectedCollection || !selectedFieldId) return null;
    return selectedCollection.fields.find((f) => f.id === selectedFieldId) ?? null;
  }, [selectedCollection, selectedFieldId]);

  const onAddCollection = () => {
    const name = window.prompt("Collection name", "New collection");
    if (!name) return;
    setModule((m) => {
      const { module: next, collection } = addCollection(m, name);
      setSelectedCollectionId(collection.id);
      setSelectedFieldId(null);
      return next;
    });
  };

  const onDeleteCollection = (id: Id) => {
    if (!window.confirm("Delete this collection?")) return;
    setModule((m) => deleteCollection(m, id));
  };

  const onAddField = (type: FieldType) => {
    if (!selectedCollection) return;
    setModule((m) => {
      const { module: next, field } = addField(m, selectedCollection.id, type);
      setSelectedFieldId(field.id);
      return next;
    });
  };

  const onUpdateField = (patch: Partial<Field>) => {
    if (!selectedCollection || !selectedField) return;
    setModule((m) =>
      updateField(m, selectedCollection.id, selectedField.id, patch),
    );
  };

  const onDeleteField = (fieldId: Id) => {
    if (!selectedCollection) return;
    setModule((m) => deleteField(m, selectedCollection.id, fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const onAddComputed = () => {
    const label = window.prompt("Computed property name", "New computed");
    if (!label) return;
    setModule((m) => {
      const { module: next, computed } = addComputed(m, label);
      setSelectedComputedId(computed.id);
      setSelectedCollectionId(null);
      setSelectedFieldId(null);
      return next;
    });
  };

  const onUpdateComputed = (patch: Partial<ComputedProperty>) => {
    if (!selectedComputed) return;
    setModule((m) => updateComputed(m, selectedComputed.id, patch));
  };

  const onDeleteComputed = (id: Id) => {
    if (!window.confirm("Delete this computed property?")) return;
    setModule((m) => deleteComputed(m, id));
    if (selectedComputedId === id) setSelectedComputedId(null);
  };

  return (
    <ThreePanel
      left={
        <>
          <CollectionsRail
            collections={module.collections}
            selectedId={selectedCollectionId}
            onSelect={(id) => {
              setSelectedCollectionId(id);
              setSelectedFieldId(null);
              setSelectedComputedId(null);
            }}
            onAdd={onAddCollection}
            onDelete={onDeleteCollection}
            onRename={(id, name) =>
              setModule((m) => {
                const coll = m.collections.find((c) => c.id === id);
                const keyInSync = coll
                  ? coll.key === labelToKey(coll.name)
                  : false;
                return updateCollection(m, id, {
                  name,
                  ...(keyInSync ? { key: labelToKey(name) } : {}),
                });
              })
            }
          />
          <ComputedRail
            computed={module.computed ?? []}
            selectedId={selectedComputedId}
            onSelect={(id) => {
              setSelectedComputedId(id);
              setSelectedCollectionId(null);
              setSelectedFieldId(null);
            }}
            onAdd={onAddComputed}
            onDelete={onDeleteComputed}
          />
        </>
      }
      center={
        selectedComputed ? (
          <div className="p-10 text-center text-ink-muted">
            <p className="text-sm">
              Editing computed property{" "}
              <span className="text-ink font-medium">
                {selectedComputed.label}
              </span>
              .
            </p>
            <p className="text-xs mt-1 text-ink-faint">
              Configure the formula and result type on the right.
            </p>
          </div>
        ) : selectedCollection ? (
          <FieldTable
            collection={selectedCollection}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onAddField={onAddField}
            onDeleteField={onDeleteField}
            onReorderFields={(from, to) =>
              setModule((m) => reorderFields(m, selectedCollection.id, from, to))
            }
            onToggleSingleton={(next) =>
              setModule((m) =>
                updateCollection(m, selectedCollection.id, {
                  singleton: next || undefined,
                }),
              )
            }
          />
        ) : (
          <div className="p-10 text-center text-ink-muted">
            <p className="text-sm">No collection selected.</p>
            <p className="text-xs mt-1 text-ink-faint">
              Pick one from the left, or create a new one.
            </p>
          </div>
        )
      }
      right={
        selectedComputed ? (
          <ComputedInspector
            module={module}
            computed={selectedComputed}
            onChange={onUpdateComputed}
            onDelete={() => onDeleteComputed(selectedComputed.id)}
          />
        ) : selectedField && selectedCollection ? (
          <FieldInspector
            module={module}
            collection={selectedCollection}
            field={selectedField}
            onChange={onUpdateField}
            onChangeType={(t) => {
              setModule((m) =>
                changeFieldType(m, selectedCollection.id, selectedField.id, t),
              );
            }}
            onMove={(d) => {
              setModule((m) =>
                moveField(m, selectedCollection.id, selectedField.id, d),
              );
            }}
            onDelete={() => {
              setModule((m) =>
                deleteField(m, selectedCollection.id, selectedField.id),
              );
              setSelectedFieldId(null);
            }}
          />
        ) : (
          <>
            <PanelHeading>Field settings</PanelHeading>
            <EmptyState>Select a field to configure it.</EmptyState>
          </>
        )
      }
    />
  );
}

// ─── Collections rail ────────────────────────────────────────────────────────

function CollectionsRail({
  collections,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  onRename,
}: {
  collections: Collection[];
  selectedId: Id | null;
  onSelect: (id: Id) => void;
  onAdd: () => void;
  onDelete: (id: Id) => void;
  onRename: (id: Id, name: string) => void;
}) {
  return (
    <>
      <PanelHeading>Collections</PanelHeading>
      {collections.length === 0 ? (
        <EmptyState>No collections yet.</EmptyState>
      ) : (
        <ul className="px-2 py-2 space-y-0.5">
          {collections.map((c) => {
            const active = c.id === selectedId;
            return (
              <li key={c.id} className="group">
                <div
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm cursor-pointer ${
                    active
                      ? "bg-ink text-paper"
                      : "text-ink-muted hover:bg-rule/30 hover:text-ink"
                  }`}
                  onClick={() => onSelect(c.id)}
                  onDoubleClick={() => {
                    const next = window.prompt("Rename collection", c.name);
                    if (next && next !== c.name) onRename(c.id, next);
                  }}
                >
                  <span className="flex-1 truncate">{c.name}</span>
                  <span
                    className={`text-[10px] ${
                      active ? "text-paper/60" : "text-ink-faint"
                    }`}
                  >
                    {c.fields.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs ${
                      active ? "text-paper/70 hover:text-paper" : "text-ink-faint hover:text-ink"
                    }`}
                    aria-label="Delete collection"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="px-3 py-2">
        <button
          onClick={onAdd}
          className="w-full text-left text-sm text-ink-muted hover:text-ink border border-dashed border-rule hover:border-ink rounded px-3 py-2 transition-colors"
        >
          + Add collection
        </button>
      </div>
    </>
  );
}

// ─── Left rail (continued): computed properties ──────────────────────────────

function ComputedRail({
  computed,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}: {
  computed: ComputedProperty[];
  selectedId: Id | null;
  onSelect: (id: Id) => void;
  onAdd: () => void;
  onDelete: (id: Id) => void;
}) {
  return (
    <>
      <PanelHeading>Computed</PanelHeading>
      {computed.length === 0 ? (
        <EmptyState>No computed properties yet.</EmptyState>
      ) : (
        <ul className="px-2 py-2 space-y-0.5">
          {computed.map((c) => {
            const active = c.id === selectedId;
            return (
              <li key={c.id} className="group">
                <div
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm cursor-pointer ${
                    active
                      ? "bg-ink text-paper"
                      : "text-ink-muted hover:bg-rule/30 hover:text-ink"
                  }`}
                  onClick={() => onSelect(c.id)}
                >
                  <span className="flex-1 truncate">{c.label}</span>
                  <span
                    className={`text-[10px] font-mono ${
                      active ? "text-paper/60" : "text-ink-faint"
                    }`}
                  >
                    {c.resultType}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs ${
                      active
                        ? "text-paper/70 hover:text-paper"
                        : "text-ink-faint hover:text-ink"
                    }`}
                    aria-label="Delete computed property"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="px-3 py-2">
        <button
          onClick={onAdd}
          className="w-full text-left text-sm text-ink-muted hover:text-ink border border-dashed border-rule hover:border-ink rounded px-3 py-2 transition-colors"
        >
          + Add computed
        </button>
      </div>
    </>
  );
}

// ─── Right: computed property inspector ──────────────────────────────────────

function ComputedInspector({
  module,
  computed,
  onChange,
  onDelete,
}: {
  module: Module;
  computed: ComputedProperty;
  onChange: (patch: Partial<ComputedProperty>) => void;
  onDelete: () => void;
}) {
  const RESULT_TYPES: Array<{ id: ComputedProperty["resultType"]; label: string }> = [
    { id: "number", label: "Number" },
    { id: "text", label: "Text" },
    { id: "boolean", label: "Boolean" },
    { id: "date", label: "Date" },
  ];
  return (
    <>
      <PanelHeading>Computed property</PanelHeading>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            className="ml-auto px-2 py-1 text-xs text-ink-muted hover:text-ink"
          >
            Delete
          </button>
        </div>

        <Row label="Label">
          <input
            value={computed.label}
            onChange={(e) => {
              const label = e.target.value;
              // Keep the key auto-synced while it tracks the label slug.
              const keyInSync = computed.key === labelToKey(computed.label);
              onChange({
                label,
                ...(keyInSync ? { key: labelToKey(label) } : {}),
              });
            }}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>

        <Row label="Key">
          <input
            value={computed.key}
            onChange={(e) => onChange({ key: labelToKey(e.target.value) })}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm font-mono"
          />
        </Row>

        <Row label="Result type">
          <div className="grid grid-cols-4 gap-1">
            {RESULT_TYPES.map((t) => {
              const active = computed.resultType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onChange({ resultType: t.id })}
                  className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Scope">
          <select
            value={computed.collectionId ?? ""}
            onChange={(e) =>
              onChange({
                collectionId: e.target.value ? e.target.value : undefined,
              })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="">Module-wide</option>
            {module.collections.map((c) => (
              <option key={c.id} value={c.id}>
                Per entry in {c.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-ink-faint mt-1.5">
            Module-wide = one value for the whole module. Per-entry = one value
            computed for each row in the chosen collection.
          </p>
        </Row>

        <Row label="Expression">
          <textarea
            value={computed.expression}
            onChange={(e) => onChange({ expression: e.target.value })}
            placeholder="e.g. calories * servings"
            rows={4}
            className="w-full bg-transparent border border-rule focus:border-ink outline-none p-2 text-sm font-mono rounded"
            spellCheck={false}
          />
          <p className="text-[10px] text-ink-faint mt-1.5">
            Reference fields by their <span className="font-mono">key</span>.
            No evaluator yet — wire a Compute action in Behavior mode to test
            inputs.
          </p>
        </Row>
      </div>
    </>
  );
}

// ─── Center: field table ─────────────────────────────────────────────────────

function FieldTable({
  collection,
  selectedFieldId,
  onSelectField,
  onAddField,
  onDeleteField,
  onReorderFields,
  onToggleSingleton,
}: {
  collection: Collection;
  selectedFieldId: Id | null;
  onSelectField: (id: Id) => void;
  onAddField: (type: FieldType) => void;
  onDeleteField: (id: Id) => void;
  onReorderFields: (from: number, to: number) => void;
  onToggleSingleton: (next: boolean) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = collection.fields.findIndex((f) => f.id === active.id);
    const to = collection.fields.findIndex((f) => f.id === over.id);
    if (from < 0 || to < 0) return;
    onReorderFields(from, to);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-ink flex items-center gap-2">
            {collection.name}
            {collection.singleton && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-faint border border-rule rounded-full px-2 py-0.5">
                singleton
              </span>
            )}
          </h2>
          <p className="text-xs text-ink-faint mt-1 font-mono">
            {collection.key}
          </p>
        </div>
        <div className="shrink-0 rounded-md border border-rule bg-paper px-4 py-2.5">
          <Switch
            label="Singleton"
            checked={!!collection.singleton}
            onChange={onToggleSingleton}
          />
          <p className="mt-1.5 text-[10px] text-ink-faint max-w-60 leading-snug">
            One entry per user. Saves upsert; capture screens pre-fill with the
            current values. Use for settings / preferences.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-rule bg-paper overflow-hidden">
        <div className="grid grid-cols-[24px_1fr_140px_120px_60px] gap-0 border-b border-rule bg-rule/20 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          <div className="px-2 py-2"></div>
          <div className="px-4 py-2">Label</div>
          <div className="px-4 py-2">Type</div>
          <div className="px-4 py-2 font-mono normal-case tracking-normal text-[11px]">
            key
          </div>
          <div className="px-4 py-2 text-right">·</div>
        </div>

        {collection.fields.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-muted">
            No fields yet.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={collection.fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul>
                {collection.fields.map((f) => (
                  <SortableFieldRow
                    key={f.id}
                    field={f}
                    active={f.id === selectedFieldId}
                    onSelect={() => onSelectField(f.id)}
                    onDelete={() => onDeleteField(f.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

      </div>

      <div className="mt-2 relative">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="w-full text-left text-sm text-ink-muted hover:text-ink border border-dashed border-rule hover:border-ink rounded px-3 py-2 transition-colors bg-paper"
        >
          + Add field
        </button>
        {pickerOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-paper border border-rule rounded-md shadow-md p-1">
            <div className="grid grid-cols-2 gap-1">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => {
                    onAddField(t.type);
                    setPickerOpen(false);
                  }}
                  className="flex items-center gap-2 text-left text-sm text-ink-muted hover:bg-rule/30 hover:text-ink rounded px-2 py-1.5"
                >
                  <span className="w-5 flex items-center justify-center text-ink-faint">
                    <t.icon size={14} weight="regular" />
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableFieldRow({
  field,
  active,
  onSelect,
  onDelete,
}: {
  field: Field;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const spec = FIELD_TYPES.find((t) => t.type === field.type);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group grid grid-cols-[24px_1fr_140px_120px_60px] gap-0 border-b last:border-b-0 border-rule cursor-pointer ${
        active ? "bg-rule/40" : "hover:bg-rule/20"
      } ${isDragging ? "relative z-10 shadow-md bg-paper" : ""}`}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.2" />
          <circle cx="2" cy="7" r="1.2" />
          <circle cx="2" cy="12" r="1.2" />
          <circle cx="8" cy="2" r="1.2" />
          <circle cx="8" cy="7" r="1.2" />
          <circle cx="8" cy="12" r="1.2" />
        </svg>
      </div>
      <div className="px-4 py-3 text-sm text-ink flex items-center gap-2">
        {field.label}
        {field.required && (
          <span className="text-[10px] text-ink-faint">·req</span>
        )}
      </div>
      <div className="px-4 py-3 text-sm text-ink-muted flex items-center gap-2">
        <span className="text-ink-faint flex items-center">
          {spec?.icon && <spec.icon size={14} weight="regular" />}
        </span>
        {spec?.label ?? field.type}
      </div>
      <div className="px-4 py-3 text-xs text-ink-faint font-mono truncate">
        {field.key}
      </div>
      <div className="px-4 py-3 text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-ink-faint hover:text-ink"
          aria-label="Delete field"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

// ─── Right: field inspector ──────────────────────────────────────────────────

function FieldInspector({
  module,
  collection,
  field,
  onChange,
  onChangeType,
  onMove,
  onDelete,
}: {
  module: Module;
  collection: Collection;
  field: Field;
  onChange: (patch: Partial<Field>) => void;
  onChangeType: (t: FieldType) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
}) {
  const idx = collection.fields.findIndex((f) => f.id === field.id);
  const canUp = idx > 0;
  const canDown = idx >= 0 && idx < collection.fields.length - 1;

  return (
    <>
      <PanelHeading>Field</PanelHeading>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-1">
          <button
            disabled={!canUp}
            onClick={() => onMove(-1)}
            aria-label="Move up"
            className="px-2 py-1 text-sm border border-rule rounded disabled:opacity-30 hover:border-ink"
          >
            ↑
          </button>
          <button
            disabled={!canDown}
            onClick={() => onMove(1)}
            aria-label="Move down"
            className="px-2 py-1 text-sm border border-rule rounded disabled:opacity-30 hover:border-ink"
          >
            ↓
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete field "${field.label}"?`)) onDelete();
            }}
            className="ml-auto px-2 py-1 text-xs text-ink-muted hover:text-ink"
          >
            Delete
          </button>
        </div>

        <Row label="Label">
          <input
            value={field.label}
            onChange={(e) => {
              const nextLabel = e.target.value;
              const keyInSync = field.key === labelToKey(field.label);
              const patch: Partial<Field> = { label: nextLabel };
              if (keyInSync) patch.key = labelToKey(nextLabel);
              onChange(patch);
            }}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>

        <Row label="Type">
          <select
            value={field.type}
            onChange={(e) => {
              const next = e.target.value as FieldType;
              if (next === field.type) return;
              if (
                window.confirm(
                  "Changing type will reset this field's type-specific config (options, min/max, target). Continue?",
                )
              ) {
                onChangeType(next);
              }
            }}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Key" hint="machine name, snake_case">
          <div className="flex items-center gap-2">
            <input
              value={field.key}
              onChange={(e) =>
                onChange({
                  key: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "_"),
                } as Partial<Field>)
              }
              className="flex-1 bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm font-mono"
            />
            <button
              onClick={() =>
                onChange({ key: labelToKey(field.label) } as Partial<Field>)
              }
              disabled={field.key === labelToKey(field.label)}
              title="Sync key from label"
              className="text-xs border border-rule rounded px-2 py-1 text-ink-muted hover:text-ink hover:border-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ↻ label
            </button>
          </div>
        </Row>

        <Row label="">
          <Switch
            label="Required"
            checked={!!field.required}
            onChange={(next) =>
              onChange({ required: next } as Partial<Field>)
            }
          />
        </Row>

        <DefaultValueRow field={field} onChange={onChange} />

        <TypeSpecificConfig
          field={field}
          collection={collection}
          collections={module.collections}
          onChange={onChange}
        />
      </div>
    </>
  );
}

function DefaultValueRow({
  field,
  onChange,
}: {
  field: Field;
  onChange: (patch: Partial<Field>) => void;
}) {
  const def = field.defaultValue;

  if (field.type === "boolean") {
    return (
      <Row label="Default state">
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { id: undefined, label: "— none —" },
              { id: false, label: "Off" },
              { id: true, label: "On" },
            ] as const
          ).map((opt) => {
            const active = def === opt.id;
            return (
              <button
                key={String(opt.id)}
                onClick={() =>
                  onChange({ defaultValue: opt.id } as Partial<Field>)
                }
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Row>
    );
  }

  if (field.type === "date" || field.type === "datetime") {
    const isToday = def === "__today__";
    return (
      <Row label="Default">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onChange({
                defaultValue: isToday ? undefined : "__today__",
              } as Partial<Field>)
            }
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              isToday
                ? "border-ink bg-ink text-paper"
                : "border-rule text-ink-muted hover:border-ink hover:text-ink"
            }`}
          >
            Today
          </button>
          <input
            type={field.type === "datetime" ? "datetime-local" : "date"}
            value={
              isToday || def === undefined || def === null
                ? ""
                : String(def).slice(0, field.type === "datetime" ? 16 : 10)
            }
            onChange={(e) =>
              onChange({
                defaultValue: e.target.value || undefined,
              } as Partial<Field>)
            }
            className="flex-1 bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </div>
      </Row>
    );
  }

  if (field.type === "select") {
    const opts = (field as SelectField).options;
    return (
      <Row label="Default">
        <select
          value={typeof def === "string" ? def : ""}
          onChange={(e) =>
            onChange({
              defaultValue: e.target.value || undefined,
            } as Partial<Field>)
          }
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        >
          <option value="">— none —</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Row>
    );
  }

  if (field.type === "number") {
    return (
      <Row label="Default">
        <input
          type="number"
          value={typeof def === "number" ? def : ""}
          onChange={(e) =>
            onChange({
              defaultValue:
                e.target.value === "" ? undefined : Number(e.target.value),
            } as Partial<Field>)
          }
          placeholder="—"
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        />
      </Row>
    );
  }

  if (field.type === "text" || field.type === "long_text") {
    return (
      <Row label="Default">
        <input
          value={typeof def === "string" ? def : ""}
          onChange={(e) =>
            onChange({
              defaultValue: e.target.value || undefined,
            } as Partial<Field>)
          }
          placeholder="—"
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        />
      </Row>
    );
  }

  return null;
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-1">
          {label}
          {hint && (
            <span className="ml-2 normal-case tracking-normal text-ink-faint/70">
              {hint}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function TypeSpecificConfig({
  field,
  collection: _collection,
  collections,
  onChange,
}: {
  field: Field;
  collection: Collection;
  collections: Collection[];
  onChange: (patch: Partial<Field>) => void;
}) {
  if (field.type === "text" || field.type === "long_text") {
    const f = field as TextField;
    return (
      <>
        <Row label="Min length">
          <input
            type="number"
            value={f.minLength ?? ""}
            onChange={(e) =>
              onChange({
                minLength: e.target.value === "" ? undefined : Number(e.target.value),
              } as Partial<Field>)
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
        <Row label="Max length">
          <input
            type="number"
            value={f.maxLength ?? ""}
            onChange={(e) =>
              onChange({
                maxLength: e.target.value === "" ? undefined : Number(e.target.value),
              } as Partial<Field>)
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
        <Row label="Pattern (regex)">
          <input
            value={f.pattern ?? ""}
            onChange={(e) =>
              onChange({
                pattern: e.target.value || undefined,
              } as Partial<Field>)
            }
            placeholder="e.g. ^[A-Z][a-z]+$"
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm font-mono"
          />
        </Row>
      </>
    );
  }

  if (field.type === "number") {
    const f = field as NumberField;
    return (
      <>
        <Row label="Min">
          <input
            type="number"
            value={f.min ?? ""}
            onChange={(e) =>
              onChange({
                min: e.target.value === "" ? undefined : Number(e.target.value),
              } as Partial<Field>)
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
        <Row label="Max">
          <input
            type="number"
            value={f.max ?? ""}
            onChange={(e) =>
              onChange({
                max: e.target.value === "" ? undefined : Number(e.target.value),
              } as Partial<Field>)
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
        <Row label="Unit">
          <input
            value={f.unit ?? ""}
            onChange={(e) =>
              onChange({ unit: e.target.value || undefined } as Partial<Field>)
            }
            placeholder="kcal, kg, $..."
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
      </>
    );
  }

  if (field.type === "select" || field.type === "multi_select") {
    const f = field as SelectField;
    return (
      <Row label="Options">
        <ul className="space-y-1 mb-2">
          {f.options.map((opt, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                value={opt.label}
                onChange={(e) => {
                  const next = [...f.options];
                  next[i] = {
                    value: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "_"),
                    label: e.target.value,
                  };
                  onChange({ options: next } as Partial<Field>);
                }}
                className="flex-1 bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
              />
              <button
                onClick={() =>
                  onChange({
                    options: f.options.filter((_, j) => j !== i),
                  } as Partial<Field>)
                }
                className="text-xs text-ink-faint hover:text-ink"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() =>
            onChange({
              options: [...f.options, { value: "", label: "" }],
            } as Partial<Field>)
          }
          className="w-full text-left text-sm text-ink-muted hover:text-ink border border-dashed border-rule hover:border-ink rounded px-3 py-1.5 transition-colors"
        >
          + Add option
        </button>
      </Row>
    );
  }

  if (field.type === "relation") {
    const f = field as RelationField;
    const targets = collections.filter((c) => c.id !== _collection.id);
    return (
      <>
        <Row label="Target collection">
          <select
            value={f.targetCollection}
            onChange={(e) =>
              onChange({ targetCollection: e.target.value } as Partial<Field>)
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="">— pick a collection —</option>
            {targets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {targets.length === 0 && (
            <p className="text-xs text-ink-faint mt-1">
              Add another collection to enable relations.
            </p>
          )}
        </Row>
        <Row label="">
          <Switch
            label="Many (one-to-many)"
            checked={!!f.many}
            onChange={(next) =>
              onChange({ many: next } as Partial<Field>)
            }
          />
        </Row>
      </>
    );
  }

  return null;
}
