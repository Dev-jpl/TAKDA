import type { Element, Module, NumberField } from "./types";
import type { Entry } from "./entries";

export type Aggregation = "count" | "sum" | "avg" | "min" | "max";
export type StatFilter = "all" | "today" | "this_week" | "this_month";

export interface StatConfig {
  label?: string;
  collectionId?: string;
  aggregation?: Aggregation;
  fieldId?: string;
  filter?: StatFilter;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function readStatConfig(element: Element): StatConfig {
  return (element.config ?? {}) as StatConfig;
}

export function applyFilter(entries: Entry[], filter?: StatFilter): Entry[] {
  if (!filter || filter === "all") return entries;
  const now = new Date();
  const start = new Date(now);
  if (filter === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (filter === "this_week") {
    start.setHours(0, 0, 0, 0);
    const day = start.getDay(); // 0 = Sun
    start.setDate(start.getDate() - day);
  } else if (filter === "this_month") {
    start.setHours(0, 0, 0, 0);
    start.setDate(1);
  }
  return entries.filter((e) => Date.parse(e.createdAt) >= start.getTime());
}

export function evaluateStat(
  module: Module,
  entries: Entry[],
  config: StatConfig,
): { value: number | null; suffix?: string } {
  const collection = module.collections.find(
    (c) => c.id === config.collectionId,
  );
  if (!collection) return { value: null };
  const filtered = applyFilter(entries, config.filter);
  const agg = config.aggregation ?? "count";

  if (agg === "count") return { value: filtered.length };

  const field = collection.fields.find((f) => f.id === config.fieldId);
  if (!field || field.type !== "number") return { value: null };
  const unit = (field as NumberField).unit;
  const values = filtered
    .map((e) => e.values[field.id])
    .filter((v): v is number => typeof v === "number");

  if (values.length === 0) return { value: 0, suffix: unit };

  switch (agg) {
    case "sum":
      return { value: values.reduce((a, b) => a + b, 0), suffix: unit };
    case "avg":
      return {
        value: values.reduce((a, b) => a + b, 0) / values.length,
        suffix: unit,
      };
    case "min":
      return { value: Math.min(...values), suffix: unit };
    case "max":
      return { value: Math.max(...values), suffix: unit };
  }
}

export function formatStat(
  value: number | null,
  config: StatConfig,
  suffixFromField?: string,
): string {
  if (value == null) return "—";
  const decimals =
    typeof config.decimals === "number" ? config.decimals : isInt(value) ? 0 : 1;
  const num = value.toFixed(decimals);
  const prefix = config.prefix ?? "";
  const suffix = config.suffix ?? suffixFromField ?? "";
  return `${prefix}${num}${suffix ? ` ${suffix}` : ""}`;
}

function isInt(n: number): boolean {
  return Math.abs(n - Math.round(n)) < 1e-9;
}

export const AGGREGATIONS: { id: Aggregation; label: string }[] = [
  { id: "count", label: "Count" },
  { id: "sum", label: "Sum" },
  { id: "avg", label: "Average" },
  { id: "min", label: "Min" },
  { id: "max", label: "Max" },
];

export const FILTERS: { id: StatFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
];
