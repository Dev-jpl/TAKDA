"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon, CaretLeftIcon, CaretRightIcon, XIcon, TrashIcon,
} from '@phosphor-icons/react';
import type { HubViewDefinition, HubSection, WidgetDefinition } from '@/types/ui-builder';
import type { UIDefinition } from '@/types/ui-builder';
import type { ComputedProperty } from '@/types/module-creator';
import type { SchemaField, ModuleEntry } from '@/services/modules.service';
import { createModuleEntry, deleteModuleEntry } from '@/services/modules.service';
import { getThresholdStatus, THRESHOLD_COLORS } from '@/lib/moduleCompute';
import { formatComputedValue, evaluateComputedProperties } from '@/lib/computedProperties';
import { resolveBlockAppearance } from '@/lib/styleResolver';
import { WidgetRenderer } from './WidgetRenderer';
import { DynamicUIRenderer } from './DynamicUIRenderer';

// ── helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string { return new Date().toLocaleDateString('en-CA'); }

function formatNavDate(iso: string): string {
  const today     = todayISO();
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString('en-CA');
  if (iso === today)     return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function SectionStatCard({
  prop, rawValue, accentColor,
}: { prop: ComputedProperty; rawValue: unknown; accentColor: string }) {
  const display      = formatComputedValue(rawValue, prop);
  const numVal       = typeof rawValue === 'number' ? rawValue : null;
  const threshStatus = prop.type === 'threshold' && rawValue !== null
    ? getThresholdStatus((rawValue as any)?.value ?? 0, prop) : null;
  return (
    <div className="bg-background-primary border border-border-primary rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-0">
      <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest truncate">{prop.label}</p>
      <div className="flex items-baseline gap-1.5">
        {threshStatus && (
          <span className="w-2 h-2 rounded-full shrink-0 mb-0.5"
            style={{ backgroundColor: THRESHOLD_COLORS[threshStatus] }} />
        )}
        <span className="text-xl font-medium"
          style={threshStatus
            ? { color: THRESHOLD_COLORS[threshStatus] }
            : numVal !== null && numVal !== 0 ? { color: accentColor } : { color: 'var(--text-primary)' }}>
          {display}
        </span>
        {prop.unit && prop.type !== 'trend' && <span className="text-[10px] text-text-tertiary">{prop.unit}</span>}
      </div>
      {prop.window && prop.window !== 'all' && (
        <p className="text-[9px] text-text-tertiary/50">{prop.window.replace(/_/g, ' ')}</p>
      )}
    </div>
  );
}

// ── Date Nav ──────────────────────────────────────────────────────────────────

function DateNavSection({
  activeDate, setActiveDate,
}: { activeDate: string; setActiveDate: (d: string) => void }) {
  const today    = todayISO();
  const atToday  = activeDate >= today;

  const shift = (days: number) => {
    const d = new Date(activeDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setActiveDate(d.toLocaleDateString('en-CA'));
  };

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => shift(-1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all"
      >
        <CaretLeftIcon size={14} weight="bold" />
      </button>

      <button
        type="button"
        onClick={() => setActiveDate(today)}
        className="flex-1 text-center text-sm font-semibold text-text-primary hover:opacity-70 transition-opacity"
      >
        {formatNavDate(activeDate)}
      </button>

      <button
        type="button"
        onClick={() => shift(1)}
        disabled={atToday}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all disabled:opacity-30 disabled:pointer-events-none"
      >
        <CaretRightIcon size={14} weight="bold" />
      </button>
    </div>
  );
}

// ── Summary Bar ───────────────────────────────────────────────────────────────

function SummaryBarSection({
  config, computedProps, computedValues, accentColor,
}: {
  config: Extract<import('@/types/ui-builder').HubSectionConfig, { type: 'summary_bar' }>;
  computedProps: ComputedProperty[];
  computedValues: Record<string, unknown>;
  accentColor: string;
}) {
  const primaryProp = computedProps.find(p => p.key === config.primary_key);
  const consumed    = Number(computedValues[config.primary_key] ?? 0);
  const goal        = config.goal_value;
  const remaining   = goal - consumed;
  const pct         = Math.min(100, goal > 0 ? (consumed / goal) * 100 : 0);
  const isOver      = remaining < 0;
  const barColor    = isOver ? '#ef4444' : accentColor;

  const macroPropList = (config.macro_keys ?? [])
    .map(k => computedProps.find(p => p.key === k))
    .filter(Boolean) as ComputedProperty[];

  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden">
      {/* Equation row */}
      <div className="grid grid-cols-5 items-center px-5 py-4">
        <div className="col-span-2 text-center">
          <p className="text-2xl font-bold text-text-primary tabular-nums">{Math.round(goal).toLocaleString()}</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">{config.goal_label ?? 'Goal'}</p>
        </div>
        <div className="text-center text-lg text-text-tertiary font-light select-none">−</div>
        <div className="col-span-2 text-center">
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {Math.round(consumed).toLocaleString()}
          </p>
          <p className="text-[10px] text-text-tertiary mt-0.5">{config.consumed_label ?? 'Consumed'}</p>
        </div>
      </div>

      {/* Remaining + progress bar */}
      <div className="px-5 pb-4 flex flex-col gap-2">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-3xl font-bold tabular-nums"
            style={{ color: isOver ? '#ef4444' : accentColor }}>
            {Math.abs(Math.round(remaining)).toLocaleString()}
          </span>
          <span className="text-xs text-text-tertiary">
            {config.remaining_label ?? (isOver ? 'over' : 'left')}
          </span>
        </div>
        <div className="h-2.5 bg-background-tertiary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        {primaryProp?.unit && (
          <p className="text-[10px] text-text-tertiary/60 text-center">
            {primaryProp.unit}
          </p>
        )}
      </div>

      {/* Macro sub-bars */}
      {macroPropList.length > 0 && (
        <div className="border-t border-border-primary/50 px-5 py-3 grid grid-cols-3 gap-4">
          {macroPropList.map(p => {
            const val  = Number(computedValues[p.key] ?? 0);
            const goal = p.goal_value ?? 100;
            const pct  = Math.min(100, goal > 0 ? (val / goal) * 100 : 0);
            return (
              <div key={p.key} className="flex flex-col gap-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-medium text-text-secondary truncate">{p.label}</span>
                  <span className="text-[10px] text-text-tertiary shrink-0 ml-1">
                    {Math.round(val)}{p.unit ? `${p.unit}` : ''} / {Math.round(goal)}{p.unit ?? ''}
                  </span>
                </div>
                <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accentColor }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Grouped Entries ───────────────────────────────────────────────────────────

function GroupedEntriesSection({
  config, entries, computedProps, schema, accentColor,
  moduleDefId, hubId, userId, activeDate, dateField,
  onEntrySaved, onDeleteEntry, onViewEntry,
}: {
  config: Extract<import('@/types/ui-builder').HubSectionConfig, { type: 'grouped_entries' }>;
  entries: ModuleEntry[];
  computedProps: ComputedProperty[];
  schema: SchemaField[];
  accentColor: string;
  moduleDefId: string;
  hubId: string;
  userId: string;
  activeDate: string;
  dateField?: string;
  onEntrySaved: (e: ModuleEntry) => void;
  onDeleteEntry: (id: string) => void;
  onViewEntry?: (e: ModuleEntry) => void;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const statProp = config.stat_key
    ? computedProps.find(p => p.key === config.stat_key) : undefined;

  const [primary, secondary] = config.show_fields;
  const limit = config.limit_per_group ?? 20;

  return (
    <div className="flex flex-col gap-0 divide-y divide-border-primary/30 rounded-xl border border-border-primary overflow-hidden bg-background-secondary">
      {config.groups.map(group => {
        const groupEntries = entries
          .filter(e => String(e.data[config.group_by_field] ?? '') === group.key)
          .slice(0, limit);
        const groupStatVal = statProp
          ? evaluateComputedProperties([statProp], groupEntries)[statProp.key] ?? null
          : null;
        const isOpen    = openGroup === group.key;

        return (
          <div key={group.key}>
            {/* Group header */}
            <div className="flex items-center justify-between px-4 py-3 bg-background-secondary">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">{group.label}</span>
                {groupEntries.length > 0 && (
                  <span className="text-[10px] text-text-tertiary">
                    {groupEntries.length} {groupEntries.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {groupStatVal !== null && groupStatVal !== undefined && statProp && (
                  <span className="text-sm font-semibold tabular-nums" style={{ color: accentColor }}>
                    {formatComputedValue(groupStatVal, statProp)}
                  </span>
                )}
                {config.inline_form && userId && (
                  <button
                    type="button"
                    onClick={() => setOpenGroup(isOpen ? null : group.key)}
                    className="flex items-center gap-1 text-[11px] font-medium transition-all px-2.5 py-1 rounded-lg"
                    style={isOpen
                      ? { color: accentColor, backgroundColor: `${accentColor}15` }
                      : { color: 'var(--text-tertiary)' }}
                  >
                    <PlusIcon size={11} weight="bold" />
                    Add
                  </button>
                )}
              </div>
            </div>

            {/* Inline quick-add form */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden border-t border-border-primary/40"
                >
                  <QuickAddForm
                    groupKey={group.key}
                    groupLabel={group.label}
                    showFields={config.show_fields}
                    groupByField={config.group_by_field}
                    schema={schema}
                    moduleDefId={moduleDefId}
                    hubId={hubId}
                    userId={userId}
                    accentColor={accentColor}
                    activeDate={activeDate}
                    dateField={dateField}
                    onSaved={e => { onEntrySaved(e); setOpenGroup(null); }}
                    onCancel={() => setOpenGroup(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Entry rows */}
            {groupEntries.length > 0 && (
              <div className="divide-y divide-border-primary/30 border-t border-border-primary/30">
                {groupEntries.map(e => (
                  <GroupEntryRow
                    key={e.id}
                    entry={e}
                    primary={primary}
                    secondary={secondary}
                    accentColor={accentColor}
                    onDelete={() => onDeleteEntry(e.id)}
                    onView={onViewEntry ? () => onViewEntry(e) : undefined}
                  />
                ))}
              </div>
            )}

            {groupEntries.length === 0 && !isOpen && (
              <div className="px-4 py-2 border-t border-border-primary/30">
                <p className="text-[11px] text-text-tertiary/60 italic">No entries</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GroupEntryRow({
  entry, primary, secondary, accentColor, onDelete, onView,
}: {
  entry: ModuleEntry; primary?: string; secondary?: string;
  accentColor: string; onDelete: () => void; onView?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="group flex items-center px-4 py-2 bg-background-primary/50 hover:bg-background-primary transition-colors cursor-pointer gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onView}
    >
      <div className="w-1 h-1 rounded-full shrink-0 opacity-40" style={{ backgroundColor: accentColor }} />
      <span className="flex-1 text-xs text-text-primary truncate">
        {primary && entry.data[primary] !== undefined ? String(entry.data[primary]) : '—'}
      </span>
      {secondary && entry.data[secondary] !== undefined && (
        <span className="text-[11px] text-text-tertiary shrink-0">
          {String(entry.data[secondary])}
        </span>
      )}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className={`w-5 h-5 flex items-center justify-center rounded text-text-tertiary hover:text-red-400 transition-all shrink-0 ${hovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <TrashIcon size={11} />
      </button>
    </div>
  );
}

// ── Quick-add form (per group) ────────────────────────────────────────────────

function QuickAddForm({
  groupKey, groupLabel, showFields, groupByField, schema,
  moduleDefId, hubId, userId, accentColor, activeDate, dateField,
  onSaved, onCancel,
}: {
  groupKey: string; groupLabel: string; showFields: string[];
  groupByField: string; schema: SchemaField[];
  moduleDefId: string; hubId: string; userId: string;
  accentColor: string; activeDate: string; dateField?: string;
  onSaved: (e: ModuleEntry) => void; onCancel: () => void;
}) {
  const fields = showFields
    .map(k => schema.find(f => f.key === k))
    .filter(Boolean) as SchemaField[];

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(f => [f.key, '']))
  );
  const [saving, setSaving] = useState(false);

  const canSave = fields.some(f => values[f.key]?.trim() !== '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = { [groupByField]: groupKey };
      for (const f of fields) {
        const raw = values[f.key];
        if (!raw || raw.trim() === '') continue;
        data[f.key] = (f.type === 'number' || f.type === 'counter') ? parseFloat(raw) || 0 : raw;
      }
      if (dateField) {
        const isDateTime = schema.find(f => f.key === dateField)?.type === 'datetime';
        data[dateField] = isDateTime ? new Date().toISOString() : activeDate;
      }
      const saved = await createModuleEntry(moduleDefId, data as any, userId, hubId);
      window.dispatchEvent(new Event('takda:data_updated'));
      onSaved(saved);
    } catch { /* surface error later if needed */ }
    finally { setSaving(false); }
  };

  const set = (key: string, val: string) => setValues(p => ({ ...p, [key]: val }));

  const inputBase = 'w-full bg-background-primary border border-border-primary rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:border-modules-aly/40';

  return (
    <div className="px-4 py-3 bg-background-primary/30 flex flex-col gap-2">
      <div className={`grid gap-2 ${fields.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {fields.map((f, i) => (
          <input
            key={f.key}
            type={f.type === 'number' || f.type === 'counter' ? 'number' : 'text'}
            className={inputBase}
            placeholder={f.label}
            value={values[f.key]}
            onChange={e => set(f.key, e.target.value)}
            autoFocus={i === 0}
            onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave(); if (e.key === 'Escape') onCancel(); }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] text-text-tertiary hover:text-text-primary transition-colors px-2 py-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="text-[11px] font-semibold px-3 py-1 rounded-lg text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: accentColor }}
        >
          {saving ? '…' : 'Add'}
        </button>
      </div>
    </div>
  );
}

// ── Entry form panel (global) ─────────────────────────────────────────────────

function EntryFormPanel({
  title, entryFormDef, schema, moduleDefId, hubId, userId, accentColor, onEntrySaved,
}: {
  title?: string; entryFormDef: UIDefinition | null;
  schema: SchemaField[]; moduleDefId: string; hubId: string; userId: string;
  accentColor: string; onEntrySaved: (e: ModuleEntry) => void;
}) {
  const handleSubmit = async (data: Record<string, unknown>) => {
    const saved = await createModuleEntry(moduleDefId, data as any, userId, hubId);
    window.dispatchEvent(new Event('takda:data_updated'));
    onEntrySaved(saved);
  };

  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden">
      {title && (
        <div className="px-4 py-2.5 border-b border-border-primary">
          <p className="text-xs font-semibold text-text-primary">{title}</p>
        </div>
      )}
      {entryFormDef ? (
        <DynamicUIRenderer
          uiDefinition={entryFormDef} schema={schema} mode="entry"
          onSubmit={handleSubmit} brandColor={accentColor}
        />
      ) : (
        <div className="px-4 py-3 text-xs text-text-tertiary">
          Entry form not configured. Design it in the Web Interface tab.
        </div>
      )}
    </div>
  );
}

// ── Flat entry list ───────────────────────────────────────────────────────────

function FlatEntryList({
  entries, schema, limit, showFields, title, accentColor, onEditEntry,
}: {
  entries: ModuleEntry[]; schema: SchemaField[]; limit: number;
  showFields: string[]; title?: string; accentColor: string;
  onEditEntry?: (e: ModuleEntry) => void;
}) {
  const recent             = entries.slice(0, limit);
  const [primary, secondary] = showFields;
  return (
    <div className="flex flex-col">
      {title && (
        <div className="flex items-center gap-2 px-1 mb-2">
          <p className="text-xs font-semibold text-text-primary">{title}</p>
          <span className="text-[10px] text-text-tertiary">{entries.length} entries</span>
        </div>
      )}
      {recent.length === 0 && (
        <p className="text-xs text-text-tertiary py-4 text-center">No entries yet.</p>
      )}
      <div className="divide-y divide-border-primary/40 rounded-xl border border-border-primary overflow-hidden">
        {recent.map(e => (
          <div
            key={e.id}
            className="flex items-center justify-between px-4 py-2.5 bg-background-secondary hover:bg-background-primary transition-colors cursor-pointer"
            onClick={() => onEditEntry?.(e)}
          >
            <span className="text-xs text-text-primary truncate">
              {primary && e.data[primary] !== undefined ? String(e.data[primary]) : '—'}
            </span>
            {secondary && e.data[secondary] !== undefined && (
              <span className="text-[11px] text-text-tertiary shrink-0 ml-3">
                {String(e.data[secondary])}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Detail sheet (single-entry view) ─────────────────────────────────────────

function DetailSheet({
  entry, detailViewDef, schema, accentColor, onClose,
}: {
  entry: ModuleEntry; detailViewDef: UIDefinition | null;
  schema: SchemaField[]; accentColor: string; onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-background-secondary border-l border-border-primary shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
            <p className="text-sm font-bold text-text-primary">Entry Detail</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:bg-background-tertiary transition-colors">
            <XIcon size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {detailViewDef ? (
            <DynamicUIRenderer
              uiDefinition={detailViewDef}
              schema={schema}
              mode="detail"
              existingValues={entry.data}
              brandColor={accentColor}
            />
          ) : (
            <div className="px-5 py-4 flex flex-col gap-3">
              {schema.map(f => (
                <div key={f.key}>
                  <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">{f.label}</p>
                  <p className="text-sm text-text-primary">
                    {entry.data[f.key] !== undefined ? String(entry.data[f.key]) : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Section dispatcher ────────────────────────────────────────────────────────

interface SectionProps {
  section:        HubSection;
  entries:        ModuleEntry[];   // already date-filtered when date_nav is active
  computedProps:  ComputedProperty[];
  computedValues: Record<string, unknown>;
  schema:         SchemaField[];
  accentColor:    string;
  widgetDef:      WidgetDefinition | null;
  entryFormDef:   UIDefinition | null;
  moduleDefId:    string;
  hubId:          string;
  userId:         string;
  widgetColSpan:  number;
  activeDate:     string;
  dateField?:     string;
  onEntrySaved:   (e: ModuleEntry) => void;
  onDeleteEntry:  (id: string) => void;
  onViewEntry?:   (e: ModuleEntry) => void;
  onAddEntry?:    () => void;
  onRunAction?:   (actionId: string, entry?: ModuleEntry) => void;
  setActiveDate:  (d: string) => void;
}

function Section(props: SectionProps) {
  const {
    section, entries, computedProps, computedValues, schema, accentColor,
    widgetDef, entryFormDef, moduleDefId, hubId, userId,
    widgetColSpan, activeDate, dateField,
    onEntrySaved, onDeleteEntry, onViewEntry, onAddEntry, onRunAction, setActiveDate,
  } = props;
  const { config } = section;

  switch (config.type) {

    case 'date_nav':
      return <DateNavSection activeDate={activeDate} setActiveDate={setActiveDate} />;

    case 'summary_bar':
      return (
        <SummaryBarSection
          config={config}
          computedProps={computedProps}
          computedValues={computedValues}
          accentColor={accentColor}
        />
      );

    case 'grouped_entries':
      return (
        <GroupedEntriesSection
          config={config}
          entries={entries}
          computedProps={computedProps}
          schema={schema}
          accentColor={accentColor}
          moduleDefId={moduleDefId}
          hubId={hubId}
          userId={userId}
          activeDate={activeDate}
          dateField={dateField}
          onEntrySaved={onEntrySaved}
          onDeleteEntry={onDeleteEntry}
          onViewEntry={onViewEntry}
        />
      );

    case 'stats_row': {
      const propList = config.computed_keys
        .map(k => computedProps.find(p => p.key === k))
        .filter(Boolean) as ComputedProperty[];
      if (propList.length === 0) return null;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {propList.map(p => (
            <SectionStatCard key={p.key} prop={p} rawValue={computedValues[p.key] ?? null} accentColor={accentColor} />
          ))}
        </div>
      );
    }

    case 'widget':
      if (!widgetDef) return null;
      return (
        <WidgetRenderer
          definition={widgetDef}
          schema={schema}
          computedProps={computedProps}
          computedValues={computedValues}
          entries={entries}
          accentColor={accentColor}
          colSpan={widgetColSpan}
          onAddEntry={onAddEntry}
          onRunAction={onRunAction}
        />
      );

    case 'entry_form_panel':
      return (
        <EntryFormPanel
          title={config.title}
          entryFormDef={entryFormDef}
          schema={schema}
          moduleDefId={moduleDefId}
          hubId={hubId}
          userId={userId}
          accentColor={accentColor}
          onEntrySaved={onEntrySaved}
        />
      );

    case 'entry_list':
      return (
        <FlatEntryList
          entries={entries}
          schema={schema}
          limit={config.limit ?? 10}
          showFields={config.show_fields ?? []}
          title={config.title}
          accentColor={accentColor}
          onEditEntry={onViewEntry}
        />
      );

    case 'divider':
      return <hr className="border-border-primary" />;

    default:
      return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

interface HubViewRendererProps {
  definition:     HubViewDefinition;
  widgetDef:      WidgetDefinition | null;
  entryFormDef:   UIDefinition | null;
  detailViewDef?: UIDefinition | null;
  schema:         SchemaField[];
  computedProps:  ComputedProperty[];
  entries:        ModuleEntry[];
  accentColor:    string;
  moduleDefId:    string;
  hubId:          string;
  userId:         string;
  widgetColSpan:  number;
  computedValues?: Record<string, unknown>;
  onEntrySaved:   (e: ModuleEntry) => void;
  onEditEntry?:   (e: ModuleEntry) => void;
  onAddEntry?:    () => void;
  onDeleteEntry?: (id: string) => void;
  onRunAction?:   (actionId: string, entry?: ModuleEntry) => void;
}

export function HubViewRenderer({
  definition, widgetDef, entryFormDef, detailViewDef, schema, computedProps,
  entries, accentColor, moduleDefId, hubId, userId, widgetColSpan,
  computedValues = {}, onEntrySaved, onEditEntry, onAddEntry, onDeleteEntry, onRunAction,
}: HubViewRendererProps) {
  const [activeDate,   setActiveDate]   = useState(todayISO);
  const [detailEntry,  setDetailEntry]  = useState<ModuleEntry | null>(null);

  // Resolve the date field from date_nav section (if present)
  const dateField = useMemo(() => {
    const nav = definition.sections.find(s => s.config.type === 'date_nav');
    if (!nav || nav.config.type !== 'date_nav') return undefined;
    return nav.config.date_field || undefined;
  }, [definition.sections]);

  // Filter entries by active date when date_nav is in the layout
  const filteredEntries = useMemo(() => {
    if (!dateField) return entries;
    return entries.filter(e => {
      const raw = e.data[dateField];
      const iso = raw ? String(raw).slice(0, 10) : e.created_at.slice(0, 10);
      return iso === activeDate;
    });
  }, [entries, dateField, activeDate]);

  const handleDelete = (id: string) => {
    onDeleteEntry?.(id);
  };

  const handleView = (e: ModuleEntry) => {
    setDetailEntry(e);
    onEditEntry?.(e);
  };

  if (definition.sections.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-xs text-text-tertiary">Hub view not configured. Add sections in the creator.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-5 py-4">
        {definition.sections.map(section => {
          const sectionAppear = resolveBlockAppearance(section.appearance, 'web', accentColor, computedValues);
          return (
          <div
            key={section.id}
            className={sectionAppear.className || undefined}
            style={Object.keys(sectionAppear.style).length ? sectionAppear.style : undefined}
          >
          <Section
            section={section}
            entries={filteredEntries}
            computedProps={computedProps}
            computedValues={computedValues}
            onRunAction={onRunAction}
            schema={schema}
            accentColor={accentColor}
            widgetDef={widgetDef}
            entryFormDef={entryFormDef}
            moduleDefId={moduleDefId}
            hubId={hubId}
            userId={userId}
            widgetColSpan={widgetColSpan}
            activeDate={activeDate}
            dateField={dateField}
            setActiveDate={setActiveDate}
            onEntrySaved={onEntrySaved}
            onDeleteEntry={handleDelete}
            onViewEntry={handleView}
            onAddEntry={onAddEntry}
          />
          </div>
          );
        })}
      </div>

      {detailEntry && (
        <DetailSheet
          entry={detailEntry}
          detailViewDef={detailViewDef ?? null}
          schema={schema}
          accentColor={accentColor}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </>
  );
}
