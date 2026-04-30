"use client";

import React, { useMemo, useState } from 'react';
import { Sparkle, ArrowRight } from '@phosphor-icons/react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import type { SchemaField } from '@/services/modules.service';

type DataMode = 'empty' | 'sample' | 'full';
type WebSurface = 'entry_form' | 'hub_view' | 'detail_view' | 'widget';
type MobileSurface = 'module_screen' | 'entry_sheet' | 'widget';

function generateSampleValue(field: SchemaField): unknown {
  switch (field.type) {
    case 'text':
    case 'string':    return 'Sample text';
    case 'number':    return field.config?.unit === 'kcal' ? 450 : field.config?.unit === 'kg' ? 72.5 : 42;
    case 'counter':   return field.config?.goal ? Math.round(field.config.goal * 0.6) : 5;
    case 'boolean':   return true;
    case 'date':      return new Date().toLocaleDateString();
    case 'datetime':  return new Date().toLocaleString();
    case 'select':    return field.config?.options?.[0] ?? 'Option A';
    case 'multi_select' as string: return [field.config?.options?.[0] ?? 'Tag 1', field.config?.options?.[1] ?? 'Tag 2'].filter(Boolean);
    default:          return '—';
  }
}

function generateSampleEntry(fields: SchemaField[]): Record<string, unknown> {
  return Object.fromEntries(fields.map(f => [f.key, generateSampleValue(f)]));
}

function SampleEntryCard({ fields, index }: { fields: SchemaField[]; index: number }) {
  const offsets = [0, -1, -2];
  const date = new Date();
  date.setDate(date.getDate() + (offsets[index] !== undefined ? offsets[index] : -index));
  const firstTextField = fields.find(f => ['text', 'string', 'select'].includes(f.type));
  const firstNumField  = fields.find(f => ['number', 'counter'].includes(f.type));

  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl px-4 py-3 mb-2 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-medium text-modules-aly">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-text-primary truncate">
          {firstTextField ? String(generateSampleValue(firstTextField)) : `Entry ${index + 1}`}
        </p>
        <p className="text-[10px] text-text-tertiary">{date.toLocaleDateString()}</p>
      </div>
      {firstNumField && (
        <span className="text-[12px] font-medium text-text-primary shrink-0">
          {String(generateSampleValue(firstNumField))}{firstNumField.config?.unit ? ` ${firstNumField.config.unit}` : ''}
        </span>
      )}
    </div>
  );
}

