"use client";

import React from 'react';
import { CursorText, Sparkle } from '@phosphor-icons/react';
import type { WidgetElementConfig, WidgetRow, WidgetRowAlign, WidgetRowJustify } from '@/types/ui-builder';
import type { ComputedProperty } from '@/types/module-creator';
import type { SchemaField } from '@/services/modules.service';
import type { ModuleAction } from '@/types/module-creator';
import { DebouncedInput, Toggle, Label, Section } from '../UIBuilder/_configHelpers';

const WINDOWS = [
  { value: 'today',    label: 'Today' },
  { value: 'week',     label: 'This week' },
  { value: 'last_7d',  label: 'Last 7 days' },
  { value: 'month',    label: 'This month' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'all',      label: 'All time' },
];

const BRAND_COLORS = [
  '#7F77DD','#1D9E75','#D85A30','#D4537E',
  '#378ADD','#BA7517','#22c55e','#f59e0b',
  '#818cf8','#ec4899','#06b6d4','#f97316',
];

function ColorRow({ value, onChange }: { value?: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BRAND_COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className="w-5 h-5 rounded-md border-2 transition-all"
          style={{ backgroundColor: c, borderColor: value === c ? 'white' : 'transparent' }}
        />
      ))}
    </div>
  );
}

// ── Per-element config ────────────────────────────────────────────────────────

interface ElementConfigProps {
  config:      WidgetElementConfig;
  onUpdate:    (patch: Partial<WidgetElementConfig>) => void;
  computed:    ComputedProperty[];
  schema:      SchemaField[];
  actions:     ModuleAction[];
  brandColor:  string;
}

