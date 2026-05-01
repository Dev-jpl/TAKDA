"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import type { ModuleDefinitionV2, ComputedProperty } from '@/types/module-creator';
import {
  ModuleEntry,
  getModuleEntries,
  deleteModuleEntry,
} from '@/services/modules.service';
import { ModuleEntryRow } from './ModuleEntryRow';
import { ModuleEntrySheet } from './ModuleEntrySheet';

// ── Client-side compute engine ────────────────────────────────────────────────

function filterByWindow(entries: ModuleEntry[], window: string | undefined): ModuleEntry[] {
  const now   = new Date();
  const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

  switch (window) {
    case 'today':
      return entries.filter(e => e.created_at.slice(0, 10) === today);
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
    default:
      return entries;
  }
}

function computeStat(prop: ComputedProperty, entries: ModuleEntry[]): number | null {
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
    case 'count':
      return windowed.length;
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
    default:
      return null;
  }
}

function formatStat(value: number | null, prop: ComputedProperty): string {
  if (value === null) return '—';
  switch (prop.format) {
    case 'percent':  return `${Math.round(value)}%`;
    case 'decimal':  return value.toFixed(prop.precision ?? 1);
    default:         return Math.round(value).toLocaleString();
  }
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  prop, value, brandColor,
}: {
  prop:       ComputedProperty;
  value:      number | null;
  brandColor: string;
}) {
  const display = formatStat(value, prop);
  const hasValue = value !== null && value > 0;

  return (
    <div className="bg-background-primary border border-border-primary rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-0">
      <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest truncate">
        {prop.label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-xl font-medium text-text-primary"
          style={hasValue ? { color: brandColor } : undefined}
        >
          {display}
        </span>
        {prop.unit && (
          <span className="text-[10px] text-text-tertiary">{prop.unit}</span>
        )}
      </div>
      {prop.window && prop.window !== 'all' && (
        <p className="text-[9px] text-text-tertiary/50">
          {prop.window.replace(/_/g, ' ')}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  definition:     ModuleDefinitionV2;
  hubId:          string;
  userId:         string | null;
  assistantName?: string;
}

export function CustomModuleView({
  definition,
  hubId,
  userId,
  assistantName = 'Aly',
}: Props) {
  const [entries,      setEntries]      = useState<ModuleEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [editingEntry, setEditingEntry] = useState<ModuleEntry | undefined>();

  const computedProps = definition.computed_properties ?? [];
  const accentColor   = definition.brand_color || 'var(--modules-aly)';

  // Flatten V2 schema collections into a flat field list for the entry sheet
  const flatSchema = useMemo(() => {
    const schemas = definition.schemas ?? {};
    if (Object.keys(schemas).length > 0) {
      return Object.values(schemas).flatMap(c => c.fields) as any[];
    }
    return (definition.schema ?? []) as any[];
  }, [definition]);

  // Compatible definition object for ModuleEntrySheet (expects legacy schema shape)
  const defForSheet = useMemo(() => ({
    ...definition,
    schema: flatSchema,
  }) as any, [definition, flatSchema]);

  const load = useCallback(() => {
    setLoading(true);
    getModuleEntries(definition.id, hubId, userId ?? undefined)
      .then(data => {
        setEntries([...data].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [definition.id, hubId, userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('takda:data_updated', handler);
    return () => window.removeEventListener('takda:data_updated', handler);
  }, [load]);

  const handleEntrySaved = (saved: ModuleEntry) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    window.dispatchEvent(new Event('takda:data_updated'));
  };

  const handleDelete = async (entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
    try {
      await deleteModuleEntry(entryId);
      window.dispatchEvent(new Event('takda:data_updated'));
    } catch {
      load();
    }
  };

  // Compute all stats from current entries
  const stats = useMemo(
    () => computedProps.map(p => ({ prop: p, value: computeStat(p, entries) })),
    [computedProps, entries],
  );

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-5 py-5 flex flex-col gap-4 animate-pulse">
        {computedProps.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {computedProps.slice(0, 4).map((_, i) => (
              <div key={i} className="h-16 bg-background-tertiary rounded-xl" />
            ))}
          </div>
        )}
        <div className="h-3 bg-background-tertiary rounded w-1/3" />
        <div className="h-3 bg-background-tertiary rounded w-1/2" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">

      {/* Stat cards row */}
      {stats.length > 0 && (
        <div className="px-5 pt-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-border-primary/50">
          {stats.map(({ prop, value }) => (
            <StatCard
              key={prop.key}
              prop={prop}
              value={value}
              brandColor={accentColor}
            />
          ))}
        </div>
      )}

      {/* Header strip: count + add button */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-primary/50">
        <span className="text-[10px] text-text-tertiary">
          {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
        </span>
        {userId && (
          <button
            type="button"
            onClick={() => { setEditingEntry(undefined); setSheetOpen(true); }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{
              color:           accentColor,
              backgroundColor: `${accentColor}15`,
              border:          `1px solid ${accentColor}30`,
            }}
          >
            <PlusIcon size={12} weight="bold" />
            Add Entry
          </button>
        )}
      </div>

      {/* Entry list */}
      {entries.length > 0 && flatSchema.length > 0 && (
        <div>
          {entries.slice(0, 30).map(entry => (
            <ModuleEntryRow
              key={entry.id}
              entry={entry}
              schema={flatSchema}
              onEdit={e => { setEditingEntry(e); setSheetOpen(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-text-tertiary">No entries yet.</p>
          {userId && (
            <button
              type="button"
              onClick={() => { setEditingEntry(undefined); setSheetOpen(true); }}
              className="text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: accentColor }}
            >
              Add your first entry →
            </button>
          )}
        </div>
      )}

      {/* Entry sheet */}
      {userId && (
        <ModuleEntrySheet
          definition={defForSheet}
          hubId={hubId}
          userId={userId}
          open={sheetOpen}
          onClose={() => { setSheetOpen(false); setEditingEntry(undefined); }}
          onSaved={handleEntrySaved}
          existingEntry={editingEntry}
        />
      )}
    </div>
  );
}
