"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ContainerRenderer } from "@/components/module-creator/element-renderer";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  reconnectEdge,
  getSmoothStepPath,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  Container,
  EdgeTrigger,
  Element as MElement,
  FlowAction,
  FlowEdge,
  FlowEdgeData,
  FlowFilter,
  FlowGraph,
  FlowNode,
  FlowNodeData,
  LayoutNode,
  Module,
  Screen,
  SelectField,
  Trigger,
  VisibilityOp,
} from "@/lib/module/types";
import { addComputed } from "@/lib/module/mutations";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Flatten all elements (depth-first) inside a container. */
function flattenElements(node: LayoutNode): MElement[] {
  if (node.kind === "element") return [node];
  const out: MElement[] = [];
  for (const child of (node as Container).children) {
    out.push(...flattenElements(child));
  }
  return out;
}

function elementLabel(el: MElement): string {
  const cfg = (el.config ?? {}) as Record<string, unknown>;
  const text =
    (typeof cfg.label === "string" && cfg.label) ||
    (typeof cfg.text === "string" && cfg.text) ||
    (typeof cfg.placeholder === "string" && cfg.placeholder) ||
    "";
  const trimmed = text.trim().slice(0, 22);
  return trimmed ? `${el.type} · ${trimmed}` : el.type;
}

// World pixel sizes for a screen — match the Interface canvas mock widths and
// modal max-widths so flow nodes/thumbnails reflect the real target size.
const PAGE_WORLD_W = { mobile: 390, tablet: 820, desktop: 1200 } as const;
const MODAL_WORLD_W = { sm: 384, md: 448, lg: 672, xl: 896 } as const;
// Assumed content heights for thumbnails. Pages run taller than modals.
const PAGE_WORLD_H = 800;
const MODAL_WORLD_H = 520;

/** Compute the thumbnail box + content scale for any screen at a given scale.
 *  scale is roughly "thumbnail pixels per world pixel" — 0.18 for palette,
 *  0.3 for canvas nodes. Output width/height are clamped so a desktop page
 *  doesn't blow past the panel and a mobile page doesn't collapse. */
function screenThumbBox(
  screen: Screen | undefined,
  scale: number,
  maxW: number,
): { width: number; height: number; contentScale: number } {
  if (!screen) {
    return { width: 120 * (scale / 0.3), height: 80 * (scale / 0.3), contentScale: scale };
  }
  const worldW =
    screen.kind === "modal"
      ? MODAL_WORLD_W[screen.modalSize ?? "md"]
      : PAGE_WORLD_W[screen.pageWidth ?? "desktop"];
  const worldH = screen.kind === "modal" ? MODAL_WORLD_H : PAGE_WORLD_H;
  let width = worldW * scale;
  let contentScale = scale;
  if (width > maxW) {
    contentScale = maxW / worldW;
    width = maxW;
  }
  const height = worldH * contentScale;
  return { width, height, contentScale };
}

function actionStepLabel(a: FlowAction): string {
  switch (a.kind) {
    case "show_toast":
      return `Toast: ${a.message.slice(0, 16) || "—"}`;
    case "open_modal":
      return "Open modal";
    case "navigate_screen":
      return "Go to screen";
    case "create_entry":
      return "Create entry";
    case "compute":
      return "Compute";
    case "submit_entry":
      return "Submit";
  }
}

type RFNode = Node<{
  data: FlowNodeData;
  label: string;
  incomplete: boolean;
  incompleteReason?: string;
}>;

function nodeIncomplete(d: FlowNodeData): string | null {
  if (d.kind === "trigger") {
    const t = d.trigger;
    if (t.kind === "screen_opened") return t.screenId ? null : "Pick a screen";
    return t.collectionId ? null : "Pick a collection";
  }
  if (d.kind === "condition") {
    if (!d.filter.collectionId) return "Pick a collection";
    if (!d.filter.fieldId) return "Pick a field";
    return null;
  }
  if (d.kind === "page") {
    return d.screenId ? null : "Pick a screen";
  }
  // action
  const a = d.action;
  switch (a.kind) {
    case "show_toast":
      return a.message.trim() ? null : "Add a message";
    case "open_modal":
    case "navigate_screen":
      return a.screenId ? null : "Pick a screen";
    case "create_entry":
      return a.collectionId ? null : "Pick a collection";
    case "compute":
      if (!a.targetComputedId) return "Pick a target computed property";
      if (!a.inputs || a.inputs.length === 0) return "Pick at least one field";
      return null;
    case "submit_entry":
      return null;
  }
}

// ─── Adapters: our schema <-> react-flow ────────────────────────────────────

function toRFNodes(graph: FlowGraph, module: Module): RFNode[] {
  return graph.nodes.map((n) => {
    const reason = nodeIncomplete(n.data);
    return {
      id: n.id,
      type: n.data.kind, // "trigger" | "condition" | "action"
      position: n.position,
      data: {
        data: n.data,
        label: labelFor(n.data, module),
        incomplete: reason !== null,
        incompleteReason: reason ?? undefined,
      },
    };
  });
}

function toRFEdges(graph: FlowGraph): Edge[] {
  return graph.edges.map((e) => {
    const isFalse = e.sourceHandle === "false";
    const stroke = isFalse ? "#d97552" : "var(--ink)";
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      type: "step",
      animated: false,
      data: e.data ?? {},
      style: { stroke, strokeWidth: 1.5 },
      markerEnd: {
        type: "arrowclosed" as never,
        color: stroke,
        width: 18,
        height: 18,
      },
    };
  });
}

function fromRFGraph(nodes: RFNode[], edges: Edge[]): FlowGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      position: n.position,
      data: n.data.data,
    })),
    edges: edges.map((e) => {
      // Normalise the runtime sourceHandle: a condition node may have outputs
      // on multiple sides ("true" right vs "true-b" bottom), but both mean the
      // same branch for execution. Anything that isn't a branch label is
      // treated as a plain (unconditional) output.
      const h = e.sourceHandle;
      const branch =
        h === "true" || h === "true-b"
          ? "true"
          : h === "false" || h === "false-b"
            ? "false"
            : undefined;
      const edgeData = (e.data as FlowEdgeData | undefined) ?? undefined;
      const hasData =
        edgeData &&
        (edgeData.trigger ||
          (edgeData.steps && edgeData.steps.length > 0) ||
          edgeData.transition);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: branch,
        ...(hasData ? { data: edgeData } : {}),
      };
    }),
  };
}

function labelFor(d: FlowNodeData, module: Module): string {
  if (d.kind === "trigger") {
    const t = d.trigger;
    if (t.kind === "entry_created" || t.kind === "entry_updated") {
      const c = module.collections.find((c) => c.id === t.collectionId);
      return t.kind === "entry_created"
        ? `On create · ${c?.name ?? "—"}`
        : `On update · ${c?.name ?? "—"}`;
    }
    if (t.kind === "screen_opened") {
      const s = module.screens.find((s) => s.id === t.screenId);
      return `On open · ${s?.name ?? "—"}`;
    }
    return "Trigger";
  }
  if (d.kind === "condition") {
    const c = module.collections.find((c) => c.id === d.filter.collectionId);
    const f = c?.fields.find((f) => f.id === d.filter.fieldId);
    return `If ${f?.label ?? "field"} ${d.filter.op}${
      d.filter.value !== undefined ? ` ${d.filter.value}` : ""
    }`;
  }
  if (d.kind === "page") {
    const s = module.screens.find((s) => s.id === d.screenId);
    return s ? `${s.kind === "modal" ? "Modal" : "Page"} · ${s.name}` : "Page";
  }
  // action
  const a = d.action;
  switch (a.kind) {
    case "show_toast":
      return `Toast · ${a.message.slice(0, 18)}`;
    case "open_modal": {
      const s = module.screens.find((s) => s.id === a.screenId);
      return `Open modal · ${s?.name ?? "—"}`;
    }
    case "navigate_screen": {
      const s = module.screens.find((s) => s.id === a.screenId);
      return `Go to · ${s?.name ?? "—"}`;
    }
    case "create_entry": {
      const c = module.collections.find((c) => c.id === a.collectionId);
      return `Create in ${c?.name ?? "—"}`;
    }
    case "compute": {
      const p = module.computed?.find((p) => p.id === a.targetComputedId);
      const inputCount = a.inputs?.length ?? 0;
      return `Compute → ${p?.label ?? "—"}${inputCount ? ` (${inputCount} field${inputCount === 1 ? "" : "s"})` : ""}`;
    }
    case "submit_entry":
      return "Submit entry";
  }
}

// ─── Custom node renderers ──────────────────────────────────────────────────

const NODE_BASE =
  "rounded-md border bg-paper px-3 py-2.5 text-xs shadow-sm w-[240px]";

// ─── Module context for node renderers ──────────────────────────────────────
const FlowModuleContext = createContext<Module | null>(null);

// Lets a page-node thumbnail wire one of its buttons to another page or modal
// node on the canvas without leaving the graph. Provided by BehaviorInner.
interface WireApi {
  /** All page nodes currently on the canvas, in render order. */
  pageNodes: { id: string; screenId: string }[];
  /** Mark a button on a page node as the focus of the right inspector. The
   *  panel renders a wire config for it; picking a target creates/updates the
   *  outgoing element_clicked edge. */
  selectButton: (sourcePageNodeId: string, elementId: string) => void;
  /** Currently focused button, if any. */
  selected: { pageNodeId: string; elementId: string } | null;
  /** Edges keyed by source button — used to render a "wired" dot in the
   *  thumbnail next to any button that already has an outgoing wire. */
  wiredElementIds: (pageNodeId: string) => Set<string>;
}
const WireContext = createContext<WireApi | null>(null);

// ─── Preview sub-components used inside node cards ──────────────────────────

