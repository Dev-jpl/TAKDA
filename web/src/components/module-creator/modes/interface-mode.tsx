"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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
  DevicePreview,
  Element,
  Id,
  Module,
  Screen,
} from "@/lib/module/types";
import {
  ELEMENT_CATALOG,
  addElement,
  addScreen,
  clearScreen,
  deleteElement,
  deleteScreen,
  findNode,
  generateFormFromCollection,
  moveElement,
  reorderElements,
  updateElement,
  updateScreen,
  type ElementCategory,
} from "@/lib/module/mutations";
import { EmptyState, PanelHeading, ThreePanel } from "../three-panel";
import { ContainerRenderer, RenderedElement } from "../element-renderer";

const DEVICE_WIDTH: Record<DevicePreview, string> = {
  phone: "390px",
  tablet: "820px",
  desktop: "100%",
};

export function InterfaceMode({
  module,
  setModule,
  device,
}: {
  module: Module;
  setModule: Dispatch<SetStateAction<Module>>;
  device: DevicePreview;
}) {
  const [selectedScreenId, setSelectedScreenId] = useState<Id | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<Id | null>(null);

  useEffect(() => {
    if (selectedScreenId == null && module.screens.length > 0) {
      setSelectedScreenId(module.screens[0].id);
    }
    if (
      selectedScreenId &&
      !module.screens.some((s) => s.id === selectedScreenId)
    ) {
      setSelectedScreenId(module.screens[0]?.id ?? null);
      setSelectedElementId(null);
    }
  }, [module.screens, selectedScreenId]);

  const selectedScreen = useMemo(
    () => module.screens.find((s) => s.id === selectedScreenId) ?? null,
    [module.screens, selectedScreenId],
  );

  const selectedElement = useMemo(() => {
    if (!selectedScreen || !selectedElementId) return null;
    const node = findNode(selectedScreen.root, selectedElementId);
    return node?.kind === "element" ? node : null;
  }, [selectedScreen, selectedElementId]);

  const onAddScreen = () => {
    const name = window.prompt("Screen name", "New screen");
    if (!name) return;
    setModule((m) => {
      const { module: next, screen } = addScreen(m, name, "page");
      setSelectedScreenId(screen.id);
      setSelectedElementId(null);
      return next;
    });
  };

  const onAddElement = (kind: Element["type"]) => {
    if (!selectedScreen) return;
    setModule((m) => {
      const { module: next, element } = addElement(m, selectedScreen.id, kind);
      setSelectedElementId(element.id);
      return next;
    });
  };

  const onPatchElement = (patch: Partial<Element>) => {
    if (!selectedScreen || !selectedElement) return;
    setModule((m) =>
      updateElement(m, selectedScreen.id, selectedElement.id, patch),
    );
  };

  return (
    <ThreePanel
      left={
        <ScreensRail
          screens={module.screens}
          screenId={selectedScreenId}
          selectedScreen={selectedScreen}
          selectedElementId={selectedElementId}
          onSelectScreen={(id) => {
            setSelectedScreenId(id);
            setSelectedElementId(null);
          }}
          onSelectElement={setSelectedElementId}
          onAddScreen={onAddScreen}
          onRenameScreen={(id, name) =>
            setModule((m) => updateScreen(m, id, { name }))
          }
          onDeleteScreen={(id) => {
            if (!window.confirm("Delete this screen?")) return;
            setModule((m) => deleteScreen(m, id));
          }}
          onReorderLayers={(from, to) => {
            if (!selectedScreen) return;
            setModule((m) =>
              reorderElements(m, selectedScreen.id, from, to),
            );
          }}
        />
      }
      center={
        selectedScreen ? (
          <Canvas
            screen={selectedScreen}
            module={module}
            device={device}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onAddElement={onAddElement}
            onDeselect={() => setSelectedElementId(null)}
            onGenerateFromCollection={(collId, opts) => {
              setModule((m) =>
                generateFormFromCollection(m, selectedScreen.id, collId, opts),
              );
            }}
            onReorderElements={(from, to) =>
              setModule((m) =>
                reorderElements(m, selectedScreen.id, from, to),
              )
            }
            onClearScreen={() => {
              if (
                !window.confirm(
                  `Remove all elements from "${selectedScreen.name}"?`,
                )
              )
                return;
              setModule((m) => clearScreen(m, selectedScreen.id));
              setSelectedElementId(null);
            }}
          />
        ) : (
          <div className="p-10 text-center text-ink-muted">
            <p className="text-sm">No screen selected.</p>
            <p className="text-xs mt-1 text-ink-faint">
              Add one from the left rail.
            </p>
          </div>
        )
      }
      right={
        selectedElement && selectedScreen ? (
          <ElementInspector
            module={module}
            screen={selectedScreen}
            element={selectedElement}
            onPatch={onPatchElement}
            onDelete={() => {
              setModule((m) =>
                deleteElement(m, selectedScreen.id, selectedElement.id),
              );
              setSelectedElementId(null);
            }}
            onMove={(d) => {
              setModule((m) =>
                moveElement(m, selectedScreen.id, selectedElement.id, d),
              );
            }}
          />
        ) : (
          <>
            <PanelHeading>Element</PanelHeading>
            <EmptyState>Select an element on the canvas to edit it.</EmptyState>
          </>
        )
      }
    />
  );
}

