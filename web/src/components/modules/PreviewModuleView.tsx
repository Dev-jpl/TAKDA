"use client";

import React, { useMemo, useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import type { ModuleDefinitionV2, ComputedProperty } from '@/types/module-creator';
import type { UIDefinition, WidgetDefinition, HubViewDefinition } from '@/types/ui-builder';
import type { SchemaField } from '@/services/modules.service';
import type { ModuleEntry } from '@/services/modules.service';
import { formatStat, getThresholdStatus, THRESHOLD_COLORS } from '@/lib/moduleCompute';
import { useComputedProperties } from '@/lib/computedProperties';
import { InfoIcon } from '@phosphor-icons/react';
import { WidgetRenderer } from './WidgetRenderer';
import { HubViewRenderer } from './HubViewRenderer';
import { ModuleEntryRow } from './ModuleEntryRow';

// ── Stat card (fallback) ──────────────────────────────────────────────────────

function StatCard({ prop, value, brandColor }: { prop: ComputedProperty; value: unknown; brandColor: string }) {
  const numVal  = typeof value === 'number' ? value : null;
  const display = numVal !== null ? `${numVal % 1 === 0 ? numVal : numVal.toFixed(1)}${prop.unit ? ` ${prop.unit}` : ''}` : '—';
  const threshStatus = prop.type === 'threshold' && value !== null
    ? getThresholdStatus((value as any)?.value ?? 0, prop) : null;
  return (
    <div className="bg-background-primary border border-border-primary rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-0">
      <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest truncate">{prop.label}</p>
      <div className="flex items-baseline gap-1.5">
        {threshStatus && <span className="w-2 h-2 rounded-full shrink-0 mb-0.5" style={{ backgroundColor: THRESHOLD_COLORS[threshStatus] }} />}
        <span className="text-xl font-medium text-text-primary"
          style={threshStatus ? { color: THRESHOLD_COLORS[threshStatus] } : numVal ? { color: brandColor } : undefined}>
          {display}
        </span>
        {prop.unit && <span className="text-[10px] text-text-tertiary">{prop.unit}</span>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface PreviewModuleViewProps {
  definition:   ModuleDefinitionV2;
  mockEntries?: ModuleEntry[];
}

export function PreviewModuleView({ definition, mockEntries = [] }: PreviewModuleViewProps) {
  const [showPreviewTip, setShowPreviewTip] = useState(false);

  const computedProps = definition.computed_properties ?? [];
  const accentColor   = definition.brand_color || 'var(--modules-aly)';
  const widgetColSpan = definition.web_config?.widget_col_span ?? 2;

  const flatSchema = useMemo((): SchemaField[] => {
    const schemas     = definition.schemas ?? {};
    const collections = Object.values(schemas);
    if (collections.length > 0) {
      const primary = collections.find(c => c.role === 'primary') ?? collections[0];
      return primary.fields as SchemaField[];
    }
    return (definition.schema ?? []) as SchemaField[];
  }, [definition.schemas, definition.schema]);

  const { hubViewDef, widgetDef, entryFormDef, detailViewDef } = useMemo(() => {
    const raw = definition.ui_definition as any;
    if (!raw) return { hubViewDef: null, widgetDef: null, entryFormDef: null, detailViewDef: null };
    if (Array.isArray(raw?.rows)) return { hubViewDef: null, widgetDef: null, entryFormDef: raw as UIDefinition, detailViewDef: null };
    return {
      hubViewDef:    (raw.hub_view    ?? null) as HubViewDefinition | null,
      widgetDef:     (raw.widget      ?? null) as WidgetDefinition   | null,
      entryFormDef:  (raw.entry_form  ?? null) as UIDefinition       | null,
      detailViewDef: (raw.detail_view ?? null) as UIDefinition       | null,
    };
  }, [definition.ui_definition]);

  const computedValues = useComputedProperties(computedProps, mockEntries);

  const stats = useMemo(
    () => computedProps.map(p => ({ prop: p, value: computedValues[p.key] ?? null })),
    [computedProps, computedValues],
  );

  const hasEntryPanel = hubViewDef?.sections.some(s => s.config.type === 'entry_form_panel');

  return (
    <div className="flex flex-col">
      {/* Preview-mode notice strip */}
      {showPreviewTip && (
        <div className="mx-5 mt-3 flex items-center gap-2 text-[11px] text-text-tertiary bg-background-tertiary border border-border-primary rounded-xl px-3 py-2">
          <InfoIcon size={13} className="shrink-0" />
          Install this module on a hub to log real entries.
          <button type="button" onClick={() => setShowPreviewTip(false)} className="ml-auto hover:text-text-primary">✕</button>
        </div>
      )}

      {hubViewDef ? (
        <>
          {!hasEntryPanel && (
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-primary/50">
              <span className="text-[10px] text-text-tertiary">{mockEntries.length} entr{mockEntries.length === 1 ? 'y' : 'ies'} (sample)</span>
              <button type="button" onClick={() => setShowPreviewTip(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ color: accentColor, backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                <PlusIcon size={12} weight="bold" /> Add Entry
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
            computedValues={computedValues}
            entries={mockEntries}
            accentColor={accentColor}
            moduleDefId={definition.id}
            hubId="preview"
            userId="preview"
            widgetColSpan={widgetColSpan}
            onEntrySaved={() => {}}
            onDeleteEntry={() => {}}
          />
        </>
      ) : (
        <>
          {widgetDef ? (
            <div className="px-5 pt-4 pb-3 border-b border-border-primary/50">
              <WidgetRenderer
                definition={widgetDef}
                schema={flatSchema}
                computedProps={computedProps}
                computedValues={computedValues}
                entries={mockEntries}
                accentColor={accentColor}
                colSpan={widgetColSpan}
                onAddEntry={() => setShowPreviewTip(true)}
              />
            </div>
          ) : stats.length > 0 ? (
            <div className="px-5 pt-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-border-primary/50">
              {stats.map(({ prop, value }) => (
                <StatCard key={prop.key} prop={prop} value={value} brandColor={accentColor} />
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-primary/50">
            <span className="text-[10px] text-text-tertiary">{mockEntries.length} entr{mockEntries.length === 1 ? 'y' : 'ies'} (sample)</span>
            <button type="button" onClick={() => setShowPreviewTip(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ color: accentColor, backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
              <PlusIcon size={12} weight="bold" /> Add Entry
            </button>
          </div>

          {mockEntries.length > 0 && flatSchema.length > 0 && (
            <div>
              {mockEntries.slice(0, 30).map(e => (
                <ModuleEntryRow key={e.id} entry={e} schema={flatSchema}
                  onEdit={() => setShowPreviewTip(true)}
                  onDelete={() => {}} />
              ))}
            </div>
          )}

          {mockEntries.length === 0 && (
            <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-text-tertiary">No sample entries.</p>
              <button type="button" onClick={() => setShowPreviewTip(true)}
                className="text-xs font-medium hover:opacity-80" style={{ color: accentColor }}>
                Add your first entry →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
