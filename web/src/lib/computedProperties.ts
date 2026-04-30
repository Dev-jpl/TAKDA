import { useEffect, useMemo } from 'react';
import type {
  ComputedProperty, ComputedOperation, ComputedWindow, ModuleDefinitionV2,
} from '@/types/module-creator';
import type { ModuleEntry } from '@/services/modules.service';

// ── Window filter ─────────────────────────────────────────────────────────────

function isInWindow(createdAt: string, window: ComputedWindow): boolean {
  const d = new Date(createdAt);
  const now = new Date();
  const startOf = (unit: 'day' | 'week' | 'month') => {
    const s = new Date(now);
    if (unit === 'day')   { s.setHours(0, 0, 0, 0); }
    if (unit === 'week')  { s.setDate(s.getDate() - s.getDay()); s.setHours(0, 0, 0, 0); }
    if (unit === 'month') { s.setDate(1); s.setHours(0, 0, 0, 0); }
    return s;
  };
  switch (window) {
    case 'today':   return d >= startOf('day');
    case 'week':    return d >= startOf('week');
    case 'month':   return d >= startOf('month');
    case 'last_7d': return d >= new Date(now.getTime() - 7  * 86400000);
    case 'last_30d':return d >= new Date(now.getTime() - 30 * 86400000);
    case 'all':     return true;
    default:        return true;
  }
}

// ── Safe formula evaluator (no eval) ─────────────────────────────────────────

function safeEval(
  expr: string,
  vars: Record<string, number>,
): number {
  // Replace variable references (entry.field, computed.key)
  let e = expr.replace(/entry\.(\w+)/g, (_, k) => String(vars[`entry.${k}`] ?? 0));
  e = e.replace(/computed\.(\w+)/g, (_, k) => String(vars[`computed.${k}`] ?? 0));
  e = e.replace(/\b(\w+)\b/g, (m) => (m in vars ? String(vars[m]) : m));

  // Only allow numbers, operators, parentheses, spaces, and a small set of functions
  const safe = /^[\d\s+\-*/.(),]+$/.test(e.replace(/Math\.\w+/g, ''));
  if (!safe) return 0;

  try {
    // eslint-disable-next-line no-new-func
    return Number(new Function(`return (${e})`)());
  } catch {
    return 0;
  }
}

// ── Core evaluation ───────────────────────────────────────────────────────────

export type ComputedResults = Record<string, unknown>;

export function evaluateComputedProperties(
  computedProperties: ComputedProperty[],
  entries: ModuleEntry[],
  schemaKey = 'default',
): ComputedResults {
  const results: ComputedResults = {};

  for (const prop of computedProperties) {
    const relevant = prop.source_schema_key
      ? entries.filter(e => e.schema_key === prop.source_schema_key)
      : entries.filter(e => (e.schema_key ?? 'default') === schemaKey);

    const windowed = prop.window
      ? relevant.filter(e => isInWindow(e.created_at, prop.window!))
      : relevant;

    const values = windowed
      .map(e => Number(e.data[prop.source_field ?? '']))
      .filter(n => !isNaN(n));

    switch (prop.type as ComputedOperation) {
      case 'sum':   results[prop.key] = values.reduce((a, b) => a + b, 0); break;
      case 'avg':   results[prop.key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; break;
      case 'min':   results[prop.key] = values.length ? Math.min(...values) : 0; break;
      case 'max':   results[prop.key] = values.length ? Math.max(...values) : 0; break;
      case 'count': results[prop.key] = windowed.length; break;

      case 'streak': {
        const days = new Set(
          relevant.map(e => new Date(e.created_at).toDateString()),
        );
        let streak = 0;
        const cursor = new Date();
        while (days.has(cursor.toDateString())) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        }
        results[prop.key] = streak;
        break;
      }

      case 'formula': {
        if (!prop.expression) { results[prop.key] = 0; break; }
        const latest = relevant[0]?.data ?? {};
        const vars: Record<string, number> = {};
        for (const [k, v] of Object.entries(latest)) vars[`entry.${k}`] = Number(v);
        for (const [k, v] of Object.entries(results)) vars[`computed.${k}`] = Number(v);
        results[prop.key] = safeEval(prop.expression, vars);
        break;
      }

      case 'progress': {
        const sourceVal = Number(results[prop.source_field ?? ''] ?? 0);
        const goal = prop.goal_value ?? 1;
        results[prop.key] = Math.min(1, Math.max(0, sourceVal / goal));
        break;
      }

      case 'trend': {
        const curr = Number(results[prop.source_field ?? ''] ?? 0);
        // Simple: compare last two windows (approximate)
        const prevWindow = windowed.slice(Math.floor(windowed.length / 2));
        const prevVals = prevWindow.map(e => Number(e.data[prop.source_field ?? ''])).filter(n => !isNaN(n));
        const prev = prevVals.reduce((a, b) => a + b, 0);
        const delta = curr - prev;
        results[prop.key] = {
          current: curr,
          previous: prev,
          delta,
          direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
          percent_change: prev !== 0 ? (delta / prev) * 100 : 0,
        };
        break;
      }

      case 'threshold': {
        const val = Number(results[prop.source_field ?? ''] ?? 0);
        let status: 'green' | 'yellow' | 'red' = 'green';
        for (const t of prop.thresholds ?? []) {
          if (val <= t.value) { status = t.status; break; }
        }
        results[prop.key] = { value: val, status };
        break;
      }

      default:
        results[prop.key] = null;
    }
  }

  return results;
}

// ── React hook ────────────────────────────────────────────────────────────────

export function useComputedProperties(
  definition: ModuleDefinitionV2 | null,
  entries: ModuleEntry[],
  schemaKey = 'default',
): ComputedResults {
  return useMemo(
    () =>
      definition?.computed_properties?.length
        ? evaluateComputedProperties(definition.computed_properties, entries, schemaKey)
        : {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [definition?.computed_properties, entries, schemaKey],
  );
}

// ── Display formatter ─────────────────────────────────────────────────────────

export function formatComputedValue(
  value: unknown,
  prop: ComputedProperty,
): string {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  const precision = prop.precision ?? 0;
  const suffix = prop.unit ? ` ${prop.unit}` : '';

  switch (prop.format) {
    case 'percent':  return `${(n * 100).toFixed(precision)}%`;
    case 'decimal':  return n.toFixed(precision) + suffix;
    case 'duration': {
      const h = Math.floor(n / 60);
      const m = Math.round(n % 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    case 'status': {
      const s = (value as { status?: string })?.status ?? '—';
      return s;
    }
    default: return `${Number.isInteger(n) ? n : n.toFixed(precision)}${suffix}`;
  }
}
