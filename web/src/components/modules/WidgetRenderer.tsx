"use client";

import React from 'react';
import type {
  WidgetDefinition, WidgetElement, WidgetElementConfig,
  WidgetRowJustify, WidgetRowAlign, WidgetSpan,
} from '@/types/ui-builder';
import { resolveBlockAppearance } from '@/lib/styleResolver';
import type { ComputedProperty } from '@/types/module-creator';
import type { SchemaField, ModuleEntry } from '@/services/modules.service';
import {
  computeStat, formatStat, getDailyBuckets, groupByField,
} from '@/lib/moduleCompute';

// ── Layout maps ───────────────────────────────────────────────────────────────

const JUSTIFY_CLASS: Record<WidgetRowJustify, string> = {
  start: 'justify-start', center: 'justify-center', end: 'justify-end',
  between: 'justify-between', around: 'justify-around',
};
const ALIGN_CLASS: Record<WidgetRowAlign, string> = {
  top: 'items-start', middle: 'items-center', bottom: 'items-end', stretch: 'items-stretch',
};
const SPAN_CLASS: Record<WidgetSpan, string> = {
  1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3',
};
const MAX_WIDTH: Record<number, string> = {
  1: 'max-w-[220px]', 2: 'max-w-[440px]', 3: 'max-w-full',
};
const SPACER_H = { sm: 8, md: 16, lg: 32 } as const;
const DONUT_COLORS = ['var(--brand)', '#6366f1', '#f59e0b', '#22c55e', '#ef4444'];

// ── Shared element props ──────────────────────────────────────────────────────

interface ElemProps {
  config:        WidgetElementConfig;
  entries:       ModuleEntry[];
  computedProps: ComputedProperty[];
  schema:        SchemaField[];
  accentColor:   string;
  onAddEntry?:   () => void;
}

// ── Individual element renderers ──────────────────────────────────────────────

function StatCardEl({ config, entries, computedProps, accentColor }: ElemProps) {
  if (config.type !== 'stat_card') return null;
  const prop    = computedProps.find(p => p.key === config.computed_key);
  const value   = prop ? computeStat(prop, entries) : null;
  const display = prop ? formatStat(value, prop) : '—';
  const unit    = config.unit ?? prop?.unit;
  return (
    <div className="flex flex-col gap-0.5 p-3">
      <p className="text-[9px] text-text-tertiary uppercase tracking-widest truncate">
        {config.label ?? prop?.label ?? 'Stat'}
      </p>
      <div className="flex items-baseline gap-1">
        <span
          className="text-2xl font-medium"
          style={{ color: value !== null && value !== 0 ? accentColor : 'var(--text-primary)' }}
        >
          {display}
        </span>
        {unit && <span className="text-[10px] text-text-tertiary">{unit}</span>}
      </div>
    </div>
  );
}