function ScreenThumbnail({
  module,
  screenId,
}: {
  module: Module;
  screenId: string;
}) {
  const screen = module.screens.find((s) => s.id === screenId);
  if (!screen) {
    return (
      <div className="text-[10px] text-ink-faint italic px-2 py-3 border border-dashed border-rule rounded text-center">
        No screen picked
      </div>
    );
  }
  const box = screenThumbBox(screen, 0.18, 200);
  return (
    <div className="border border-rule rounded bg-paper overflow-hidden mx-auto" style={{ width: box.width }}>
      <div className="px-2 py-1 border-b border-rule flex items-center justify-between text-[9px]">
        <span className="text-ink-muted truncate">{screen.name}</span>
        <span className="text-ink-faint uppercase tracking-widest">
          {screen.kind}
        </span>
      </div>
      <div
        className="relative overflow-hidden bg-paper pointer-events-none"
        style={{ height: box.height }}
      >
        <div
          style={{
            transform: `scale(${box.contentScale})`,
            transformOrigin: "top left",
            width: `${100 / box.contentScale}%`,
          }}
        >
          <ContainerRenderer
            container={screen.root}
            module={module}
            selectedId={null}
            onSelect={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

function CollectionChips({
  module,
  collectionId,
  highlightFieldId,
}: {
  module: Module;
  collectionId: string;
  highlightFieldId?: string;
}) {
  const coll = module.collections.find((c) => c.id === collectionId);
  if (!coll) {
    return (
      <div className="text-[10px] text-ink-faint italic px-2 py-3 border border-dashed border-rule rounded text-center">
        No collection picked
      </div>
    );
  }
  return (
    <div className="border border-rule rounded bg-paper px-2 py-1.5">
      <div className="text-[9px] text-ink-faint flex items-center gap-1 mb-1">
        <span>{coll.singleton ? "Singleton" : "Collection"}</span>
        <span>·</span>
        <span className="font-mono truncate">{coll.key}</span>
      </div>
      {coll.fields.length === 0 ? (
        <div className="text-[10px] text-ink-faint italic">No fields yet.</div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {coll.fields.slice(0, 6).map((f) => (
            <span
              key={f.id}
              className={`text-[9px] px-1.5 py-0.5 rounded border truncate ${
                highlightFieldId === f.id
                  ? "border-ink text-ink bg-ink/5"
                  : "border-rule text-ink-muted"
              }`}
              title={f.label}
            >
              {f.label}
            </span>
          ))}
          {coll.fields.length > 6 && (
            <span className="text-[9px] text-ink-faint">
              +{coll.fields.length - 6}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ToastPreview({
  message,
  tone,
}: {
  message: string;
  tone?: "info" | "success" | "warn";
}) {
  const t = tone ?? "info";
  return (
    <div
      className={`rounded border px-2.5 py-1.5 text-[11px] ${
        t === "success"
          ? "border-green-600/40 bg-green-500/10 text-ink"
          : t === "warn"
            ? "border-amber-600/40 bg-amber-500/10 text-ink"
            : "border-rule bg-paper text-ink"
      }`}
    >
      {message ? (
        message
      ) : (
        <span className="italic text-ink-faint">No message</span>
      )}
    </div>
  );
}

// Visible, grabbable handles.
const HANDLE_STYLE: React.CSSProperties = {
  width: 12,
  height: 12,
  border: "2px solid var(--paper)",
  borderRadius: 9999,
};

function TriggerNode({ data, selected }: NodeProps<RFNode>) {
  const module = useContext(FlowModuleContext);
  const trigger = data.data.kind === "trigger" ? data.data.trigger : null;
  return (
    <div
      className={`${NODE_BASE} relative ${
        selected ? "border-ink shadow-md" : "border-rule"
      }`}
      style={{ borderLeft: "3px solid var(--ink)" }}
    >
      {data.incomplete && (
        <span
          title={data.incompleteReason}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-paper"
        />
      )}
      <div className="text-[9px] uppercase tracking-[0.15em] text-ink-faint">
        Trigger
      </div>
      <div className="text-ink mt-0.5">{data.label}</div>
      {module && trigger && (
        <div className="mt-2">
          {trigger.kind === "screen_opened" ? (
            <ScreenThumbnail module={module} screenId={trigger.screenId} />
          ) : (
            <CollectionChips
              module={module}
              collectionId={trigger.collectionId}
            />
          )}
        </div>
      )}
      <Handle
        id="r"
        type="source"
        position={Position.Right}
        style={{ ...HANDLE_STYLE, background: "var(--ink)", right: -7 }}
        title="Drag to connect"
      />
      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        style={{ ...HANDLE_STYLE, background: "var(--ink)", bottom: -7 }}
        title="Drag to connect"
      />
    </div>
  );
}

function ConditionNode({ data, selected }: NodeProps<RFNode>) {
  const module = useContext(FlowModuleContext);
  const filter = data.data.kind === "condition" ? data.data.filter : null;
  return (
    <div
      className={`${NODE_BASE} relative ${
        selected ? "border-ink shadow-md" : "border-rule"
      }`}
      style={{ borderLeft: "3px solid #d9a82e", paddingRight: 24 }}
    >
      {data.incomplete && (
        <span
          title={data.incompleteReason}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-paper"
        />
      )}
      <div className="text-[9px] uppercase tracking-[0.15em] text-ink-faint">
        Condition
      </div>
      <div className="text-ink mt-0.5">{data.label}</div>
      {module && filter && (
        <div className="mt-2">
          <CollectionChips
            module={module}
            collectionId={filter.collectionId}
            highlightFieldId={filter.fieldId}
          />
        </div>
      )}

      {/* Inputs — left and top */}
      <Handle
        id="l"
        type="target"
        position={Position.Left}
        style={{ ...HANDLE_STYLE, background: "var(--ink-muted)", left: -7 }}
      />
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        style={{ ...HANDLE_STYLE, background: "var(--ink-muted)", top: -7 }}
      />

      {/* TRUE outputs — right (top half) + bottom-left */}
      <div
        className="absolute right-1 top-[28%] -translate-y-1/2 text-[8px] uppercase tracking-widest text-green-700"
        style={{ pointerEvents: "none" }}
      >
        T
      </div>
      <Handle
        id="true"
        type="source"
        position={Position.Right}
        style={{ ...HANDLE_STYLE, top: "30%", background: "#5fa869", right: -7 }}
        title="Drag to connect (TRUE branch)"
      />
      <Handle
        id="true-b"
        type="source"
        position={Position.Bottom}
        style={{
          ...HANDLE_STYLE,
          background: "#5fa869",
          bottom: -7,
          left: "30%",
        }}
        title="TRUE branch"
      />

      {/* FALSE outputs — right (bottom half) + bottom-right */}
      <div
        className="absolute right-1 top-[72%] -translate-y-1/2 text-[8px] uppercase tracking-widest text-orange-700"
        style={{ pointerEvents: "none" }}
      >
        F
      </div>
      <Handle
        id="false"
        type="source"
        position={Position.Right}
        style={{ ...HANDLE_STYLE, top: "70%", background: "#d97552", right: -7 }}
        title="Drag to connect (FALSE branch)"
      />
      <Handle
        id="false-b"
        type="source"
        position={Position.Bottom}
        style={{
          ...HANDLE_STYLE,
          background: "#d97552",
          bottom: -7,
          left: "70%",
        }}
        title="FALSE branch"
      />
    </div>
  );
}

function ActionNode({ data, selected }: NodeProps<RFNode>) {
  const module = useContext(FlowModuleContext);
  const action = data.data.kind === "action" ? data.data.action : null;
  return (
    <div
      className={`${NODE_BASE} relative ${
        selected ? "border-ink shadow-md" : "border-rule"
      }`}
      style={{ borderLeft: "3px solid #4b8bc4" }}
    >
      {data.incomplete && (
        <span
          title={data.incompleteReason}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-paper"
        />
      )}
      <div className="text-[9px] uppercase tracking-[0.15em] text-ink-faint">
        Action
      </div>
      <div className="text-ink mt-0.5">{data.label}</div>
      {module && action && (
        <div className="mt-2">
          {action.kind === "show_toast" ? (
            <ToastPreview message={action.message} tone={action.tone} />
          ) : action.kind === "open_modal" ||
            action.kind === "navigate_screen" ? (
            <ScreenThumbnail module={module} screenId={action.screenId} />
          ) : action.kind === "create_entry" ? (
            <CollectionChips
              module={module}
              collectionId={action.collectionId}
            />
          ) : null}
        </div>
      )}

      {/* Inputs — left and top */}
      <Handle
        id="l"
        type="target"
        position={Position.Left}
        style={{ ...HANDLE_STYLE, background: "var(--ink-muted)", left: -7 }}
      />
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        style={{ ...HANDLE_STYLE, background: "var(--ink-muted)", top: -7 }}
      />

      {/* Outputs — right and bottom */}
      <Handle
        id="r"
        type="source"
        position={Position.Right}
        style={{ ...HANDLE_STYLE, background: "#4b8bc4", right: -7 }}
        title="Drag to connect to the next step"
      />
      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        style={{ ...HANDLE_STYLE, background: "#4b8bc4", bottom: -7 }}
        title="Drag to connect to the next step"
      />
    </div>
  );
}

// Walk a container tree and return every button element.
function flattenButtons(node: LayoutNode): MElement[] {
  if (node.kind === "element") return node.type === "button" ? [node] : [];
  const out: MElement[] = [];
  for (const child of (node as Container).children) out.push(...flattenButtons(child));
  return out;
}

function PageNode({ id, data, selected }: NodeProps<RFNode>) {
  const module = useContext(FlowModuleContext);
  const wire = useContext(WireContext);
  const screenId = data.data.kind === "page" ? data.data.screenId : "";
  const screen = module?.screens.find((s) => s.id === screenId);
  const accent = screen?.kind === "modal" ? "#a86bc4" : "#2e7d6b";
  // Box sized from the screen's actual target viewport so a desktop page
  // looks wide, mobile looks narrow, and modal looks modal-shaped.
  const box = screenThumbBox(screen, 0.3, 380);
  // Outer card width: thumbnail width + horizontal padding (px-2 = 16px) +
  // a small margin so the title doesn't feel cramped.
  const cardW = Math.max(180, Math.round(box.width) + 16);
  const sizeLabel = screen
    ? screen.kind === "modal"
      ? (screen.modalSize ?? "md").toUpperCase()
      : screen.pageWidth ?? "desktop"
    : "";

  // Buttons that already have an outgoing element_clicked wire on this page —
  // used to draw a small dot indicator next to each wired button.
  const wiredIds = wire ? wire.wiredElementIds(id) : new Set<string>();
  const focusedButton =
    wire?.selected?.pageNodeId === id ? wire.selected.elementId : null;

  // Event delegation: catch clicks on any data-element-type="button" inside
  // the thumbnail. ContainerRenderer's button render carries data-element-id
  // so we can identify which one was clicked.
  const onThumbClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const el = target?.closest('[data-element-type="button"]') as
      | HTMLElement
      | null;
    if (!el) return;
    e.stopPropagation();
    e.preventDefault();
    const elementId = el.getAttribute("data-element-id");
    if (!elementId || !wire) return;
    wire.selectButton(id, elementId);
  };

  // Decorate wired/focused buttons inside the thumbnail. We do this after
  // ContainerRenderer paints by toggling CSS classes via data-element-id
  // selectors on a wrapper.
  const decorationCss = `
    [data-page-node="${id}"] [data-element-type="button"] {
      position: relative;
    }
    ${Array.from(wiredIds)
      .map(
        (eid) => `
      [data-page-node="${id}"] [data-element-id="${eid}"][data-element-type="button"]::after {
        content: "";
        position: absolute;
        top: -3px;
        right: -3px;
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background: var(--ink);
        border: 2px solid var(--paper);
      }`,
      )
      .join("\n")}
    ${
      focusedButton
        ? `[data-page-node="${id}"] [data-element-id="${focusedButton}"][data-element-type="button"] {
        outline: 2px solid var(--ink);
        outline-offset: 2px;
      }`
        : ""
    }
  `;

  return (
    <div
      className={`rounded-md border bg-paper text-xs shadow-sm relative ${
        selected ? "border-ink shadow-md" : "border-rule"
      }`}
      style={{ borderLeft: `3px solid ${accent}`, width: cardW }}
    >
      {data.incomplete && (
        <span
          title={data.incompleteReason}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-paper"
        />
      )}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.15em] text-ink-faint">
            {screen?.kind === "modal" ? "Modal" : "Page"}
          </div>
          <div className="text-ink mt-0.5 truncate">
            {screen?.name ?? "—"}
          </div>
        </div>
        {sizeLabel && (
          <span className="text-[9px] uppercase tracking-widest text-ink-faint shrink-0">
            {sizeLabel}
          </span>
        )}
      </div>
      {module && screen ? (
        <div className="px-2 pb-2 flex justify-center">
          <style>{decorationCss}</style>
          <div
            data-page-node={id}
            className="relative overflow-hidden rounded bg-paper border border-rule"
            style={{ width: box.width, height: box.height }}
            onClickCapture={onThumbClick}
          >
            <div
              style={{
                transform: `scale(${box.contentScale})`,
                transformOrigin: "top left",
                width: `${100 / box.contentScale}%`,
              }}
            >
              <ContainerRenderer
                container={screen.root}
                module={module}
                selectedId={null}
                onSelect={() => {}}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3 pb-3 text-[10px] text-ink-faint italic">
          No screen picked
        </div>
      )}

      <Handle
        id="l"
        type="target"
        position={Position.Left}
        style={{ ...HANDLE_STYLE, background: "var(--ink-muted)", left: -7 }}
      />
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        style={{ ...HANDLE_STYLE, background: "var(--ink-muted)", top: -7 }}
      />
      <Handle
        id="r"
        type="source"
        position={Position.Right}
        style={{ ...HANDLE_STYLE, background: accent, right: -7 }}
        title="Drag from here to link this page to another"
      />
      <Handle
        id="b"
        type="source"
        position={Position.Bottom}
        style={{ ...HANDLE_STYLE, background: accent, bottom: -7 }}
        title="Drag from here to link this page to another"
      />
    </div>
  );
}

const NODE_TYPES = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  page: PageNode,
};

function StepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
  style,
}: EdgeProps) {
  const module = useContext(FlowModuleContext);
  const rf = useReactFlow();
  const edgeData = (data ?? {}) as FlowEdgeData;
  const steps = edgeData.steps ?? [];
  const trigger = edgeData.trigger;

  // Smoothstep edges have a middle segment between two elbows. For an edge
  // flowing horizontally (left/right handles), that segment is VERTICAL and
  // sits at `centerX` — slide it left/right. For a vertically-flowing edge
  // (top/bottom handles) the segment is HORIZONTAL at `centerY` — slide up
  // and down. We let users grab and drag that segment to reroute the arrow.
  const isHorizontalFlow =
    (sourcePosition === Position.Right || sourcePosition === Position.Left) &&
    (targetPosition === Position.Right || targetPosition === Position.Left);
  const isVerticalFlow =
    (sourcePosition === Position.Top || sourcePosition === Position.Bottom) &&
    (targetPosition === Position.Top || targetPosition === Position.Bottom);

  const defaultCenterX = (sourceX + targetX) / 2;
  const defaultCenterY = (sourceY + targetY) / 2;
  const centerX = edgeData.centerX ?? defaultCenterX;
  const centerY = edgeData.centerY ?? defaultCenterY;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    ...(isHorizontalFlow ? { centerX } : {}),
    ...(isVerticalFlow ? { centerY } : {}),
  });

  // Drag the elbow segment. Only the perpendicular axis moves so the user
  // gets a clean horizontal slide on a vertical segment (and vice versa).
  const startDrag = (axis: "x" | "y") => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const pos = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      rf.setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id !== id) return edge;
          const cur = (edge.data as FlowEdgeData | undefined) ?? {};
          return {
            ...edge,
            data: {
              ...cur,
              ...(axis === "x" ? { centerX: pos.x } : { centerY: pos.y }),
            },
          };
        }),
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const resetBend = (e: React.MouseEvent) => {
    e.stopPropagation();
    rf.setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id !== id) return edge;
        const next = { ...((edge.data as FlowEdgeData | undefined) ?? {}) };
        delete next.centerX;
        delete next.centerY;
        return { ...edge, data: next };
      }),
    );
  };

  // Grab strip geometry for the draggable mid-segment.
  const hasCustomX = edgeData.centerX !== undefined;
  const hasCustomY = edgeData.centerY !== undefined;
  // Horizontal flow → vertical strip at x=centerX, between source/target Y
  const vStripX = centerX;
  const vStripY = (sourceY + targetY) / 2;
  const vStripH = Math.max(28, Math.abs(targetY - sourceY));
  // Vertical flow → horizontal strip at y=centerY
  const hStripY = centerY;
  const hStripX = (sourceX + targetX) / 2;
  const hStripW = Math.max(28, Math.abs(targetX - sourceX));
  // Look up the source button's label so the edge label says
  // "on click · Save" instead of just "on click".
  const triggerLabel = (() => {
    if (!trigger) return null;
    const verb = trigger.kind === "element_submitted" ? "submit" : "click";
    if (!module) return `on ${verb}`;
    for (const s of module.screens) {
      const found = flattenButtons(s.root).find(
        (b) => b.id === trigger.elementId,
      );
      if (found) {
        const text =
          (found.config?.text as string | undefined) ||
          (found.config?.label as string | undefined);
        return text ? `on ${verb} · ${text}` : `on ${verb}`;
      }
    }
    return `on ${verb}`;
  })();
  const hasOverlay = !!trigger || steps.length > 0;
  const effectiveStyle = selected
    ? { ...style, stroke: "var(--ink)", strokeWidth: 2.5 }
    : style;
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={effectiveStyle}
      />
      {hasOverlay && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
            }}
            className="flex flex-col items-center gap-1"
          >
            {trigger && triggerLabel && (
              <div className="text-[8px] uppercase tracking-widest bg-paper border border-rule rounded px-1.5 py-0.5 text-ink-muted shadow-sm">
                {triggerLabel}
              </div>
            )}
            {steps.map((s, i) => (
              <div
                key={i}
                className="text-[10px] bg-paper border border-rule rounded px-1.5 py-0.5 text-ink shadow-sm"
              >
                {actionStepLabel(s)}
              </div>
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
      {/* Grab strips along the elbow's mid-segment. Drag a strip
          perpendicular to its length to reroute that segment. Double-click
          either strip to reset the bend to the default midpoint. */}
      {isHorizontalFlow && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan group"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${vStripX}px, ${vStripY}px)`,
              width: 14,
              height: vStripH,
              pointerEvents: "auto",
              cursor: "ew-resize",
            }}
            onPointerDown={startDrag("x")}
            onDoubleClick={resetBend}
            title={
              hasCustomX
                ? "Drag horizontally to reroute · double-click to reset"
                : "Drag horizontally to bend the arrow"
            }
          >
            {/* Visual line + center grip dot. The line overlays the actual
                edge segment so it feels like you're grabbing the line. */}
            <div
              className={`absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-0.75 transition-opacity ${
                hasCustomX || selected
                  ? "bg-ink opacity-80"
                  : "bg-ink opacity-0 group-hover:opacity-40"
              }`}
            />
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper transition-all ${
                hasCustomX
                  ? "w-3 h-3 border-2 border-ink"
                  : "w-2 h-2 border border-ink-faint opacity-40 group-hover:opacity-100 group-hover:border-ink"
              }`}
            />
          </div>
        </EdgeLabelRenderer>
      )}
      {isVerticalFlow && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan group"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${hStripX}px, ${hStripY}px)`,
              width: hStripW,
              height: 14,
              pointerEvents: "auto",
              cursor: "ns-resize",
            }}
            onPointerDown={startDrag("y")}
            onDoubleClick={resetBend}
            title={
              hasCustomY
                ? "Drag vertically to reroute · double-click to reset"
                : "Drag vertically to bend the arrow"
            }
          >
            <div
              className={`absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.75 transition-opacity ${
                hasCustomY || selected
                  ? "bg-ink opacity-80"
                  : "bg-ink opacity-0 group-hover:opacity-40"
              }`}
            />
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper transition-all ${
                hasCustomY
                  ? "w-3 h-3 border-2 border-ink"
                  : "w-2 h-2 border border-ink-faint opacity-40 group-hover:opacity-100 group-hover:border-ink"
              }`}
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const EDGE_TYPES = {
  step: StepEdge,
};

// ─── Behavior mode ──────────────────────────────────────────────────────────

export function BehaviorMode(props: {
  module: Module;
  setModule: Dispatch<SetStateAction<Module>>;
}) {
  return (
    <ReactFlowProvider>
      <BehaviorInner {...props} />
    </ReactFlowProvider>
  );
}

function BehaviorInner({
  module,
  setModule,
}: {
  module: Module;
  setModule: Dispatch<SetStateAction<Module>>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedButton, setSelectedButton] = useState<{
    pageNodeId: string;
    elementId: string;
  } | null>(null);

  // Use xyflow's canonical local state — that way the canvas owns its render
  // path and we sync to the module via a debounced effect below.
  const [rfNodes, setRfNodes, baseOnNodesChange] = useNodesState<RFNode>([]);
  const [rfEdges, setRfEdges, baseOnEdgesChange] = useEdgesState<Edge>([]);

  // ── Undo / redo ──────────────────────────────────────────────────────────
  // We snapshot before structural changes (add/remove nodes or edges, config
  // edits, drag-ends) — not on every position tick during a drag.
  const HISTORY_LIMIT = 50;
  type Snapshot = { nodes: RFNode[]; edges: Edge[] };
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const skipNextHistory = useState({ v: false })[0]; // mutable ref-ish object

  const pushHistory = useCallback(() => {
    if (skipNextHistory.v) {
      skipNextHistory.v = false;
      return;
    }
    setPast((p) => {
      const next = [...p, { nodes: rfNodes, edges: rfEdges }];
      return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
    });
    setFuture([]);
  }, [rfNodes, rfEdges, skipNextHistory]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture((f) => [{ nodes: rfNodes, edges: rfEdges }, ...f]);
    setPast((p) => p.slice(0, -1));
    skipNextHistory.v = true;
    setRfNodes(prev.nodes);
    setRfEdges(prev.edges);
    setSelectedId(null);
  }, [past, rfNodes, rfEdges, setRfNodes, setRfEdges, skipNextHistory]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, { nodes: rfNodes, edges: rfEdges }]);
    setFuture((f) => f.slice(1));
    skipNextHistory.v = true;
    setRfNodes(next.nodes);
    setRfEdges(next.edges);
    setSelectedId(null);
  }, [future, rfNodes, rfEdges, setRfNodes, setRfEdges, skipNextHistory]);

  // Wrap xyflow's change handlers so we snapshot at the right moments.
  const onNodesChange = useCallback(
    (changes: NodeChange<RFNode>[]) => {
      const shouldSnapshot = changes.some(
        (c) =>
          c.type === "add" ||
          c.type === "remove" ||
          (c.type === "position" && c.dragging === false),
      );
      if (shouldSnapshot) pushHistory();
      baseOnNodesChange(changes);
    },
    [baseOnNodesChange, pushHistory],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const shouldSnapshot = changes.some(
        (c) => c.type === "add" || c.type === "remove",
      );
      if (shouldSnapshot) pushHistory();
      baseOnEdgesChange(changes);
    },
    [baseOnEdgesChange, pushHistory],
  );

  // ── Hydrate local state from module.flowGraph on mount / when the module
  // identity changes (switching tabs/modules). We intentionally only re-run
  // when the graph reference changes from outside — local edits update both
  // local RF state and module state directly without re-hydrating.
  const lastHydratedGraph = useMemo(
    () => module.flowGraph,
    [module.flowGraph],
  );
  useEffect(() => {
    const graph = lastHydratedGraph ?? { nodes: [], edges: [] };
    setRfNodes(toRFNodes(graph, module));
    setRfEdges(toRFEdges(graph));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module.id]); // hydrate on module switch only

  // Refresh labels/incomplete badges when collections or screens change.
  useEffect(() => {
    setRfNodes((curr) =>
      curr.map((n) => {
        const reason = nodeIncomplete(n.data.data);
        return {
          ...n,
          data: {
            ...n.data,
            label: labelFor(n.data.data, module),
            incomplete: reason !== null,
            incompleteReason: reason ?? undefined,
          },
        };
      }),
    );
  }, [module.collections, module.screens, setRfNodes]);

  const writeGraph = useCallback(
    (next: FlowGraph) => {
      setModule((m) => ({ ...m, flowGraph: next }));
    },
    [setModule],
  );

  // Sync local RF state → module on every change (so persistence works).
  // First-mount sync is skipped — at that point `rfNodes`/`rfEdges` are still
  // xyflow's initial empty arrays (hydration's setRfNodes is queued but not
  // yet committed). Without this guard we'd write an empty flowGraph back
  // to the module and trigger an autosave that wipes the user's saved wires.
  const skipFirstSync = useRef(true);
  useEffect(() => {
    if (skipFirstSync.current) {
      skipFirstSync.current = false;
      return;
    }
    writeGraph(fromRFGraph(rfNodes, rfEdges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfNodes, rfEdges]);

  const onConnect = useCallback(
    (conn: Connection) => {
      pushHistory();
      // If both endpoints are page nodes, default the edge to a page transition
      // (modal vs navigate inferred from target screen kind).
      const sourceNode = rfNodes.find((n) => n.id === conn.source);
      const targetNode = rfNodes.find((n) => n.id === conn.target);
      let data: FlowEdgeData | undefined;
      if (
        targetNode?.data.data.kind === "page" &&
        sourceNode?.data.data.kind === "page"
      ) {
        const target = module.screens.find(
          (s) =>
            targetNode.data.data.kind === "page" &&
            s.id === targetNode.data.data.screenId,
        );
        data = {
          transition: target?.kind === "modal" ? "modal" : "navigate",
        };
      }
      setRfEdges((eds) =>
        addEdge(
          { ...conn, id: uid(), type: "step", ...(data ? { data } : {}) },
          eds,
        ),
      );
    },
    [setRfEdges, pushHistory, rfNodes, module],
  );

  // Reconnect: drag an arrow's endpoint onto a different node to repoint it.
  // If the user releases over empty canvas, the edge is removed.
  const reconnectDoneRef = useRef(true);
  const onReconnectStart = useCallback(() => {
    reconnectDoneRef.current = false;
  }, []);
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      pushHistory();
      reconnectDoneRef.current = true;
      // If the target node changed and target is a page, refresh transition
      // metadata so navigate/modal stays right after a repoint.
      let nextData = oldEdge.data as FlowEdgeData | undefined;
      const target = rfNodes.find((n) => n.id === newConnection.target);
      if (target?.data.data.kind === "page") {
        const targetScreen = module.screens.find(
          (s) =>
            target.data.data.kind === "page" &&
            s.id === target.data.data.screenId,
        );
        nextData = {
          ...(nextData ?? {}),
          transition: targetScreen?.kind === "modal" ? "modal" : "navigate",
        };
      }
      setRfEdges((eds) =>
        reconnectEdge(
          { ...oldEdge, data: nextData },
          newConnection,
          eds,
        ),
      );
    },
    [pushHistory, setRfEdges, rfNodes, module],
  );
  const onReconnectEnd = useCallback(
    (_: unknown, edge: Edge) => {
      // Dropped over empty canvas — drop the edge.
      if (reconnectDoneRef.current) return;
      reconnectDoneRef.current = true;
      pushHistory();
      setRfEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [pushHistory, setRfEdges],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: RFNode) => {
      setSelectedId(node.id);
      setSelectedEdgeId(null);
      setSelectedButton(null);
    },
    [],
  );

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedId(null);
    setSelectedButton(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
    setSelectedEdgeId(null);
    setSelectedButton(null);
  }, []);

  const addNode = useCallback(
    (data: FlowNodeData, position?: { x: number; y: number }) => {
      pushHistory();
      const id = uid();
      const reason = nodeIncomplete(data);
      const node: RFNode = {
        id,
        type: data.kind,
        position: position ?? {
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200,
        },
        data: {
          data,
          label: labelFor(data, module),
          incomplete: reason !== null,
          incompleteReason: reason ?? undefined,
        },
      };
      setRfNodes((curr) => [...curr, node]);
      setSelectedId(id);
    },
    [module, setRfNodes, pushHistory],
  );

  const rfApi = useReactFlow();

  // Drop from palette → place at the cursor's flow-space position.
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/x-takda-node");
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as FlowNodeData;
        const pos = rfApi.screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });
        addNode(data, pos);
      } catch {
        /* malformed payload — ignore */
      }
    },
    [rfApi, addNode],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // One-click auto-layout: place trigger nodes on the left, walk edges to fan
  // out columns. Simple breadth-first column assignment.
  const autoLayout = useCallback(() => {
    pushHistory();
    setRfNodes((curr) => {
      if (curr.length === 0) return curr;
      const colByNode = new Map<string, number>();
      const triggerNodes = curr.filter((n) => n.data.data.kind === "trigger");
      const queue: { id: string; col: number }[] = triggerNodes.map((n) => ({
        id: n.id,
        col: 0,
      }));
      for (const t of triggerNodes) colByNode.set(t.id, 0);
      while (queue.length > 0) {
        const { id, col } = queue.shift()!;
        for (const e of rfEdges) {
          if (e.source !== id) continue;
          const nextCol = col + 1;
          const prev = colByNode.get(e.target);
          if (prev === undefined || nextCol > prev) {
            colByNode.set(e.target, nextCol);
            queue.push({ id: e.target, col: nextCol });
          }
        }
      }
      for (const n of curr) {
        if (!colByNode.has(n.id)) colByNode.set(n.id, 0);
      }
      const groups = new Map<number, string[]>();
      for (const [id, col] of colByNode) {
        const arr = groups.get(col) ?? [];
        arr.push(id);
        groups.set(col, arr);
      }
      const COL_W = 220;
      const ROW_H = 100;
      return curr.map((n) => {
        const col = colByNode.get(n.id) ?? 0;
        const arr = groups.get(col) ?? [];
        const row = arr.indexOf(n.id);
        return {
          ...n,
          position: { x: 60 + col * COL_W, y: 60 + row * ROW_H },
        };
      });
    });
    requestAnimationFrame(() => rfApi.fitView({ padding: 0.2 }));
  }, [rfEdges, rfApi, setRfNodes, pushHistory]);

  // Keyboard: Delete / Backspace removes the selected node + attached edges.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t?.isContentEditable
      ) {
        return;
      }
      if (selectedEdgeId) {
        e.preventDefault();
        pushHistory();
        setRfEdges((curr) => curr.filter((eg) => eg.id !== selectedEdgeId));
        setSelectedEdgeId(null);
        return;
      }
      if (!selectedId) return;
      e.preventDefault();
      pushHistory();
      setRfNodes((curr) => curr.filter((n) => n.id !== selectedId));
      setRfEdges((curr) =>
        curr.filter(
          (eg) => eg.source !== selectedId && eg.target !== selectedId,
        ),
      );
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, selectedEdgeId, setRfNodes, setRfEdges, pushHistory]);

  // Cmd/Ctrl+Z = undo, Shift+Cmd/Ctrl+Z or Cmd/Ctrl+Y = redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t?.isContentEditable
      ) {
        return;
      }
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

  const selectedNode = rfNodes.find((n) => n.id === selectedId) ?? null;
  const selected: FlowNode | null = selectedNode
    ? { id: selectedNode.id, position: selectedNode.position, data: selectedNode.data.data }
    : null;
  const selectedEdge = rfEdges.find((e) => e.id === selectedEdgeId) ?? null;

  const updateSelectedEdge = useCallback(
    (next: FlowEdgeData) => {
      if (!selectedEdgeId) return;
      pushHistory();
      setRfEdges((curr) =>
        curr.map((e) =>
          e.id === selectedEdgeId ? { ...e, data: next } : e,
        ),
      );
    },
    [selectedEdgeId, setRfEdges, pushHistory],
  );

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    pushHistory();
    setRfEdges((curr) => curr.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  }, [selectedEdgeId, setRfEdges, pushHistory]);

  const updateSelected = useCallback(
    (next: FlowNodeData) => {
      if (!selectedId) return;
      pushHistory();
      const reason = nodeIncomplete(next);
      setRfNodes((curr) =>
        curr.map((n) =>
          n.id === selectedId
            ? {
                ...n,
                type: next.kind,
                data: {
                  data: next,
                  label: labelFor(next, module),
                  incomplete: reason !== null,
                  incompleteReason: reason ?? undefined,
                },
              }
            : n,
        ),
      );
    },
    [selectedId, module, setRfNodes, pushHistory],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushHistory();
    setRfNodes((curr) => curr.filter((n) => n.id !== selectedId));
    setRfEdges((curr) =>
      curr.filter((e) => e.source !== selectedId && e.target !== selectedId),
    );
    setSelectedId(null);
  }, [selectedId, setRfNodes, setRfEdges, pushHistory]);

  // Note: we intentionally don't gate the whole Behavior tab on having a
  // collection — page nodes, button wires, navigation, and toasts all work
  // without one. Individual palette items (triggers/conditions) and the
  // field picker show their own contextual empty states.

  const wireApi: WireApi = {
    pageNodes: rfNodes
      .filter((n) => n.data.data.kind === "page")
      .map((n) => ({
        id: n.id,
        screenId:
          n.data.data.kind === "page" ? n.data.data.screenId : "",
      }))
      .filter((p) => !!p.screenId),
    selected: selectedButton,
    selectButton: (sourcePageNodeId, elementId) => {
      setSelectedButton({ pageNodeId: sourcePageNodeId, elementId });
      setSelectedId(null);
      setSelectedEdgeId(null);
    },
    wiredElementIds: (pageNodeId) => {
      const out = new Set<string>();
      for (const e of rfEdges) {
        if (e.source !== pageNodeId) continue;
        const d = e.data as FlowEdgeData | undefined;
        if (d?.trigger?.kind === "element_clicked") {
          out.add(d.trigger.elementId);
        }
      }
      return out;
    },
  };

  // Wire / rewire / unwire helpers used by ButtonWireConfig.
  // A button wire is now an ORDERED LIST of steps. The runtime edge stores:
  //   - inline `data.steps[]` for everything except the final step
  //   - edge `target` for the final step (page node if it's a navigation,
  //     otherwise an auto-spawned action node)
  // Empty list → no wire.

  // Look up the source button's outgoing element_clicked edge (if any).
  const findButtonEdge = (
    sourcePageNodeId: string,
    elementId: string,
    eds: Edge[],
  ) =>
    eds.find((e) => {
      if (e.source !== sourcePageNodeId) return false;
      const d = e.data as FlowEdgeData | undefined;
      return (
        d?.trigger?.kind === "element_clicked" &&
        d.trigger.elementId === elementId
      );
    });

  // Convert an inline ButtonStep into its FlowAction equivalent (for steps
  // that aren't the wire's tail). Page steps in the middle become
  // navigate/open_modal actions.
  const stepToFlowAction = (s: ButtonStep): FlowAction => {
    if (s.type === "action") return s.action;
    const node = rfNodes.find((n) => n.id === s.pageNodeId);
    const screenId =
      node?.data.data.kind === "page" ? node.data.data.screenId : "";
    const screen = module.screens.find((x) => x.id === screenId);
    return screen?.kind === "modal"
      ? { kind: "open_modal", screenId }
      : { kind: "navigate_screen", screenId };
  };

  const wireButton = (
    sourcePageNodeId: string,
    elementId: string,
    steps: ButtonStep[],
  ) => {
    pushHistory();
    const sourceNode = rfNodes.find((n) => n.id === sourcePageNodeId);
    const spawnPos = sourceNode
      ? { x: sourceNode.position.x + 320, y: sourceNode.position.y + 40 }
      : { x: 100, y: 100 };

    const prevEdge = findButtonEdge(sourcePageNodeId, elementId, rfEdges);
    const prevTargetNode = prevEdge
      ? rfNodes.find((n) => n.id === prevEdge.target)
      : undefined;
    const prevAutoActionId =
      prevTargetNode?.data.data.kind === "action" ? prevTargetNode.id : null;
    const filterEds = (eds: Edge[]) => eds.filter((e) => e !== prevEdge);

    // Empty list — drop the edge and any auto-spawned action node.
    if (steps.length === 0) {
      setRfEdges(filterEds);
      if (prevAutoActionId) {
        setRfNodes((ns) => ns.filter((n) => n.id !== prevAutoActionId));
      }
      return;
    }

    const inlineSteps = steps.slice(0, -1).map(stepToFlowAction);
    const tail = steps[steps.length - 1];

    if (tail.type === "page") {
      const target = rfNodes.find((n) => n.id === tail.pageNodeId);
      const targetData = target?.data.data;
      const targetScreen =
        targetData && targetData.kind === "page"
          ? module.screens.find((s) => s.id === targetData.screenId)
          : null;
      const transition: "navigate" | "modal" =
        targetScreen?.kind === "modal" ? "modal" : "navigate";
      setRfEdges((eds) => [
        ...filterEds(eds),
        mkEdge(sourcePageNodeId, tail.pageNodeId, elementId, {
          transition,
          ...(inlineSteps.length > 0 ? { steps: inlineSteps } : {}),
        }),
      ]);
      // Discard a previous auto action node — the wire no longer targets it.
      if (prevAutoActionId) {
        setRfNodes((ns) => ns.filter((n) => n.id !== prevAutoActionId));
      }
      return;
    }

    // tail.type === "action" — reuse or spawn an action node.
    const action = tail.action;
    const reason = nodeIncomplete({ kind: "action", action });

    if (prevAutoActionId) {
      setRfNodes((latest) =>
        latest.map((n) =>
          n.id === prevAutoActionId
            ? {
                ...n,
                data: {
                  data: { kind: "action", action },
                  label: labelFor({ kind: "action", action }, module),
                  incomplete: reason !== null,
                  incompleteReason: reason ?? undefined,
                },
              }
            : n,
        ),
      );
      setRfEdges((eds) => [
        ...filterEds(eds),
        mkEdge(sourcePageNodeId, prevAutoActionId, elementId, {
          ...(inlineSteps.length > 0 ? { steps: inlineSteps } : {}),
        }),
      ]);
      return;
    }

    const newActionId = uid();
    const newNode: RFNode = {
      id: newActionId,
      type: "action",
      position: spawnPos,
      data: {
        data: { kind: "action", action },
        label: labelFor({ kind: "action", action }, module),
        incomplete: reason !== null,
        incompleteReason: reason ?? undefined,
      },
    };
    setRfNodes((latest) => [...latest, newNode]);
    setRfEdges((eds) => [
      ...filterEds(eds),
      mkEdge(sourcePageNodeId, newActionId, elementId, {
        ...(inlineSteps.length > 0 ? { steps: inlineSteps } : {}),
      }),
    ]);
  };

  // Edge factory — keeps style/marker centralised.
  const mkEdge = (
    source: string,
    target: string,
    elementId: string,
    extra: Partial<FlowEdgeData>,
  ): Edge => ({
    id: uid(),
    source,
    target,
    type: "step",
    markerEnd: {
      type: "arrowclosed" as never,
      color: "var(--ink)",
      width: 18,
      height: 18,
    },
    style: { stroke: "var(--ink)", strokeWidth: 1.5 },
    data: {
      trigger: { kind: "element_clicked", elementId },
      ...extra,
    },
  });

  return (
    <FlowModuleContext.Provider value={module}>
    <WireContext.Provider value={wireApi}>
    <div className="flex flex-1 min-h-0">
      {/* LEFT — node palette */}
      <aside className="w-60 border-r border-rule bg-paper flex flex-col">
        <div className="px-4 py-3 border-b border-rule">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Nodes
          </div>
          <p className="text-[10px] text-ink-faint mt-0.5 normal-case tracking-normal">
            Drag onto the canvas or click to drop in.
          </p>
        </div>
        <NodePalette module={module} onAdd={addNode} />
      </aside>

      {/* CENTER — flow canvas */}
      <div className="flex-1 min-w-0 relative bg-rule/10">
        <FlowChrome />
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          edgesReconnectable
          reconnectRadius={24}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode={null}
          defaultEdgeOptions={{
            type: "step",
            markerEnd: { type: "arrowclosed", color: "var(--ink)", width: 18, height: 18 },
            style: { stroke: "var(--ink)", strokeWidth: 1.5 },
          }}
          connectionLineType={"smoothstep" as never}
          connectionLineStyle={{
            stroke: "var(--ink)",
            strokeWidth: 1.5,
            strokeDasharray: "4 4",
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--rule)" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) =>
              n.type === "trigger"
                ? "var(--ink)"
                : n.type === "condition"
                  ? "#d9a82e"
                  : "#4b8bc4"
            }
            maskColor="rgba(0,0,0,0.04)"
            className="bg-paper! border! border-rule!"
          />
        </ReactFlow>
        {rfNodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-ink-faint italic">
              ← Drag a node from the palette to start
            </p>
          </div>
        )}
        {rfNodes.length > 0 && rfEdges.length === 0 && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2">
            <div className="rounded border border-rule bg-paper/95 px-3 py-1.5 text-[11px] text-ink-muted shadow-sm">
              Drag from a node's right dot to another node's left dot to
              connect.
            </div>
          </div>
        )}
        {/* Floating utility bar */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="inline-flex rounded border border-rule bg-paper/95 shadow-sm overflow-hidden">
            <button
              onClick={undo}
              disabled={past.length === 0}
              title="Undo  (⌘Z)"
              className="px-2.5 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-rule/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-r border-rule"
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              disabled={future.length === 0}
              title="Redo  (⇧⌘Z)"
              className="px-2.5 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-rule/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↷ Redo
            </button>
          </div>
          <button
            onClick={autoLayout}
            disabled={rfNodes.length === 0}
            title="Auto-layout (rearrange nodes)"
            className="px-2.5 py-1.5 rounded border border-rule bg-paper/95 text-xs text-ink-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            ↹ Auto layout
          </button>
        </div>
      </div>

      {/* RIGHT — config of selected node */}
      <aside className="w-72 border-l border-rule bg-paper flex flex-col">
        <div className="px-4 py-3 border-b border-rule">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Config
          </div>
        </div>
        <div className="flex-1 overflow-auto px-4 py-4">
          {selectedButton ? (
            <ButtonWireConfig
              module={module}
              nodes={rfNodes}
              edges={rfEdges}
              source={selectedButton}
              onWire={(steps) =>
                wireButton(
                  selectedButton.pageNodeId,
                  selectedButton.elementId,
                  steps,
                )
              }
              onCreateComputed={(label) => {
                let newId = "";
                setModule((m) => {
                  const { module: next, computed } = addComputed(m, label);
                  newId = computed.id;
                  return next;
                });
                return newId;
              }}
              onClose={() => setSelectedButton(null)}
            />
          ) : selectedEdge ? (
            <EdgeConfig
              module={module}
              edge={selectedEdge}
              nodes={rfNodes}
              onChange={updateSelectedEdge}
              onDelete={deleteSelectedEdge}
            />
          ) : selected ? (
            <NodeConfig
              module={module}
              node={selected}
              onChange={updateSelected}
              onDelete={deleteSelected}
            />
          ) : (
            <p className="text-xs text-ink-faint italic">
              Select a node, edge, or button to edit its wire.
            </p>
          )}
        </div>
      </aside>
    </div>
    </WireContext.Provider>
    </FlowModuleContext.Provider>
  );
}

// ─── Palette ────────────────────────────────────────────────────────────────

function NodePalette({
  module,
  onAdd,
}: {
  module: Module;
  onAdd: (data: FlowNodeData) => void;
}) {
  const firstColl = module.collections[0];
  const firstField = firstColl?.fields[0];
  const firstScreen = module.screens[0];
  const firstModal = module.screens.find((s) => s.kind === "modal");

  const triggers: { label: string; data: FlowNodeData }[] = [
    {
      label: "Entry created",
      data: {
        kind: "trigger",
        trigger: {
          kind: "entry_created",
          collectionId: firstColl?.id ?? "",
        },
      },
    },
    {
      label: "Entry updated",
      data: {
        kind: "trigger",
        trigger: {
          kind: "entry_updated",
          collectionId: firstColl?.id ?? "",
        },
      },
    },
    {
      label: "Screen opened",
      data: {
        kind: "trigger",
        trigger: {
          kind: "screen_opened",
          screenId: firstScreen?.id ?? "",
        },
      },
    },
  ];

  const conditions: { label: string; data: FlowNodeData }[] = firstField
    ? [
        {
          label: "If field…",
          data: {
            kind: "condition",
            filter: {
              collectionId: firstColl!.id,
              fieldId: firstField.id,
              op: "truthy",
            },
          },
        },
      ]
    : [];

  // One palette item per screen — drops as a first-class page node. Actions
  // (toast, create_entry, navigate…) are configured *on edges* between pages,
  // so they aren't a palette section anymore.
  void firstModal;
  const pages: { screen: Module["screens"][number]; data: FlowNodeData }[] =
    module.screens.map((s) => ({
      screen: s,
      data: { kind: "page", screenId: s.id },
    }));

  return (
    <div className="flex-1 overflow-auto px-3 py-3 space-y-4 text-xs">
      <PagePaletteGroup
        module={module}
        items={pages}
        onAdd={onAdd}
      />
      <PaletteGroup
        title="Triggers"
        items={triggers}
        accent="var(--ink)"
        onAdd={onAdd}
      />
      <PaletteGroup
        title="Conditions"
        items={conditions}
        accent="#d9a82e"
        onAdd={onAdd}
      />
    </div>
  );
}

function PagePaletteGroup({
  module,
  items,
  onAdd,
}: {
  module: Module;
  items: { screen: Module["screens"][number]; data: FlowNodeData }[];
  onAdd: (data: FlowNodeData) => void;
}) {
  return (
    <section>
      <h3 className="text-[9px] uppercase tracking-[0.15em] text-ink-faint mb-1.5">
        Pages
      </h3>
      {items.length === 0 ? (
        <p className="text-[11px] text-ink-faint italic px-2">
          Add a screen on the Interface tab.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map(({ screen, data }) => (
            <li key={screen.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onAdd(data)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAdd(data);
                  }
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData(
                    "application/x-takda-node",
                    JSON.stringify(data),
                  );
                }}
                title={
                  screen.kind === "modal"
                    ? `Open ${screen.name} modal`
                    : `Go to ${screen.name}`
                }
                className="w-full text-left rounded border border-rule bg-paper p-1.5 text-ink-muted hover:text-ink hover:border-ink transition-colors cursor-grab active:cursor-grabbing focus:outline-none focus:border-ink"
                style={{ borderLeft: `3px solid #4b8bc4` }}
              >
                <PalettePageThumbnail screen={screen} module={module} />
                <div className="px-1 pt-1.5 pb-0.5 flex items-center justify-between gap-1">
                  <span className="text-[10px] truncate">{screen.name}</span>
                  <span className="text-[8px] uppercase tracking-widest text-ink-faint shrink-0">
                    {screen.kind}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PalettePageThumbnail({
  screen,
  module,
}: {
  screen: Module["screens"][number];
  module: Module;
}) {
  // Palette is narrow (~210px aside, minus padding) — cap at 180.
  const box = screenThumbBox(screen, 0.14, 180);
  return (
    <div className="flex justify-center">
      <div
        className="relative overflow-hidden rounded bg-paper border border-rule pointer-events-none"
        style={{ width: box.width, height: box.height }}
      >
        <div
          style={{
            transform: `scale(${box.contentScale})`,
            transformOrigin: "top left",
            width: `${100 / box.contentScale}%`,
          }}
        >
          <ContainerRenderer
            container={screen.root}
            module={module}
            selectedId={null}
            onSelect={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

function PaletteGroup({
  title,
  items,
  accent,
  onAdd,
}: {
  title: string;
  items: { label: string; data: FlowNodeData }[];
  accent: string;
  onAdd: (data: FlowNodeData) => void;
}) {
  return (
    <section>
      <h3 className="text-[9px] uppercase tracking-[0.15em] text-ink-faint mb-1.5">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i}>
            <button
              onClick={() => onAdd(item.data)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData(
                  "application/x-takda-node",
                  JSON.stringify(item.data),
                );
              }}
              className="w-full text-left rounded border border-rule bg-paper px-2.5 py-1.5 text-ink-muted hover:text-ink hover:border-ink transition-colors cursor-grab active:cursor-grabbing"
              style={{ borderLeft: `3px solid ${accent}` }}
            >
              + {item.label}
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-[11px] text-ink-faint italic px-2">
            Add a field first.
          </li>
        )}
      </ul>
    </section>
  );
}

