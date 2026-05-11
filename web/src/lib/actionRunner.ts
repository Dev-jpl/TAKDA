"use client";

import { evaluate } from 'mathjs';
import type { ModuleAction, ActionStep } from '@/types/module-creator';
import type { ModuleEntry } from '@/services/modules.service';
import { createModuleEntry, updateModuleEntry, deleteModuleEntry } from '@/services/modules.service';

// ── Run context ───────────────────────────────────────────────────────────────

export interface ActionRunContext {
  moduleDefId:      string;
  hubId:            string;
  userId:           string;
  entry?:           ModuleEntry;                 // current entry (on_entry_saved)
  computedValues?:  Record<string, unknown>;
  refs?:            Record<string, unknown>;      // results from compute steps
  onFeedback?:      (msg: string, style?: 'success' | 'warning' | 'error' | 'info') => void;
  onEntryCreated?:  (e: ModuleEntry) => void;
  onEntryUpdated?:  (e: ModuleEntry) => void;
  onEntryDeleted?:  (id: string) => void;
  onNavigate?:      (target: string) => void;
}

// ── Expression / value resolver ───────────────────────────────────────────────

function buildScope(ctx: ActionRunContext): Record<string, unknown> {
  const entryData = ctx.entry?.data ?? {};
  return {
    // entry.* fields (e.g. entry.calories)
    entry: entryData,
    // computed.* values (e.g. computed.cal_today)
    computed: ctx.computedValues ?? {},
    // refs.* — from previous compute steps
    refs: ctx.refs ?? {},
    // spread entry fields at root level too (shorthand: just `calories`)
    ...entryData,
    ...(ctx.computedValues ?? {}),
    ...(ctx.refs ?? {}),
  };
}

function resolveValue(expr: string, ctx: ActionRunContext): unknown {
  if (!expr) return expr;
  const s = String(expr).trim();

  // Special functions
  if (s === 'now()') return new Date().toISOString();
  if (s === 'today()') return new Date().toLocaleDateString('en-CA');
  if (s === 'auto') return undefined;

  // Try mathjs expression evaluation
  try {
    const scope = buildScope(ctx);
    const result = evaluate(s, scope);
    return result;
  } catch {
    // Not a math expression — return as literal string
    return s;
  }
}

// Interpolate {{variable}} placeholders in a string
function interpolate(template: string, ctx: ActionRunContext): string {
  const scope = buildScope(ctx);
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const parts = path.trim().split('.');
    let val: unknown = scope;
    for (const p of parts) {
      val = (val as Record<string, unknown>)?.[p];
      if (val === undefined) break;
    }
    return val !== undefined ? String(val) : `{{${path}}}`;
  });
}

// ── Step executors ────────────────────────────────────────────────────────────

async function execCompute(step: ActionStep, ctx: ActionRunContext): Promise<void> {
  const { variable_name, expression } = step.config as { variable_name?: string; expression?: string };
  if (!variable_name || !expression) return;
  try {
    const scope  = buildScope(ctx);
    const result = evaluate(expression, scope);
    if (!ctx.refs) ctx.refs = {};
    ctx.refs[variable_name] = result;
  } catch {
    if (!ctx.refs) ctx.refs = {};
    ctx.refs[variable_name] = null;
  }
}

async function execMutateCreate(step: ActionStep, ctx: ActionRunContext): Promise<void> {
  const { mappings } = step.config as { collection?: string; mappings?: Record<string, string> };
  if (!mappings) return;
  const data: Record<string, unknown> = {};
  for (const [field, expr] of Object.entries(mappings)) {
    const val = resolveValue(expr, ctx);
    if (val !== undefined && val !== '') data[field] = val;
  }
  const entry = await createModuleEntry(ctx.moduleDefId, data as any, ctx.userId, ctx.hubId);
  window.dispatchEvent(new Event('takda:data_updated'));
  ctx.onEntryCreated?.(entry);
}

async function execMutateUpdate(step: ActionStep, ctx: ActionRunContext): Promise<void> {
  const { mappings } = step.config as { mappings?: Record<string, string> };
  const entryId = ctx.entry?.id;
  if (!entryId || !mappings) return;
  const data: Record<string, unknown> = {};
  for (const [field, expr] of Object.entries(mappings)) {
    const val = resolveValue(expr, ctx);
    if (val !== undefined) data[field] = val;
  }
  const entry = await updateModuleEntry(ctx.moduleDefId, entryId, data as any, ctx.userId, ctx.hubId);
  window.dispatchEvent(new Event('takda:data_updated'));
  ctx.onEntryUpdated?.(entry);
}

