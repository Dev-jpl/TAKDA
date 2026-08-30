"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  ElementSpacing,
  ElementSurface,
  Id,
  LayoutNode,
  Module,
  PageWidth,
  Screen,
  TextAlign,
  TextSize,
  TextStyle as TextStyleConfig,
  TextWeight,
  VisibilityOp,
} from "@/lib/module/types";
import {
  CONTAINER_CATALOG,
  ELEMENT_CATALOG,
  addContainer,
  cloneNode,
  insertNodes,
  addElementTo,
  addScreen,
  clearScreen,
  defaultElementConfig,
  deleteNode,
  deleteScreen,
  findNode,
  findParentOf,
  generateFormFromCollection,
  groupNodes,
  reorderInParent,
  ungroupContainer,
  updateContainer,
  updateScreen,
  updateNode,
  type ElementCategory,
} from "@/lib/module/mutations";
import {
  COLOR_COMBOS,
  PALETTE_HUES,
  swatchByHueTier,
  swatchFor,
  type ColorToken,
} from "@/lib/module/palette";
import { EmptyState, PanelHeading, ThreePanel } from "../three-panel";
import { ContainerRenderer, RenderedElement } from "../element-renderer";
import { Switch } from "@/components/ui/switch";
import { IconPicker } from "@/components/module-icon";

const DEVICE_WIDTH: Record<DevicePreview, string> = {
  phone: "390px",
  tablet: "820px",
  desktop: "1200px",
};

// Page-width tokens stored on the screen itself. Mirror DEVICE_WIDTH so a page
// that picks "mobile" mocks at 390px regardless of the global preview toggle.
const PAGE_WIDTH: Record<PageWidth, string> = {
  mobile: "390px",
  tablet: "820px",
  desktop: "1200px",
};


// Pixel widths that match the runtime max-w classes for modal sizes.
const MODAL_CANVAS_WIDTH: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "384px",
  md: "448px",
  lg: "672px",
  xl: "896px",
};

