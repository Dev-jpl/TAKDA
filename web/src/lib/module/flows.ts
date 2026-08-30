import type { Entry } from "./entries";
import type {
  EdgeTrigger,
  Flow,
  FlowAction,
  FlowEdge,
  FlowFilter,
  FlowGraph,
  FlowNode,
  Module,
  Screen,
  Trigger,
} from "./types";
import { evaluateVisibility } from "./validation";

/** Context passed to action handlers. Hosts the runtime-facing capabilities
 *  that flow actions need to execute (toast, navigate, create entries). */
export interface FlowRuntime {
  showToast: (message: string, tone?: "info" | "success" | "warn") => void;
  openModal: (screenId: string) => void;
  navigateScreen: (screenId: string) => void;
  createEntry: (collectionId: string, values: Record<string, unknown>) => void;
  /** Evaluate a computed property against the supplied field inputs.
   *  Implementation is host-provided; the runtime just dispatches. */
  compute: (params: {
    targetComputedId: string;
    inputs: { collectionId: string; fieldId: string }[];
  }) => void;
  /** Persist the current page's form state to its bound collections. */
  submit: () => void;
}

/** Pick the flows that match a given trigger event. */
export function flowsFor(
  module: Module,
  match: (t: Trigger) => boolean,
): Flow[] {
  if (!module.flows) return [];
  return module.flows.filter(
    (f) => f.enabled !== false && match(f.trigger),
  );
}

/** Resolve a filter against a context entry (e.g. the entry that just saved).
 *  When no entry is available (screen-opened triggers), filters that require
 *  field values fail closed. */
export function passesFilter(
  filter: FlowFilter | undefined,
  contextEntry: Entry | null,
): boolean {
  if (!filter) return true;
  if (!contextEntry || contextEntry.collectionId !== filter.collectionId) {
    return evaluateVisibility(
      { ...filter, value: filter.value as string | number | boolean | undefined },
      undefined,
    );
  }
  const value = contextEntry.values[filter.fieldId];
  return evaluateVisibility(filter, value);
}

/** Execute a flow's actions in order. Pure dispatch — the FlowRuntime side
 *  effects (toast / navigation / create) are provided by the caller. */
export function runFlow(
  flow: Flow,
  ctx: { entry?: Entry | null },
  runtime: FlowRuntime,
): void {
  if (!passesFilter(flow.filter, ctx.entry ?? null)) return;

  for (const action of flow.actions) {
    runAction(action, runtime);
  }
}

function runAction(action: FlowAction, runtime: FlowRuntime): void {
  switch (action.kind) {
    case "show_toast":
      runtime.showToast(action.message, action.tone);
      return;
    case "open_modal":
      runtime.openModal(action.screenId);
      return;
    case "navigate_screen":
      runtime.navigateScreen(action.screenId);
      return;
    case "create_entry":
      runtime.createEntry(action.collectionId, action.values);
      return;
    case "compute":
      runtime.compute({
        targetComputedId: action.targetComputedId,
        inputs: action.inputs,
      });
      return;
    case "submit_entry":
      runtime.submit();
      return;
  }
}

// ─── Graph walker ────────────────────────────────────────────────────────────
// Walks the visual flowGraph from triggering nodes. Conditions branch via
// edge.sourceHandle ("true" / "false"); plain action edges fall through.

interface WalkCtx {
  entry?: Entry | null;
  runtime: FlowRuntime;
  /** Guard against cycles. */
  seen: Set<string>;
}

function nodeMatchesTrigger(
  node: FlowNode,
  match: (t: Trigger) => boolean,
): boolean {
  return node.data.kind === "trigger" && match(node.data.trigger);
}

export function dispatchGraph(
  graph: FlowGraph,
  match: (t: Trigger) => boolean,
  ctx: { entry?: Entry | null; module?: Module },
  runtime: FlowRuntime,
): void {
  const triggerNodes = graph.nodes.filter((n) => nodeMatchesTrigger(n, match));
  for (const n of triggerNodes) {
    walk(
      graph,
      n.id,
      undefined,
      { entry: ctx.entry, runtime, seen: new Set() },
      ctx.module,
    );
  }
}

function walk(
  graph: FlowGraph,
  fromId: string,
  fromHandle: "true" | "false" | undefined,
  ctx: WalkCtx,
  module?: Module,
): void {
  // Follow edges leaving `fromId` whose handle matches `fromHandle` (or any
  // unconditional edge when `fromHandle` is undefined). Edges that carry a
  // `data.trigger` are user-driven (element clicks); they don't auto-fire from
  // a walk and are dispatched separately via dispatchEdgeTrigger.
  const out = graph.edges.filter(
    (e) =>
      e.source === fromId &&
      !e.data?.trigger &&
      (fromHandle === undefined ? !e.sourceHandle : e.sourceHandle === fromHandle),
  );
  for (const e of out) {
    if (ctx.seen.has(e.id)) continue;
    ctx.seen.add(e.id);
    traverseEdge(graph, e, ctx, module);
  }
}

function traverseEdge(
  graph: FlowGraph,
  edge: FlowEdge,
  ctx: WalkCtx,
  module: Module | undefined,
): void {
  // Run inline edge steps first (the "mini pills" on the line).
  if (edge.data?.steps) {
    for (const step of edge.data.steps) runAction(step, ctx.runtime);
  }
  const target = graph.nodes.find((n) => n.id === edge.target);
  if (!target) return;
  runNode(graph, target, ctx, module, edge);
}

function runNode(
  graph: FlowGraph,
  node: FlowNode,
  ctx: WalkCtx,
  module?: Module,
  incomingEdge?: FlowEdge,
): void {
  if (node.data.kind === "action") {
    runAction(node.data.action, ctx.runtime);
    walk(graph, node.id, undefined, ctx, module);
    return;
  }
  if (node.data.kind === "condition") {
    const passed = passesFilter(node.data.filter, ctx.entry ?? null);
    walk(graph, node.id, passed ? "true" : "false", ctx, module);
    return;
  }
  if (node.data.kind === "page") {
    // Pages are locations: arriving at a page navigates or opens it as a modal,
    // then stops. Outgoing page edges only fire on user interaction.
    const screenId = node.data.screenId;
    const mode =
      incomingEdge?.data?.transition ??
      inferTransition(module, screenId);
    if (mode === "modal") ctx.runtime.openModal(screenId);
    else ctx.runtime.navigateScreen(screenId);
    return;
  }
  // Trigger nodes only fire as entry points — ignore as targets.
}

function inferTransition(
  module: Module | undefined,
  screenId: string,
): "modal" | "navigate" {
  const screen: Screen | undefined = module?.screens.find(
    (s) => s.id === screenId,
  );
  return screen?.kind === "modal" ? "modal" : "navigate";
}

/** Dispatch an edge-level trigger — invoked by the runtime when a user
 *  interacts with an element on a page (e.g. button click). Finds edges whose
 *  `data.trigger` matches and traverses them. */
export function dispatchEdgeTrigger(
  graph: FlowGraph,
  match: (t: EdgeTrigger) => boolean,
  ctx: { entry?: Entry | null; module?: Module },
  runtime: FlowRuntime,
): number {
  const seen = new Set<string>();
  let fired = 0;
  for (const e of graph.edges) {
    if (!e.data?.trigger) continue;
    if (!match(e.data.trigger)) continue;
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    fired++;
    traverseEdge(graph, e, { entry: ctx.entry, runtime, seen }, ctx.module);
  }
  return fired;
}
