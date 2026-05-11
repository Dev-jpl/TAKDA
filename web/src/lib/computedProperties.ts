"use client";

import { useMemo } from 'react';
import { evaluate } from 'mathjs';
import type { ComputedProperty } from '@/types/module-creator';
import type { ModuleEntry } from '@/services/modules.service';

// ── Window helpers ────────────────────────────────────────────────────────────

function filterByWindow(entries: ModuleEntry[], window?: string): ModuleEntry[] {
  const now = new Date();
  switch (window) {
    case 'today':
      return entries.filter(e => new Date(e.created_at).toDateString() === now.toDateString());
    case 'week':
    case 'last_7d':
      return entries.filter(e => new Date(e.created_at) >= new Date(now.getTime() - 7 * 86_400_000));
    case 'month':
      return entries.filter(e => {
        const d = new Date(e.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    case 'last_30d':
      return entries.filter(e => new Date(e.created_at) >= new Date(now.getTime() - 30 * 86_400_000));
    default:
      return entries;
  }
}

function getPreviousWindowEntries(entries: ModuleEntry[], window?: string): ModuleEntry[] {
  const now = new Date();
  switch (window) {
    case 'today': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return entries.filter(e => new Date(e.created_at).toDateString() === yesterday.toDateString());
    }
    case 'week':
    case 'last_7d': {
      const end   = now.getTime() - 7  * 86_400_000;
      const start = now.getTime() - 14 * 86_400_000;
      return entries.filter(e => { const t = new Date(e.created_at).getTime(); return t >= start && t < end; });
    }
    case 'month': {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return entries.filter(e => {
        const d = new Date(e.created_at);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });
    }
    case 'last_30d': {
      const end   = now.getTime() - 30 * 86_400_000;
      const start = now.getTime() - 60 * 86_400_000;
      return entries.filter(e => { const t = new Date(e.created_at).getTime(); return t >= start && t < end; });
    }
    default:
      return [];
  }
}

function numericValues(entries: ModuleEntry[], field: string): number[] {
  return entries
    .map(e => Number(e.data[field]))
    .filter(v => !isNaN(v));
}

// ── Main evaluator ────────────────────────────────────────────────────────────

export type ComputedResults = Record<string, unknown>;

export function evaluateComputedProperties(
  props: ComputedProperty[],
  entries: ModuleEntry[],
): ComputedResults {
  const results: ComputedResults = {};

  // Sort entries newest-first once
  const sorted = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const PASS1 = new Set(['sum', 'avg', 'min', 'max', 'count', 'streak']);

  for (const pass of [1, 2] as const) {
    for (const prop of props) {
      const isPass1Type = PASS1.has(prop.type);
      if (pass === 1 && !isPass1Type) continue;
      if (pass === 2 && isPass1Type)  continue;

      const windowed = filterByWindow(sorted, prop.window);
      const field    = prop.source_field ?? '';

      try {
        switch (prop.type) {

          case 'sum': {
            const vals = numericValues(windowed, field);
            results[prop.key] = vals.reduce((a, b) => a + b, 0);
            break;
          }

          case 'avg': {
            const vals = numericValues(windowed, field);
            results[prop.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
            break;
          }

          case 'min': {
            const vals = numericValues(windowed, field);
            results[prop.key] = vals.length ? Math.min(...vals) : null;
            break;
          }

          case 'max': {
            const vals = numericValues(windowed, field);
            results[prop.key] = vals.length ? Math.max(...vals) : null;
            break;
          }

          case 'count':
            results[prop.key] = windowed.length;
            break;

          case 'streak': {
            const dateSet = new Set(sorted.map(e => new Date(e.created_at).toDateString()));
            let streak = 0;
            const cursor = new Date();
            while (dateSet.has(cursor.toDateString())) {
              streak++;
              cursor.setDate(cursor.getDate() - 1);
            }
            results[prop.key] = streak;
            break;
          }

          case 'formula': {
            if (!prop.expression) { results[prop.key] = null; break; }
            const latest = sorted[0];
            if (!latest) { results[prop.key] = null; break; }
            // Scope: latest entry's raw data + already-evaluated computed values
            const scope = { ...latest.data, ...results };
            try {
              results[prop.key] = evaluate(prop.expression, scope);
            } catch {
              results[prop.key] = null;
            }
            break;
          }

          case 'progress': {
            // Source: sum of source_field over all entries, or a named computed key via expression
            let sourceVal: number;
            if (prop.source_field) {
              sourceVal = numericValues(sorted, prop.source_field).reduce((a, b) => a + b, 0);
            } else if (prop.expression) {
              sourceVal = Number(results[prop.expression] ?? 0);
            } else {
              results[prop.key] = null;
              break;
            }
            const goal = prop.goal_value ?? 0;
            if (!goal) { results[prop.key] = null; break; }
            results[prop.key] = Math.max(0, Math.min(1, sourceVal / goal));
            break;
          }

          case 'trend': {
            const currEntries = filterByWindow(sorted, prop.window);
            const prevEntries = getPreviousWindowEntries(sorted, prop.window);
            const f           = prop.source_field ?? '';
            const current     = numericValues(currEntries, f).reduce((a, b) => a + b, 0);
            const previous    = numericValues(prevEntries, f).reduce((a, b) => a + b, 0);
            const delta       = current - previous;
            results[prop.key] = {
              current, previous, delta,
              direction:      delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
              percent_change: previous !== 0 ? (delta / previous) * 100 : 0,
            };
            break;
          }

          case 'threshold': {
            const sourceVal = Number(results[field] ?? 0);
            let status: 'green' | 'yellow' | 'red' = 'green';
            const sorted_thresholds = [...(prop.thresholds ?? [])].sort((a, b) => a.value - b.value);
            for (const t of sorted_thresholds) {
              if (sourceVal <= t.value) { status = t.status; break; }
            }
            results[prop.key] = { value: sourceVal, status };
            break;
          }

          default:
            results[prop.key] = null;
        }
      } catch {
        results[prop.key] = null;
      }
    }
  }

  return results;
}

// ── React hook ────────────────────────────────────────────────────────────────

export function useComputedProperties(
  props: ComputedProperty[],
  entries: ModuleEntry[],
): ComputedResults {
  return useMemo(
    () => evaluateComputedProperties(props, entries),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props, entries],
  );
}

// ── Display formatter ─────────────────────────────────────────────────────────

export function formatComputedValue(value: unknown, prop: ComputedProperty): string {
  if (value === null || value === undefined) return '—';
  if (prop.type === 'trend') {
    const v = value as { direction: string; delta: number };
    const arrow = v.direction === 'up' ? '↑' : v.direction === 'down' ? '↓' : '→';
    return `${arrow} ${Math.abs(Math.round(v.delta))}${prop.unit ? ` ${prop.unit}` : ''}`;
  }
  if (prop.type === 'threshold') {
    const v = value as { value: number; status: string };
    const n = v.value;
    return `${Number.isInteger(n) ? n : n.toFixed(prop.precision ?? 1)}${prop.unit ? ` ${prop.unit}` : ''}`;
  }
  if (prop.type === 'progress') {
    return `${Math.round(Number(value) * 100)}%`;
  }
  const n = Number(value);
  if (isNaN(n)) return String(value);
  const suffix = prop.unit ? ` ${prop.unit}` : '';
  switch (prop.format) {
    case 'percent':  return `${Math.round(n)}%`;
    case 'decimal':  return n.toFixed(prop.precision ?? 1) + suffix;
    default:         return `${Number.isInteger(n) ? n : n.toFixed(prop.precision ?? 0)}${suffix}`;
  }
}
