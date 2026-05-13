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
  Container,
  DevicePreview,
  Element,
  Id,
  LayoutNode,
  Module,
  Screen,
} from "@/lib/module/types";
import {
  CONTAINER_CATALOG,
  ELEMENT_CATALOG,
  addContainer,
  addElementTo,
  addScreen,
  clearScreen,
  deleteNode,
  deleteScreen,
  findNode,
  findParentOf,
  generateFormFromCollection,
  reorderInParent,
  updateContainer,
  updateScreen,
  updateNode,
  type ElementCategory,
} from "@/lib/module/mutations";
import { EmptyState, PanelHeading, ThreePanel } from "../three-panel";
import { ContainerRenderer, RenderedElement } from "../element-renderer";
import { Switch } from "@/components/ui/switch";

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

  const selectedNode: LayoutNode | null = useMemo(() => {
    if (!selectedScreen || !selectedElementId) return null;
    return findNode(selectedScreen.root, selectedElementId);
  }, [selectedScreen, selectedElementId]);

  const selectedElement =
    selectedNode?.kind === "element" ? selectedNode : null;
  const selectedContainer =
    selectedNode?.kind === "container" ? selectedNode : null;

  // For "Add" actions, figure out which container is the target parent.
  const targetParentId = useMemo<Id | null>(() => {
    if (!selectedScreen) return null;
    if (!selectedNode) return selectedScreen.root.id;
    if (selectedNode.kind === "container") return selectedNode.id;
    // Selected an element — add as sibling, so target = its parent.
    const parent = findParentOf(selectedScreen.root, selectedNode.id);
    return parent ? parent.id : selectedScreen.root.id;
  }, [selectedScreen, selectedNode]);

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
    if (!selectedScreen || !targetParentId) return;
    setModule((m) => {
      const { module: next, element } = addElementTo(
        m,
        selectedScreen.id,
        targetParentId,
        kind,
      );
      setSelectedElementId(element.id);
      return next;
    });
  };

  const onAddContainer = (direction: "row" | "column") => {
    if (!selectedScreen) return;
    setModule((m) => {
      // Containers always live at root for M1 (no deep nesting yet).
      const { module: next, container } = addContainer(
        m,
        selectedScreen.id,
        selectedScreen.root.id,
        direction,
      );
      setSelectedElementId(container.id);
      return next;
    });
  };

  const onPatchSelected = (patch: Partial<Element> | Partial<Container>) => {
    if (!selectedScreen || !selectedNode) return;
    setModule((m) =>
      updateNode(m, selectedScreen.id, selectedNode.id, patch),
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
          onReorderLayers={(parentId, from, to) => {
            if (!selectedScreen) return;
            setModule((m) =>
              reorderInParent(m, selectedScreen.id, parentId, from, to),
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
            selectedNodeId={selectedElementId}
            onSelectNode={setSelectedElementId}
            onAddElement={onAddElement}
            onAddContainer={onAddContainer}
            onDeselect={() => setSelectedElementId(null)}
            onGenerateFromCollection={(collId, opts) => {
              setModule((m) =>
                generateFormFromCollection(m, selectedScreen.id, collId, opts),
              );
            }}
            onReorderInParent={(parentId, from, to) =>
              setModule((m) =>
                reorderInParent(m, selectedScreen.id, parentId, from, to),
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
            targetParentId={targetParentId}
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
        selectedContainer && selectedScreen ? (
          <ContainerInspector
            container={selectedContainer}
            onPatch={(p) =>
              setModule((m) =>
                updateContainer(m, selectedScreen.id, selectedContainer.id, p),
              )
            }
            onDelete={() => {
              setModule((m) =>
                deleteNode(m, selectedScreen.id, selectedContainer.id),
              );
              setSelectedElementId(null);
            }}
          />
        ) : selectedElement && selectedScreen ? (
          <ElementInspector
            module={module}
            screen={selectedScreen}
            element={selectedElement}
            onPatch={onPatchSelected}
            onDelete={() => {
              setModule((m) =>
                deleteNode(m, selectedScreen.id, selectedElement.id),
              );
              setSelectedElementId(null);
            }}
            onMove={(_d) => {
              // Move via inspector: compute parent + neighbor index and reorder.
              if (!selectedScreen) return;
              const parent =
                findParentOf(selectedScreen.root, selectedElement.id) ??
                selectedScreen.root;
              const idx = parent.children.findIndex(
                (c) => c.id === selectedElement.id,
              );
              const target = idx + _d;
              if (target < 0 || target >= parent.children.length) return;
              setModule((m) =>
                reorderInParent(
                  m,
                  selectedScreen.id,
                  parent.id,
                  idx,
                  target,
                ),
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
  onReorderLayers: (parentId: Id, from: number, to: number) => void;
}) {
  const selectedScreenId = screenId;
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
      ) : selectedScreen.root.children.length === 0 ? (
        <EmptyState>Empty — add an element on the canvas.</EmptyState>
      ) : (
        <div className="px-2 py-2">
          <LayerTree
            container={selectedScreen.root}
            depth={0}
            selectedId={selectedElementId}
            onSelect={onSelectElement}
            onReorder={onReorderLayers}
          />
        </div>
      )}
    </>
  );
}

function LayerTree({
  container,
  depth,
  selectedId,
  onSelect,
  onReorder,
}: {
  container: Container;
  depth: number;
  selectedId: Id | null;
  onSelect: (id: Id) => void;
  onReorder: (parentId: Id, from: number, to: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = container.children.findIndex((n) => n.id === active.id);
    const to = container.children.findIndex((n) => n.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(container.id, from, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={container.children.map((n) => n.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-0.5">
          {container.children.map((node) => (
            <SortableLayerRow
              key={node.id}
              node={node}
              active={node.id === selectedId}
              depth={depth}
              onSelect={() => onSelect(node.id)}
              selectedId={selectedId}
              onChildSelect={onSelect}
              onChildReorder={onReorder}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableLayerRow({
  node,
  active,
  depth,
  onSelect,
  selectedId,
  onChildSelect,
  onChildReorder,
}: {
  node: LayoutNode;
  active: boolean;
  depth: number;
  onSelect: () => void;
  selectedId: Id | null;
  onChildSelect: (id: Id) => void;
  onChildReorder: (parentId: Id, from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    marginLeft: depth > 0 ? depth * 12 : undefined,
  };
  const isContainer = node.kind === "container";
  const spec = isContainer
    ? CONTAINER_CATALOG.find(
        (c) => c.direction === (node as Container).direction,
      )
    : ELEMENT_CATALOG.find((e) => e.kind === (node as Element).type);

  return (
    <li ref={setNodeRef} style={style}>
      <div
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
        <span className="truncate">
          {isContainer
            ? `${spec?.label ?? "Container"} · ${(node as Container).children.length}`
            : (spec as { label?: string })?.label ?? (node as Element).type}
        </span>
      </div>
      {isContainer && (node as Container).children.length > 0 && (
        <div className="mt-0.5">
          <LayerTree
            container={node as Container}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onChildSelect}
            onReorder={onChildReorder}
          />
        </div>
      )}
    </li>
  );
}

// ─── Center: canvas ──────────────────────────────────────────────────────────

function Canvas({
  screen,
  module,
  device,
  selectedNodeId,
  onSelectNode,
  onAddElement,
  onAddContainer,
  onDeselect,
  onGenerateFromCollection,
  onReorderInParent,
  onClearScreen,
  targetParentId,
}: {
  screen: Screen;
  module: Module;
  device: DevicePreview;
  selectedNodeId: Id | null;
  onSelectNode: (id: Id) => void;
  onAddElement: (kind: Element["type"]) => void;
  onAddContainer: (direction: "row" | "column") => void;
  onDeselect: () => void;
  onGenerateFromCollection: (
    collectionId: Id,
    options: { heading?: boolean; saveButton?: boolean },
  ) => void;
  onReorderInParent: (parentId: Id, from: number, to: number) => void;
  onClearScreen: () => void;
  targetParentId: Id | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const targetIsRoot = targetParentId === screen.root.id;
  const targetParent =
    targetParentId && !targetIsRoot
      ? (findNode(screen.root, targetParentId) as Container | null)
      : null;

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
        >
          <DesignContainer
            container={screen.root}
            module={module}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onReorderInParent={onReorderInParent}
            isRoot
          />
        </div>
      </div>

      <div
        className="sticky bottom-0 left-0 right-0 z-20 w-full border-t border-rule bg-paper/95 backdrop-blur-sm px-6 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2">
          {targetParent && (
            <p className="text-[11px] text-ink-faint">
              Adding into{" "}
              <span className="text-ink-muted">
                {CONTAINER_CATALOG.find(
                  (c) => c.direction === targetParent.direction,
                )?.label}
              </span>
            </p>
          )}
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
      </div>

      {pickerOpen && (
        <ElementPickerModal
          onPickElement={(k) => {
            onAddElement(k);
            setPickerOpen(false);
          }}
          onPickContainer={(direction) => {
            onAddContainer(direction);
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
  container,
  module,
  selectedNodeId,
  onSelectNode,
  onReorderInParent,
  isRoot,
}: {
  container: Container;
  module: Module;
  selectedNodeId: Id | null;
  onSelectNode: (id: Id) => void;
  onReorderInParent: (parentId: Id, from: number, to: number) => void;
  isRoot?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const children = container.children;

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = children.findIndex((n) => n.id === active.id);
    const to = children.findIndex((n) => n.id === over.id);
    if (from < 0 || to < 0) return;
    onReorderInParent(container.id, from, to);
  };

  if (children.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-ink-faint ${
          isRoot ? "min-h-[60vh]" : "min-h-16"
        }`}
        style={{ padding: container.padding ?? 24 }}
      >
        Empty — add an element
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={children.map((n) => n.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          style={{
            display: "flex",
            flexDirection: container.direction,
            gap: container.gap ?? (isRoot ? 12 : 8),
            padding: container.padding ?? (isRoot ? 24 : 12),
            alignItems: alignToFlex(container.align),
            justifyContent: justifyToFlex(container.justify),
            flexWrap: container.wrap ? "wrap" : "nowrap",
          }}
        >
          {children.map((node) =>
            node.kind === "container" ? (
              <SortableCanvasContainer
                key={node.id}
                container={node}
                module={module}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                onReorderInParent={onReorderInParent}
              />
            ) : (
              <SortableCanvasElement
                key={node.id}
                element={node as Element}
                module={module}
                selected={node.id === selectedNodeId}
                onSelect={() => onSelectNode(node.id)}
              />
            ),
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function alignToFlex(a?: string): string | undefined {
  if (!a) return undefined;
  if (a === "stretch") return "stretch";
  return `flex-${a}`;
}

function justifyToFlex(j?: string): string | undefined {
  if (!j) return undefined;
  if (j === "between") return "space-between";
  return `flex-${j}`;
}

function SortableCanvasContainer({
  container,
  module,
  selectedNodeId,
  onSelectNode,
  onReorderInParent,
}: {
  container: Container;
  module: Module;
  selectedNodeId: Id | null;
  onSelectNode: (id: Id) => void;
  onReorderInParent: (parentId: Id, from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: container.id });
  const selected = container.id === selectedNodeId;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    flexGrow: 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelectNode(container.id);
      }}
      className={`group relative rounded transition-colors border border-dashed ${
        selected
          ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper"
          : "border-rule hover:border-ink-faint"
      } ${isDragging ? "z-10 shadow-md" : ""}`}
    >
      <span
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute -left-5 top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink"
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
      <DesignContainer
        container={container}
        module={module}
        selectedNodeId={selectedNodeId}
        onSelectNode={onSelectNode}
        onReorderInParent={onReorderInParent}
      />
    </div>
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

          <Switch
            label="Add heading"
            checked={heading}
            onChange={setHeading}
          />
          <Switch
            label="Add save button"
            checked={saveButton}
            onChange={setSaveButton}
          />

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
  onPickElement,
  onPickContainer,
  onClose,
}: {
  onPickElement: (kind: Element["type"]) => void;
  onPickContainer: (direction: "row" | "column") => void;
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

  const matches = (s: string) =>
    !query || s.toLowerCase().includes(query.toLowerCase());

  const cats: ElementCategory[] = ["input", "display", "action", "layout"];
  const filtered = (cat: ElementCategory) =>
    ELEMENT_CATALOG.filter(
      (e) => e.category === cat && (matches(e.label) || matches(e.kind)),
    );
  const filteredContainers = CONTAINER_CATALOG.filter(
    (c) => matches(c.label) || matches(c.kind),
  );
  const allFilteredElements = ELEMENT_CATALOG.filter(
    (e) => matches(e.label) || matches(e.kind),
  );

  const handleEnter = () => {
    if (filteredContainers.length > 0) {
      onPickContainer(filteredContainers[0].direction);
    } else if (allFilteredElements.length > 0) {
      onPickElement(allFilteredElements[0].kind);
    }
  };

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
              if (e.key === "Enter") handleEnter();
            }}
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {filteredContainers.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint px-2 py-1">
                Containers
              </div>
              <div className="grid grid-cols-2 gap-1">
                {filteredContainers.map((c) => (
                  <button
                    key={c.kind}
                    onClick={() => onPickContainer(c.direction)}
                    className="flex items-center gap-3 text-left text-sm text-ink-muted hover:bg-rule/30 hover:text-ink rounded px-3 py-2 transition-colors"
                  >
                    <span className="w-6 h-6 rounded border border-rule flex items-center justify-center text-xs text-ink-faint shrink-0">
                      {c.glyph}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{c.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                      onClick={() => onPickElement(e.kind)}
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
          {filteredContainers.length === 0 &&
            allFilteredElements.length === 0 && (
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

// ─── Right: container inspector ──────────────────────────────────────────────

function ContainerInspector({
  container,
  onPatch,
  onDelete,
}: {
  container: Container;
  onPatch: (patch: Partial<Container>) => void;
  onDelete: () => void;
}) {
  const spec = CONTAINER_CATALOG.find(
    (c) => c.direction === container.direction,
  );

  const justifies: Array<{ id: Container["justify"]; label: string }> = [
    { id: "start", label: "Start" },
    { id: "center", label: "Center" },
    { id: "end", label: "End" },
    { id: "between", label: "Between" },
  ];
  const aligns: Array<{ id: Container["align"]; label: string }> = [
    { id: "start", label: "Start" },
    { id: "center", label: "Center" },
    { id: "end", label: "End" },
    { id: "stretch", label: "Stretch" },
  ];

  return (
    <>
      <PanelHeading>{spec?.label ?? "Container"}</PanelHeading>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Delete this ${spec?.label.toLowerCase()} and its contents?`,
                )
              )
                onDelete();
            }}
            className="ml-auto px-2 py-1 text-xs text-ink-muted hover:text-ink"
          >
            Delete
          </button>
        </div>

        <Row label="Direction">
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                { id: "row", label: "Row" },
                { id: "column", label: "Column" },
              ] as const
            ).map((opt) => {
              const active = container.direction === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onPatch({ direction: opt.id })}
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

        <Row label="Gap (px)">
          <input
            type="number"
            min={0}
            value={container.gap ?? 0}
            onChange={(e) => onPatch({ gap: Number(e.target.value) || 0 })}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>

        <Row label="Padding (px)">
          <input
            type="number"
            min={0}
            value={container.padding ?? 0}
            onChange={(e) => onPatch({ padding: Number(e.target.value) || 0 })}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>

        <Row label="Justify">
          <div className="grid grid-cols-2 gap-1">
            {justifies.map((opt) => {
              const active =
                (container.justify ?? "start") === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onPatch({ justify: opt.id })}
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

        <Row label="Align">
          <div className="grid grid-cols-2 gap-1">
            {aligns.map((opt) => {
              const active =
                (container.align ??
                  (container.direction === "row" ? "center" : "stretch")) ===
                opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onPatch({ align: opt.id })}
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

        <Row label="">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={!!container.wrap}
              onChange={(e) => onPatch({ wrap: e.target.checked })}
            />
            Wrap children
          </label>
        </Row>
      </div>
    </>
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
          <>
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
            <Row label="">
              <Switch
                label="Full width"
                checked={!!element.config?.fullWidth}
                onChange={(next) => setConfig({ fullWidth: next })}
              />
            </Row>
            {!element.config?.fullWidth && (
              <Row label="Align">
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: "left", label: "Left" },
                      { id: "center", label: "Center" },
                      { id: "right", label: "Right" },
                    ] as const
                  ).map((opt) => {
                    const active =
                      ((element.config?.align as string) ?? "left") === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setConfig({ align: opt.id })}
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
          </>
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

        {element.type === "boolean_toggle" && (
          <>
            <Row label="Display as">
              <div className="grid grid-cols-2 gap-1">
                {(
                  [
                    { id: "switch", label: "Switch" },
                    { id: "checkbox", label: "Checkbox" },
                  ] as const
                ).map((opt) => {
                  const active =
                    ((element.config?.displayAs as string) ?? "switch") === opt.id;
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
            <Row label="Default state">
              <div className="grid grid-cols-2 gap-1">
                {(
                  [
                    { id: false, label: "Off" },
                    { id: true, label: "On" },
                  ] as const
                ).map((opt) => {
                  const active = !!element.config?.defaultValue === opt.id;
                  return (
                    <button
                      key={String(opt.id)}
                      onClick={() => setConfig({ defaultValue: opt.id })}
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
          </>
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
