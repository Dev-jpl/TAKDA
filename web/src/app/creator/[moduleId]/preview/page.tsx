"use client";

import React, { useMemo, useState } from 'react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import { PreviewModuleView } from '@/components/modules/PreviewModuleView';
import { evaluateComputedProperties, formatComputedValue } from '@/lib/computedProperties';
import type { ModuleDefinitionV2, SchemaField } from '@/types/module-creator';
import type { ModuleEntry } from '@/services/modules.service';

// ── Sample data generator ─────────────────────────────────────────────────────

const TEXT_SAMPLES = ['Grilled chicken', 'Salad', 'Coffee', 'Protein shake', 'Pasta', 'Apple'];

function fieldSample(field: SchemaField, index: number): unknown {
  const k = field.key.toLowerCase();
  switch (field.type) {
    case 'text':
    case 'string':
      return TEXT_SAMPLES[index % TEXT_SAMPLES.length];
    case 'number':
    case 'counter': {
      if (k.includes('calorie') || k.includes('kcal')) return 200 + Math.round(Math.random() * 600);
      if (k.includes('protein'))                        return 10  + Math.round(Math.random() * 40);
      if (k.includes('carb'))                           return 20  + Math.round(Math.random() * 80);
      if (k.includes('fat'))                            return 5   + Math.round(Math.random() * 30);
      if (k.includes('weight'))                         return 60  + Math.round(Math.random() * 40);
      if (k.includes('hour') || k.includes('sleep'))   return 5   + Math.round(Math.random() * 4);
      if (k.includes('step'))                           return 3000 + Math.round(Math.random() * 9000);
      return 10 + Math.round(Math.random() * 90);
    }
    case 'boolean':
      return index % 2 === 0;
    case 'date':
      return new Date(Date.now() - index * 86_400_000).toLocaleDateString('en-CA');
    case 'datetime':
      return new Date(Date.now() - index * 86_400_000).toISOString();
    case 'select': {
      const opts = field.config?.options ?? ['Option A'];
      return opts[index % opts.length];
    }
    default:
      return '';
  }
}

function generateSampleEntries(definition: ModuleDefinitionV2, count: number): ModuleEntry[] {
  const schemas     = definition.schemas ?? {};
  const collections = Object.values(schemas);
  const fields: SchemaField[] = collections.length > 0
    ? ((collections.find(c => c.role === 'primary') ?? collections[0]).fields as SchemaField[])
    : ((definition.schema ?? []) as SchemaField[]);

  if (fields.length === 0) return [];

  return Array.from({ length: count }, (_, i) => {
    const data: Record<string, unknown> = {};
    for (const f of fields) data[f.key] = fieldSample(f, i);
    return {
      id:            `preview-${i}`,
      module_def_id: definition.id,
      hub_id:        'preview',
      user_id:       'preview',
      schema_key:    'default',
      data,
      created_at:    new Date(Date.now() - i * 3_600_000 * 4).toISOString(),
    } as ModuleEntry;
  });
}

// ── Computed values preview strip ─────────────────────────────────────────────

function ComputedPreview({
  definition,
  entries,
}: {
  definition: ModuleDefinitionV2;
  entries:    ModuleEntry[];
}) {
  const props = definition.computed_properties ?? [];
  if (props.length === 0) return null;

  const values = useMemo(
    () => evaluateComputedProperties(props, entries),
    [props, entries],
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">
        Computed values — with sample data
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {props.map(p => {
          const val     = values[p.key] ?? null;
          const display = formatComputedValue(val, p);
          return (
            <div key={p.key} className="bg-background-secondary border border-border-primary rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
              <p className="text-[9px] text-text-tertiary uppercase tracking-widest truncate">{p.label}</p>
              <p className="text-base font-medium text-text-primary">{display}</p>
              <p className="text-[9px] text-text-tertiary/50">{p.type}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PreviewPage() {
  const { definition } = useModuleEditor();
  const [mode, setMode] = useState<'empty' | 'sample'>('sample');

  if (!definition) return (
    <div className="flex items-center justify-center h-full">
      <span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  const brandColor   = definition.brand_color || 'var(--modules-aly)';
  const sampleCount  = mode === 'empty' ? 0 : 10;

  // Stable sample entries — regenerate only when definition changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sampleEntries = useMemo(() => generateSampleEntries(definition as ModuleDefinitionV2, sampleCount), [definition.id, sampleCount]);

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-3xl mx-auto px-5 py-8 flex flex-col gap-6">

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          {(['empty', 'sample'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-xl text-[11px] font-medium border transition-all ${
                mode === m
                  ? 'border-transparent text-white'
                  : 'border-border-primary text-text-tertiary hover:text-text-secondary'
              }`}
              style={mode === m ? { backgroundColor: brandColor } : undefined}
            >
              {m === 'empty' ? 'Empty state' : 'With sample data'}
            </button>
          ))}
        </div>

        {/* Computed values strip */}
        {mode === 'sample' && (
          <ComputedPreview definition={definition as ModuleDefinitionV2} entries={sampleEntries} />
        )}

        {/* Web preview */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Web — Hub Card</p>
          <div className="border border-border-primary rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-primary bg-background-secondary">
              <div className="w-5 h-5 rounded-lg shrink-0"
                style={{ backgroundColor: `${brandColor}20`, border: `1px solid ${brandColor}30` }} />
              <span className="text-[12px] font-medium text-text-primary">{definition.name || 'Module'}</span>
              <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>
                Preview
              </span>
            </div>
            <PreviewModuleView
              definition={definition as ModuleDefinitionV2}
              mockEntries={sampleEntries}
            />
          </div>
        </div>

        <p className="text-xs text-text-tertiary text-center">
          This is a preview with sample data. Install this module on a hub to use it with real data.
        </p>
      </div>
    </div>
  );
}