// ─── Left rail: screens + layers ─────────────────────────────────────────────

function ScreensRail({
  screens,
  screenId,
  selectedScreen,
  selectedElementId,
  onSelectScreen,
  onSelectElement,
  onAddScreen,
  onRenameScreen,
  onDeleteScreen,
  onReorderLayers,
}: {
  screens: Screen[];
  screenId: Id | null;
  selectedScreen: Screen | null;
  selectedElementId: Id | null;
  onSelectScreen: (id: Id) => void;
  onSelectElement: (id: Id) => void;
  onAddScreen: () => void;
  onRenameScreen: (id: Id, name: string) => void;
  onDeleteScreen: (id: Id) => void;
  onReorderLayers: (from: number, to: number) => void;
}) {
  const selectedScreenId = screenId;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const elementChildren = selectedScreen
    ? selectedScreen.root.children.filter((n) => n.kind === "element")
    : [];

  const onDragEndLayers = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = elementChildren.findIndex((n) => n.id === active.id);
    const to = elementChildren.findIndex((n) => n.id === over.id);
    if (from < 0 || to < 0) return;
    onReorderLayers(from, to);
  };
  return (
    <>
      <PanelHeading>Screens</PanelHeading>
      {screens.length === 0 ? (
        <EmptyState>No screens yet.</EmptyState>
      ) : (
        <ul className="px-2 py-2 space-y-0.5">
          {screens.map((s) => {
            const active = s.id === selectedScreenId;
            return (
              <li key={s.id} className="group">
                <div
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm cursor-pointer ${
                    active
                      ? "bg-ink text-paper"
                      : "text-ink-muted hover:bg-rule/30 hover:text-ink"
                  }`}
                  onClick={() => onSelectScreen(s.id)}
                  onDoubleClick={() => {
                    const next = window.prompt("Rename screen", s.name);
                    if (next && next !== s.name) onRenameScreen(s.id, next);
                  }}
                >
                  <span className="flex-1 truncate">{s.name}</span>
                  <span
                    className={`text-[10px] ${
                      active ? "text-paper/60" : "text-ink-faint"
                    }`}
                  >
                    {s.kind}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScreen(s.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs ${
                      active
                        ? "text-paper/70 hover:text-paper"
                        : "text-ink-faint hover:text-ink"
                    }`}
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
          onClick={onAddScreen}
          className="w-full text-left text-sm text-ink-muted hover:text-ink border border-dashed border-rule hover:border-ink rounded px-3 py-2 transition-colors"
        >
          + Add screen
        </button>
      </div>

      <PanelHeading>Layers</PanelHeading>
      {!selectedScreen ? (
        <EmptyState>Select a screen.</EmptyState>
      ) : elementChildren.length === 0 ? (
        <EmptyState>Empty — add an element on the canvas.</EmptyState>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEndLayers}
        >
          <SortableContext
            items={elementChildren.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="px-2 py-2 space-y-0.5">
              {elementChildren.map((node) => (
                <SortableLayerRow
                  key={node.id}
                  element={node as Element}
                  active={node.id === selectedElementId}
                  onSelect={() => onSelectElement(node.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}

function SortableLayerRow({
  element,
  active,
  onSelect,
}: {
  element: Element;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: element.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const spec = ELEMENT_CATALOG.find((e) => e.kind === element.type);
  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer ${
        active
          ? "bg-ink text-paper"
          : "text-ink-muted hover:bg-rule/30 hover:text-ink"
      } ${isDragging ? "relative z-10 shadow-md bg-paper" : ""}`}
    >
      <span
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className={`shrink-0 cursor-grab active:cursor-grabbing ${
          active ? "text-paper/70" : "text-ink-faint hover:text-ink"
        }`}
        title="Drag to reorder"
      >
        <svg width="8" height="12" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.2" />
          <circle cx="2" cy="7" r="1.2" />
          <circle cx="2" cy="12" r="1.2" />
          <circle cx="8" cy="2" r="1.2" />
          <circle cx="8" cy="7" r="1.2" />
          <circle cx="8" cy="12" r="1.2" />
        </svg>
      </span>
      <span
        className={`w-4 text-center text-[11px] ${
          active ? "text-paper/70" : "text-ink-faint"
        }`}
      >
        {spec?.glyph}
      </span>
      <span className="truncate">{spec?.label ?? element.type}</span>
    </li>
  );
}

// ─── Center: canvas ──────────────────────────────────────────────────────────

function Canvas({
  screen,
  module,
  device,
  selectedElementId,
  onSelectElement,
  onAddElement,
  onDeselect,
  onGenerateFromCollection,
  onReorderElements,
  onClearScreen,
}: {
  screen: Screen;
  module: Module;
  device: DevicePreview;
  selectedElementId: Id | null;
  onSelectElement: (id: Id) => void;
  onAddElement: (kind: Element["type"]) => void;
  onDeselect: () => void;
  onGenerateFromCollection: (
    collectionId: Id,
    options: { heading?: boolean; saveButton?: boolean },
  ) => void;
  onReorderElements: (from: number, to: number) => void;
  onClearScreen: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  return (
    <div
      className="flex flex-col items-center min-h-full relative"
      onClick={onDeselect}
    >
      <div className="w-full flex justify-center px-8 pt-6 pb-24">
        <div
          className="rounded-md border border-rule bg-paper shadow-sm transition-all"
          style={{
            width: DEVICE_WIDTH[device],
            maxWidth: "100%",
            minHeight: "70vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <DesignContainer
            screen={screen}
            module={module}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
            onReorderElements={onReorderElements}
          />
        </div>
      </div>

      <div
        className="sticky bottom-0 left-0 right-0 z-20 w-full border-t border-rule bg-paper/95 backdrop-blur-sm px-6 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen(true);
            }}
            className="rounded-md border border-ink bg-ink text-paper px-4 py-2 text-sm hover:opacity-90 transition-opacity"
          >
            + Add element
          </button>
          {module.collections.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGenerateOpen(true);
              }}
              className="rounded-md border border-rule bg-paper px-4 py-2 text-sm text-ink-muted hover:text-ink hover:border-ink transition-colors"
            >
              ✨ Generate from collection
            </button>
          )}
          {screen.root.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearScreen();
              }}
              className="rounded-md border border-rule bg-paper px-4 py-2 text-sm text-ink-muted hover:text-ink hover:border-ink transition-colors"
              title="Remove all elements from this screen"
            >
              ↺ Clean canvas
            </button>
          )}
        </div>
      </div>

      {pickerOpen && (
        <ElementPickerModal
          onPick={(k) => {
            onAddElement(k);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {generateOpen && (
        <GenerateFromCollectionModal
          collections={module.collections}
          onPick={(collId, opts) => {
            onGenerateFromCollection(collId, opts);
            setGenerateOpen(false);
          }}
          onClose={() => setGenerateOpen(false)}
        />
      )}
    </div>
  );
}

function DesignContainer({
  screen,
  module,
  selectedElementId,
  onSelectElement,
  onReorderElements,
}: {
  screen: Screen;
  module: Module;
  selectedElementId: Id | null;
  onSelectElement: (id: Id) => void;
  onReorderElements: (from: number, to: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const elements = screen.root.children.filter((n) => n.kind === "element");

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = elements.findIndex((n) => n.id === active.id);
    const to = elements.findIndex((n) => n.id === over.id);
    if (from < 0 || to < 0) return;
    onReorderElements(from, to);
  };

  if (elements.length === 0) {
    return (
      <ContainerRenderer
        container={screen.root}
        module={module}
        selectedId={selectedElementId}
        onSelect={onSelectElement}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={elements.map((n) => n.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="flex flex-col"
          style={{
            gap: screen.root.gap ?? 12,
            padding: screen.root.padding ?? 24,
          }}
        >
          {elements.map((node) => (
            <SortableCanvasElement
              key={node.id}
              element={node as Element}
              module={module}
              selected={node.id === selectedElementId}
              onSelect={() => onSelectElement(node.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableCanvasElement({
  element,
  module: _module,
  selected,
  onSelect,
}: {
  element: Element;
  module: Module;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: element.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group relative rounded transition-colors ${
        selected
          ? "ring-2 ring-ink ring-offset-2 ring-offset-paper"
          : "hover:ring-1 hover:ring-ink-faint"
      } ${isDragging ? "z-10 shadow-md" : ""}`}
    >
      <span
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink"
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
      </span>
      <div className="pointer-events-none">
        <RenderedElement element={element} module={_module} />
      </div>
    </div>
  );
}

function GenerateFromCollectionModal({
  collections,
  onPick,
  onClose,
}: {
  collections: Collection[];
  onPick: (
    collectionId: Id,
    opts: { heading?: boolean; saveButton?: boolean },
  ) => void;
  onClose: () => void;
}) {
  const [collId, setCollId] = useState<Id>(collections[0]?.id ?? "");
  const [heading, setHeading] = useState(true);
  const [saveButton, setSaveButton] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selected = collections.find((c) => c.id === collId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md border border-rule bg-paper shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-rule">
          <h3 className="text-base font-medium">Generate form from collection</h3>
          <p className="text-xs text-ink-muted mt-1">
            Drops a bound input for every field in the chosen collection onto
            this screen.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-2">
              Collection
            </div>
            <select
              value={collId}
              onChange={(e) => setCollId(e.target.value)}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1.5 text-sm"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.fields.length} field
                  {c.fields.length === 1 ? "" : "s"})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={heading}
              onChange={(e) => setHeading(e.target.checked)}
            />
            Add heading
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={saveButton}
              onChange={(e) => setSaveButton(e.target.checked)}
            />
            Add save button
          </label>

          {selected && selected.fields.length === 0 && (
            <p className="text-xs text-ink-faint italic">
              This collection has no fields yet.
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-rule flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-ink-muted hover:text-ink rounded"
          >
            Cancel
          </button>
          <button
            disabled={!selected || selected.fields.length === 0}
            onClick={() => onPick(collId, { heading, saveButton })}
            className="rounded-md border border-ink bg-ink text-paper px-4 py-1.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

function ElementPickerModal({
  onPick,
  onClose,
}: {
  onPick: (kind: Element["type"]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cats: ElementCategory[] = ["input", "display", "action", "layout"];
  const filtered = (cat: ElementCategory) =>
    ELEMENT_CATALOG.filter(
      (e) =>
        e.category === cat &&
        (!query ||
          e.label.toLowerCase().includes(query.toLowerCase()) ||
          e.kind.toLowerCase().includes(query.toLowerCase())),
    );
  const allFiltered = ELEMENT_CATALOG.filter(
    (e) =>
      !query ||
      e.label.toLowerCase().includes(query.toLowerCase()) ||
      e.kind.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-md border border-rule bg-paper shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-rule">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search elements..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
            onKeyDown={(e) => {
              if (e.key === "Enter" && allFiltered.length > 0) {
                onPick(allFiltered[0].kind);
              }
            }}
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {cats.map((cat) => {
            const items = filtered(cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint px-2 py-1">
                  {cat}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {items.map((e) => (
                    <button
                      key={e.kind}
                      onClick={() => onPick(e.kind)}
                      className="flex items-center gap-3 text-left text-sm text-ink-muted hover:bg-rule/30 hover:text-ink rounded px-3 py-2 transition-colors"
                    >
                      <span className="w-6 h-6 rounded border border-rule flex items-center justify-center text-xs text-ink-faint shrink-0">
                        {e.glyph}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{e.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {allFiltered.length === 0 && (
            <div className="text-center py-6 text-sm text-ink-faint">
              No elements match &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-rule text-[10px] text-ink-faint flex items-center justify-between">
          <span>↵ to add first match</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}

// ─── Right: element inspector ────────────────────────────────────────────────

function ElementInspector({
  module,
  screen,
  element,
  onPatch,
  onDelete,
  onMove,
}: {
  module: Module;
  screen: Screen;
  element: Element;
  onPatch: (patch: Partial<Element>) => void;
  onDelete: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const spec = ELEMENT_CATALOG.find((e) => e.kind === element.type);
  const isInput =
    spec?.category === "input";

  const setConfig = (patch: Record<string, unknown>) =>
    onPatch({ config: { ...(element.config ?? {}), ...patch } });

  const idx = screen.root.children.findIndex(
    (n) => n.kind === "element" && n.id === element.id,
  );
  const canUp = idx > 0;
  const canDown = idx >= 0 && idx < screen.root.children.length - 1;

  return (
    <>
      <PanelHeading>{spec?.label ?? element.type}</PanelHeading>
      <div className="p-4 space-y-4">
        {/* Order + delete */}
        <div className="flex items-center gap-1">
          <button
            disabled={!canUp}
            onClick={() => onMove(-1)}
            className="px-2 py-1 text-sm border border-rule rounded disabled:opacity-30 hover:border-ink"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            disabled={!canDown}
            onClick={() => onMove(1)}
            className="px-2 py-1 text-sm border border-rule rounded disabled:opacity-30 hover:border-ink"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            onClick={onDelete}
            className="ml-auto px-2 py-1 text-xs text-ink-muted hover:text-ink"
          >
            Delete
          </button>
        </div>

        {/* Type-specific config */}
        {(element.type === "heading" ||
          element.type === "paragraph" ||
          element.type === "label" ||
          element.type === "button") && (
          <Row label="Text">
            <input
              value={(element.config?.text as string) ?? ""}
              onChange={(e) => setConfig({ text: e.target.value })}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            />
          </Row>
        )}

        {element.type === "heading" && (
          <Row label="Size">
            <select
              value={(element.config?.size as string) ?? "lg"}
              onChange={(e) => setConfig({ size: e.target.value })}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            >
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">Extra large</option>
            </select>
          </Row>
        )}

        {element.type === "button" && (
          <Row label="Variant">
            <select
              value={(element.config?.variant as string) ?? "primary"}
              onChange={(e) => setConfig({ variant: e.target.value })}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          </Row>
        )}

        {element.type === "spacer" && (
          <Row label="Height (px)">
            <input
              type="number"
              value={(element.config?.size as number) ?? 16}
              onChange={(e) =>
                setConfig({ size: Number(e.target.value) || 0 })
              }
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            />
          </Row>
        )}

        {(element.type === "text_input" ||
          element.type === "long_text_input" ||
          element.type === "number_input" ||
          element.type === "select_input") && (
          <Row label="Placeholder">
            <input
              value={(element.config?.placeholder as string) ?? ""}
              onChange={(e) => setConfig({ placeholder: e.target.value })}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            />
          </Row>
        )}

        {element.type === "select_input" && (
          <Row label="Display as">
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  { id: "dropdown", label: "Dropdown" },
                  { id: "chips", label: "Chips" },
                  { id: "radio", label: "Radio" },
                  { id: "checkbox", label: "Checkbox" },
                ] as const
              ).map((opt) => {
                const active =
                  ((element.config?.displayAs as string) ?? "dropdown") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setConfig({ displayAs: opt.id })}
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
        )}

        {/* Binding (only for inputs) */}
        {isInput && (
          <BindingControl module={module} element={element} onPatch={onPatch} />
        )}
      </div>
    </>
  );
}

function BindingControl({
  module,
  element,
  onPatch,
}: {
  module: Module;
  element: Element;
  onPatch: (patch: Partial<Element>) => void;
}) {
  const binding = element.binding;
  const collectionId =
    binding && binding.kind === "field" ? binding.collectionId : "";
  const fieldId =
    binding && binding.kind === "field" ? binding.fieldId : "";

  const fieldsInColl =
    module.collections.find((c) => c.id === collectionId)?.fields ?? [];

  return (
    <div className="pt-4 border-t border-rule space-y-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Bind to field
      </div>

      <Row label="Collection">
        <select
          value={collectionId}
          onChange={(e) => {
            const cid = e.target.value;
            if (!cid) {
              onPatch({ binding: undefined });
            } else {
              onPatch({
                binding: { kind: "field", collectionId: cid, fieldId: "" },
              });
            }
          }}
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        >
          <option value="">— none —</option>
          {module.collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Row>

      {collectionId && (
        <Row label="Field">
          <select
            value={fieldId}
            onChange={(e) =>
              onPatch({
                binding: {
                  kind: "field",
                  collectionId,
                  fieldId: e.target.value,
                },
              })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="">— pick a field —</option>
            {fieldsInColl.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </Row>
      )}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}