function ElementConfig({ config, onUpdate, computed, schema, actions, brandColor }: ElementConfigProps) {
  const upd = (p: Partial<WidgetElementConfig>) => onUpdate(p);

  if (config.type === 'stat_card') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Computed property</Label>
        <select value={config.computed_key} onChange={e => upd({ computed_key: e.target.value } as any)}
          className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none">
          <option value="">— pick a computed property —</option>
          {computed.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </Section>
      <Section>
        <Label>Label override</Label>
        <DebouncedInput value={config.label ?? ''} onChange={v => upd({ label: v } as any)} placeholder="e.g. Total Today" />
      </Section>
      <Section>
        <Label>Unit</Label>
        <DebouncedInput value={(config as any).unit ?? ''} onChange={v => upd({ unit: v } as any)} placeholder="e.g. kcal" />
      </Section>
      <div className="flex items-center justify-between">
        <Label>Show change indicator</Label>
        <Toggle checked={config.show_change ?? false} onChange={v => upd({ show_change: v } as any)} brandColor={brandColor} />
      </div>
    </div>
  );

  if (config.type === 'bar_chart' || config.type === 'line_chart') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Computed property</Label>
        <select value={config.computed_key} onChange={e => upd({ computed_key: e.target.value } as any)}
          className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none">
          <option value="">— pick a computed property —</option>
          {computed.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </Section>
      <Section>
        <Label>Window</Label>
        <select value={config.window ?? 'last_7d'} onChange={e => upd({ window: e.target.value } as any)}
          className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none">
          {WINDOWS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
      </Section>
      <Section>
        <Label>Color</Label>
        <ColorRow value={config.color} onChange={c => upd({ color: c } as any)} />
      </Section>
    </div>
  );

  if (config.type === 'donut_chart') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Field (category)</Label>
        <select value={config.field_key} onChange={e => upd({ field_key: e.target.value } as any)}
          className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none">
          <option value="">— pick a field —</option>
          {schema.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </Section>
      <Section>
        <Label>Aggregation</Label>
        <div className="flex gap-2">
          {(['count', 'sum'] as const).map(a => (
            <button key={a} type="button" onClick={() => upd({ aggregation: a } as any)}
              className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${config.aggregation === a ? 'text-white' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}
              style={config.aggregation === a ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}>
              {a}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );

  if (config.type === 'progress_ring' || config.type === 'progress_bar') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Computed property</Label>
        <select value={config.computed_key} onChange={e => upd({ computed_key: e.target.value } as any)}
          className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none">
          <option value="">— pick a computed property —</option>
          {computed.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </Section>
      <Section>
        <Label>Goal</Label>
        <input type="number" value={config.goal ?? ''} onChange={e => upd({ goal: Number(e.target.value) } as any)}
          className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none" placeholder="e.g. 2000" />
      </Section>
      <Section>
        <Label>Color</Label>
        <ColorRow value={config.color} onChange={c => upd({ color: c } as any)} />
      </Section>
    </div>
  );

  if (config.type === 'text') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Content</Label>
        <DebouncedInput value={config.content} onChange={v => upd({ content: v } as any)} multiline placeholder="Enter text…" />
      </Section>
      <Section>
        <Label>Size</Label>
        <div className="flex gap-1.5">
          {(['sm', 'md', 'lg'] as const).map(s => (
            <button key={s} type="button" onClick={() => upd({ size: s } as any)}
              className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${config.size === s ? 'text-white' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}
              style={config.size === s ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </Section>
      <Section>
        <Label>Weight</Label>
        <div className="flex gap-1.5">
          {([400, 500] as const).map(w => (
            <button key={w} type="button" onClick={() => upd({ weight: w } as any)}
              className={`flex-1 py-1.5 rounded-lg border text-[11px] transition-all ${config.weight === w ? 'text-white' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}
              style={config.weight === w ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}>
              {w === 400 ? 'Regular' : 'Medium'}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );

  if (config.type === 'spacer') return (
    <Section>
      <Label>Size</Label>
      <div className="flex gap-1.5">
        {(['sm', 'md', 'lg'] as const).map(s => (
          <button key={s} type="button" onClick={() => upd({ size: s } as any)}
            className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${config.size === s ? 'text-white' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}
            style={config.size === s ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>
    </Section>
  );

  if (config.type === 'entry_list') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Max entries</Label>
        <input type="number" min={1} max={20} value={config.limit} onChange={e => upd({ limit: Number(e.target.value) } as any)}
          className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
      </Section>
      <Section>
        <Label>Visible fields</Label>
        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
          {schema.map(f => (
            <label key={f.key} className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" className="accent-modules-aly"
                checked={config.show_fields.includes(f.key)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...config.show_fields, f.key]
                    : config.show_fields.filter(k => k !== f.key);
                  upd({ show_fields: next } as any);
                }} />
              <span className="text-[12px] text-text-secondary">{f.label}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );

  if (config.type === 'action_button') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Label</Label>
        <DebouncedInput value={config.label} onChange={v => upd({ label: v } as any)} placeholder="e.g. Log Meal" />
      </Section>
      <Section>
        <Label>Action</Label>
        <select value={config.action_id ?? ''} onChange={e => upd({ action_id: e.target.value } as any)}
          className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none">
          <option value="">Open entry sheet (default)</option>
          {actions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Section>
      <Section>
        <Label>Style</Label>
        <div className="flex gap-1.5">
          {(['primary', 'outline'] as const).map(s => (
            <button key={s} type="button" onClick={() => upd({ style: s } as any)}
              className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition-all capitalize ${config.style === s ? 'text-white' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}
              style={config.style === s ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}>
              {s}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );

  return <p className="text-[11px] text-text-tertiary/60">No configuration needed.</p>;
}

// ── Row layout config ─────────────────────────────────────────────────────────

function RowLayoutConfig({ row, onUpdate, brandColor }: {
  row:       WidgetRow;
  onUpdate:  (patch: { justify?: WidgetRowJustify; align?: WidgetRowAlign }) => void;
  brandColor: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Justify</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['start','center','end','between'] as WidgetRowJustify[]).map(v => (
            <button key={v} type="button" onClick={() => onUpdate({ justify: v })}
              className={`py-1.5 rounded-lg border text-[11px] font-medium transition-all capitalize ${row.justify === v ? 'text-white' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}
              style={row.justify === v ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}>
              {v}
            </button>
          ))}
        </div>
      </Section>
      <Section>
        <Label>Align</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {(['top','middle','bottom','stretch'] as WidgetRowAlign[]).map(v => (
            <button key={v} type="button" onClick={() => onUpdate({ align: v })}
              className={`py-1.5 rounded-lg border text-[11px] font-medium transition-all capitalize ${row.align === v ? 'text-white' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}
              style={row.align === v ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}>
              {v}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  rows:          WidgetRow[];
  selectedRowId: string | null;
  selectedElId:  string | null;
  computed:      ComputedProperty[];
  schema:        SchemaField[];
  actions:       ModuleAction[];
  brandColor:    string;
  assistantName: string;
  onUpdateEl:    (rowId: string, elId: string, patch: Partial<WidgetElementConfig>) => void;
  onUpdateRow:   (rowId: string, patch: { justify?: WidgetRowJustify; align?: WidgetRowAlign }) => void;
}

export function WidgetConfigPanel({
  rows, selectedRowId, selectedElId, computed, schema, actions,
  brandColor, assistantName, onUpdateEl, onUpdateRow,
}: Props) {
  const [tab, setTab] = React.useState<'configure' | 'chat'>('configure');

  const selectedRow = selectedRowId ? rows.find(r => r.id === selectedRowId) : null;
  const selectedEl  = selectedRow && selectedElId ? selectedRow.elements.find(e => e.id === selectedElId) : null;

  return (
    <div className="w-64 border-l border-border-primary bg-background-secondary flex flex-col h-full shrink-0">
      {/* Tab strip */}
      <div className="flex gap-1 p-2 border-b border-border-primary shrink-0">
        {(['configure', 'chat'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-xl transition-all border ${
              tab === t ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'text-text-tertiary hover:bg-background-tertiary border-transparent'
            }`}>
            {t === 'chat' ? `Ask ${assistantName}` : 'Configure'}
          </button>
        ))}
      </div>

      {tab === 'configure' && (
        <div className="flex-1 overflow-y-auto p-4">
          {selectedEl ? (
            <ElementConfig
              config={selectedEl.config}
              onUpdate={patch => onUpdateEl(selectedRowId!, selectedElId!, patch)}
              computed={computed}
              schema={schema}
              actions={actions}
              brandColor={brandColor}
            />
          ) : selectedRow ? (
            <RowLayoutConfig
              row={selectedRow}
              onUpdate={patch => onUpdateRow(selectedRowId!, patch)}
              brandColor={brandColor}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CursorText size={24} className="text-text-tertiary/30" />
              <p className="text-xs text-text-tertiary">Select an element to configure it, or click a row to adjust layout.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center p-4 text-center gap-3">
          <Sparkle size={20} className="text-modules-aly/40" />
          <p className="text-xs text-text-tertiary">Widget AI assistant coming soon.</p>
        </div>
      )}
    </div>
  );
}