// ─── Inspector (left) ───────────────────────────────────────────────────────

// One ordered piece of a button's onClick sequence. A `page` step ends the
// wire on a page/modal node; an `action` step wraps any non-navigation
// FlowAction (submit/compute/toast/create_entry).
type ButtonStep =
  | { type: "page"; pageNodeId: string }
  | { type: "action"; action: FlowAction };

// Per-step picker kind in the UI (drives which sub-config to render).
type ButtonStepKind =
  | "submit"
  | "compute"
  | "show_toast"
  | "create_entry"
  | "go_page"
  | "open_modal";

// ─── Helpers shared by ButtonWireConfig ─────────────────────────────────────

function stepKindOf(step: ButtonStep): ButtonStepKind {
  if (step.type === "page") {
    // Caller resolves page vs modal — we treat both as page for kind purposes
    // and refine using the resolved screen below.
    return "go_page";
  }
  const a = step.action;
  if (a.kind === "submit_entry") return "submit";
  if (a.kind === "compute") return "compute";
  if (a.kind === "show_toast") return "show_toast";
  if (a.kind === "create_entry") return "create_entry";
  if (a.kind === "open_modal") return "open_modal";
  if (a.kind === "navigate_screen") return "go_page";
  return "submit"; // fallback
}

/** Parse an existing wire (edge.steps + tail target) into the ordered list of
 *  ButtonSteps the UI works with. */
