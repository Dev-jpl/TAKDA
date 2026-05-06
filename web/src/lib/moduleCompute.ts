import type { ComputedProperty } from '@/types/module-creator';
import type { ModuleEntry } from '@/services/modules.service';

export function filterByWindow(entries: ModuleEntry[], window: string | undefined): ModuleEntry[] {
  const now   = new Date();
  const today = now.toLocaleDateString('en-CA');
  switch (window) {
    case 'today': return entries.filter(e => e.created_at.slice(0, 10) === today);
    case 'week':
    case 'last_7d': {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return entries.filter(e => new Date(e.created_at) >= cutoff);
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return entries.filter(e => new Date(e.created_at) >= first);
    }
    case 'last_30d': {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return entries.filter(e => new Date(e.created_at) >= cutoff);
    }
    default: return entries;
  }
}

export function safeEvalFormula(expression: string, data: Record<string, unknown>): number | null {
  try {
    const vars = Object.entries(data)
      .filter(([k]) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k))
      .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
      .join('\n');
    // eslint-disable-next-line no-new-func
    const result = new Function(`${vars}\nreturn (${expression});`)();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch { return null; }
}

export function computeStat(prop: ComputedProperty, entries: ModuleEntry[]): number | null {
  const windowed = filterByWindow(entries, prop.window);
  const field    = prop.source_field;
  switch (prop.type) {
    case 'sum': {
      if (!field) return windowed.length;
      return windowed.reduce((s, e) => s + (Number(e.data[field]) || 0), 0);
    }
    case 'avg': {
      if (!field) return null;
      const vals = windowed.map(e => Number(e.data[field])).filter(v => !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    case 'count': return windowed.length;
    case 'min': {
      if (!field) return null;
      const vals = windowed.map(e => Number(e.data[field])).filter(v => !isNaN(v));
      return vals.length ? Math.min(...vals) : null;
    }
    case 'max': {
      if (!field) return null;
      const vals = windowed.map(e => Number(e.data[field])).filter(v => !isNaN(v));
      return vals.length ? Math.max(...vals) : null;
    }
    case 'formula': {
      if (!prop.expression) return null;
      const latest = windowed[windowed.length - 1];
      if (!latest) return null;
      return safeEvalFormula(prop.expression, latest.data as Record<string, unknown>);
    }
    case 'threshold': {
      if (!field) return windowed.length > 0 ? Number(windowed[windowed.length - 1]?.data[field ?? '']) : null;
      const latest = windowed[windowed.length - 1];
      return latest ? (Number(latest.data[field]) || null) : null;
    }
    default: return null;
  }
}

export function formatStat(value: number | null, prop: ComputedProperty): string {
  if (value === null) return '—';
  switch (prop.format) {
    case 'percent':  return `${Math.round(value)}%`;
    case 'decimal':  return value.toFixed(prop.precision ?? 1);
    default:         return Math.round(value).toLocaleString();
  }
}

export function getThresholdStatus(value: number, prop: ComputedProperty): 'green' | 'yellow' | 'red' | null {
  if (!prop.thresholds?.length) return null;
  const sorted = [...prop.thresholds].sort((a, b) => a.value - b.value);
  for (const t of sorted) {
    if (value <= t.value) return t.status;
  }
  return sorted[sorted.length - 1]?.status ?? null;
}

export const THRESHOLD_COLORS: Record<string, string> = {
  green:  '#22c55e',
  yellow: '#f59e0b',
  red:    '#ef4444',
};

export function getDailyBuckets(
  entries: ModuleEntry[],
  field: string | undefined,
  type: string,
  days: number,
): number[] {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const date    = new Date(now.getTime() - (days - 1 - i) * 86_400_000);
    const dateStr = date.toLocaleDateString('en-CA');
    const dayEntries = entries.filter(e => e.created_at.slice(0, 10) === dateStr);
    if (type === 'count' || !field) return dayEntries.length;
    if (type === 'avg') {
      const vals = dayEntries.map(e => Number(e.data[field])).filter(v => !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    return dayEntries.reduce((s, e) => s + (Number(e.data[field]) || 0), 0);
  });
}

export function groupByField(
  entries: ModuleEntry[],
  fieldKey: string,
  aggregation: 'count' | 'sum',
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const val  = String(e.data[fieldKey] ?? 'Other');
    const curr = map.get(val) ?? 0;
    map.set(val, aggregation === 'count' ? curr + 1 : curr + (Number(e.data[fieldKey]) || 0));
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}
