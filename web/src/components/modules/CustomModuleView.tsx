"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import type { ModuleDefinitionV2, ComputedProperty } from '@/types/module-creator';
import type { UIDefinition, WidgetDefinition, HubViewDefinition } from '@/types/ui-builder';
import {
  ModuleEntry,
  getModuleEntries,
  deleteModuleEntry,
} from '@/services/modules.service';
import { computeStat, formatStat, getThresholdStatus, THRESHOLD_COLORS } from '@/lib/moduleCompute';
import { ModuleEntryRow } from './ModuleEntryRow';
import { ModuleEntrySheet } from './ModuleEntrySheet';
import { WidgetRenderer } from './WidgetRenderer';
import { HubViewRenderer } from './HubViewRenderer';

// ── Stat card (fallback, when no widget/hub_view defined) ─────────────────────

function StatCard({
  prop, value, brandColor,
}: {
  prop: ComputedProperty; value: number | null; brandColor: string;
}) {
  const display     = formatStat(value, prop);
  const hasValue    = value !== null && value > 0;
  const threshStatus = prop.type === 'threshold' && value !== null
    ? getThresholdStatus(value, prop) : null;
  return (
    <div className="bg-background-primary border border-border-primary rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-0">
      <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest truncate">
        {prop.label}
      </p>
      <div className="flex items-baseline gap-1.5">
        {threshStatus && (
          <span className="w-2 h-2 rounded-full shrink-0 mb-0.5"
            style={{ backgroundColor: THRESHOLD_COLORS[threshStatus] }} />
        )}
        <span
          className="text-xl font-medium text-text-primary"
          style={threshStatus
            ? { color: THRESHOLD_COLORS[threshStatus] }
            : hasValue ? { color: brandColor } : undefined}
        >
          {display}
        </span>
        {prop.unit && <span className="text-[10px] text-text-tertiary">{prop.unit}</span>}
      </div>
      {prop.window && prop.window !== 'all' && (
        <p className="text-[9px] text-text-tertiary/50">{prop.window.replace(/_/g, ' ')}</p>
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
  const widgetColSpan = definition.web_config?.widget_col_span ?? 2;

  // ── Schema (primary collection → flat field list) ─────────────────────────
  const flatSchema = useMemo(() => {
    const schemas     = definition.schemas ?? {};
    const collections = Object.values(schemas);
    if (collections.length > 0) {
      const primary = collections.find(c => c.role === 'primary') ?? collections[0];
      return primary.fields as any[];
    }
    return (definition.schema ?? []) as any[];
  }, [definition.schemas, definition.schema]);

  // ── Parse ui_definition surfaces ─────────────────────────────────────────
  const { hubViewDef, widgetDef, entryFormDef, detailViewDef } = useMemo(() => {
    const raw = definition.ui_definition as any;
    if (!raw) return { hubViewDef: null, widgetDef: null, entryFormDef: null, detailViewDef: null };
    // Legacy: top-level array of rows → treat as entry_form only
    if (Array.isArray(raw?.rows)) {
      return { hubViewDef: null, widgetDef: null, entryFormDef: raw as UIDefinition, detailViewDef: null };
    }
    return {
      hubViewDef:   (raw.hub_view    ?? null) as HubViewDefinition | null,
      widgetDef:    (raw.widget      ?? null) as WidgetDefinition   | null,
      entryFormDef: (raw.entry_form  ?? null) as UIDefinition       | null,
      detailViewDef:(raw.detail_view ?? null) as UIDefinition       | null,
    };
  }, [definition.ui_definition]);

  // Compatible definition for ModuleEntrySheet (expects legacy schema shape)
  const defForSheet = useMemo(() => ({
    ...definition,
    schema: flatSchema,
  }) as any, [definition, flatSchema]);

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    getModuleEntries(definition.id, hubId, userId ?? undefined)
      .then(data => setEntries([...data].sort((a, b) => b.created_at.localeCompare(a.created_at))))
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
        const next = [...prev]; next[idx] = saved; return next;
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
    } catch { load(); }
  };

  const openEdit = (entry: ModuleEntry) => {
    setEditingEntry(entry);
    setSheetOpen(true);
  };

  const openAdd = () => {
    setEditingEntry(undefined);
    setSheetOpen(true);
  };

  // ── Computed stats (for fallback view) ────────────────────────────────────
  const stats = useMemo(
    () => computedProps.map(p => ({ prop: p, value: computeStat(p, entries) })),
    [computedProps, entries],
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────
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

  // ── Determine whether the hub_view has an inline entry form panel ─────────
  const hasEntryPanel = hubViewDef?.sections.some(s => s.config.type === 'entry_form_panel');

  return (
    <div className="flex flex-col">

      {/* ── Hub View: designed layout ──────────────────────────────────── */}
      {hubViewDef ? (
        <>
          {/* Header strip — "Add Entry" shown unless the hub_view has an inline form */}
          {userId && !hasEntryPanel && (
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-primary/50">
              <span className="text-[10px] text-text-tertiary">
                {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
              </span>
              <button
                type="button"
                onClick={openAdd}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ color: accentColor, backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
              >
                <PlusIcon size={12} weight="bold" />
                Add Entry
              </button>
            </div>
          )}
          <HubViewRenderer
            definition={hubViewDef}
            widgetDef={widgetDef}
            entryFormDef={entryFormDef}
            detailViewDef={detailViewDef}
            schema={flatSchema}
            computedProps={computedProps}
            entries={entries}
            accentColor={accentColor}
            moduleDefId={definition.id}
            hubId={hubId}
            userId={userId ?? ''}
            widgetColSpan={widgetColSpan}
            onEntrySaved={handleEntrySaved}
            onEditEntry={openEdit}
            onAddEntry={openAdd}
            onDeleteEntry={handleDelete}
          />
        </>
      ) : (
        /* ── Fallback: generic layout ──────────────────────────────────── */
        <>
          {/* Widget or stat cards */}
          {widgetDef ? (
            <div className="px-5 pt-4 pb-3 border-b border-border-primary/50">
              <WidgetRenderer
                definition={widgetDef}
                schema={flatSchema}
                computedProps={computedProps}
                entries={entries}
                accentColor={accentColor}
                colSpan={widgetColSpan}
                onAddEntry={openAdd}
              />
            </div>
          ) : stats.length > 0 ? (
            <div className="px-5 pt-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-border-primary/50">
              {stats.map(({ prop, value }) => (
                <StatCard key={prop.key} prop={prop} value={value} brandColor={accentColor} />
              ))}
            </div>
          ) : null}

          {/* Header strip */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-primary/50">
            <span className="text-[10px] text-text-tertiary">
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
            </span>
            {userId && (
              <button
                type="button"
                onClick={openAdd}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ color: accentColor, backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
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
                  onEdit={e => openEdit(e)}
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
                  onClick={openAdd}
                  className="text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: accentColor }}
                >
                  Add your first entry →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Entry sheet (always available for add/edit) ─────────────── */}
      {userId && (
        <ModuleEntrySheet
          definition={defForSheet}
          uiDefinition={entryFormDef}
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