function edgeToSteps(
  edge: Edge,
  nodes: RFNode[],
  module: Module,
): ButtonStep[] {
  const out: ButtonStep[] = [];
  const data = edge.data as FlowEdgeData | undefined;
  for (const a of data?.steps ?? []) {
    if (a.kind === "navigate_screen" || a.kind === "open_modal") {
      const pn = nodes.find(
        (n) =>
          n.data.data.kind === "page" && n.data.data.screenId === a.screenId,
      );
      if (pn) out.push({ type: "page", pageNodeId: pn.id });
      else out.push({ type: "action", action: a });
    } else {
      out.push({ type: "action", action: a });
    }
  }
  const tail = nodes.find((n) => n.id === edge.target);
  if (tail) {
    if (tail.data.data.kind === "page") {
      out.push({ type: "page", pageNodeId: tail.id });
    } else if (tail.data.data.kind === "action") {
      out.push({ type: "action", action: tail.data.data.action });
    }
  }
  void module;
  return out;
}

function ButtonWireConfig({
  module,
  nodes,
  edges,
  source,
  onWire,
  onCreateComputed,
  onClose,
}: {
  module: Module;
  nodes: RFNode[];
  edges: Edge[];
  source: { pageNodeId: string; elementId: string };
  onWire: (steps: ButtonStep[]) => void;
  onCreateComputed: (label: string) => string;
  onClose: () => void;
}) {
  const sourceNode = nodes.find((n) => n.id === source.pageNodeId);
  const sourceScreen =
    sourceNode?.data.data.kind === "page"
      ? module.screens.find(
          (s) =>
            sourceNode.data.data.kind === "page" &&
            s.id === sourceNode.data.data.screenId,
        )
      : undefined;
  const buttonEl = sourceScreen
    ? flattenButtons(sourceScreen.root).find((b) => b.id === source.elementId)
    : undefined;
  const buttonLabel =
    (buttonEl?.config?.text as string | undefined) ||
    (buttonEl?.config?.label as string | undefined) ||
    "Button";

  const wiredEdge = edges.find((e) => {
    if (e.source !== source.pageNodeId) return false;
    const d = e.data as FlowEdgeData | undefined;
    return (
      d?.trigger?.kind === "element_clicked" &&
      d.trigger.elementId === source.elementId
    );
  });

  const initialSteps: ButtonStep[] = wiredEdge
    ? edgeToSteps(wiredEdge, nodes, module)
    : [];

  const [steps, setSteps] = useState<ButtonStep[]>(initialSteps);

  // Re-sync local state when the user picks a different button.
  useEffect(() => {
    setSteps(initialSteps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.pageNodeId, source.elementId]);

  const commit = (next: ButtonStep[]) => {
    setSteps(next);
    onWire(next);
  };

  const updateStep = (idx: number, next: ButtonStep) => {
    const arr = steps.slice();
    arr[idx] = next;
    commit(arr);
  };
  const removeStep = (idx: number) =>
    commit(steps.filter((_, i) => i !== idx));
  const addStep = (step: ButtonStep) => commit([...steps, step]);
  const moveStep = (idx: number, delta: -1 | 1) => {
    const j = idx + delta;
    if (j < 0 || j >= steps.length) return;
    const arr = steps.slice();
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    commit(arr);
  };

  // Default step factory used by the add-step picker.
  const makeDefaultStep = (kind: ButtonStepKind): ButtonStep | null => {
    if (kind === "submit") return { type: "action", action: { kind: "submit_entry" } };
    if (kind === "show_toast")
      return {
        type: "action",
        action: { kind: "show_toast", message: "", tone: "info" },
      };
    if (kind === "create_entry") {
      const cid = module.collections[0]?.id ?? "";
      if (!cid) return null;
      return {
        type: "action",
        action: { kind: "create_entry", collectionId: cid, values: {} },
      };
    }
    if (kind === "compute") {
      const target = module.computed?.[0]?.id ?? "";
      if (!target) return null;
      return {
        type: "action",
        action: {
          kind: "compute",
          inputs: [],
          targetComputedId: target,
        },
      };
    }
    if (kind === "go_page" || kind === "open_modal") {
      const wantModal = kind === "open_modal";
      const cand = nodes.find((n) => {
        if (n.id === source.pageNodeId) return false;
        if (n.data.data.kind !== "page") return false;
        const screen = module.screens.find(
          (s) => s.id === (n.data.data as { kind: "page"; screenId: string }).screenId,
        );
        return screen?.kind === (wantModal ? "modal" : "page");
      });
      if (!cand) return null;
      return { type: "page", pageNodeId: cand.id };
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Button
          </div>
          <div className="text-sm font-medium text-ink truncate" title={buttonLabel}>
            {buttonLabel}
          </div>
          {sourceScreen && (
            <div className="text-[10px] text-ink-faint mt-0.5">
              on {sourceScreen.name}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[10px] text-ink-faint hover:text-ink shrink-0"
        >
          ✕
        </button>
      </header>

      {steps.length === 0 ? (
        <p className="text-[11px] text-ink-faint italic">
          No steps yet — add one below.
        </p>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                  {i === 0 ? "On click" : "Then"}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-ink-faint">
                  <button
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0}
                    className="hover:text-ink disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    className="hover:text-ink disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeStep(i)}
                    className="hover:text-ink"
                    title="Remove step"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <StepEditor
                step={step}
                module={module}
                nodes={nodes}
                sourcePageNodeId={source.pageNodeId}
                onChange={(s) => updateStep(i, s)}
                onCreateComputed={onCreateComputed}
              />
            </li>
          ))}
        </ol>
      )}

      <AddStepButton
        module={module}
        nodes={nodes}
        sourcePageNodeId={source.pageNodeId}
        onAdd={(kind) => {
          const step = makeDefaultStep(kind);
          if (step) addStep(step);
        }}
        hasSteps={steps.length > 0}
      />
    </div>
  );
}

