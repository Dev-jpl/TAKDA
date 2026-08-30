import type { Element, Module, NumberField } from "./types";
import type { Entry } from "./entries";

export type ChartBucket = "day" | "week" | "month";
export type ChartAggregation = "count" | "sum";
export type ChartStyle = "bar" | "line" | "area" | "spark" | "donut" | "heatmap";

export interface ChartConfig {
  label?: string;
  collectionId?: string;
  aggregation?: ChartAggregation;
  fieldId?: string;
  bucket?: ChartBucket;
  range?: number; // number of buckets back from today (inclusive)
  suffix?: string;
  style?: ChartStyle;
  /** Field ID to group by for donut charts (must be select or multi_select). */
  groupBy?: string;
}

export interface ChartPoint {
  label: string;     // short display label (e.g. "Mon", "Jan", "W3")
  value: number;
  start: Date;
}

export function readChartConfig(element: Element): ChartConfig {
  return (element.config ?? {}) as ChartConfig;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  r.setDate(r.getDate() - r.getDay()); // Sunday-start
  return r;
}

function startOfMonth(d: Date): Date {
  const r = startOfDay(d);
  r.setDate(1);
  return r;
}

function addBuckets(d: Date, bucket: ChartBucket, n: number): Date {
  const r = new Date(d);
  if (bucket === "day") r.setDate(r.getDate() + n);
  else if (bucket === "week") r.setDate(r.getDate() + n * 7);
  else r.setMonth(r.getMonth() + n);
  return r;
}

function bucketStart(d: Date, bucket: ChartBucket): Date {
  if (bucket === "day") return startOfDay(d);
  if (bucket === "week") return startOfWeek(d);
  return startOfMonth(d);
}

function bucketLabel(d: Date, bucket: ChartBucket): string {
  if (bucket === "day") {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  if (bucket === "week") {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return d.toLocaleDateString(undefined, { month: "short" });
}

export function evaluateChart(
  module: Module,
  entries: Entry[],
  config: ChartConfig,
): { points: ChartPoint[]; suffix?: string } {
  const collection = module.collections.find(
    (c) => c.id === config.collectionId,
  );
  if (!collection) return { points: [] };

  const bucket = config.bucket ?? "day";
  const range = Math.max(1, Math.min(60, config.range ?? 7));
  const agg = config.aggregation ?? "count";

  const field =
    agg === "sum"
      ? collection.fields.find((f) => f.id === config.fieldId)
      : null;
  if (agg === "sum" && (!field || field.type !== "number")) return { points: [] };
  const suffix = field ? (field as NumberField).unit : undefined;

  const now = new Date();
  const lastBucket = bucketStart(now, bucket);
  // points[0] is the oldest, points[range-1] is the current bucket
  const points: ChartPoint[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const start = addBuckets(lastBucket, bucket, -i);
    points.push({ label: bucketLabel(start, bucket), value: 0, start });
  }

  const firstStart = points[0].start.getTime();
  const lastEnd = addBuckets(lastBucket, bucket, 1).getTime();

  for (const e of entries) {
    const t = Date.parse(e.createdAt);
    if (Number.isNaN(t) || t < firstStart || t >= lastEnd) continue;
    const eStart = bucketStart(new Date(t), bucket).getTime();
    const idx = points.findIndex((p) => p.start.getTime() === eStart);
    if (idx < 0) continue;
    if (agg === "count") {
      points[idx].value += 1;
    } else if (field) {
      const v = e.values[field.id];
      if (typeof v === "number") points[idx].value += v;
    }
  }

  return { points, suffix };
}

// ─── Donut: aggregate entries grouped by a select/multi-select field ────────

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
}

export function evaluateDonut(
  module: Module,
  entries: Entry[],
  config: ChartConfig,
): { slices: DonutSlice[]; total: number; suffix?: string } {
  const collection = module.collections.find(
    (c) => c.id === config.collectionId,
  );
  if (!collection) return { slices: [], total: 0 };
  const groupField = collection.fields.find((f) => f.id === config.groupBy);
  if (!groupField) return { slices: [], total: 0 };

  const agg = config.aggregation ?? "count";
  const valueField =
    agg === "sum"
      ? collection.fields.find((f) => f.id === config.fieldId)
      : null;
  if (agg === "sum" && (!valueField || valueField.type !== "number")) {
    return { slices: [], total: 0 };
  }
  const suffix = valueField ? (valueField as NumberField).unit : undefined;

  // Options index for human labels on select fields.
  const opts =
    groupField.type === "select" || groupField.type === "multi_select"
      ? groupField.options
      : [];
  const labelFor = (key: string) =>
    opts.find((o) => o.value === key)?.label ?? key;

  const map = new Map<string, number>();
  const add = (key: string, n: number) =>
    map.set(key, (map.get(key) ?? 0) + n);

  for (const e of entries) {
    const raw = e.values[groupField.id];
    const keys: string[] = Array.isArray(raw)
      ? raw.map(String)
      : raw === undefined || raw === null || raw === ""
        ? ["—"]
        : [String(raw)];
    const inc =
      agg === "count"
        ? 1
        : valueField && typeof e.values[valueField.id] === "number"
          ? (e.values[valueField.id] as number)
          : 0;
    for (const k of keys) add(k, inc);
  }

  const slices: DonutSlice[] = [...map.entries()]
    .map(([key, value]) => ({ key, label: labelFor(key), value }))
    .sort((a, b) => b.value - a.value);
  const total = slices.reduce((s, x) => s + x.value, 0);
  return { slices, total, suffix };
}

// ─── Heatmap: per-day intensity over a range ────────────────────────────────

export interface HeatmapCell {
  date: Date;
  value: number;
}

export function evaluateHeatmap(
  module: Module,
  entries: Entry[],
  config: ChartConfig,
): { cells: HeatmapCell[]; max: number; suffix?: string } {
  const collection = module.collections.find(
    (c) => c.id === config.collectionId,
  );
  if (!collection) return { cells: [], max: 0 };

  const agg = config.aggregation ?? "count";
  const field =
    agg === "sum"
      ? collection.fields.find((f) => f.id === config.fieldId)
      : null;
  if (agg === "sum" && (!field || field.type !== "number")) {
    return { cells: [], max: 0 };
  }
  const suffix = field ? (field as NumberField).unit : undefined;

  const days = Math.max(7, Math.min(365, config.range ?? 90));
  const today = startOfDay(new Date());
  const cells: HeatmapCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    cells.push({ date: addBuckets(today, "day", -i), value: 0 });
  }
  const indexByTime = new Map(cells.map((c, i) => [c.date.getTime(), i]));

  for (const e of entries) {
    const t = Date.parse(e.createdAt);
    if (Number.isNaN(t)) continue;
    const dayStart = startOfDay(new Date(t)).getTime();
    const idx = indexByTime.get(dayStart);
    if (idx === undefined) continue;
    if (agg === "count") {
      cells[idx].value += 1;
    } else if (field) {
      const v = e.values[field.id];
      if (typeof v === "number") cells[idx].value += v;
    }
  }
  const max = cells.reduce((m, c) => Math.max(m, c.value), 0);
  return { cells, max, suffix };
}