export function InterfaceMode({
  module,
  setModule: setModuleRaw,
  device,
}: {
  module: Module;
  setModule: Dispatch<SetStateAction<Module>>;
  device: DevicePreview;
}) {
  const [selectedScreenId, setSelectedScreenId] = useState<Id | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<Id | null>(null);
  const [multiSelectIds, setMultiSelectIds] = useState<Set<Id>>(new Set());

  // ── Undo/redo history (scoped to Interface edits) ─────────────────────────
  const HISTORY_LIMIT = 50;
  const [past, setPast] = useState<Module[]>([]);
  const [future, setFuture] = useState<Module[]>([]);
  const skipNextTrack = useRef(false);
  const prevModuleRef = useRef(module);

  // Track history via effect so we never call setState during another
  // component's render (React forbids this and warns in console).
  useEffect(() => {
    if (prevModuleRef.current === module) return;
    if (skipNextTrack.current) {
      skipNextTrack.current = false;
      prevModuleRef.current = module;
      return;
    }
    const snapshot = prevModuleRef.current;
    prevModuleRef.current = module;
    setPast((p) => {
      const trimmed = p.length >= HISTORY_LIMIT ? p.slice(1) : p;
      return [...trimmed, snapshot];
    });
    setFuture([]);
  }, [module]);

  const setModule: Dispatch<SetStateAction<Module>> = setModuleRaw;

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    const cur = prevModuleRef.current;
    skipNextTrack.current = true;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [cur, ...f]);
    setModuleRaw(prev);
  }, [past, setModuleRaw]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const cur = prevModuleRef.current;
    skipNextTrack.current = true;
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, cur]);
    setModuleRaw(next);
  }, [future, setModuleRaw]);

  // Keyboard shortcuts: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z (or Cmd/Ctrl+Y)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
        return;
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);


  const handleSelect = useCallback(
    (id: Id, opts?: { additive?: boolean }) => {
      if (opts?.additive) {
        setMultiSelectIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        setSelectedElementId((cur) => cur ?? id);
        return;
      }
      setSelectedElementId(id);
      setMultiSelectIds(new Set([id]));
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedElementId(null);
    setMultiSelectIds(new Set());
  }, []);

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

  const onAddScreen = (kind: "page" | "modal" = "page") => {
    const placeholder = kind === "modal" ? "New modal" : "New screen";
    const name = window.prompt(
      kind === "modal" ? "Modal name" : "Screen name",
      placeholder,
    );
    if (!name) return;
    setModule((m) => {
      const { module: next, screen } = addScreen(m, name, kind);
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

  // ── Copy / cut / paste / duplicate ────────────────────────────────────────
  // In-memory clipboard scoped to this editor session. We deliberately don't
  // use the OS clipboard — our nodes have no useful plain-text representation
  // and pasting random text/images into a layout would be confusing.
  const [clipboard, setClipboard] = useState<LayoutNode[] | null>(null);

  // Resolve the current selection into an ordered list of nodes from this
  // screen, in their visual (child-array) order.
  const collectSelected = useCallback((): LayoutNode[] => {
    if (!selectedScreen) return [];
    const ids =
      multiSelectIds.size > 0
        ? multiSelectIds
        : selectedElementId
          ? new Set([selectedElementId])
          : new Set<Id>();
    if (ids.size === 0) return [];
    const collected: LayoutNode[] = [];
    const walk = (c: Container) => {
      for (const child of c.children) {
        if (ids.has(child.id)) collected.push(child);
        if (child.kind === "container") walk(child);
      }
    };
    walk(selectedScreen.root);
    return collected;
  }, [selectedScreen, multiSelectIds, selectedElementId]);

  // Paste: insert clones as siblings of the current element selection, or
  // into the selected/target container if a container is focused.
  const pasteFromClipboard = useCallback(
    (source: LayoutNode[]) => {
      if (!selectedScreen || source.length === 0) return;
      const clones = source.map((n) => cloneNode(n));
      let parentId: Id;
      let afterId: Id | undefined;
      if (selectedNode?.kind === "container") {
        parentId = selectedNode.id;
        afterId = undefined;
      } else if (selectedNode?.kind === "element") {
        const parent = findParentOf(selectedScreen.root, selectedNode.id);
        parentId = (parent ?? selectedScreen.root).id;
        afterId = selectedNode.id;
      } else {
        parentId = targetParentId ?? selectedScreen.root.id;
        afterId = undefined;
      }
      setModule((m) => {
        const { module: next, ids } = insertNodes(
          m,
          selectedScreen.id,
          parentId,
          clones,
          afterId,
        );
        const last = ids[ids.length - 1];
        if (last) {
          setSelectedElementId(last);
          setMultiSelectIds(new Set(ids));
        }
        return next;
      });
    },
    [selectedScreen, selectedNode, targetParentId, setModule],
  );

  // Keyboard: Cmd/Ctrl + C / X / V / D
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable)
        return;
      const k = e.key.toLowerCase();
      if (k === "c") {
        const sel = collectSelected();
        if (sel.length === 0) return;
        e.preventDefault();
        setClipboard(sel.map((n) => cloneNode(n)));
        return;
      }
      if (k === "x") {
        const sel = collectSelected();
        if (sel.length === 0 || !selectedScreen) return;
        e.preventDefault();
        setClipboard(sel.map((n) => cloneNode(n)));
        setModule((m) => {
          let next = m;
          for (const n of sel) next = deleteNode(next, selectedScreen.id, n.id);
          return next;
        });
        clearSelection();
        return;
      }
      if (k === "v") {
        if (!clipboard || clipboard.length === 0) return;
        e.preventDefault();
        pasteFromClipboard(clipboard);
        return;
      }
      if (k === "d") {
        const sel = collectSelected();
        if (sel.length === 0) return;
        e.preventDefault();
        pasteFromClipboard(sel);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    collectSelected,
    clipboard,
    pasteFromClipboard,
    selectedScreen,
    setModule,
    clearSelection,
  ]);

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
            clearSelection();
          }}
          onSelectElement={(id) => handleSelect(id)}
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
            multiSelectIds={multiSelectIds}
            onSelectNode={(id, opts) => handleSelect(id, opts)}
            onAddElement={onAddElement}
            onAddContainer={onAddContainer}
            onDeselect={clearSelection}
            onGroup={(direction) => {
              if (!selectedScreen) return;
              const ids = Array.from(multiSelectIds);
              if (ids.length < 2) return;
              setModule((m) => {
                const { module: next, containerId } = groupNodes(
                  m,
                  selectedScreen.id,
                  ids,
                  direction,
                );
                if (containerId) {
                  setSelectedElementId(containerId);
                  setMultiSelectIds(new Set([containerId]));
                }
                return next;
              });
            }}
            onUngroup={() => {
              if (!selectedScreen || !selectedContainer) return;
              setModule((m) =>
                ungroupContainer(m, selectedScreen.id, selectedContainer.id),
              );
              clearSelection();
            }}
            canUngroup={!!selectedContainer}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
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
        ) : selectedScreen ? (
          <ScreenInspector
            screen={selectedScreen}
            onPatch={(p) =>
              setModule((m) => updateScreen(m, selectedScreen.id, p))
            }
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
  onAddScreen: (kind?: "page" | "modal") => void;
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
      <div className="px-3 py-2 space-y-1.5">
        <button
          onClick={() => onAddScreen("page")}
          className="w-full text-left text-sm text-ink-muted hover:text-ink border border-dashed border-rule hover:border-ink rounded px-3 py-2 transition-colors"
        >
          + Add screen
        </button>
        <button
          onClick={() => onAddScreen("modal")}
          className="w-full text-left text-sm text-ink-muted hover:text-ink border border-dashed border-rule hover:border-ink rounded px-3 py-2 transition-colors"
        >
          + Add modal
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
          className={`w-4 flex items-center justify-center ${
            active ? "text-paper/70" : "text-ink-faint"
          }`}
        >
          {spec?.icon && <spec.icon size={13} weight="regular" />}
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
  multiSelectIds,
  onSelectNode,
  onAddElement,
  onAddContainer,
  onDeselect,
  onGenerateFromCollection,
  onReorderInParent,
  onClearScreen,
  onGroup,
  onUngroup,
  canUngroup,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  targetParentId,
}: {
  screen: Screen;
  module: Module;
  device: DevicePreview;
  selectedNodeId: Id | null;
  multiSelectIds: Set<Id>;
  onSelectNode: (id: Id, opts?: { additive?: boolean }) => void;
  onAddElement: (kind: Element["type"]) => void;
  onAddContainer: (direction: "row" | "column") => void;
  onDeselect: () => void;
  onGenerateFromCollection: (
    collectionId: Id,
    options: { heading?: boolean; saveButton?: boolean },
  ) => void;
  onReorderInParent: (parentId: Id, from: number, to: number) => void;
  onClearScreen: () => void;
  onGroup: (direction: "row" | "column") => void;
  onUngroup: () => void;
  canUngroup: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  targetParentId: Id | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  // ── Zoom (Cmd/Ctrl + / - / 0) ─────────────────────────────────────────────
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 2;
  const ZOOM_STEP = 0.1;
  const [zoom, setZoom] = useState(1);
  const clampZoom = (z: number) =>
    Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(z * 100) / 100));
  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z - ZOOM_STEP)), []);
  const zoomReset = useCallback(() => setZoom(1), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      // "=" lives on the + key; some keyboards also report "+" with shift.
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        zoomReset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, zoomReset]);

  const targetIsRoot = targetParentId === screen.root.id;
  const targetParent =
    targetParentId && !targetIsRoot
      ? (findNode(screen.root, targetParentId) as Container | null)
      : null;

  const zoomWrapStyle: React.CSSProperties = {
    transform: `scale(${zoom})`,
    transformOrigin: "top center",
    transition: "transform 100ms ease-out",
  };

  return (
    <div
      className="flex flex-col items-center min-h-full relative"
      onClick={onDeselect}
    >
      {screen.kind === "modal" ? (
        <div
          className={`w-full flex px-8 ${
            (screen.modalPosition ?? "center") === "top"
              ? "items-start pt-12"
              : (screen.modalPosition ?? "center") === "bottom"
                ? "items-end pb-12"
                : "items-center"
          } justify-center pb-24`}
          style={{ minHeight: "calc(100vh - 8rem)" }}
        >
          <div style={zoomWrapStyle}>
            <div
              className="rounded-md border border-rule bg-paper shadow-xl transition-all"
              style={{
                width: MODAL_CANVAS_WIDTH[screen.modalSize ?? "md"],
                maxWidth: "100%",
                maxHeight: "80vh",
                overflow: "auto",
              }}
            >
              <DesignContainer
                container={screen.root}
                module={module}
                selectedNodeId={selectedNodeId}
                multiSelectIds={multiSelectIds}
                onSelectNode={onSelectNode}
                onReorderInParent={onReorderInParent}
                isRoot
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center px-8 pt-6 pb-24">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-2">
            {screen.pageWidth
              ? `${screen.pageWidth} · ${PAGE_WIDTH[screen.pageWidth]}`
              : `preview · ${device} (${DEVICE_WIDTH[device]})`}
          </div>
          <div style={zoomWrapStyle}>
            <div
              className="rounded-md border border-rule bg-paper shadow-sm transition-all"
              style={{
                width: screen.pageWidth
                  ? PAGE_WIDTH[screen.pageWidth]
                  : DEVICE_WIDTH[device],
                maxWidth: "100%",
                minHeight: "70vh",
              }}
            >
              <DesignContainer
                container={screen.root}
                module={module}
                selectedNodeId={selectedNodeId}
                multiSelectIds={multiSelectIds}
                onSelectNode={onSelectNode}
                onReorderInParent={onReorderInParent}
                isRoot
              />
            </div>
          </div>
        </div>
      )}

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
              onUndo();
            }}
            disabled={!canUndo}
            title="Undo (Cmd+Z)"
            className="rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <span>↶</span> Undo
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRedo();
            }}
            disabled={!canRedo}
            title="Redo (Shift+Cmd+Z)"
            className="rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <span>↷</span> Redo
          </button>
          <span className="w-px h-6 bg-rule mx-1" />
          <div className="inline-flex rounded-md border border-rule overflow-hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                zoomOut();
              }}
              disabled={zoom <= ZOOM_MIN}
              title="Zoom out (Cmd/Ctrl + -)"
              className="px-2.5 py-2 text-sm text-ink-muted hover:text-ink hover:bg-rule/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              −
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                zoomReset();
              }}
              title="Reset zoom (Cmd/Ctrl + 0)"
              className="px-2.5 py-2 text-xs text-ink-muted hover:text-ink hover:bg-rule/30 transition-colors border-l border-r border-rule min-w-[52px]"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                zoomIn();
              }}
              disabled={zoom >= ZOOM_MAX}
              title="Zoom in (Cmd/Ctrl + =)"
              className="px-2.5 py-2 text-sm text-ink-muted hover:text-ink hover:bg-rule/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
          <span className="w-px h-6 bg-rule mx-1" />
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
          {multiSelectIds.size >= 2 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGroup("row");
                }}
                className="rounded-md border border-ink bg-paper px-4 py-2 text-sm text-ink hover:bg-ink hover:text-paper transition-colors"
                title="Wrap selected elements in a row"
              >
                ⊟ Group as Row ({multiSelectIds.size})
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGroup("column");
                }}
                className="rounded-md border border-ink bg-paper px-4 py-2 text-sm text-ink hover:bg-ink hover:text-paper transition-colors"
                title="Wrap selected elements in a column"
              >
                ⊞ Group as Column ({multiSelectIds.size})
              </button>
            </>
          )}
          {canUngroup && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUngroup();
              }}
              className="rounded-md border border-rule bg-paper px-4 py-2 text-sm text-ink-muted hover:text-ink hover:border-ink transition-colors"
              title="Lift the container's children back to its parent"
            >
              ⊠ Ungroup
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
  multiSelectIds,
  onSelectNode,
  onReorderInParent,
  isRoot,
}: {
  container: Container;
  module: Module;
  selectedNodeId: Id | null;
  multiSelectIds: Set<Id>;
  onSelectNode: (id: Id, opts?: { additive?: boolean }) => void;
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
            backgroundColor: container.bgColor
              ? swatchFor(container.bgColor as ColorToken).soft
              : undefined,
            border:
              isRoot && container.border
                ? `1px solid ${
                    container.borderColor
                      ? swatchFor(container.borderColor as ColorToken).fill
                      : "var(--rule)"
                  }`
                : isRoot && !container.border
                  ? "none"
                  : undefined,
            borderRadius: isRoot ? 6 : undefined,
          }}
        >
          {children.map((node) =>
            node.kind === "container" ? (
              <SortableCanvasContainer
                key={node.id}
                container={node}
                module={module}
                selectedNodeId={selectedNodeId}
                multiSelectIds={multiSelectIds}
                onSelectNode={onSelectNode}
                onReorderInParent={onReorderInParent}
              />
            ) : (
              <SortableCanvasElement
                key={node.id}
                element={node as Element}
                module={module}
                selected={node.id === selectedNodeId}
                multiSelected={multiSelectIds.has(node.id)}
                onSelect={(opts) => onSelectNode(node.id, opts)}
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
  multiSelectIds,
  onSelectNode,
  onReorderInParent,
}: {
  container: Container;
  module: Module;
  selectedNodeId: Id | null;
  multiSelectIds: Set<Id>;
  onSelectNode: (id: Id, opts?: { additive?: boolean }) => void;
  onReorderInParent: (parentId: Id, from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: container.id });
  const selected = container.id === selectedNodeId;
  const multiSelected = multiSelectIds.has(container.id);
  const bgSwatch = container.bgColor
    ? swatchFor(container.bgColor as ColorToken)
    : null;
  const borderSwatch = container.borderColor
    ? swatchFor(container.borderColor as ColorToken)
    : null;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    // Default to grow:1 (fill the flex parent) when neither width nor grow
    // is set, preserving the prior behavior. An explicit width or grow=0
    // pins the container to its natural / requested size.
    flexGrow:
      container.grow ?? (container.width !== undefined ? 0 : 1),
    width: container.width,
    backgroundColor: bgSwatch?.soft,
    border: container.border
      ? `1px solid ${borderSwatch?.fill ?? "var(--rule)"}`
      : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelectNode(container.id, {
          additive: e.shiftKey || e.metaKey || e.ctrlKey,
        });
      }}
      className={`group relative rounded transition-colors ${
        selected
          ? "ring-2 ring-ink ring-offset-2 ring-offset-paper"
          : multiSelected
            ? "ring-1 ring-ink"
            : "hover:ring-1 hover:ring-ink-faint"
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
      {container.collapsible && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-rule bg-rule/30 text-sm">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-ink-faint text-ink-muted text-xs">
            ▾
          </span>
          <span className="flex-1 truncate font-medium text-ink">
            {container.title || "Collapsible section"}
          </span>
          <span className="text-[10px] text-ink-faint uppercase tracking-[0.18em] inline-flex items-center gap-1">
            <span>⌄</span> collapsible
          </span>
        </div>
      )}
      <DesignContainer
        container={container}
        module={module}
        selectedNodeId={selectedNodeId}
        multiSelectIds={multiSelectIds}
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
  multiSelected,
  onSelect,
}: {
  element: Element;
  module: Module;
  selected: boolean;
  multiSelected: boolean;
  onSelect: (opts?: { additive?: boolean }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: element.id });
  const conditional = !!element.visibleIf;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : conditional ? 0.7 : 1,
    flexGrow: element.grow,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({
          additive: e.shiftKey || e.metaKey || e.ctrlKey,
        });
      }}
      className={`group relative rounded transition-colors ${
        selected
          ? "ring-2 ring-ink ring-offset-2 ring-offset-paper"
          : multiSelected
            ? "ring-1 ring-ink"
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
    opts: { heading?: boolean; saveButton?: boolean; list?: boolean },
  ) => void;
  onClose: () => void;
}) {
  const [collId, setCollId] = useState<Id>(collections[0]?.id ?? "");
  const [heading, setHeading] = useState(true);
  const [saveButton, setSaveButton] = useState(true);
  const [listView, setListView] = useState(true);

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
          <Switch
            label="Add list of existing entries"
            checked={listView}
            onChange={setListView}
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
            onClick={() =>
              onPick(collId, { heading, saveButton, list: listView })
            }
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
                    <span className="w-6 h-6 rounded border border-rule flex items-center justify-center text-ink-faint shrink-0">
                      <c.icon size={14} weight="regular" />
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
                      <span className="w-6 h-6 rounded border border-rule flex items-center justify-center text-ink-faint shrink-0">
                        <e.icon size={14} weight="regular" />
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

function ScreenInspector({
  screen,
  onPatch,
}: {
  screen: Screen;
  onPatch: (patch: Partial<Screen>) => void;
}) {
  return (
    <>
      <PanelHeading>{screen.kind === "modal" ? "Modal" : "Page"}</PanelHeading>
      <div className="px-4 py-3 space-y-3">
        <Row label="Name">
          <input
            value={screen.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
        {screen.kind === "page" && (
          <Row label="Target width">
            <div className="grid grid-cols-3 gap-1">
              {(["mobile", "tablet", "desktop"] as const).map((w) => {
                const active = (screen.pageWidth ?? "desktop") === w;
                return (
                  <button
                    key={w}
                    onClick={() => onPatch({ pageWidth: w })}
                    className={`text-xs px-2 py-1.5 rounded border transition-colors capitalize ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-ink-faint mt-1.5">
              Web is responsive — this picks the design width. The viewport
              toggle at the top still lets you preview other sizes.
            </p>
          </Row>
        )}
        {screen.kind === "modal" && (
          <>
            <Row label="Size">
              <div className="grid grid-cols-4 gap-1">
                {(["sm", "md", "lg", "xl"] as const).map((s) => {
                  const active = (screen.modalSize ?? "md") === s;
                  return (
                    <button
                      key={s}
                      onClick={() => onPatch({ modalSize: s })}
                      className={`text-xs px-2 py-1.5 rounded border transition-colors uppercase ${
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Row>
            <Row label="Position">
              <div className="grid grid-cols-3 gap-1">
                {(["top", "center", "bottom"] as const).map((p) => {
                  const active = (screen.modalPosition ?? "center") === p;
                  return (
                    <button
                      key={p}
                      onClick={() => onPatch({ modalPosition: p })}
                      className={`text-xs px-2 py-1.5 rounded border transition-colors capitalize ${
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </Row>
          </>
        )}
      </div>
    </>
  );
}

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

        <Row label="Width">
          <input
            value={
              container.width === undefined
                ? ""
                : typeof container.width === "number"
                  ? String(container.width)
                  : container.width
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") {
                onPatch({ width: undefined });
                return;
              }
              // Bare numbers → px; anything with % / rem / em / vw / vh / etc.
              // is stored as the literal CSS string.
              const asNum = Number(raw);
              if (!Number.isNaN(asNum) && /^\d+(\.\d+)?$/.test(raw)) {
                onPatch({ width: asNum });
              } else {
                onPatch({ width: raw });
              }
            }}
            placeholder="auto · 320 · 50%"
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
          <p className="text-[10px] text-ink-faint mt-1">
            Number = px. Or use 50%, 20rem, etc. Leave empty to fill the
            parent.
          </p>
        </Row>

        <Row label="Grow">
          <input
            type="number"
            min={0}
            value={container.grow ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") onPatch({ grow: undefined });
              else onPatch({ grow: Math.max(0, Number(raw) || 0) });
            }}
            placeholder="auto"
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
          <p className="text-[10px] text-ink-faint mt-1">
            Flex-grow factor in the parent. 0 = natural size, 1+ = take share
            of free space. Empty = auto (fills if no width is set).
          </p>
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
          <Switch
            label="Wrap children"
            checked={!!container.wrap}
            onChange={(next) => onPatch({ wrap: next })}
          />
        </Row>

        <div className="pt-4 border-t border-rule space-y-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Surface
          </div>

          <Row label="Background">
            <ColorPicker
              value={container.bgColor as ColorToken | undefined}
              onChange={(t) => onPatch({ bgColor: t })}
            />
          </Row>

          <Row label="">
            <Switch
              label="Border"
              checked={!!container.border}
              onChange={(next) => onPatch({ border: next })}
            />
          </Row>

          {container.border && (
            <Row label="Border color">
              <ColorPicker
                value={container.borderColor as ColorToken | undefined}
                onChange={(t) => onPatch({ borderColor: t })}
              />
            </Row>
          )}
        </div>

        <div className="pt-4 border-t border-rule space-y-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Collapsible
          </div>

          <Row label="">
            <Switch
              label="Make this section collapsible"
              checked={!!container.collapsible}
              onChange={(next) => onPatch({ collapsible: next })}
            />
          </Row>

          {container.collapsible && (
            <>
              <Row label="Title">
                <input
                  value={container.title ?? ""}
                  onChange={(e) =>
                    onPatch({ title: e.target.value || undefined })
                  }
                  placeholder="Section title"
                  className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
                />
              </Row>

              <Row label="">
                <Switch
                  label="Start expanded"
                  checked={container.defaultExpanded !== false}
                  onChange={(next) => onPatch({ defaultExpanded: next })}
                />
              </Row>
            </>
          )}
        </div>
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

  const clearConfig = (keys: string[]) => {
    const next = { ...(element.config ?? {}) } as Record<string, unknown>;
    for (const k of keys) delete next[k];
    onPatch({ config: next });
  };

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
            onClick={() => {
              if (
                !window.confirm(
                  "Reset all settings on this element back to defaults?",
                )
              )
                return;
              onPatch({
                config: defaultElementConfig(element.type),
                surface: undefined,
                spacing: undefined,
              });
            }}
            title="Reset all settings on this element"
            className="ml-auto px-2 py-1 text-xs text-ink-muted hover:text-ink"
          >
            Reset all
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs text-ink-muted hover:text-ink"
          >
            Delete
          </button>
        </div>

        {/* Type-specific config */}
        {(element.type === "heading" ||
          element.type === "paragraph" ||
          element.type === "label" ||
          element.type === "button") && (
          <Section
            title="Basics"
            onReset={() => clearConfig(["text", "size"])}
          >
            <Row label="Text">
              <input
                value={(element.config?.text as string) ?? ""}
                onChange={(e) => setConfig({ text: e.target.value })}
                placeholder={
                  element.type === "button"
                    ? "Button label"
                    : element.type === "heading"
                      ? "Heading text"
                      : "Text"
                }
                className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
              />
            </Row>

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
          </Section>
        )}

        {element.type === "button" && (
          <>
            <p className="text-[11px] text-ink-faint italic px-1">
              Wire button actions in the Behavior tab.
            </p>
            <Section
              title="Layout"
              defaultOpen={false}
              onReset={() => clearConfig(["fullWidth", "align"])}
            >
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
                        ((element.config?.align as string) ?? "left") ===
                        opt.id;
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
            </Section>

            <Section
              title="Appearance"
              defaultOpen={false}
              onReset={() => clearConfig(["variant", "color"])}
            >
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
              <Row label="Color">
                <ColorPicker
                  value={element.config?.color as ColorToken | undefined}
                  onChange={(t) => setConfig({ color: t })}
                />
              </Row>
            </Section>
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

        {element.type === "icon" && (
          <Section
            title="Icon"
            onReset={() =>
              clearConfig(["name", "size", "weight", "color", "align"])
            }
          >
            <Row label="Pick">
              <IconPicker
                value={element.config?.name as string | undefined}
                onChange={(name) => setConfig({ name })}
              />
            </Row>
            <Row label="Size (px)">
              <input
                type="number"
                min={8}
                max={256}
                value={(element.config?.size as number) ?? 24}
                onChange={(e) =>
                  setConfig({ size: Number(e.target.value) || 24 })
                }
                className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
              />
            </Row>
            <Row label="Weight">
              <select
                value={(element.config?.weight as string) ?? "regular"}
                onChange={(e) => setConfig({ weight: e.target.value })}
                className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
              >
                <option value="thin">Thin</option>
                <option value="light">Light</option>
                <option value="regular">Regular</option>
                <option value="bold">Bold</option>
                <option value="fill">Fill</option>
                <option value="duotone">Duotone</option>
              </select>
            </Row>
            <Row label="Color">
              <ColorPicker
                value={element.config?.color as ColorToken | undefined}
                onChange={(t) => setConfig({ color: t })}
              />
            </Row>
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
          </Section>
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

        {/* List config */}
        {element.type === "list" && (
          <ListConfig module={module} element={element} onPatch={onPatch} />
        )}

        {/* Stat config */}
        {element.type === "stat" && (
          <StatConfigPanel module={module} element={element} onPatch={onPatch} />
        )}

        {/* Progress bar config */}
        {element.type === "progress_bar" && (
          <ProgressConfigPanel
            module={module}
            element={element}
            onPatch={onPatch}
          />
        )}

        {/* Chart config */}
        {element.type === "chart" && (
          <ChartConfigPanel
            module={module}
            element={element}
            onPatch={onPatch}
          />
        )}

        {/* Surface & spacing — shared across all elements */}
        <SurfaceSpacingInspector element={element} onPatch={onPatch} />

        {/* Conditional visibility — shared across all elements */}
        <VisibilityInspector
          module={module}
          element={element}
          onPatch={onPatch}
        />
      </div>
    </>
  );
}

function VisibilityInspector({
  module,
  element,
  onPatch,
}: {
  module: Module;
  element: Element;
  onPatch: (patch: Partial<Element>) => void;
}) {
  const [open, setOpen] = useState(false);
  const rule = element.visibleIf;
  const watchedColl = rule
    ? module.collections.find((c) => c.id === rule.collectionId) ?? null
    : null;
  const watchedFields = watchedColl?.fields ?? [];
  const watchedField =
    rule && watchedColl
      ? watchedColl.fields.find((f) => f.id === rule.fieldId) ?? null
      : null;

  const setRule = (next: Element["visibleIf"] | undefined) =>
    onPatch({ visibleIf: next });

  const OPS: {
    id: NonNullable<Element["visibleIf"]>["op"];
    label: string;
    needsValue: boolean;
  }[] = [
    { id: "equals", label: "Equals", needsValue: true },
    { id: "not_equals", label: "Not equals", needsValue: true },
    { id: "truthy", label: "Is set / on", needsValue: false },
    { id: "falsy", label: "Is empty / off", needsValue: false },
    { id: "gt", label: ">", needsValue: true },
    { id: "lt", label: "<", needsValue: true },
  ];
  const opSpec = rule ? OPS.find((o) => o.id === rule.op) : null;

  return (
    <div
      className={`rounded-md mb-2 last:mb-0 transition-colors ${
        open ? "bg-rule/25" : "bg-rule/10 hover:bg-rule/20"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={`group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-[10px] uppercase tracking-[0.18em] cursor-pointer transition-colors ${
          open ? "text-ink" : "text-ink-muted hover:text-ink"
        }`}
      >
        <span className="text-left">
          Visibility
          {rule && (
            <span className="ml-1 inline-block w-1 h-1 rounded-full bg-ink align-middle" />
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {rule && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRule(undefined);
              }}
              title="Always visible"
              className="normal-case tracking-normal text-[10px] text-ink-faint opacity-0 group-hover:opacity-100 hover:text-ink transition-opacity"
            >
              Reset
            </button>
          )}
          <span
            className="inline-flex w-5 h-5 items-center justify-center rounded border border-rule bg-paper text-ink-muted group-hover:border-ink group-hover:text-ink transition-colors"
            aria-hidden
          >
            <span
              className="inline-block transition-transform leading-none text-[11px]"
              style={{ transform: open ? "rotate(180deg)" : "none" }}
            >
              ▾
            </span>
          </span>
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setRule(undefined)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                !rule
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-ink-muted hover:border-ink hover:text-ink"
              }`}
            >
              Always
            </button>
            <button
              onClick={() => {
                if (rule) return;
                const firstColl = module.collections[0];
                const firstField = firstColl?.fields[0];
                if (firstColl && firstField) {
                  setRule({
                    collectionId: firstColl.id,
                    fieldId: firstField.id,
                    op: "truthy",
                  });
                }
              }}
              disabled={
                !rule &&
                (module.collections.length === 0 ||
                  !module.collections.some((c) => c.fields.length > 0))
              }
              className={`text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                rule
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-ink-muted hover:border-ink hover:text-ink"
              }`}
            >
              When field…
            </button>
          </div>

          {rule && (
            <>
              <Row label="Collection">
                <select
                  value={rule.collectionId}
                  onChange={(e) => {
                    const nextColl = module.collections.find(
                      (c) => c.id === e.target.value,
                    );
                    setRule({
                      ...rule,
                      collectionId: e.target.value,
                      fieldId: nextColl?.fields[0]?.id ?? "",
                    });
                  }}
                  className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
                >
                  {module.collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Field">
                <select
                  value={rule.fieldId}
                  onChange={(e) =>
                    setRule({ ...rule, fieldId: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
                >
                  <option value="">— pick a field —</option>
                  {watchedFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="Condition">
                <select
                  value={rule.op}
                  onChange={(e) =>
                    setRule({
                      ...rule,
                      op: e.target.value as VisibilityOp,
                    })
                  }
                  className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
                >
                  {OPS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Row>

              {opSpec?.needsValue && (
                <Row label="Value">
                  {watchedField?.type === "select" ? (
                    <select
                      value={(rule.value as string | undefined) ?? ""}
                      onChange={(e) =>
                        setRule({ ...rule, value: e.target.value })
                      }
                      className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
                    >
                      <option value="">— pick —</option>
                      {watchedField.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : watchedField?.type === "boolean" ? (
                    <select
                      value={
                        rule.value === true
                          ? "true"
                          : rule.value === false
                            ? "false"
                            : ""
                      }
                      onChange={(e) =>
                        setRule({
                          ...rule,
                          value: e.target.value === "true",
                        })
                      }
                      className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
                    >
                      <option value="true">On</option>
                      <option value="false">Off</option>
                    </select>
                  ) : (
                    <input
                      type={watchedField?.type === "number" ? "number" : "text"}
                      value={
                        rule.value === undefined ? "" : String(rule.value)
                      }
                      onChange={(e) =>
                        setRule({
                          ...rule,
                          value:
                            watchedField?.type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                      className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
                    />
                  )}
                </Row>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SurfaceSpacingInspector({
  element,
  onPatch,
}: {
  element: Element;
  onPatch: (patch: Partial<Element>) => void;
}) {
  const [open, setOpen] = useState(false);
  const surface = element.surface ?? {};
  const spacing = element.spacing ?? {};

  const patchSurface = (p: Partial<ElementSurface>) =>
    onPatch({ surface: { ...surface, ...p } });
  const patchSpacing = (p: Partial<ElementSpacing>) =>
    onPatch({ spacing: { ...spacing, ...p } });

  const hasAny =
    surface.bgColor ||
    surface.border ||
    surface.borderColor ||
    Object.values(spacing).some((v) => v !== undefined && v !== 0);

  return (
    <div
      className={`rounded-md mb-2 last:mb-0 transition-colors ${
        open ? "bg-rule/25" : "bg-rule/10 hover:bg-rule/20"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={`group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-[10px] uppercase tracking-[0.18em] cursor-pointer transition-colors ${
          open ? "text-ink" : "text-ink-muted hover:text-ink"
        }`}
      >
        <span className="text-left">
          Surface & spacing
          {hasAny && (
            <span className="ml-1 inline-block w-1 h-1 rounded-full bg-ink align-middle" />
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {hasAny && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPatch({ surface: undefined, spacing: undefined });
              }}
              title="Reset surface & spacing"
              className="normal-case tracking-normal text-[10px] text-ink-faint opacity-0 group-hover:opacity-100 hover:text-ink transition-opacity"
            >
              Reset
            </button>
          )}
          <span
            className="inline-flex w-5 h-5 items-center justify-center rounded border border-rule bg-paper text-ink-muted group-hover:border-ink group-hover:text-ink transition-colors"
            aria-hidden
          >
            <span
              className="inline-block transition-transform leading-none text-[11px]"
              style={{ transform: open ? "rotate(180deg)" : "none" }}
            >
              ▾
            </span>
          </span>
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3">
          <Row label="Background">
            <ColorPicker
              value={surface.bgColor as ColorToken | undefined}
              onChange={(t) => patchSurface({ bgColor: t })}
            />
          </Row>
          <Row label="">
            <Switch
              label="Border"
              checked={!!surface.border}
              onChange={(b) => patchSurface({ border: b })}
            />
          </Row>
          {surface.border && (
            <Row label="Border color">
              <ColorPicker
                value={surface.borderColor as ColorToken | undefined}
                onChange={(t) => patchSurface({ borderColor: t })}
              />
            </Row>
          )}
          <SpacingControl
            label="Padding"
            values={{
              top: spacing.paddingTop,
              right: spacing.paddingRight,
              bottom: spacing.paddingBottom,
              left: spacing.paddingLeft,
            }}
            onChange={(side, v) => {
              const key = `padding${side[0].toUpperCase()}${side.slice(1)}` as
                | "paddingTop"
                | "paddingRight"
                | "paddingBottom"
                | "paddingLeft";
              patchSpacing({ [key]: v });
            }}
            onSetAll={(v) =>
              patchSpacing({
                paddingTop: v,
                paddingRight: v,
                paddingBottom: v,
                paddingLeft: v,
              })
            }
            onSetAxis={(axis, v) =>
              patchSpacing(
                axis === "x"
                  ? { paddingLeft: v, paddingRight: v }
                  : { paddingTop: v, paddingBottom: v },
              )
            }
          />
          <SpacingControl
            label="Margin"
            values={{
              top: spacing.marginTop,
              right: spacing.marginRight,
              bottom: spacing.marginBottom,
              left: spacing.marginLeft,
            }}
            onChange={(side, v) => {
              const key = `margin${side[0].toUpperCase()}${side.slice(1)}` as
                | "marginTop"
                | "marginRight"
                | "marginBottom"
                | "marginLeft";
              patchSpacing({ [key]: v });
            }}
            onSetAll={(v) =>
              patchSpacing({
                marginTop: v,
                marginRight: v,
                marginBottom: v,
                marginLeft: v,
              })
            }
            onSetAxis={(axis, v) =>
              patchSpacing(
                axis === "x"
                  ? { marginLeft: v, marginRight: v }
                  : { marginTop: v, marginBottom: v },
              )
            }
          />
        </div>
      )}
    </div>
  );
}

type SpacingSide = "top" | "right" | "bottom" | "left";

function SpacingControl({
  label,
  values,
  onChange,
  onSetAll,
  onSetAxis,
}: {
  label: string;
  values: Record<SpacingSide, number | undefined>;
  onChange: (side: SpacingSide, v: number | undefined) => void;
  onSetAll: (v: number | undefined) => void;
  onSetAxis: (axis: "x" | "y", v: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const all =
    values.top !== undefined &&
    values.top === values.right &&
    values.top === values.bottom &&
    values.top === values.left
      ? values.top
      : undefined;
  const x =
    values.left !== undefined && values.left === values.right
      ? values.left
      : undefined;
  const y =
    values.top !== undefined && values.top === values.bottom
      ? values.top
      : undefined;
  const isMixed = all === undefined;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-1">
        {label}
      </div>
      <div className="flex items-center gap-1">
        <label className="flex-1 flex items-center gap-2 border border-rule rounded px-2 py-1 focus-within:border-ink transition-colors">
          <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint shrink-0">
            All
          </span>
          <input
            type="number"
            value={all ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              onSetAll(raw === "" ? undefined : Number(raw));
            }}
            placeholder={isMixed ? "mixed" : "—"}
            className="w-full bg-transparent outline-none text-xs text-right min-w-0"
          />
        </label>
        <button
          onClick={() => setOpen((v) => !v)}
          title={open ? "Collapse sides" : "Break down by side"}
          className="px-2 py-1 text-xs border border-rule rounded text-ink-faint hover:border-ink hover:text-ink transition-colors"
        >
          <span
            className="inline-block transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          >
            ▾
          </span>
        </button>
      </div>

      {open && (
        <div className="mt-1.5 space-y-1 pl-2 border-l border-rule">
          <div className="grid grid-cols-2 gap-1">
            <AxisInput label="X" value={x} onChange={(v) => onSetAxis("x", v)} />
            <AxisInput label="Y" value={y} onChange={(v) => onSetAxis("y", v)} />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <SideInput
              label="Top"
              value={values.top}
              onChange={(v) => onChange("top", v)}
            />
            <SideInput
              label="Right"
              value={values.right}
              onChange={(v) => onChange("right", v)}
            />
            <SideInput
              label="Bottom"
              value={values.bottom}
              onChange={(v) => onChange("bottom", v)}
            />
            <SideInput
              label="Left"
              value={values.left}
              onChange={(v) => onChange("left", v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SideInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="flex items-center gap-2 border border-rule rounded px-2 py-1 focus-within:border-ink transition-colors">
      <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint shrink-0">
        {label}
      </span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? undefined : Number(raw));
        }}
        placeholder="—"
        className="w-full bg-transparent outline-none text-xs text-right min-w-0"
      />
    </label>
  );
}

function TextStyleControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TextStyleConfig | undefined;
  onChange: (next: TextStyleConfig | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const t = value ?? {};
  const patch = (p: Partial<TextStyleConfig>) => {
    const merged = { ...t, ...p };
    const hasAny = Object.values(merged).some(
      (v) => v !== undefined && v !== null,
    );
    onChange(hasAny ? merged : undefined);
  };

  const sizes: { id: TextSize; label: string }[] = [
    { id: "xs", label: "XS" },
    { id: "sm", label: "SM" },
    { id: "md", label: "MD" },
    { id: "lg", label: "LG" },
    { id: "xl", label: "XL" },
  ];
  const weights: { id: TextWeight; label: string }[] = [
    { id: "normal", label: "Normal" },
    { id: "medium", label: "Medium" },
    { id: "semibold", label: "Semi" },
    { id: "bold", label: "Bold" },
  ];
  const aligns: { id: TextAlign; label: string }[] = [
    { id: "left", label: "Left" },
    { id: "center", label: "Center" },
    { id: "right", label: "Right" },
  ];

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-ink-faint hover:text-ink transition-colors"
      >
        <span>{label}</span>
        <span
          className="inline-block transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <Row label="Size">
            <div className="grid grid-cols-5 gap-1">
              {sizes.map((s) => {
                const active = (t.size ?? "sm") === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => patch({ size: s.id })}
                    className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Row>
          <Row label="Weight">
            <div className="grid grid-cols-4 gap-1">
              {weights.map((w) => {
                const active = (t.weight ?? "normal") === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => patch({ weight: w.id })}
                    className={`text-[11px] px-1.5 py-1 rounded border transition-colors ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </Row>
          <Row label="Align">
            <div className="grid grid-cols-3 gap-1">
              {aligns.map((a) => {
                const active = (t.align ?? "left") === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => patch({ align: a.id })}
                    className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </Row>
          <SpacingControl
            label="Padding"
            values={{
              top: t.paddingTop,
              right: t.paddingRight,
              bottom: t.paddingBottom,
              left: t.paddingLeft,
            }}
            onChange={(side, v) => {
              const key = `padding${side[0].toUpperCase()}${side.slice(1)}` as
                | "paddingTop"
                | "paddingRight"
                | "paddingBottom"
                | "paddingLeft";
              patch({ [key]: v } as Partial<TextStyleConfig>);
            }}
            onSetAll={(v) =>
              patch({
                paddingTop: v,
                paddingRight: v,
                paddingBottom: v,
                paddingLeft: v,
              })
            }
            onSetAxis={(axis, v) =>
              patch(
                axis === "x"
                  ? { paddingLeft: v, paddingRight: v }
                  : { paddingTop: v, paddingBottom: v },
              )
            }
          />
          <SpacingControl
            label="Margin"
            values={{
              top: t.marginTop,
              right: t.marginRight,
              bottom: t.marginBottom,
              left: t.marginLeft,
            }}
            onChange={(side, v) => {
              const key = `margin${side[0].toUpperCase()}${side.slice(1)}` as
                | "marginTop"
                | "marginRight"
                | "marginBottom"
                | "marginLeft";
              patch({ [key]: v } as Partial<TextStyleConfig>);
            }}
            onSetAll={(v) =>
              patch({
                marginTop: v,
                marginRight: v,
                marginBottom: v,
                marginLeft: v,
              })
            }
            onSetAxis={(axis, v) =>
              patch(
                axis === "x"
                  ? { marginLeft: v, marginRight: v }
                  : { marginTop: v, marginBottom: v },
              )
            }
          />
        </div>
      )}
    </div>
  );
}

function AxisInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="flex items-center gap-2 border border-rule rounded px-2 py-1 focus-within:border-ink transition-colors bg-rule/10">
      <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint shrink-0">
        {label}
      </span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? undefined : Number(raw));
        }}
        placeholder={value === undefined ? "mixed" : "—"}
        className="w-full bg-transparent outline-none text-xs text-right min-w-0"
      />
    </label>
  );
}

function ChartConfigPanel({
  module,
  element,
  onPatch,
}: {
  module: Module;
  element: Element;
  onPatch: (patch: Partial<Element>) => void;
}) {
  const cfg = (element.config ?? {}) as Record<string, unknown>;
  const collectionId = (cfg.collectionId as string) ?? "";
  const aggregation = (cfg.aggregation as string) ?? "count";
  const fieldId = (cfg.fieldId as string) ?? "";
  const bucket = (cfg.bucket as string) ?? "day";
  const range = (cfg.range as number) ?? 7;
  const style = (cfg.style as string) ?? "bar";
  const groupBy = (cfg.groupBy as string) ?? "";
  const collection = collectionId
    ? module.collections.find((c) => c.id === collectionId) ?? null
    : null;
  const numberFields =
    collection?.fields.filter((f) => f.type === "number") ?? [];
  const categoryFields =
    collection?.fields.filter(
      (f) => f.type === "select" || f.type === "multi_select",
    ) ?? [];
  const isTimeSeries =
    style === "bar" || style === "line" || style === "area" || style === "spark";
  const isDonut = style === "donut";
  const isHeatmap = style === "heatmap";

  const set = (patch: Record<string, unknown>) =>
    onPatch({ config: { ...(element.config ?? {}), ...patch } });

  const clear = (keys: string[]) => {
    const next = { ...(element.config ?? {}) } as Record<string, unknown>;
    for (const k of keys) delete next[k];
    onPatch({ config: next });
  };

  return (
    <div className="pt-2 mt-2 border-t border-rule">
      <Section
        title="Basics"
        onReset={() => clear(["style", "label", "labelText"])}
      >
        <Row label="Style">
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: "bar", label: "Bar" },
                { id: "line", label: "Line" },
                { id: "area", label: "Area" },
                { id: "spark", label: "Spark" },
                { id: "donut", label: "Donut" },
                { id: "heatmap", label: "Heatmap" },
              ] as const
            ).map((opt) => {
              const active = style === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => set({ style: opt.id })}
                  className={`text-xs px-2 py-1.5 rounded border transition-colors ${
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

        <Row label="Label">
          <input
            value={(cfg.label as string) ?? ""}
            onChange={(e) => set({ label: e.target.value || undefined })}
            placeholder="e.g. Calories last 7 days"
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
      </Section>

      <Section
        title="Data"
        onReset={() =>
          clear(["collectionId", "aggregation", "fieldId", "groupBy"])
        }
      >
        <Row label="Collection">
          <select
            value={collectionId}
            onChange={(e) =>
              set({
                collectionId: e.target.value || undefined,
                fieldId: undefined,
                groupBy: undefined,
              })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="">— pick a collection —</option>
            {module.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>

        {isDonut && (
          <Row label="Group by">
            <select
              value={groupBy}
              onChange={(e) => set({ groupBy: e.target.value || undefined })}
              disabled={!collection}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm disabled:opacity-50"
            >
              <option value="">— pick a category field —</option>
              {categoryFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            {categoryFields.length === 0 && collection && (
              <p className="text-xs text-ink-faint mt-1">
                Add a select / multi-select field to this collection first.
              </p>
            )}
          </Row>
        )}

        <Row label="Aggregation">
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                { id: "count", label: "Count" },
                { id: "sum", label: "Sum" },
              ] as const
            ).map((opt) => {
              const active = aggregation === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => set({ aggregation: opt.id })}
                  className={`text-xs px-2 py-1.5 rounded border transition-colors ${
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

        {aggregation === "sum" && (
          <Row label="Number field">
            <select
              value={fieldId}
              onChange={(e) => set({ fieldId: e.target.value || undefined })}
              disabled={!collection}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm disabled:opacity-50"
            >
              <option value="">— pick a number field —</option>
              {numberFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </Row>
        )}
      </Section>

      {(isTimeSeries || isHeatmap) && (
        <Section
          title="Time range"
          onReset={() => clear(["bucket", "range", "suffix"])}
        >
          <Row label="Default window">
            <div className="grid grid-cols-2 gap-1">
              {(isHeatmap
                ? ([
                    { id: "30d", label: "Month", bucket: "day", range: 30 },
                    { id: "90d", label: "Quarter", bucket: "day", range: 90 },
                    { id: "365d", label: "Year", bucket: "day", range: 365 },
                    { id: "custom", label: "Custom" },
                  ] as const)
                : ([
                    { id: "7d", label: "Week", bucket: "day", range: 7 },
                    { id: "30d", label: "Month", bucket: "day", range: 30 },
                    { id: "12w", label: "12 weeks", bucket: "week", range: 12 },
                    { id: "12mo", label: "Year", bucket: "month", range: 12 },
                    { id: "custom", label: "Custom" },
                  ] as const)
              ).map((opt) => {
                const isCustom = opt.id === "custom";
                const matchesAnyPreset = isHeatmap
                  ? [30, 90, 365].includes(range)
                  : (bucket === "day" && [7, 30].includes(range)) ||
                    (bucket === "week" && range === 12) ||
                    (bucket === "month" && range === 12);
                const active = isCustom
                  ? !matchesAnyPreset
                  : !isCustom &&
                    "bucket" in opt &&
                    bucket === opt.bucket &&
                    range === opt.range;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (isCustom) return;
                      if ("bucket" in opt)
                        set({ bucket: opt.bucket, range: opt.range });
                    }}
                    className={`text-xs px-2 py-1.5 rounded border transition-colors ${
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
            <p className="text-[11px] text-ink-faint mt-1.5">
              Viewers can switch Week / Month / Year on the chart itself.
            </p>
          </Row>

          {/* Show advanced controls only when no preset matches the saved values. */}
          {(() => {
            const matchesAnyPreset = isHeatmap
              ? [30, 90, 365].includes(range)
              : (bucket === "day" && [7, 30].includes(range)) ||
                (bucket === "week" && range === 12) ||
                (bucket === "month" && range === 12);
            if (matchesAnyPreset) return null;
            return (
              <>
                {isTimeSeries && (
                  <>
                    <Row label="Bucket (one bar per…)">
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            { id: "day", label: "Day" },
                            { id: "week", label: "Week" },
                            { id: "month", label: "Month" },
                          ] as const
                        ).map((opt) => {
                          const active = bucket === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => set({ bucket: opt.id })}
                              className={`text-xs px-2 py-1.5 rounded border transition-colors ${
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
                    <Row label={`How many (${range} × ${bucket}${range > 1 ? "s" : ""})`}>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={range}
                        onChange={(e) =>
                          set({
                            range: Math.max(
                              1,
                              Math.min(60, Number(e.target.value) || 7),
                            ),
                          })
                        }
                        className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
                      />
                    </Row>
                  </>
                )}
                {isHeatmap && (
                  <Row label={`Days (${range})`}>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={range}
                      onChange={(e) =>
                        set({
                          range: Math.max(
                            1,
                            Math.min(365, Number(e.target.value) || 90),
                          ),
                        })
                      }
                      className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
                    />
                  </Row>
                )}
              </>
            );
          })()}

          <Row label="Suffix">
            <input
              value={(cfg.suffix as string) ?? ""}
              onChange={(e) => set({ suffix: e.target.value || undefined })}
              placeholder="kcal, kg..."
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            />
          </Row>
        </Section>
      )}

      <Section
        title="Appearance"
        defaultOpen={false}
        onReset={() => clear(["color"])}
      >
        <Row label="Bar color">
          <ColorPicker
            value={cfg.color as ColorToken | undefined}
            onChange={(t) => set({ color: t })}
          />
        </Row>
      </Section>

      <Section
        title="Typography"
        defaultOpen={false}
        onReset={() => clear(["labelText", "totalText"])}
      >
        <TextStyleControl
          label="Label text style"
          value={cfg.labelText as TextStyleConfig | undefined}
          onChange={(next) => set({ labelText: next })}
        />
        <TextStyleControl
          label="Total text style"
          value={cfg.totalText as TextStyleConfig | undefined}
          onChange={(next) => set({ totalText: next })}
        />
      </Section>
    </div>
  );
}

function ProgressConfigPanel({
  module,
  element,
  onPatch,
}: {
  module: Module;
  element: Element;
  onPatch: (patch: Partial<Element>) => void;
}) {
  const cfg = (element.config ?? {}) as Record<string, unknown>;
  const collectionId = (cfg.collectionId as string) ?? "";
  const aggregation = (cfg.aggregation as string) ?? "sum";
  const fieldId = (cfg.fieldId as string) ?? "";
  const filter = (cfg.filter as string) ?? "today";
  const collection = collectionId
    ? module.collections.find((c) => c.id === collectionId) ?? null
    : null;
  const numberFields = collection?.fields.filter((f) => f.type === "number") ?? [];

  const set = (patch: Record<string, unknown>) =>
    onPatch({ config: { ...(element.config ?? {}), ...patch } });

  const clear = (keys: string[]) => {
    const next = { ...(element.config ?? {}) } as Record<string, unknown>;
    for (const k of keys) delete next[k];
    onPatch({ config: next });
  };

  return (
    <div className="pt-2 mt-2 border-t border-rule">
      <Section
        title="Basics"
        onReset={() => clear(["style", "align", "label", "labelText"])}
      >
        <Row label="Style">
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                { id: "linear", label: "Linear" },
                { id: "radial", label: "Radial" },
              ] as const
            ).map((opt) => {
              const active =
                ((cfg.style as string) ?? "linear") === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => set({ style: opt.id })}
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

        {cfg.style === "radial" && (
          <Row label="Align">
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: "left", label: "Left" },
                  { id: "center", label: "Center" },
                  { id: "right", label: "Right" },
                ] as const
              ).map((opt) => {
                const active = ((cfg.align as string) ?? "center") === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => set({ align: opt.id })}
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

        <Row label="Label">
          <input
            value={(cfg.label as string) ?? ""}
            onChange={(e) => set({ label: e.target.value || undefined })}
            placeholder="e.g. Calories today"
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
      </Section>

      <Section
        title="Data"
        onReset={() =>
          clear(["collectionId", "aggregation", "fieldId", "filter"])
        }
      >
        <Row label="Collection">
          <select
            value={collectionId}
            onChange={(e) =>
              set({
                collectionId: e.target.value || undefined,
                fieldId: undefined,
              })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="">— pick a collection —</option>
            {module.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Aggregation">
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: "count", label: "Count" },
                { id: "sum", label: "Sum" },
                { id: "avg", label: "Avg" },
                { id: "min", label: "Min" },
                { id: "max", label: "Max" },
              ] as const
            ).map((opt) => {
              const active = aggregation === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => set({ aggregation: opt.id })}
                  className={`text-xs px-2 py-1.5 rounded border transition-colors ${
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

        {aggregation !== "count" && (
          <Row label="Number field">
            <select
              value={fieldId}
              onChange={(e) => set({ fieldId: e.target.value || undefined })}
              disabled={!collection}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm disabled:opacity-50"
            >
              <option value="">— pick a number field —</option>
              {numberFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </Row>
        )}

        <Row label="Time window">
          <select
            value={filter}
            onChange={(e) => set({ filter: e.target.value })}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="this_week">This week</option>
            <option value="this_month">This month</option>
          </select>
        </Row>
      </Section>

      <Section
        title="Goal"
        onReset={() =>
          clear(["goal", "goalSource", "suffix", "showText"])
        }
      >
        <GoalSourceControl
          module={module}
          element={element}
          onPatch={onPatch}
        />
        <Row label="Suffix">
          <input
            value={(cfg.suffix as string) ?? ""}
            onChange={(e) => set({ suffix: e.target.value || undefined })}
            placeholder="kcal, kg..."
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
        <Row label="">
          <Switch
            label="Show value / goal text"
            checked={cfg.showText !== false}
            onChange={(next) => set({ showText: next })}
          />
        </Row>
      </Section>

      <Section
        title="Appearance"
        defaultOpen={false}
        onReset={() => clear(["color"])}
      >
        <Row label="Color">
          <ColorPicker
            value={cfg.color as ColorToken | undefined}
            onChange={(t) => set({ color: t })}
          />
        </Row>
      </Section>

      <Section
        title="Typography"
        defaultOpen={false}
        onReset={() => clear(["labelText", "valueText"])}
      >
        <TextStyleControl
          label="Label text style"
          value={cfg.labelText as TextStyleConfig | undefined}
          onChange={(next) => set({ labelText: next })}
        />
        {cfg.showText !== false && (
          <TextStyleControl
            label="Value text style"
            value={cfg.valueText as TextStyleConfig | undefined}
            onChange={(next) => set({ valueText: next })}
          />
        )}
      </Section>
    </div>
  );
}

function StatConfigPanel({
  module,
  element,
  onPatch,
}: {
  module: Module;
  element: Element;
  onPatch: (patch: Partial<Element>) => void;
}) {
  const cfg = (element.config ?? {}) as Record<string, unknown>;
  const collectionId = (cfg.collectionId as string) ?? "";
  const aggregation = (cfg.aggregation as string) ?? "count";
  const fieldId = (cfg.fieldId as string) ?? "";
  const filter = (cfg.filter as string) ?? "all";
  const collection = collectionId
    ? module.collections.find((c) => c.id === collectionId) ?? null
    : null;
  const numberFields = collection?.fields.filter((f) => f.type === "number") ?? [];

  const set = (patch: Record<string, unknown>) =>
    onPatch({ config: { ...(element.config ?? {}), ...patch } });

  const clear = (keys: string[]) => {
    const next = { ...(element.config ?? {}) } as Record<string, unknown>;
    for (const k of keys) delete next[k];
    onPatch({ config: next });
  };

  return (
    <div className="pt-2 mt-2 border-t border-rule">
      <Section title="Basics" onReset={() => clear(["label"])}>
        <Row label="Label">
          <input
            value={(cfg.label as string) ?? ""}
            onChange={(e) => set({ label: e.target.value || undefined })}
            placeholder="e.g. Today's calories"
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
      </Section>

      <Section
        title="Data"
        onReset={() =>
          clear(["collectionId", "aggregation", "fieldId", "filter"])
        }
      >
        <Row label="Collection">
          <select
            value={collectionId}
            onChange={(e) =>
              set({
                collectionId: e.target.value || undefined,
                fieldId: undefined,
              })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="">— pick a collection —</option>
            {module.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Aggregation">
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: "count", label: "Count" },
                { id: "sum", label: "Sum" },
                { id: "avg", label: "Avg" },
                { id: "min", label: "Min" },
                { id: "max", label: "Max" },
              ] as const
            ).map((opt) => {
              const active = aggregation === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => set({ aggregation: opt.id })}
                  className={`text-xs px-2 py-1.5 rounded border transition-colors ${
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

        {aggregation !== "count" && (
          <Row label="Number field">
            <select
              value={fieldId}
              onChange={(e) => set({ fieldId: e.target.value || undefined })}
              disabled={!collection}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm disabled:opacity-50"
            >
              <option value="">— pick a number field —</option>
              {numberFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            {collection && numberFields.length === 0 && (
              <p className="text-xs text-ink-faint mt-1">
                This collection has no number fields.
              </p>
            )}
          </Row>
        )}

        <Row label="Time window">
          <select
            value={filter}
            onChange={(e) => set({ filter: e.target.value })}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="this_week">This week</option>
            <option value="this_month">This month</option>
          </select>
        </Row>
      </Section>

      <Section
        title="Format"
        defaultOpen={false}
        onReset={() => clear(["prefix", "suffix"])}
      >
        <div className="grid grid-cols-2 gap-2">
          <Row label="Prefix">
            <input
              value={(cfg.prefix as string) ?? ""}
              onChange={(e) => set({ prefix: e.target.value || undefined })}
              placeholder="$, etc."
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            />
          </Row>
          <Row label="Suffix">
            <input
              value={(cfg.suffix as string) ?? ""}
              onChange={(e) => set({ suffix: e.target.value || undefined })}
              placeholder="kcal, kg..."
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            />
          </Row>
        </div>
      </Section>

      <Section
        title="Appearance"
        defaultOpen={false}
        onReset={() => clear(["color"])}
      >
        <Row label="Color">
          <ColorPicker
            value={cfg.color as ColorToken | undefined}
            onChange={(t) => set({ color: t })}
          />
        </Row>
      </Section>

      <Section
        title="Typography"
        defaultOpen={false}
        onReset={() => clear(["labelText", "valueText"])}
      >
        <TextStyleControl
          label="Label text style"
          value={cfg.labelText as TextStyleConfig | undefined}
          onChange={(next) => set({ labelText: next })}
        />
        <TextStyleControl
          label="Value text style"
          value={cfg.valueText as TextStyleConfig | undefined}
          onChange={(next) => set({ valueText: next })}
        />
      </Section>
    </div>
  );
}

function ListConfig({
  module,
  element,
  onPatch,
}: {
  module: Module;
  element: Element;
  onPatch: (patch: Partial<Element>) => void;
}) {
  const collectionId =
    element.binding?.kind === "collection" ? element.binding.collectionId : "";
  const collection = collectionId
    ? module.collections.find((c) => c.id === collectionId) ?? null
    : null;
  const groupBy = (element.config?.groupBy as string | undefined) ?? "";
  const title = (element.config?.title as string | undefined) ?? "";

  const setConfig = (patch: Record<string, unknown>) =>
    onPatch({ config: { ...(element.config ?? {}), ...patch } });

  return (
    <div className="pt-4 border-t border-rule space-y-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Bind to collection
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
                binding: { kind: "collection", collectionId: cid },
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

      <Row label="Title">
        <input
          value={title}
          onChange={(e) => setConfig({ title: e.target.value || undefined })}
          placeholder={collection?.name ?? ""}
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        />
      </Row>

      {collection && (
        <Row label="Group by">
          <select
            value={groupBy}
            onChange={(e) => setConfig({ groupBy: e.target.value || undefined })}
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="">— none —</option>
            {collection.fields
              .filter(
                (f) =>
                  f.type === "select" ||
                  f.type === "multi_select" ||
                  f.type === "date" ||
                  f.type === "datetime" ||
                  f.type === "text",
              )
              .map((f) => (
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

function GoalSourceControl({
  module,
  element,
  onPatch,
}: {
  module: Module;
  element: Element;
  onPatch: (patch: Partial<Element>) => void;
}) {
  const cfg = (element.config ?? {}) as Record<string, unknown>;
  const goalSource = cfg.goalSource as
    | { collectionId?: string; fieldId?: string }
    | undefined;
  const mode: "fixed" | "field" = goalSource !== undefined ? "field" : "fixed";

  const set = (patch: Record<string, unknown>) =>
    onPatch({ config: { ...(element.config ?? {}), ...patch } });

  const collection = goalSource?.collectionId
    ? module.collections.find((c) => c.id === goalSource.collectionId) ?? null
    : null;
  const numberFields = collection?.fields.filter((f) => f.type === "number") ?? [];
  const collectionsWithNumberField = module.collections.filter((c) =>
    c.fields.some((f) => f.type === "number"),
  );
  const hasSingleton = module.collections.some((c) => c.singleton);

  return (
    <>
      <Row label="Goal source">
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              { id: "fixed", label: "Fixed value" },
              { id: "field", label: "From field" },
            ] as const
          ).map((opt) => {
            const active = mode === opt.id;
            const disabled =
              opt.id === "field" && collectionsWithNumberField.length === 0;
            return (
              <button
                key={opt.id}
                disabled={disabled}
                title={
                  disabled
                    ? "Add a number field to a collection on the Schema tab first"
                    : undefined
                }
                onClick={() => {
                  if (opt.id === "fixed") {
                    set({ goalSource: undefined });
                  } else {
                    const preferred =
                      collectionsWithNumberField.find((c) => c.singleton) ??
                      collectionsWithNumberField[0];
                    set({
                      goalSource: {
                        collectionId: preferred?.id,
                        fieldId: undefined,
                      },
                    });
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-rule disabled:hover:text-ink-muted`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Row>

      {mode === "fixed" ? (
        <Row label="Goal">
          <input
            type="number"
            value={(cfg.goal as number | undefined) ?? ""}
            onChange={(e) =>
              set({
                goal:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="e.g. 2000"
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          />
        </Row>
      ) : (
        <>
          <Row label="Collection">
            <select
              value={goalSource?.collectionId ?? ""}
              onChange={(e) =>
                set({
                  goalSource: {
                    collectionId: e.target.value || undefined,
                    fieldId: undefined,
                  },
                })
              }
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            >
              <option value="">— pick a collection —</option>
              {module.collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.singleton ? " · singleton" : ""}
                </option>
              ))}
            </select>
            {!hasSingleton && (
              <p className="text-xs text-ink-faint mt-1">
                Tip: mark a collection as singleton on the Schema tab so end
                users can edit the goal.
              </p>
            )}
          </Row>
          <Row label="Number field">
            <select
              value={goalSource?.fieldId ?? ""}
              onChange={(e) =>
                set({
                  goalSource: {
                    ...(goalSource ?? {}),
                    fieldId: e.target.value || undefined,
                  },
                })
              }
              disabled={!collection}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm disabled:opacity-50"
            >
              <option value="">— pick a number field —</option>
              {numberFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </Row>
        </>
      )}
    </>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: ColorToken | undefined;
  onChange: (token: ColorToken | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = swatchFor(value);
  const tiers: ("soft" | "mid" | "vivid")[] = ["soft", "mid", "vivid"];

  const pick = (t: ColorToken | undefined) => {
    onChange(t);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      {/* Trigger: compact chip showing current selection */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded border border-rule hover:border-ink transition-colors text-xs text-ink-muted hover:text-ink"
      >
        <span
          className="w-4 h-4 rounded-full border border-rule shrink-0"
          style={{ backgroundColor: current.fill }}
        />
        <span className="flex-1 text-left truncate">
          {value ? current.label : "Ink · default"}
        </span>
        <span
          className="text-ink-faint inline-block transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>

      {/* Expanded picker */}
      {open && (
        <div className="space-y-1.5 p-2 rounded border border-rule bg-paper">
          {/* Ink (default / clear) */}
          <button
            onClick={() => pick(undefined)}
            className={`flex items-center gap-2 w-full px-2 py-1 rounded text-[11px] transition-colors ${
              !value
                ? "bg-ink text-paper"
                : "text-ink-muted hover:bg-rule/30 hover:text-ink"
            }`}
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-rule shrink-0"
              style={{ backgroundColor: swatchFor("ink").fill }}
            />
            <span>Ink · default</span>
          </button>

          {/* Tier rows, no labels — soft sits on top (lightest), vivid bottom */}
          <div className="space-y-1">
            {tiers.map((tier) => (
              <div
                key={tier}
                className="grid grid-cols-8 gap-1"
                title={tier === "soft" ? "Soft" : tier === "mid" ? "Mid" : "Vivid"}
              >
                {PALETTE_HUES.map((hue) => {
                  const s = swatchByHueTier(hue, tier);
                  const active = value === s.token;
                  return (
                    <button
                      key={s.token}
                      onClick={() => pick(s.token)}
                      title={s.label}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        active
                          ? "border-ink scale-110 shadow-sm"
                          : "border-rule hover:border-ink"
                      }`}
                      style={{ backgroundColor: s.fill }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Combos — compact strip, tooltip only */}
          <div className="flex flex-wrap gap-1 pt-1 border-t border-rule">
            {COLOR_COMBOS.map((combo) => {
              const swatches = combo.tokens.map((t) => swatchFor(t));
              return (
                <button
                  key={combo.id}
                  onClick={() => pick(combo.tokens[0])}
                  title={`${combo.label}: ${swatches
                    .map((s) => s.label)
                    .join(" + ")}`}
                  className="flex -space-x-1 px-1.5 py-1 rounded border border-rule hover:border-ink transition-colors"
                >
                  {swatches.map((s, i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-full border border-paper"
                      style={{ backgroundColor: s.fill }}
                    />
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  defaultOpen = true,
  onReset,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`rounded-md mb-2 last:mb-0 transition-colors ${
        open ? "bg-rule/25" : "bg-rule/10 hover:bg-rule/20"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={`group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-[10px] uppercase tracking-[0.18em] cursor-pointer transition-colors ${
          open ? "text-ink" : "text-ink-muted hover:text-ink"
        }`}
      >
        <span className="text-left">{title}</span>
        <div className="flex items-center gap-1.5">
          {onReset && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              title={`Reset ${title.toLowerCase()}`}
              className="normal-case tracking-normal text-[10px] text-ink-faint opacity-0 group-hover:opacity-100 hover:text-ink transition-opacity"
            >
              Reset
            </button>
          )}
          <span
            className="inline-flex w-5 h-5 items-center justify-center rounded border border-rule bg-paper text-ink-muted group-hover:border-ink group-hover:text-ink transition-colors"
            aria-hidden
          >
            <span
              className="inline-block transition-transform leading-none text-[11px]"
              style={{ transform: open ? "rotate(180deg)" : "none" }}
            >
              ▾
            </span>
          </span>
        </div>
      </div>
      {open && <div className="px-3 pb-3 pt-1 space-y-3">{children}</div>}
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
