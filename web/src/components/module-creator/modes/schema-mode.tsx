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
  addField,
  changeFieldType,
  deleteCollection,
  deleteField,
  moveField,
  reorderFields,
  updateCollection,
  updateField,
} from "@/lib/module/mutations";
import { EmptyState, PanelHeading, ThreePanel } from "../three-panel";

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

  return (
    <ThreePanel
      left={
        <CollectionsRail
          collections={module.collections}
          selectedId={selectedCollectionId}
          onSelect={(id) => {
            setSelectedCollectionId(id);
            setSelectedFieldId(null);
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
      }
      center={
        selectedCollection ? (
          <FieldTable
            collection={selectedCollection}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onAddField={onAddField}
            onDeleteField={onDeleteField}
            onReorderFields={(from, to) =>
              setModule((m) => reorderFields(m, selectedCollection.id, from, to))
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
        selectedField && selectedCollection ? (
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

// ─── Center: field table ─────────────────────────────────────────────────────

function FieldTable({
  collection,
  selectedFieldId,
  onSelectField,
  onAddField,
  onDeleteField,
  onReorderFields,
}: {
  collection: Collection;
  selectedFieldId: Id | null;
  onSelectField: (id: Id) => void;
  onAddField: (type: FieldType) => void;
  onDeleteField: (id: Id) => void;
  onReorderFields: (from: number, to: number) => void;
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
      <div className="mb-6">
        <h2 className="text-xl font-medium text-ink">{collection.name}</h2>
        <p className="text-xs text-ink-faint mt-1 font-mono">
          {collection.key}
        </p>
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
                  <span className="w-5 text-center text-ink-faint">
                    {t.glyph}
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
        <span className="text-ink-faint">{spec?.glyph}</span>
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
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) =>
                onChange({ required: e.target.checked } as Partial<Field>)
              }
            />
            Required
          </label>
        </Row>

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
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={!!f.many}
              onChange={(e) =>
                onChange({ many: e.target.checked } as Partial<Field>)
              }
            />
            Many (one-to-many)
          </label>
        </Row>
      </>
    );
  }

  return null;
}