export default function PreviewPage() {
  const { definition } = useModuleEditor();
  const [webSurface,    setWebSurface]    = useState<WebSurface>('entry_form');
  const [mobileSurface, setMobileSurface] = useState<MobileSurface>('module_screen');
  const [dataMode,      setDataMode]      = useState<DataMode>('sample');
  const [simulateAction, setSimulateAction] = useState<string | null>(null);

  const fields = useMemo<SchemaField[]>(() => {
    if (!definition) return [];
    if (Object.keys(definition.schemas ?? {}).length > 0)
      return Object.values(definition.schemas).flatMap(c => c.fields as SchemaField[]);
    return (definition.schema ?? []) as SchemaField[];
  }, [definition]);

  if (!definition) return (
    <div className="flex items-center justify-center h-full">
      <span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  const sampleCount = dataMode === 'empty' ? 0 : dataMode === 'sample' ? 1 : 5;
  const allActions = [
    ...(definition.behaviors?.web_actions    ?? []).map(a => ({ ...a, platform: 'Web' })),
    ...(definition.behaviors?.mobile_actions ?? []).map(a => ({ ...a, platform: 'Mobile' })),
  ];
  const accent = definition.brand_color ?? 'var(--modules-aly)';

  return (
    <div className="flex gap-4 p-5 h-full overflow-hidden">

      {/* ── Left: Web preview ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest mb-3">Web Preview</p>

        {/* Surface + data mode toggles */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-0.5 bg-background-secondary border border-border-primary rounded-xl p-0.5">
            {(['entry_form','hub_view','detail_view','widget'] as WebSurface[]).map(s => (
              <button key={s} type="button" onClick={() => setWebSurface(s)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${webSurface === s ? 'bg-background-primary text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
                {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 bg-background-secondary border border-border-primary rounded-xl p-0.5 ml-auto">
            {(['empty','sample','full'] as DataMode[]).map(m => (
              <button key={m} type="button" onClick={() => setDataMode(m)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all capitalize ${dataMode === m ? 'bg-background-primary text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Web canvas */}
        <div className="flex-1 bg-background-secondary border border-border-primary rounded-xl overflow-y-auto p-5">
          {/* Module header card */}
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-border-primary">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}30` }}>
              <Sparkle size={14} style={{ color: accent }} weight="fill" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{definition.name || 'Module'}</p>
              <p className="text-[10px] text-text-tertiary">{fields.length} fields</p>
            </div>
          </div>

          {webSurface === 'entry_form' && (
            <div className="flex flex-col gap-4 max-w-md">
              {dataMode === 'empty' ? (
                <p className="text-[11px] text-text-tertiary text-center py-8">{definition.web_config?.empty_state_message || 'No entries yet'}</p>
              ) : fields.slice(0, 6).map(f => {
                const val = generateSampleValue(f);
                return (
                  <div key={f.key}>
                    <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-1">{f.label}</p>
                    <div className="bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-secondary">
                      {Array.isArray(val) ? val.join(', ') : typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                    </div>
                  </div>
                );
              })}
              <button type="button" className="w-full py-2.5 rounded-xl text-sm font-medium text-white pointer-events-none" style={{ backgroundColor: accent }}>
                Save
              </button>
            </div>
          )}

          {webSurface === 'hub_view' && (
            <div>
              {Array.from({ length: sampleCount }).map((_, i) => (
                <SampleEntryCard key={i} fields={fields} index={i} />
              ))}
              {sampleCount === 0 && <p className="text-[11px] text-text-tertiary text-center py-8">No entries</p>}
            </div>
          )}

          {webSurface === 'detail_view' && fields.length > 0 && (
            <div className="flex flex-col gap-3 max-w-md">
              {fields.slice(0, 6).map(f => (
                <div key={f.key} className="flex items-center justify-between gap-4 py-2 border-b border-border-primary/40 last:border-0">
                  <span className="text-[11px] text-text-tertiary">{f.label}</span>
                  <span className="text-[12px] font-medium text-text-primary">{String(generateSampleValue(f))}</span>
                </div>
              ))}
            </div>
          )}

          {webSurface === 'widget' && (
            <div className="max-w-xs bg-background-tertiary border border-border-primary rounded-xl p-4">
              <p className="text-[10px] text-text-tertiary mb-1">{definition.name}</p>
              {definition.computed_properties?.slice(0, 2).map(cp => (
                <p key={cp.key} className="text-2xl font-medium text-text-primary">
                  {cp.type === 'count' ? sampleCount : cp.type === 'sum' ? sampleCount * 42 : '—'}
                  {cp.unit ? <span className="text-sm text-text-tertiary ml-1">{cp.unit}</span> : null}
                </p>
              ))}
              {!definition.computed_properties?.length && <p className="text-xl font-medium text-text-primary">—</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Mobile preview ── */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden">
        <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest mb-3">Mobile Preview</p>

        <div className="flex items-center gap-0.5 bg-background-secondary border border-border-primary rounded-xl p-0.5 mb-3">
          {(['module_screen','entry_sheet','widget'] as MobileSurface[]).map(s => (
            <button key={s} type="button" onClick={() => setMobileSurface(s)}
              className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${mobileSurface === s ? 'bg-background-primary text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
              {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Phone frame */}
        <div className="flex-1 flex justify-center overflow-hidden">
          <div className="w-[280px] h-[540px] rounded-[36px] border-4 border-background-tertiary bg-background-primary shadow-xl overflow-hidden flex flex-col relative">
            {/* Status bar */}
            <div className="h-8 bg-background-secondary flex items-center justify-between px-5 shrink-0">
              <span className="text-[10px] text-text-tertiary font-medium">9:41</span>
              <span className="text-[9px] text-text-tertiary">▌▌▌ ⬛</span>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {mobileSurface === 'module_screen' && (
                <>
                  <p className="text-sm font-medium text-text-primary mb-3">{definition.name || 'Module'}</p>
                  {Array.from({ length: sampleCount }).map((_, i) => (
                    <div key={i} className="bg-background-secondary border border-border-primary rounded-xl px-3 py-2.5 mb-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-modules-aly/10 shrink-0" />
                      <div className="flex-1">
                        <div className="h-2 bg-background-tertiary rounded w-3/4 mb-1" />
                        <div className="h-1.5 bg-background-tertiary/60 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                  {sampleCount === 0 && <p className="text-[11px] text-text-tertiary text-center py-6">No entries</p>}
                </>
              )}

              {mobileSurface === 'entry_sheet' && (
                <div className="absolute bottom-0 left-0 right-0 bg-background-secondary rounded-t-[20px] border-t border-border-primary flex flex-col" style={{ height: '65%' }}>
                  <div className="w-7 h-1 rounded-full bg-background-tertiary mx-auto mt-2.5 shrink-0" />
                  <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
                    {fields.slice(0, 3).map(f => (
                      <div key={f.key}>
                        <p className="text-[9px] text-text-tertiary mb-0.5">{f.label}</p>
                        <div className="bg-background-tertiary border border-border-primary rounded-lg h-8 px-2.5 flex items-center">
                          <span className="text-[10px] text-text-tertiary/50">{String(generateSampleValue(f))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mobileSurface === 'widget' && (
                <div className="bg-background-secondary border border-border-primary rounded-xl p-3">
                  <p className="text-[10px] text-text-tertiary mb-1">{definition.name}</p>
                  <p className="text-xl font-medium text-text-primary">{sampleCount * 42}</p>
                  {definition.computed_properties?.[0]?.unit && (
                    <p className="text-[10px] text-text-tertiary">{definition.computed_properties[0].unit}</p>
                  )}
                </div>
              )}
            </div>

            {/* FAB */}
            <button type="button" className="absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-xl pointer-events-none" style={{ backgroundColor: accent }}>
              <span className="text-white text-xl font-medium">+</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Actions preview (below, full width) ── */}
      {allActions.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-border-primary bg-background-secondary px-5 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest">Actions</p>
            {allActions.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="text-[10px] text-text-secondary">{a.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-background-tertiary text-text-tertiary">{a.platform}</span>
                <button type="button" onClick={() => setSimulateAction(a.id === simulateAction ? null : a.id)}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-modules-aly/10 text-modules-aly border border-modules-aly/20 hover:bg-modules-aly hover:text-white transition-all">
                  Simulate
                </button>
              </div>
            ))}
          </div>

          {/* Simulation overlay */}
          {simulateAction && (() => {
            const action = allActions.find(a => a.id === simulateAction);
            if (!action) return null;
            return (
              <div className="mt-3 bg-background-tertiary border border-border-primary rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-text-primary">Simulating: {action.name}</p>
                  <button type="button" onClick={() => setSimulateAction(null)} className="text-text-tertiary hover:text-text-primary text-[10px]">Close</button>
                </div>
                {(action.steps ?? []).length === 0 && <p className="text-[10px] text-text-tertiary/50">No steps defined</p>}
                {(action.steps ?? []).map((step, i) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-modules-aly font-mono w-4">{i + 1}.</span>
                    <ArrowRight size={10} className="text-text-tertiary/50 shrink-0" />
                    <span className="text-[10px] text-text-secondary">{step.type.replace(/_/g, ' ')}</span>
                    {step.config.message != null && <span className="text-[10px] text-text-tertiary">"{String(step.config.message as string).slice(0, 40)}"</span>}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