function BarChartEl({ config, entries, computedProps, accentColor }: ElemProps) {
  if (config.type !== 'bar_chart') return null;
  const prop    = computedProps.find(p => p.key === config.computed_key);
  const buckets = getDailyBuckets(entries, prop?.source_field, prop?.type ?? 'count', 7);
  const max     = Math.max(...buckets, 1);
  return (
    <div className="flex flex-col gap-1 p-2 pb-1.5">
      <div className="flex items-end gap-0.5 h-12">
        {buckets.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max((v / max) * 100, 2)}%`,
              backgroundColor: `${accentColor}${i === 6 ? 'ff' : '55'}`,
            }}
          />
        ))}
      </div>
      <p className="text-[9px] text-text-tertiary/60 text-center">Last 7 days</p>
    </div>
  );
}

function LineChartEl({ config, entries, computedProps, accentColor }: ElemProps) {
  if (config.type !== 'line_chart') return null;
  const prop = computedProps.find(p => p.key === config.computed_key);
  const pts  = getDailyBuckets(entries, prop?.source_field, prop?.type ?? 'count', 7);
  const max  = Math.max(...pts, 1);
  const W = 100; const H = 40;
  const xs = pts.map((_, i) => (i / Math.max(pts.length - 1, 1)) * W);
  const ys = pts.map(v => H - (v / max) * H * 0.85);
  const d  = pts.map((_, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return (
    <div className="flex flex-col gap-1 px-2 pb-1.5 pt-2">
      <svg width="100%" height="40" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={d} fill="none" stroke={accentColor} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-[9px] text-text-tertiary/60 text-center">Last 7 days</p>
    </div>
  );
}

function DonutChartEl({ config, entries, accentColor }: ElemProps) {
  if (config.type !== 'donut_chart') return null;
  const colors = [accentColor, ...DONUT_COLORS.slice(1)];
  const groups = groupByField(entries, config.field_key, config.aggregation);
  const total  = groups.reduce((s, g) => s + g.value, 0) || 1;
  const r = 14; const cx = 20; const cy = 20;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;
  return (
    <div className="flex items-center gap-2 p-2">
      <svg width="44" height="44" viewBox="0 0 40 40" className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--background-tertiary)" strokeWidth="5" />
        {groups.length === 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-primary)" strokeWidth="5" />
        )}
        {groups.slice(0, 5).map((g, i) => {
          const arc = (g.value / total) * circ;
          const offset = -(cumulative - circ * 0.25);
          cumulative += arc;
          return (
            <circle
              key={g.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="5"
              strokeDasharray={`${arc} ${circ}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="flex flex-col gap-0.5 min-w-0">
        {groups.slice(0, 4).map((g, i) => (
          <div key={g.label} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[9px] text-text-secondary truncate">{g.label}</span>
          </div>
        ))}
        {groups.length === 0 && <span className="text-[9px] text-text-tertiary">No data</span>}
      </div>
    </div>
  );
}