// ─── Add-step picker ───────────────────────────────────────────────────────

function AddStepButton({
  module,
  nodes,
  sourcePageNodeId,
  onAdd,
  hasSteps,
}: {
  module: Module;
  nodes: RFNode[];
  sourcePageNodeId: string;
  onAdd: (kind: ButtonStepKind) => void;
  hasSteps: boolean;
}) {
  const [open, setOpen] = useState(false);
  const matchPage = (wantModal: boolean) =>
    nodes.some((n) => {
      if (n.id === sourcePageNodeId) return false;
      if (n.data.data.kind !== "page") return false;
      const screen = module.screens.find(
        (s) =>
          s.id ===
          (n.data.data as { kind: "page"; screenId: string }).screenId,
      );
      return screen?.kind === (wantModal ? "modal" : "page");
    });
  const hasNavTarget = matchPage(false);
  const hasModalTarget = matchPage(true);
  const hasCollections = module.collections.length > 0;
  const hasComputed = (module.computed?.length ?? 0) > 0;

  const options: {
    kind: ButtonStepKind;
    label: string;
    disabled?: boolean;
    hint?: string;
  }[] = [
    { kind: "submit", label: "Submit" },
    { kind: "go_page", label: "Go to page", disabled: !hasNavTarget, hint: !hasNavTarget ? "Add a page node first" : undefined },
    { kind: "open_modal", label: "Open modal", disabled: !hasModalTarget, hint: !hasModalTarget ? "Add a modal page node first" : undefined },
    { kind: "compute", label: "Compute", disabled: !hasComputed, hint: !hasComputed ? "Add a computed property first" : undefined },
    { kind: "show_toast", label: "Show toast" },
    { kind: "create_entry", label: "Create entry", disabled: !hasCollections, hint: !hasCollections ? "Add a collection first" : undefined },
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-[11px] text-ink-muted hover:text-ink border border-dashed border-rule hover:border-ink rounded px-3 py-2 transition-colors"
      >
        + {hasSteps ? "Then" : "Add step"}
      </button>
    );
  }

  return (
    <div className="rounded border border-rule p-2 space-y-1 bg-paper">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Add step
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-[10px] text-ink-faint hover:text-ink"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {options.map((opt) => (
          <button
            key={opt.kind}
            onClick={() => {
              if (opt.disabled) return;
              onAdd(opt.kind);
              setOpen(false);
            }}
            disabled={opt.disabled}
            title={opt.hint}
            className="text-[11px] px-2 py-1 rounded border border-rule text-ink-muted hover:border-ink hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Per-step editor ───────────────────────────────────────────────────────

function StepEditor({
  step,
  module,
  nodes,
  sourcePageNodeId,
  onChange,
  onCreateComputed,
}: {
  step: ButtonStep;
  module: Module;
  nodes: RFNode[];
  sourcePageNodeId: string;
  onChange: (next: ButtonStep) => void;
  onCreateComputed: (label: string) => string;
}) {
  const kind = stepKindOf(step);

  // Resolve current page-step kind into go_page vs open_modal based on target.
  let pageKind: "go_page" | "open_modal" = "go_page";
  if (step.type === "page") {
    const node = nodes.find((n) => n.id === step.pageNodeId);
    const nd = node?.data.data;
    const screen =
      nd && nd.kind === "page"
        ? module.screens.find((s) => s.id === nd.screenId)
        : undefined;
    pageKind = screen?.kind === "modal" ? "open_modal" : "go_page";
  }
  const effectiveKind: ButtonStepKind = step.type === "page" ? pageKind : kind;

  const pageTargets = (modal: boolean) =>
    nodes
      .filter(
        (n) => n.id !== sourcePageNodeId && n.data.data.kind === "page",
      )
      .map((n) => {
        const sid = n.data.data.kind === "page" ? n.data.data.screenId : "";
        const screen = module.screens.find((s) => s.id === sid);
        return { id: n.id, screen };
      })
      .filter((t) => t.screen && (modal ? t.screen.kind === "modal" : t.screen.kind !== "modal"));

  return (
    <div className="rounded border border-rule p-2 space-y-2 bg-paper">
      <div className="text-[11px] text-ink font-medium">
        {labelForStepKind(effectiveKind)}
      </div>

      {effectiveKind === "submit" && (
        <p className="text-[10px] text-ink-faint">
          Saves current page's bound inputs to their collections.
        </p>
      )}

      {effectiveKind === "go_page" && step.type === "page" && (
        <select
          value={step.pageNodeId}
          onChange={(e) => onChange({ type: "page", pageNodeId: e.target.value })}
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        >
          <option value="">— pick —</option>
          {pageTargets(false).map((t) => (
            <option key={t.id} value={t.id}>
              {t.screen!.name}
            </option>
          ))}
        </select>
      )}

      {effectiveKind === "open_modal" && step.type === "page" && (
        <select
          value={step.pageNodeId}
          onChange={(e) => onChange({ type: "page", pageNodeId: e.target.value })}
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        >
          <option value="">— pick —</option>
          {pageTargets(true).map((t) => (
            <option key={t.id} value={t.id}>
              {t.screen!.name}
            </option>
          ))}
        </select>
      )}

      {effectiveKind === "show_toast" &&
        step.type === "action" &&
        step.action.kind === "show_toast" && (
          <div className="space-y-2">
            <input
              value={step.action.message}
              onChange={(e) =>
                onChange({
                  type: "action",
                  action: { ...step.action, message: e.target.value } as FlowAction,
                })
              }
              placeholder="Message"
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            />
            <div className="grid grid-cols-3 gap-1">
              {(["info", "success", "warn"] as const).map((tone) => {
                const active = (step.action.kind === "show_toast" ? step.action.tone : undefined) ?? "info";
                return (
                  <button
                    key={tone}
                    onClick={() =>
                      onChange({
                        type: "action",
                        action: { ...step.action, tone } as FlowAction,
                      })
                    }
                    className={`text-[10px] px-2 py-1 rounded border transition-colors capitalize ${
                      active === tone
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {tone}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {effectiveKind === "create_entry" &&
        step.type === "action" &&
        step.action.kind === "create_entry" && (
          <select
            value={step.action.collectionId}
            onChange={(e) =>
              onChange({
                type: "action",
                action: {
                  kind: "create_entry",
                  collectionId: e.target.value,
                  values: {},
                },
              })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            {module.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

      {effectiveKind === "compute" &&
        step.type === "action" &&
        step.action.kind === "compute" && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <select
                value={step.action.targetComputedId}
                onChange={(e) =>
                  onChange({
                    type: "action",
                    action: {
                      ...(step.action as Extract<FlowAction, { kind: "compute" }>),
                      targetComputedId: e.target.value,
                    },
                  })
                }
                className="flex-1 bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
              >
                {(module.computed?.length ?? 0) === 0 && (
                  <option value="">— none —</option>
                )}
                {module.computed?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const label =
                    window.prompt("Computed property name", "New computed") ??
                    "";
                  if (!label.trim()) return;
                  const newId = onCreateComputed(label.trim());
                  if (newId) {
                    onChange({
                      type: "action",
                      action: {
                        ...(step.action as Extract<FlowAction, { kind: "compute" }>),
                        targetComputedId: newId,
                      },
                    });
                  }
                }}
                className="shrink-0 text-[10px] text-ink-muted hover:text-ink border border-rule rounded px-2 py-1 hover:border-ink transition-colors"
                title="Create a new computed property"
              >
                + New
              </button>
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              Use fields
            </div>
            <FieldMultiPicker
              module={module}
              value={step.action.inputs ?? []}
              onChange={(inputs) =>
                onChange({
                  type: "action",
                  action: {
                    ...(step.action as Extract<FlowAction, { kind: "compute" }>),
                    inputs,
                  },
                })
              }
            />
          </div>
        )}
    </div>
  );
}

function labelForStepKind(kind: ButtonStepKind): string {
  switch (kind) {
    case "submit":
      return "Submit";
    case "compute":
      return "Compute";
    case "show_toast":
      return "Show toast";
    case "create_entry":
      return "Create entry";
    case "go_page":
      return "Go to page";
    case "open_modal":
      return "Open modal";
  }
}

function NodeConfig({
  module,
  node,
  onChange,
  onDelete,
}: {
  module: Module;
  node: FlowNode;
  onChange: (next: FlowNodeData) => void;
  onDelete: () => void;
}) {
  const fit = useReactFlow().fitView;
  // Drop dependency on fit; just expose Delete for now.
  void fit;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          {node.data.kind}
        </span>
        <button
          onClick={onDelete}
          className="text-[10px] text-ink-faint hover:text-ink"
        >
          Delete
        </button>
      </header>

      {node.data.kind === "trigger" && (
        <TriggerConfig
          module={module}
          trigger={node.data.trigger}
          onChange={(t) => onChange({ kind: "trigger", trigger: t })}
        />
      )}
      {node.data.kind === "condition" && (
        <ConditionConfig
          module={module}
          filter={node.data.filter}
          onChange={(f) => onChange({ kind: "condition", filter: f })}
        />
      )}
      {node.data.kind === "action" && (
        <ActionConfig
          module={module}
          action={node.data.action}
          onChange={(a) => onChange({ kind: "action", action: a })}
        />
      )}
    </div>
  );
}

function TriggerConfig({
  module,
  trigger,
  onChange,
}: {
  module: Module;
  trigger: Trigger;
  onChange: (next: Trigger) => void;
}) {
  const KINDS: { id: Trigger["kind"]; label: string }[] = [
    { id: "entry_created", label: "Created" },
    { id: "entry_updated", label: "Updated" },
    { id: "screen_opened", label: "Open" },
  ];
  return (
    <div className="space-y-3">
      <ConfigRow label="When">
        <div className="grid grid-cols-3 gap-1">
          {KINDS.map((k) => {
            const active = trigger.kind === k.id;
            return (
              <button
                key={k.id}
                onClick={() => {
                  if (active) return;
                  if (k.id === "screen_opened") {
                    onChange({
                      kind: "screen_opened",
                      screenId: module.screens[0]?.id ?? "",
                    });
                  } else {
                    onChange({
                      kind: k.id,
                      collectionId: module.collections[0]?.id ?? "",
                    });
                  }
                }}
                className={`text-[11px] px-2 py-1.5 rounded border transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                }`}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      </ConfigRow>

      {trigger.kind !== "screen_opened" ? (
        <ConfigRow label="Collection">
          <select
            value={trigger.collectionId}
            onChange={(e) =>
              onChange({ ...trigger, collectionId: e.target.value })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            {module.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </ConfigRow>
      ) : (
        <ConfigRow label="Screen">
          <select
            value={trigger.screenId}
            onChange={(e) =>
              onChange({ kind: "screen_opened", screenId: e.target.value })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            {module.screens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </ConfigRow>
      )}
    </div>
  );
}

function ConditionConfig({
  module,
  filter,
  onChange,
}: {
  module: Module;
  filter: FlowFilter;
  onChange: (next: FlowFilter) => void;
}) {
  const coll = module.collections.find((c) => c.id === filter.collectionId);
  const watchedField = coll?.fields.find((f) => f.id === filter.fieldId) ?? null;

  const OPS: { id: VisibilityOp; label: string; needsValue: boolean }[] = [
    { id: "equals", label: "Equals", needsValue: true },
    { id: "not_equals", label: "Not equals", needsValue: true },
    { id: "truthy", label: "Is set / on", needsValue: false },
    { id: "falsy", label: "Is empty / off", needsValue: false },
    { id: "gt", label: ">", needsValue: true },
    { id: "lt", label: "<", needsValue: true },
  ];
  const opSpec = OPS.find((o) => o.id === filter.op);

  return (
    <div className="space-y-3">
      <ConfigRow label="Collection">
        <select
          value={filter.collectionId}
          onChange={(e) => {
            const nextColl = module.collections.find(
              (c) => c.id === e.target.value,
            );
            onChange({
              ...filter,
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
      </ConfigRow>
      <ConfigRow label="Field">
        <select
          value={filter.fieldId}
          onChange={(e) => onChange({ ...filter, fieldId: e.target.value })}
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        >
          {coll?.fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </ConfigRow>
      <ConfigRow label="Op">
        <select
          value={filter.op}
          onChange={(e) =>
            onChange({ ...filter, op: e.target.value as VisibilityOp })
          }
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        >
          {OPS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </ConfigRow>
      {opSpec?.needsValue && watchedField && (
        <ConfigRow label="Value">
          {watchedField.type === "select" ? (
            <select
              value={(filter.value as string | undefined) ?? ""}
              onChange={(e) => onChange({ ...filter, value: e.target.value })}
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            >
              <option value="">— pick —</option>
              {(watchedField as SelectField).options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : watchedField.type === "boolean" ? (
            <select
              value={filter.value === true ? "true" : "false"}
              onChange={(e) =>
                onChange({ ...filter, value: e.target.value === "true" })
              }
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            >
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          ) : (
            <input
              type={watchedField.type === "number" ? "number" : "text"}
              value={filter.value === undefined ? "" : String(filter.value)}
              onChange={(e) =>
                onChange({
                  ...filter,
                  value:
                    watchedField.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            />
          )}
        </ConfigRow>
      )}
      <p className="text-[10px] text-ink-faint">
        Wire <span className="text-green-700">true</span> /{" "}
        <span className="text-orange-700">false</span> outputs to different
        actions.
      </p>
    </div>
  );
}

function ActionConfig({
  module,
  action,
  onChange,
}: {
  module: Module;
  action: FlowAction;
  onChange: (next: FlowAction) => void;
}) {
  const KINDS: { id: FlowAction["kind"]; label: string }[] = [
    { id: "show_toast", label: "Toast" },
    { id: "open_modal", label: "Open modal" },
    { id: "navigate_screen", label: "Go to" },
    { id: "create_entry", label: "Create entry" },
    { id: "compute", label: "Compute" },
    { id: "submit_entry", label: "Submit" },
  ];

  const switchKind = (kind: FlowAction["kind"]) => {
    let next: FlowAction;
    switch (kind) {
      case "show_toast":
        next = { kind, message: "Done!", tone: "info" };
        break;
      case "open_modal": {
        const m = module.screens.find((s) => s.kind === "modal");
        next = { kind, screenId: m?.id ?? "" };
        break;
      }
      case "navigate_screen": {
        const s = module.screens.find((s) => s.kind !== "modal");
        next = { kind, screenId: s?.id ?? "" };
        break;
      }
      case "create_entry":
        next = {
          kind,
          collectionId: module.collections[0]?.id ?? "",
          values: {},
        };
        break;
      case "compute":
        next = {
          kind,
          inputs: [],
          targetComputedId: module.computed?.[0]?.id ?? "",
        };
        break;
      case "submit_entry":
        next = { kind };
        break;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <ConfigRow label="Kind">
        <select
          value={action.kind}
          onChange={(e) => switchKind(e.target.value as FlowAction["kind"])}
          className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
        >
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </ConfigRow>

      {action.kind === "show_toast" && (
        <>
          <ConfigRow label="Message">
            <input
              value={action.message}
              onChange={(e) =>
                onChange({ ...action, message: e.target.value })
              }
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            />
          </ConfigRow>
          <ConfigRow label="Tone">
            <div className="grid grid-cols-3 gap-1">
              {(["info", "success", "warn"] as const).map((tone) => {
                const active = (action.tone ?? "info") === tone;
                return (
                  <button
                    key={tone}
                    onClick={() => onChange({ ...action, tone })}
                    className={`text-[11px] px-2 py-1 rounded border capitalize transition-colors ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {tone}
                  </button>
                );
              })}
            </div>
          </ConfigRow>
        </>
      )}

      {(action.kind === "open_modal" || action.kind === "navigate_screen") && (
        <ConfigRow label="Screen">
          <select
            value={action.screenId}
            onChange={(e) =>
              onChange({ ...action, screenId: e.target.value })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            <option value="">— pick —</option>
            {module.screens
              .filter((s) =>
                action.kind === "open_modal"
                  ? s.kind === "modal"
                  : s.kind !== "modal",
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </ConfigRow>
      )}

      {action.kind === "create_entry" && (
        <ConfigRow label="Collection">
          <select
            value={action.collectionId}
            onChange={(e) =>
              onChange({ ...action, collectionId: e.target.value, values: {} })
            }
            className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
          >
            {module.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </ConfigRow>
      )}

      {action.kind === "compute" && (
        <>
          <ConfigRow label="Assign to">
            <select
              value={action.targetComputedId}
              onChange={(e) =>
                onChange({ ...action, targetComputedId: e.target.value })
              }
              className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
            >
              {(module.computed?.length ?? 0) === 0 && (
                <option value="">— none —</option>
              )}
              {module.computed?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </ConfigRow>
          <ConfigRow label="Use fields">
            <FieldMultiPicker
              module={module}
              value={action.inputs ?? []}
              onChange={(inputs) => onChange({ ...action, inputs })}
            />
          </ConfigRow>
        </>
      )}
    </div>
  );
}

/** Toggleable list of every field across all collections. Returns the picks
 *  as `{ collectionId, fieldId }` pairs in the order they were checked. */
function FieldMultiPicker({
  module,
  value,
  onChange,
}: {
  module: Module;
  value: { collectionId: string; fieldId: string }[];
  onChange: (next: { collectionId: string; fieldId: string }[]) => void;
}) {
  const picked = new Set(value.map((v) => `${v.collectionId}::${v.fieldId}`));
  const toggle = (collectionId: string, fieldId: string) => {
    const key = `${collectionId}::${fieldId}`;
    if (picked.has(key)) {
      onChange(
        value.filter((v) => !(v.collectionId === collectionId && v.fieldId === fieldId)),
      );
    } else {
      onChange([...value, { collectionId, fieldId }]);
    }
  };

  if (module.collections.length === 0) {
    return (
      <p className="text-[10px] text-ink-faint italic">
        No collections yet — add fields on the Schema tab.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-auto">
      {module.collections.map((c) => (
        <div key={c.id}>
          <div className="text-[9px] uppercase tracking-widest text-ink-faint mb-1">
            {c.name}
          </div>
          <div className="flex flex-wrap gap-1">
            {c.fields.length === 0 && (
              <span className="text-[10px] text-ink-faint italic">No fields</span>
            )}
            {c.fields.map((f) => {
              const key = `${c.id}::${f.id}`;
              const on = picked.has(key);
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(c.id, f.id)}
                  className={`text-[10px] rounded border px-1.5 py-0.5 transition-colors font-mono ${
                    on
                      ? "border-ink bg-ink text-paper"
                      : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                  title={`${f.label} (${f.type})`}
                >
                  {f.key}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfigRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-faint mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

// Avoid unused-warning for FlowEdge import while we develop.
type _Edge = FlowEdge;

// ─── Edge inspector ─────────────────────────────────────────────────────────

function EdgeConfig({
  module,
  edge,
  nodes,
  onChange,
  onDelete,
}: {
  module: Module;
  edge: Edge;
  nodes: RFNode[];
  onChange: (next: FlowEdgeData) => void;
  onDelete: () => void;
}) {
  const data = (edge.data as FlowEdgeData | undefined) ?? {};
  const sourceNode = nodes.find((n) => n.id === edge.source) ?? null;
  const targetNode = nodes.find((n) => n.id === edge.target) ?? null;
  const sourceIsPage = sourceNode?.data.data.kind === "page";
  const targetIsPage = targetNode?.data.data.kind === "page";

  const sourceScreenId =
    sourceNode?.data.data.kind === "page"
      ? sourceNode.data.data.screenId
      : undefined;
  const srcScreen: Screen | undefined = sourceScreenId
    ? module.screens.find((s) => s.id === sourceScreenId)
    : undefined;

  const targetScreenId =
    targetNode?.data.data.kind === "page"
      ? targetNode.data.data.screenId
      : undefined;
  const tgtScreen = targetScreenId
    ? module.screens.find((s) => s.id === targetScreenId)
    : undefined;

  const elements: MElement[] = srcScreen
    ? flattenElements(srcScreen.root)
    : [];
  // Only show interactive elements as trigger candidates.
  const triggerableElements = elements.filter((el) =>
    ["button", "text_input", "long_text_input", "number_input", "boolean_toggle", "select_input", "relation_picker", "file_input", "date_input"].includes(el.type),
  );

  const trigger = data.trigger;
  const steps = data.steps ?? [];

  const setTrigger = (next: EdgeTrigger | undefined) => {
    onChange({ ...data, trigger: next });
  };
  const setSteps = (next: FlowAction[]) => {
    onChange({ ...data, steps: next });
  };
  const setTransition = (t: "navigate" | "modal" | undefined) => {
    onChange({ ...data, transition: t });
  };

  const sourceLabel = sourceNode
    ? sourceIsPage
      ? `Page · ${srcScreen?.name ?? "—"}`
      : sourceNode.data.label
    : "—";
  const targetLabel = targetNode
    ? targetIsPage
      ? `${tgtScreen?.kind === "modal" ? "Modal" : "Page"} · ${tgtScreen?.name ?? "—"}`
      : targetNode.data.label
    : "—";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Edge
        </span>
        <button
          onClick={onDelete}
          className="text-[10px] text-ink-faint hover:text-ink"
        >
          Delete
        </button>
      </header>

      <div className="text-[11px] text-ink-muted leading-snug">
        <div><span className="text-ink-faint">From</span> {sourceLabel}</div>
        <div><span className="text-ink-faint">To</span> {targetLabel}</div>
      </div>

      {sourceIsPage && (
        <ConfigRow label="Triggered by">
          {triggerableElements.length === 0 ? (
            <p className="text-[11px] text-ink-faint italic">
              No interactive elements on this page.
            </p>
          ) : (
            <>
              <select
                value={trigger?.kind ?? "auto"}
                onChange={(e) => {
                  const k = e.target.value;
                  if (k === "auto") {
                    setTrigger(undefined);
                    return;
                  }
                  // Preserve element id if already set; otherwise pick first.
                  const elementId =
                    trigger?.elementId ?? triggerableElements[0]?.id ?? "";
                  setTrigger({
                    kind: k as EdgeTrigger["kind"],
                    elementId,
                  });
                }}
                className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm"
              >
                <option value="auto">— page load (no trigger) —</option>
                <option value="element_clicked">Element click</option>
                <option value="element_submitted">Element submit</option>
              </select>
              {trigger && (
                <select
                  value={trigger.elementId}
                  onChange={(e) =>
                    setTrigger({ ...trigger, elementId: e.target.value })
                  }
                  className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-1 text-sm mt-2"
                >
                  <option value="">— pick element —</option>
                  {triggerableElements.map((el) => (
                    <option key={el.id} value={el.id}>
                      {elementLabel(el)}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </ConfigRow>
      )}

      {targetIsPage && (
        <ConfigRow label="Transition">
          <div className="grid grid-cols-2 gap-1">
            {(["navigate", "modal"] as const).map((mode) => {
              const inferred = tgtScreen?.kind === "modal" ? "modal" : "navigate";
              const effective = data.transition ?? inferred;
              const active = effective === mode;
              return (
                <button
                  key={mode}
                  onClick={() =>
                    setTransition(mode === inferred ? undefined : mode)
                  }
                  className={`text-[11px] px-2 py-1.5 rounded border capitalize transition-colors ${
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-rule text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {mode === "navigate" ? "Go to page" : "Open as modal"}
                </button>
              );
            })}
          </div>
        </ConfigRow>
      )}

      <ConfigRow label="Steps (before transition)">
        <ul className="space-y-1.5">
          {steps.map((step, i) => (
            <li
              key={i}
              className="border border-rule rounded px-2 py-1.5 bg-paper space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <select
                  value={step.kind}
                  onChange={(e) => {
                    const kind = e.target.value as FlowAction["kind"];
                    const next = makeStep(kind, module);
                    const arr = steps.slice();
                    arr[i] = next;
                    setSteps(arr);
                  }}
                  className="bg-transparent border-b border-rule focus:border-ink outline-none py-0.5 text-[11px] flex-1"
                >
                  <option value="show_toast">Show toast</option>
                  <option value="create_entry">Create entry</option>
                </select>
                <button
                  onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  title="Remove step"
                  className="text-[10px] text-ink-faint hover:text-ink"
                >
                  ✕
                </button>
              </div>
              {step.kind === "show_toast" && (
                <input
                  value={step.message}
                  onChange={(e) => {
                    const arr = steps.slice();
                    arr[i] = { ...step, message: e.target.value };
                    setSteps(arr);
                  }}
                  placeholder="Toast message"
                  className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-0.5 text-[11px]"
                />
              )}
              {step.kind === "create_entry" && (
                <select
                  value={step.collectionId}
                  onChange={(e) => {
                    const arr = steps.slice();
                    arr[i] = {
                      ...step,
                      collectionId: e.target.value,
                      values: {},
                    };
                    setSteps(arr);
                  }}
                  className="w-full bg-transparent border-b border-rule focus:border-ink outline-none py-0.5 text-[11px]"
                >
                  {module.collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ul>
        <button
          onClick={() => setSteps([...steps, makeStep("show_toast", module)])}
          className="mt-2 w-full text-[11px] px-2 py-1 rounded border border-dashed border-rule text-ink-muted hover:text-ink hover:border-ink transition-colors"
        >
          + Add step
        </button>
      </ConfigRow>
    </div>
  );
}

function makeStep(kind: FlowAction["kind"], module: Module): FlowAction {
  switch (kind) {
    case "show_toast":
      return { kind, message: "", tone: "info" };
    case "create_entry":
      return {
        kind,
        collectionId: module.collections[0]?.id ?? "",
        values: {},
      };
    case "open_modal":
      return { kind, screenId: module.screens.find((s) => s.kind === "modal")?.id ?? "" };
    case "navigate_screen":
      return { kind, screenId: module.screens.find((s) => s.kind !== "modal")?.id ?? "" };
    case "compute":
      return {
        kind,
        inputs: [],
        targetComputedId: module.computed?.[0]?.id ?? "",
      };
    case "submit_entry":
      return { kind };
  }
}

// ─── TAKDA theme overrides for xyflow chrome ─────────────────────────────────
// xyflow's default Controls / MiniMap / selection use a generic blue palette;
// these overrides restyle them in TAKDA's paper/ink editorial tones.

function FlowChrome() {
  return (
    <style>{`
      .react-flow__controls {
        box-shadow: none !important;
        border: 1px solid var(--rule);
        border-radius: 6px;
        overflow: hidden;
        background: var(--paper);
      }
      .react-flow__controls-button {
        background: var(--paper);
        border-bottom: 1px solid var(--rule);
        color: var(--ink-muted);
        width: 28px;
        height: 28px;
      }
      .react-flow__controls-button:last-child { border-bottom: none; }
      .react-flow__controls-button:hover {
        background: rgb(from var(--rule) r g b / 0.4);
        color: var(--ink);
      }
      .react-flow__controls-button svg { fill: currentColor; }

      .react-flow__minimap {
        border-radius: 6px;
        box-shadow: none !important;
      }
      .react-flow__minimap-mask {
        fill: rgb(0 0 0 / 0.04);
      }

      .react-flow__edge-path { transition: stroke 0.15s; }
      .react-flow__edge:hover .react-flow__edge-path { stroke-width: 2.5 !important; }
      .react-flow__edge.selected .react-flow__edge-path { stroke-width: 2.5 !important; }

      .react-flow__handle {
        transition: transform 0.1s, box-shadow 0.1s;
      }
      .react-flow__handle:hover {
        transform: scale(1.25);
        box-shadow: 0 0 0 4px rgb(from var(--ink) r g b / 0.08);
      }
      .react-flow__handle-connecting { background: var(--ink) !important; }

      .react-flow__connection-path {
        stroke: var(--ink);
        stroke-width: 1.5;
        stroke-dasharray: 4 4;
      }

      .react-flow__selection {
        background: rgb(from var(--ink) r g b / 0.06);
        border: 1px dashed var(--ink-faint);
      }

      .react-flow__node.selected > div { box-shadow: 0 0 0 2px var(--ink); border-radius: 6px; }

      .react-flow__attribution { display: none; }
    `}</style>
  );
}