async function execMutateDelete(step: ActionStep, ctx: ActionRunContext): Promise<void> {
  const rawId = (step.config as { entry_id?: string }).entry_id ?? 'entry.id';
  const entryId = String(resolveValue(rawId, ctx) ?? ctx.entry?.id ?? '');
  if (!entryId) return;
  await deleteModuleEntry(entryId);
  window.dispatchEvent(new Event('takda:data_updated'));
  ctx.onEntryDeleted?.(entryId);
}

async function execUiShow(step: ActionStep, ctx: ActionRunContext): Promise<void> {
  const { message = '', color = 'info' } = step.config as {
    message?: string; color?: 'brand' | 'success' | 'warning' | 'error' | 'info';
  };
  const resolved = interpolate(message, ctx);
  const style = color === 'brand' ? 'info' : (color as 'success' | 'warning' | 'error' | 'info');
  ctx.onFeedback?.(resolved, style);
}

async function execNavigate(step: ActionStep, ctx: ActionRunContext): Promise<void> {
  const { target = '' } = step.config as { target?: string };
  if (target) ctx.onNavigate?.(target);
}

async function execConditional(step: ActionStep, ctx: ActionRunContext, actions: ModuleAction[]): Promise<void> {
  const { left = '', operator = '=', right = '' } = step.config as {
    left?: string; operator?: string; right?: string;
    then_steps?: ActionStep[]; else_steps?: ActionStep[];
  };

  let leftVal: unknown;
  let rightVal: unknown;
  try {
    leftVal  = resolveValue(left,  ctx);
    rightVal = resolveValue(right, ctx);
  } catch {
    leftVal  = left;
    rightVal = right;
  }

  let conditionMet = false;
  try {
    const l = Number(leftVal);
    const r = Number(rightVal);
    if (!isNaN(l) && !isNaN(r)) {
      conditionMet =
        operator === '>'  ? l > r  :
        operator === '<'  ? l < r  :
        operator === '>=' ? l >= r :
        operator === '<=' ? l <= r :
        operator === '!=' ? l !== r :
        /* = == */          l === r;
    } else {
      conditionMet = String(leftVal) === String(rightVal);
    }
  } catch { /* keep false */ }

  const branch = conditionMet
    ? (step.config as any).then_steps as ActionStep[] | undefined
    : (step.config as any).else_steps  as ActionStep[] | undefined;

  if (branch?.length) {
    await runSteps(branch, ctx, actions);
  }
}

async function execNotifyAly(step: ActionStep, ctx: ActionRunContext): Promise<void> {
  const { message = '' } = step.config as { message?: string };
  // On web, store in sessionStorage so the next Aly message picks it up
  if (!message) return;
  const resolved = interpolate(message, ctx);
  try {
    const existing = JSON.parse(sessionStorage.getItem('aly:action_context') ?? '[]');
    existing.push(resolved);
    sessionStorage.setItem('aly:action_context', JSON.stringify(existing.slice(-10)));
  } catch { /* ignore */ }
}

// ── Step router ───────────────────────────────────────────────────────────────

async function runStep(step: ActionStep, ctx: ActionRunContext, actions: ModuleAction[]): Promise<void> {
  switch (step.type) {
    case 'compute':        return execCompute(step, ctx);
    case 'mutate_create':  return execMutateCreate(step, ctx);
    case 'mutate_update':  return execMutateUpdate(step, ctx);
    case 'mutate_delete':  return execMutateDelete(step, ctx);
    case 'ui_show':        return execUiShow(step, ctx);
    case 'ui_navigate':    return execNavigate(step, ctx);
    case 'conditional':    return execConditional(step, ctx, actions);
    case 'notify_aly':     return execNotifyAly(step, ctx);
    default:               break;
  }
}

async function runSteps(
  steps: ActionStep[],
  ctx: ActionRunContext,
  actions: ModuleAction[],
): Promise<void> {
  for (const step of steps) {
    await runStep(step, { ...ctx }, actions);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run a single action by its full definition.
 */
export async function runAction(
  action: ModuleAction,
  ctx: ActionRunContext,
  allActions: ModuleAction[] = [],
): Promise<void> {
  const runCtx: ActionRunContext = { ...ctx, refs: {} };
  await runSteps(action.steps, runCtx, allActions);
}

/**
 * Run an action by ID, looked up from the definition's web_actions list.
 */
export async function runActionById(
  actionId: string,
  actions: ModuleAction[],
  ctx: ActionRunContext,
): Promise<void> {
  const action = actions.find(a => a.id === actionId);
  if (!action) return;
  await runAction(action, ctx, actions);
}

/**
 * Fire all actions matching a given trigger type (e.g. 'on_entry_saved').
 */
export async function fireActionsByTrigger(
  trigger: string,
  actions: ModuleAction[],
  ctx: ActionRunContext,
): Promise<void> {
  const matching = actions.filter(a => a.trigger === trigger);
  for (const action of matching) {
    await runAction(action, ctx, actions);
  }
}