function ProgressRingEl({ config, entries, computedProps, accentColor }: ElemProps) {
  if (config.type !== 'progress_ring') return null;
  const prop  = computedProps.find(p => p.key === config.computed_key);
  const value = prop ? (computeStat(prop, entries) ?? 0) : 0;
  const goal  = config.goal ?? prop?.goal_value ?? 100;
  const pct   = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
  const r = 14; const cx = 20; const cy = 20;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-0.5 p-2">
      <svg width="44" height="44" viewBox="0 0 40 40">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--background-tertiary)" strokeWidth="4" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={accentColor} strokeWidth="4"
          strokeDasharray={`${circ * pct / 100} ${circ}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="7"
          fill="var(--text-primary)" fontWeight="500">
          {Math.round(pct)}%
        </text>
      </svg>
      {prop && <p className="text-[9px] text-text-tertiary/60 truncate">{prop.label}</p>}
    </div>
  );
}

function ProgressBarEl({ config, entries, computedProps, accentColor }: ElemProps) {
  if (config.type !== 'progress_bar') return null;
  const prop    = computedProps.find(p => p.key === config.computed_key);
  const value   = prop ? (computeStat(prop, entries) ?? 0) : 0;
  const goal    = config.goal ?? prop?.goal_value ?? 100;
  const pct     = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
  const display = prop ? formatStat(value, prop) : String(Math.round(value));
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2">
      <div className="flex justify-between">
        <span className="text-[9px] text-text-tertiary truncate">{prop?.label ?? 'Progress'}</span>
        <span className="text-[9px] font-medium" style={{ color: accentColor }}>{display}</span>
      </div>
      <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: accentColor }} />
      </div>
      <p className="text-[9px] text-text-tertiary/50">{Math.round(pct)}% of goal</p>
    </div>
  );
}

function TextEl({ config }: ElemProps) {
  if (config.type !== 'text') return null;
  const sizeClass = config.size === 'lg' ? 'text-base' : config.size === 'sm' ? 'text-[11px]' : 'text-sm';
  return (
    <p
      className={`${sizeClass} px-3 py-2 text-text-primary`}
      style={{ fontWeight: config.weight ?? 400, color: config.color ?? undefined }}
    >
      {config.content}
    </p>
  );
}

function EntryListEl({ config, entries, schema }: ElemProps) {
  if (config.type !== 'entry_list') return null;
  const showFields = config.show_fields;
  const recent     = entries.slice(0, config.limit ?? 5);
  const [primary, secondary] = showFields;
  if (!primary) return null;
  return (
    <div className="flex flex-col divide-y divide-border-primary/40">
      {recent.length === 0 && (
        <p className="text-[11px] text-text-tertiary px-3 py-2.5">No entries yet</p>
      )}
      {recent.map(e => (
        <div key={e.id} className="flex items-center justify-between px-3 py-1.5 gap-2">
          <span className="text-xs text-text-primary truncate">
            {e.data[primary] !== undefined ? String(e.data[primary]) : '—'}
          </span>
          {secondary && e.data[secondary] !== undefined && (
            <span className="text-[11px] text-text-tertiary shrink-0">{String(e.data[secondary])}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ActionButtonEl({ config, accentColor, onAddEntry }: ElemProps) {
  if (config.type !== 'action_button') return null;
  return (
    <div className="px-3 py-2">
      <button
        type="button"
        onClick={onAddEntry}
        className={`w-full text-xs font-semibold py-2 px-4 rounded-xl transition-all ${
          config.style === 'primary'
            ? 'text-white hover:opacity-90'
            : 'border border-border-primary text-text-primary hover:bg-background-tertiary'
        }`}
        style={config.style === 'primary' ? { backgroundColor: accentColor } : undefined}
      >
        {config.label}
      </button>
    </div>
  );
}

// ── Element dispatcher ────────────────────────────────────────────────────────

function renderElement(props: ElemProps): React.ReactNode {
  switch (props.config.type) {
    case 'stat_card':     return <StatCardEl {...props} />;
    case 'bar_chart':     return <BarChartEl {...props} />;
    case 'line_chart':    return <LineChartEl {...props} />;
    case 'donut_chart':   return <DonutChartEl {...props} />;
    case 'progress_ring': return <ProgressRingEl {...props} />;
    case 'progress_bar':  return <ProgressBarEl {...props} />;
    case 'text':          return <TextEl {...props} />;
    case 'divider':       return <hr className="border-border-primary mx-3 my-1" />;
    case 'spacer':        return <div style={{ height: SPACER_H[props.config.size] }} />;
    case 'entry_list':    return <EntryListEl {...props} />;
    case 'action_button': return <ActionButtonEl {...props} />;
    default:              return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

interface WidgetRendererProps {
  definition:      WidgetDefinition;
  schema:          SchemaField[];
  computedProps:   ComputedProperty[];
  entries:         ModuleEntry[];
  accentColor:     string;
  colSpan?:        number;
  computedValues?: Record<string, unknown>;
  onAddEntry?:     () => void;
}

export function WidgetRenderer({
  definition, schema, computedProps, entries, accentColor,
  colSpan = 2, computedValues = {}, onAddEntry,
}: WidgetRendererProps) {
  const maxW = MAX_WIDTH[colSpan] ?? 'max-w-[440px]';

  if (definition.rows.length === 0) {
    return <p className="text-xs text-text-tertiary px-3 py-2">Widget not configured.</p>;
  }

  return (
    <div className={`${maxW} flex flex-col gap-2`}>
      {definition.rows.map(row => {
        const rowAppear = resolveBlockAppearance(row.appearance, 'web', accentColor, computedValues);
        return (
          <div
            key={row.id}
            className={`grid grid-cols-3 gap-2 ${JUSTIFY_CLASS[row.justify]} ${ALIGN_CLASS[row.align]} ${rowAppear.className}`}
            style={rowAppear.style}
          >
            {row.elements.map((el: WidgetElement) => {
              const elAppear = resolveBlockAppearance(el.appearance, 'web', accentColor, computedValues);
              return (
                <div
                  key={el.id}
                  className={`${SPAN_CLASS[el.span]} bg-background-secondary border border-border-primary rounded-xl overflow-hidden ${elAppear.className}`}
                  style={elAppear.style}
                >
                  {renderElement({ config: el.config, entries, computedProps, schema, accentColor, onAddEntry })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
