/**
 * actionRunner.js — React Native action step executor
 *
 * Mirrors the web's actionRunner.ts but uses React Native APIs:
 * - No sessionStorage → uses a module-level queue for notify_aly context
 * - No window.dispatchEvent → uses a simple callback pattern
 * - Alert for ui_show (toast style handled by caller via onFeedback)
 */

import { Alert } from 'react-native'
import { API_URL } from '../services/apiConfig'
import { invalidatePrefix } from '../services/offlineCache'

// ── Pending Aly context (drained by next chat message) ────────────────────────
const _alyContextQueue = []

export function drainAlyContext() {
  const msgs = [..._alyContextQueue]
  _alyContextQueue.length = 0
  return msgs
}

// ── Expression / interpolation helpers ───────────────────────────────────────

function buildScope(ctx) {
  const entryData = ctx.entry?.data ?? {}
  return {
    ...entryData,
    ...(ctx.computedValues ?? {}),
    ...(ctx.refs ?? {}),
    entry:    entryData,
    computed: ctx.computedValues ?? {},
    refs:     ctx.refs ?? {},
  }
}

function interpolate(template, ctx) {
  const scope = buildScope(ctx)
  return String(template).replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const parts = path.trim().split('.')
    let val = scope
    for (const p of parts) { val = val?.[p]; if (val === undefined) break }
    return val !== undefined ? String(val) : `{{${path}}}`
  })
}

function resolveValue(expr, ctx) {
  if (!expr) return expr
  const s = String(expr).trim()
  if (s === 'now()')   return new Date().toISOString()
  if (s === 'today()') return new Date().toLocaleDateString('en-CA')
  if (s === 'auto')    return undefined

  // Try to resolve from scope
  const scope = buildScope(ctx)
  // Simple dot-path lookup: "entry.calories" → scope.entry.calories
  const parts = s.split('.')
  if (parts.length > 1) {
    let val = scope
    for (const p of parts) { val = val?.[p]; if (val === undefined) break }
    if (val !== undefined) return val
  }
  // Try as a direct key
  if (scope[s] !== undefined) return scope[s]
  // Return as literal
  return s
}

// ── Step executors ────────────────────────────────────────────────────────────

async function execCompute(step, ctx) {
  const { variable_name, expression } = step.config
  if (!variable_name || !expression) return
  try {
    // Simple arithmetic evaluation — safe: only numbers and basic operators
    const scope = buildScope(ctx)
    // Replace variable references with their numeric values
    let expr = expression
    for (const [k, v] of Object.entries(scope)) {
      if (typeof v === 'number') expr = expr.replace(new RegExp(`\\b${k}\\b`, 'g'), String(v))
    }
    // Evaluate safe arithmetic
    const safe = /^[\d\s+\-*/.(),]+$/.test(expr)
    // eslint-disable-next-line no-new-func
    const result = safe ? Function(`"use strict"; return (${expr})`)() : null
    if (!ctx.refs) ctx.refs = {}
    ctx.refs[variable_name] = result
  } catch {
    if (!ctx.refs) ctx.refs = {}
    ctx.refs[variable_name] = null
  }
}

async function execMutateCreate(step, ctx) {
  const { mappings } = step.config
  if (!mappings) return
  const data = {}
  for (const [field, expr] of Object.entries(mappings)) {
    const val = resolveValue(expr, ctx)
    if (val !== undefined && val !== '') data[field] = val
  }
  const defId = ctx.moduleDefId
  const res = await fetch(`${API_URL}/modules/${defId}/entries`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ user_id: ctx.userId, hub_id: ctx.hubId, data }),
  })
  if (!res.ok) throw new Error('Failed to create entry')
  const entry = await res.json()
  await invalidatePrefix(`entries:${defId}`)
  ctx.onEntryCreated?.(entry)
}

async function execMutateUpdate(step, ctx) {
  const { mappings } = step.config
  const entryId = ctx.entry?.id
  if (!entryId || !mappings) return
  const data = {}
  for (const [field, expr] of Object.entries(mappings)) {
    const val = resolveValue(expr, ctx)
    if (val !== undefined) data[field] = val
  }
  const defId = ctx.moduleDefId
  const res = await fetch(`${API_URL}/modules/${defId}/entries/${entryId}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ user_id: ctx.userId, hub_id: ctx.hubId, data }),
  })
  if (!res.ok) throw new Error('Failed to update entry')
  const entry = await res.json()
  await invalidatePrefix(`entries:${defId}`)
  ctx.onEntryUpdated?.(entry)
}

async function execMutateDelete(step, ctx) {
  const rawId = step.config.entry_id ?? 'entry.id'
  const entryId = String(resolveValue(rawId, ctx) ?? ctx.entry?.id ?? '')
  if (!entryId) return
  const res = await fetch(`${API_URL}/modules/entries/${entryId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete entry')
  await invalidatePrefix('entries:')
  ctx.onEntryDeleted?.(entryId)
}

async function execUiShow(step, ctx) {
  const { message = '', color = 'info' } = step.config
  const resolved = interpolate(message, ctx)
  if (ctx.onFeedback) {
    ctx.onFeedback(resolved, color)
  } else {
    Alert.alert('', resolved)
  }
}

async function execUiFeedback(step, ctx) {
  // Mobile-specific: haptic + animation
  // Haptic handled by caller via onFeedback with haptic flag
  const { haptic_type = 'success', message } = step.config
  if (message && ctx.onFeedback) {
    ctx.onFeedback(interpolate(String(message), ctx), haptic_type)
  }
}

async function execConditional(step, ctx, allActions) {
  const { left = '', operator = '=', right = '' } = step.config
  let lVal = resolveValue(left, ctx)
  let rVal = resolveValue(right, ctx)

  let met = false
  try {
    const l = Number(lVal), r = Number(rVal)
    if (!isNaN(l) && !isNaN(r)) {
      met = operator === '>'  ? l > r  :
            operator === '<'  ? l < r  :
            operator === '>=' ? l >= r :
            operator === '<=' ? l <= r :
            operator === '!=' ? l !== r :
                                l === r
    } else {
      met = String(lVal) === String(rVal)
    }
  } catch { /* keep false */ }

  const branch = met
    ? step.config.then_steps
    : step.config.else_steps

  if (branch?.length) {
    await runSteps(branch, { ...ctx }, allActions)
  }
}

async function execNotifyAly(step, ctx) {
  const { message = '' } = step.config
  const resolved = interpolate(message, ctx)
  if (resolved) _alyContextQueue.push(resolved)
}

// ── Step router ───────────────────────────────────────────────────────────────

async function runStep(step, ctx, allActions) {
  switch (step.type) {
    case 'compute':        return execCompute(step, ctx)
    case 'mutate_create':  return execMutateCreate(step, ctx)
    case 'mutate_update':  return execMutateUpdate(step, ctx)
    case 'mutate_delete':  return execMutateDelete(step, ctx)
    case 'ui_show':        return execUiShow(step, ctx)
    case 'ui_feedback':    return execUiFeedback(step, ctx)
    case 'conditional':    return execConditional(step, ctx, allActions)
    case 'notify_aly':     return execNotifyAly(step, ctx)
    default: break
  }
}

async function runSteps(steps, ctx, allActions) {
  for (const step of steps) {
    await runStep(step, { ...ctx }, allActions)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run a single action definition.
 *
 * @param {object} action   ModuleAction
 * @param {object} ctx      ActionRunContext
 * @param {array}  allActions  All actions in the module (for conditional branches)
 */
export async function runAction(action, ctx, allActions = []) {
  await runSteps(action.steps, { ...ctx, refs: {} }, allActions)
}

/**
 * Run an action by ID looked up from the actions list.
 */
export async function runActionById(actionId, actions, ctx) {
  const action = actions.find(a => a.id === actionId)
  if (action) await runAction(action, ctx, actions)
}

/**
 * Fire all actions matching a trigger type.
 */
export async function fireActionsByTrigger(trigger, actions, ctx) {
  for (const action of actions.filter(a => a.trigger === trigger)) {
    await runAction(action, ctx, actions)
  }
}
