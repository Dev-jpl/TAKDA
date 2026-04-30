"use client";

import React, { useCallback, useState } from 'react';
import {
  Plus, Trash, CaretDown, CaretUp, X, DotsSixVertical,
  Table, GearSix, ClockCounterClockwise, ArrowsLeftRight,
  TextT, Hash, ToggleLeft, CalendarBlank, ListBullets,
  ArrowsCounterClockwise, Rows, LinkSimple, Image, TextAlignLeft,
} from '@phosphor-icons/react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import type {
  SchemaCollection, SchemaField, FieldType, CollectionRole,
  ComputedProperty, ComputedOperation, ComputedWindow, FieldConfig,
} from '@/types/module-creator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function uid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

// ── Type metadata ─────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType }[] = [
  { value: 'text',         label: 'Text',        icon: TextT },
  { value: 'number',       label: 'Number',      icon: Hash },
  { value: 'boolean',      label: 'Boolean',     icon: ToggleLeft },
  { value: 'date',         label: 'Date',        icon: CalendarBlank },
  { value: 'datetime',     label: 'DateTime',    icon: CalendarBlank },
  { value: 'select',       label: 'Select',      icon: ListBullets },
  { value: 'multi_select', label: 'Multi-select',icon: ListBullets },
  { value: 'counter',      label: 'Counter',     icon: ArrowsCounterClockwise },
  { value: 'list',         label: 'List',        icon: Rows },
  { value: 'relation',     label: 'Relation',    icon: LinkSimple },
  { value: 'rich_text',    label: 'Rich Text',   icon: TextAlignLeft },
  { value: 'media',        label: 'Media',       icon: Image },
];

const FIELD_ICON: Record<string, React.ElementType> = Object.fromEntries(
  FIELD_TYPES.map(t => [t.value, t.icon]),
);

const ROLE_ICONS: Record<CollectionRole, React.ElementType> = {
  primary:  Table,
  config:   GearSix,
  log:      ClockCounterClockwise,
  junction: ArrowsLeftRight,
};

const ROLE_LABELS: Record<CollectionRole, string> = {
  primary:  'Primary',
  config:   'Config',
  log:      'Log',
  junction: 'Junction',
};

const COMPUTED_OPS: { value: ComputedOperation; label: string }[] = [
  { value: 'sum',       label: 'Sum' },
  { value: 'avg',       label: 'Average' },
  { value: 'min',       label: 'Min' },
  { value: 'max',       label: 'Max' },
  { value: 'count',     label: 'Count' },
  { value: 'streak',    label: 'Streak' },
  { value: 'formula',   label: 'Formula' },
  { value: 'progress',  label: 'Progress' },
  { value: 'trend',     label: 'Trend' },
  { value: 'threshold', label: 'Threshold' },
];

const WINDOWS: { value: ComputedWindow; label: string }[] = [
  { value: 'today',    label: 'Today' },
  { value: 'week',     label: 'This week' },
  { value: 'month',    label: 'This month' },
  { value: 'last_7d',  label: 'Last 7 days' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'all',      label: 'All time' },
];

// ── Shared small components ───────────────────────────────────────────────────

function SmallInput({ value, onChange, placeholder, mono = false, type = 'text' }: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none focus:border-modules-aly/50 w-20 ${mono ? 'font-mono' : ''}`}
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-modules-aly' : 'bg-background-tertiary border border-border-primary'}`}
    >
      <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ── Field config panel ────────────────────────────────────────────────────────

function FieldConfigPanel({
  field, collKey, allCollections, onChange,
}: {
  field: SchemaField;
  collKey: string;
  allCollections: Record<string, SchemaCollection>;
  onChange: (patch: Partial<SchemaField>) => void;
}) {
  const cfg = field.config ?? {};
  const patchCfg = (p: Partial<FieldConfig>) => onChange({ config: { ...cfg, ...p } });

  const otherColls = Object.values(allCollections).filter(c => c.key !== collKey);
  const targetColl = cfg.target_schema_key ? allCollections[cfg.target_schema_key] : null;

  // Tag options input state
  const [optInput, setOptInput] = useState('');
  const addOption = () => {
    const v = optInput.trim();
    if (!v) return;
    patchCfg({ options: [...(cfg.options ?? []), v] });
    setOptInput('');
  };

  return (
    <div className="border-t border-border-primary/30 bg-background-tertiary/40 px-4 py-3 flex flex-col gap-3">

      {/* Type selector */}
      <div>
        <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest mb-1.5">Type</p>
        <div className="grid grid-cols-4 gap-1">
          {FIELD_TYPES.map(t => {
            const Icon = t.icon;
            const active = field.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange({ type: t.value })}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] transition-all ${active ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}
              >
                <Icon size={11} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Type-specific config */}
      {(field.type === 'select' || field.type === 'multi_select') && (
        <div>
          <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest mb-1.5">Options</p>
          <div className="flex flex-wrap gap-1 mb-1.5 min-h-6">
            {(cfg.options ?? []).map(opt => (
              <span key={opt} className="flex items-center gap-1 text-[10px] bg-modules-aly/10 text-modules-aly rounded-md px-1.5 py-0.5">
                {opt}
                <button type="button" onClick={() => patchCfg({ options: cfg.options?.filter(o => o !== opt) })}><X size={9} /></button>
              </span>
            ))}
            <input
              value={optInput}
              onChange={e => setOptInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addOption(); } }}
              placeholder="Add option…"
              className="bg-transparent text-[11px] text-text-primary outline-none min-w-20 flex-1 placeholder:text-text-tertiary/50"
            />
          </div>
        </div>
      )}

      {(field.type === 'number' || field.type === 'counter') && (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Min</span><SmallInput value={cfg.min ?? ''} onChange={v => patchCfg({ min: v ? Number(v) : undefined })} type="number" /></label>
          <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Max</span><SmallInput value={cfg.max ?? ''} onChange={v => patchCfg({ max: v ? Number(v) : undefined })} type="number" /></label>
          <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Unit</span><SmallInput value={cfg.unit ?? ''} onChange={v => patchCfg({ unit: v })} placeholder="e.g. kg" /></label>
          <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Step</span><SmallInput value={cfg.step ?? ''} onChange={v => patchCfg({ step: v ? Number(v) : undefined })} type="number" /></label>
          {field.type === 'counter' && (
            <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Goal</span><SmallInput value={cfg.goal ?? ''} onChange={v => patchCfg({ goal: v ? Number(v) : undefined })} type="number" /></label>
          )}
        </div>
      )}

      {field.type === 'text' && (
        <label className="flex flex-col gap-1">
          <span className="text-[9px] text-text-tertiary">Placeholder</span>
          <input value={cfg.placeholder ?? ''} onChange={e => patchCfg({ placeholder: e.target.value })} placeholder="e.g. Enter value…" className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none focus:border-modules-aly/50 w-full" />
        </label>
      )}

      {field.type === 'relation' && (
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-[9px] text-text-tertiary">Target collection</span>
            <select value={cfg.target_schema_key ?? ''} onChange={e => patchCfg({ target_schema_key: e.target.value, display_field: '' })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
              <option value="">— pick collection —</option>
              {otherColls.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          {targetColl && (
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-[9px] text-text-tertiary">Display field</span>
              <select value={cfg.display_field ?? ''} onChange={e => patchCfg({ display_field: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
                <option value="">— pick field —</option>
                {targetColl.fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {field.type === 'list' && (
        <label className="flex flex-col gap-1">
          <span className="text-[9px] text-text-tertiary">Max items</span>
          <SmallInput value={cfg.max_items ?? ''} onChange={v => patchCfg({ max_items: v ? Number(v) : undefined })} type="number" />
        </label>
      )}

      {field.type === 'media' && (
        <div>
          <p className="text-[9px] text-text-tertiary mb-1.5">Accept</p>
          <div className="flex gap-2">
            {(['image', 'any'] as const).map(a => (
              <label key={a} className="flex items-center gap-1.5 text-[11px] text-text-secondary cursor-pointer">
                <input type="radio" checked={cfg.accept === a} onChange={() => patchCfg({ accept: a })} className="accent-modules-aly" />
                {a === 'image' ? 'Images only' : 'Any file'}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Default value */}
      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-text-tertiary">Default value</span>
        <input value={cfg.default_expr ?? ''} onChange={e => patchCfg({ default_expr: e.target.value })} placeholder="now(), last_entry.field_key, or static value" className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none focus:border-modules-aly/50 w-full font-mono" />
      </label>

      {/* Conditional visibility */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Toggle checked={!!cfg.condition} onChange={v => patchCfg({ condition: v ? { field: '', operator: 'eq' } : null })} />
          <span className="text-[11px] text-text-secondary">Only show when…</span>
        </div>
        {cfg.condition && (
          <div className="flex gap-2 items-center flex-wrap">
            <select value={cfg.condition.field} onChange={e => patchCfg({ condition: { ...cfg.condition!, field: e.target.value } })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
              <option value="">field…</option>
            </select>
            <select value={cfg.condition.operator} onChange={e => patchCfg({ condition: { ...cfg.condition!, operator: e.target.value as any } })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
              {['eq','neq','gt','lt','empty','not_empty'].map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            {!['empty','not_empty'].includes(cfg.condition.operator) && (
              <input value={String(cfg.condition.value ?? '')} onChange={e => patchCfg({ condition: { ...cfg.condition!, value: e.target.value } })} placeholder="value" className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none w-24" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Computed property edit panel ──────────────────────────────────────────────

function ComputedEditPanel({
  prop, allCollections, allComputed, onChange, onClose,
}: {
  prop: ComputedProperty;
  allCollections: Record<string, SchemaCollection>;
  allComputed: ComputedProperty[];
  onChange: (p: ComputedProperty) => void;
  onClose: () => void;
}) {
  const collList = Object.values(allCollections);
  const otherComputed = allComputed.filter(c => c.key !== prop.key);
  const sourceFields = prop.source_schema_key
    ? (allCollections[prop.source_schema_key]?.fields ?? [])
    : collList[0]?.fields ?? [];

  const isAggregate = ['sum','avg','min','max','count'].includes(prop.type);

  return (
    <div className="bg-background-tertiary/40 border-t border-border-primary/30 px-4 py-3 flex flex-col gap-3">
      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-[9px] text-text-tertiary">Label</span>
          <input value={prop.label} onChange={e => onChange({ ...prop, label: e.target.value, key: prop.key || toKey(e.target.value) })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none focus:border-modules-aly/50 w-full" />
        </label>
        <label className="flex flex-col gap-1 w-36">
          <span className="text-[9px] text-text-tertiary">Key</span>
          <input value={prop.key} onChange={e => onChange({ ...prop, key: toKey(e.target.value) })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none focus:border-modules-aly/50 font-mono" />
        </label>
      </div>

      {/* Type selector */}
      <div>
        <p className="text-[9px] text-text-tertiary mb-1.5">Type</p>
        <div className="flex flex-wrap gap-1">
          {COMPUTED_OPS.map(op => (
            <button key={op.value} type="button" onClick={() => onChange({ ...prop, type: op.value })}
              className={`px-2.5 py-1 rounded-lg border text-[10px] transition-all ${prop.type === op.value ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type-specific config */}
      {isAggregate && (
        <div className="flex gap-3 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-text-tertiary">Collection</span>
            <select value={prop.source_schema_key ?? ''} onChange={e => onChange({ ...prop, source_schema_key: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
              {collList.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-text-tertiary">Field</span>
            <select value={prop.source_field ?? ''} onChange={e => onChange({ ...prop, source_field: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
              <option value="">— field —</option>
              {sourceFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-text-tertiary">Window</span>
            <select value={prop.window ?? 'all'} onChange={e => onChange({ ...prop, window: e.target.value as ComputedWindow })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
              {WINDOWS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {prop.type === 'formula' && (
        <label className="flex flex-col gap-1">
          <span className="text-[9px] text-text-tertiary">Expression</span>
          <textarea value={prop.expression ?? ''} onChange={e => onChange({ ...prop, expression: e.target.value })} rows={2} placeholder="entry.calories * 4 + entry.protein * 4" className="bg-background-primary border border-border-primary rounded-lg px-2 py-1.5 text-[11px] text-text-primary outline-none font-mono focus:border-modules-aly/50 resize-none w-full" />
          <span className="text-[9px] text-text-tertiary/60">Use entry.field_key or computed.key</span>
        </label>
      )}

      {prop.type === 'progress' && (
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-[9px] text-text-tertiary">Source (computed)</span>
            <select value={prop.source_field ?? ''} onChange={e => onChange({ ...prop, source_field: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
              <option value="">— pick computed —</option>
              {otherComputed.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-text-tertiary">Goal</span>
            <SmallInput value={prop.goal_value ?? ''} onChange={v => onChange({ ...prop, goal_value: v ? Number(v) : undefined })} type="number" />
          </label>
        </div>
      )}

      {prop.type === 'streak' && (
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-[9px] text-text-tertiary">Collection</span>
            <select value={prop.source_schema_key ?? ''} onChange={e => onChange({ ...prop, source_schema_key: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
              {collList.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {prop.type === 'trend' && (
        <label className="flex flex-col gap-1">
          <span className="text-[9px] text-text-tertiary">Source (computed)</span>
          <select value={prop.source_field ?? ''} onChange={e => onChange({ ...prop, source_field: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
            <option value="">— pick computed —</option>
            {otherComputed.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
      )}

      {prop.type === 'threshold' && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-text-tertiary">Source (computed)</span>
            <select value={prop.source_field ?? ''} onChange={e => onChange({ ...prop, source_field: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
              <option value="">— pick computed —</option>
              {otherComputed.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <p className="text-[9px] text-text-tertiary">Thresholds</p>
          {(prop.thresholds ?? []).map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-text-tertiary">≤</span>
              <SmallInput value={t.value} onChange={v => {
                const ts = [...(prop.thresholds ?? [])];
                ts[i] = { ...t, value: Number(v) };
                onChange({ ...prop, thresholds: ts });
              }} type="number" />
              <div className="flex gap-1">
                {(['green','yellow','red'] as const).map(s => (
                  <button key={s} type="button" onClick={() => {
                    const ts = [...(prop.thresholds ?? [])];
                    ts[i] = { ...t, status: s };
                    onChange({ ...prop, thresholds: ts });
                  }} className={`w-4 h-4 rounded-full border-2 transition-all ${t.status === s ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: s === 'green' ? '#22c55e' : s === 'yellow' ? '#f59e0b' : '#ef4444' }} />
                ))}
              </div>
              <button type="button" onClick={() => onChange({ ...prop, thresholds: (prop.thresholds ?? []).filter((_, j) => j !== i) })} className="text-text-tertiary hover:text-red-400"><X size={11} /></button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...prop, thresholds: [...(prop.thresholds ?? []), { value: 0, status: 'green' }] })} className="text-[10px] text-text-tertiary hover:text-modules-aly flex items-center gap-1 self-start"><Plus size={11} /> Add threshold</button>
        </div>
      )}

      {/* Format + unit */}
      <div className="flex gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[9px] text-text-tertiary">Format</span>
          <select value={prop.format ?? 'number'} onChange={e => onChange({ ...prop, format: e.target.value as any })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
            {['number','percent','decimal','duration','status'].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] text-text-tertiary">Unit</span>
          <SmallInput value={prop.unit ?? ''} onChange={v => onChange({ ...prop, unit: v })} placeholder="kcal" />
        </label>
        {prop.format === 'decimal' && (
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-text-tertiary">Precision</span>
            <SmallInput value={prop.precision ?? 0} onChange={v => onChange({ ...prop, precision: Number(v) })} type="number" />
          </label>
        )}
        <button type="button" onClick={onClose} className="ml-auto text-[10px] text-text-tertiary hover:text-text-primary border border-border-primary rounded-lg px-2.5 py-1">Done</button>
      </div>
    </div>
  );
}

// ── Collection card ───────────────────────────────────────────────────────────

function CollectionCard({
  collection, isOnly, allCollections, onUpdate, onDelete,
}: {
  collection: SchemaCollection;
  isOnly: boolean;
  allCollections: Record<string, SchemaCollection>;
  onUpdate: (updated: SchemaCollection) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded]     = useState(true);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = React.useRef<number | null>(null);

  const RoleIcon = ROLE_ICONS[collection.role];

  const updateField = (idx: number, patch: Partial<SchemaField>) => {
    const fields = [...collection.fields];
    fields[idx] = { ...fields[idx], ...patch };
    onUpdate({ ...collection, fields });
  };

  const addField = () => {
    const newField: SchemaField = { key: `field_${uid()}`, label: 'New field', type: 'text', required: false };
    onUpdate({ ...collection, fields: [...collection.fields, newField] });
    setExpandedField(newField.key);
  };

  const removeField = (idx: number) => {
    onUpdate({ ...collection, fields: collection.fields.filter((_, i) => i !== idx) });
    setExpandedField(null);
  };

  const handleDragStart = (idx: number, e: React.DragEvent) => {
    dragIdxRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdxRef.current !== null && idx !== dragIdxRef.current) setDragOverIdx(idx);
  };
  const handleDrop = (idx: number) => {
    const from = dragIdxRef.current;
    dragIdxRef.current = null;
    setDragOverIdx(null);
    if (from === null || from === idx) return;
    const fields = [...collection.fields];
    const [moved] = fields.splice(from, 1);
    fields.splice(idx, 0, moved);
    onUpdate({ ...collection, fields });
  };

  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden mb-3">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 group/coll">
        <RoleIcon size={14} className="text-text-tertiary shrink-0" />
        <input
          value={collection.label}
          onChange={e => onUpdate({ ...collection, label: e.target.value })}
          onBlur={e => onUpdate({ ...collection, label: e.target.value, key: collection.key || toKey(e.target.value) })}
          className="bg-transparent text-sm font-medium text-text-primary outline-none flex-1 min-w-0"
        />
        <span className="text-[10px] font-mono text-text-tertiary/60">· {collection.key}</span>
        <button type="button" onClick={() => setExpanded(v => !v)} className="p-1 text-text-tertiary hover:text-text-primary">
          {expanded ? <CaretUp size={13} /> : <CaretDown size={13} />}
        </button>
        <button type="button" onClick={onDelete} disabled={isOnly} className="p-1 text-text-tertiary hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed opacity-0 group-hover/coll:opacity-100 transition-opacity">
          <Trash size={13} />
        </button>
      </div>

      {expanded && (
        <>
          {/* Role selector */}
          <div className="px-4 py-2.5 border-t border-border-primary/50 flex gap-1.5">
            {(['primary','config','log','junction'] as CollectionRole[]).map(role => (
              <button key={role} type="button" onClick={() => onUpdate({ ...collection, role })}
                className={`px-2.5 py-1 rounded-lg border text-[10px] transition-all ${collection.role === role ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          {/* Toggles */}
          <div className="px-4 py-2.5 border-t border-border-primary/50 flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Toggle checked={collection.singleton ?? false} onChange={v => onUpdate({ ...collection, singleton: v })} />
              <span className="text-[11px] text-text-secondary">Singleton</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Toggle checked={collection.is_ordered ?? false} onChange={v => onUpdate({ ...collection, is_ordered: v })} />
              <span className="text-[11px] text-text-secondary">Ordered</span>
            </label>
          </div>

          {/* Fields */}
          <div className="border-t border-border-primary/50 px-4 pt-3 pb-2">
            {collection.fields.length === 0 && (
              <p className="text-[11px] text-text-tertiary/50 py-3 text-center">No fields yet</p>
            )}
            {collection.fields.map((field, idx) => {
              const FieldIcon = FIELD_ICON[field.type] ?? TextT;
              const isExpanded = expandedField === field.key;
              return (
                <div key={field.key} onDragOver={e => handleDragOver(idx, e)} onDrop={() => handleDrop(idx)}
                  className={`border-b border-border-primary/30 last:border-0 ${dragOverIdx === idx ? 'border-t-2 border-t-modules-aly/60' : ''}`}>
                  <div className="flex items-center gap-2 py-1.5 group/field">
                    <div draggable onDragStart={e => handleDragStart(idx, e)} className="cursor-grab text-text-tertiary/40 hover:text-text-tertiary shrink-0">
                      <DotsSixVertical size={13} />
                    </div>
                    <FieldIcon size={12} className="text-text-tertiary/70 shrink-0" />
                    <input
                      value={field.label}
                      onChange={e => updateField(idx, { label: e.target.value })}
                      onBlur={e => updateField(idx, { label: e.target.value, key: field.key || toKey(e.target.value) })}
                      className="bg-transparent text-[12px] text-text-primary outline-none flex-1 min-w-0"
                    />
                    <span className="text-[9px] font-mono text-text-tertiary/50 max-w-24 truncate shrink-0">{field.key}</span>
                    <button type="button" onClick={() => updateField(idx, { required: !field.required })}
                      className={`text-[11px] shrink-0 transition-colors ${field.required ? 'text-modules-aly' : 'text-text-tertiary/40 hover:text-text-tertiary'}`}
                      title="Required">✱</button>
                    <button type="button" onClick={() => setExpandedField(isExpanded ? null : field.key)} className="text-text-tertiary hover:text-text-primary shrink-0">
                      {isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
                    </button>
                    <button type="button" onClick={() => removeField(idx)} className="text-text-tertiary hover:text-red-400 opacity-0 group-hover/field:opacity-100 shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                  {isExpanded && (
                    <FieldConfigPanel
                      field={field}
                      collKey={collection.key}
                      allCollections={allCollections}
                      onChange={patch => updateField(idx, patch)}
                    />
                  )}
                </div>
              );
            })}
            <button type="button" onClick={addField} className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-modules-aly py-2 transition-colors">
              <Plus size={11} /> Add field
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Right column: schema summary ──────────────────────────────────────────────

function SchemaSummary({ collections, computedProps }: { collections: SchemaCollection[]; computedProps: ComputedProperty[] }) {
  // Collect relation links
  const relations: { from: string; to: string; via: string }[] = [];
  for (const coll of collections) {
    for (const f of coll.fields) {
      if (f.type === 'relation' && f.config?.target_schema_key) {
        relations.push({ from: coll.label, to: f.config.target_schema_key, via: f.label });
      }
    }
  }

  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl p-4 flex flex-col gap-3 sticky top-4">
      <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest">Schema</p>
      {collections.length === 0 && (
        <p className="text-[11px] text-text-tertiary/50">No collections yet</p>
      )}
      {collections.map(c => {
        const RoleIcon = ROLE_ICONS[c.role];
        return (
          <div key={c.key} className="flex items-start gap-2">
            <RoleIcon size={12} className="text-text-tertiary/60 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium text-text-primary truncate">{c.label || '—'}</span>
                <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-background-tertiary text-text-tertiary shrink-0">{c.role}</span>
              </div>
              <span className="text-[10px] text-text-tertiary">{c.fields.length} field{c.fields.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        );
      })}

      {computedProps.length > 0 && (
        <>
          <div className="border-t border-border-primary/50 pt-3">
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest mb-2">Computed</p>
            {computedProps.map(p => (
              <div key={p.key} className="flex items-center gap-2 py-0.5">
                <span className="text-[11px] font-mono text-modules-aly/70 w-6 text-center">f</span>
                <span className="text-[11px] text-text-secondary flex-1 truncate">{p.label}</span>
                <span className="text-[9px] text-text-tertiary">{p.type}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {relations.length > 0 && (
        <div className="border-t border-border-primary/50 pt-3">
          <p className="text-[9px] text-text-tertiary uppercase tracking-widest mb-2">Relations</p>
          {relations.map((r, i) => (
            <div key={i} className="text-[10px] text-text-secondary py-0.5">
              <span className="font-medium">{r.from}</span>
              <span className="text-text-tertiary"> → </span>
              <span className="font-medium">{r.to}</span>
              <span className="text-text-tertiary"> via {r.via}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SchemaPage() {
  const { definition, updateSchemas, updateComputedProperties } = useModuleEditor();
  const [editingComputed, setEditingComputed] = useState<string | null>(null);
  const [draftComputed,   setDraftComputed]   = useState<ComputedProperty | null>(null);

  if (!definition) {
    return <div className="flex items-center justify-center h-full"><span className="text-text-tertiary text-sm">Loading…</span></div>;
  }

  const schemas = definition.schemas ?? {};
  const computed = definition.computed_properties ?? [];
  const collections = Object.values(schemas);

  // Migration banner: if schemas empty but legacy schema has fields
  const showMigrationBanner = collections.length === 0 && (definition.schema?.length ?? 0) > 0;

  const migrateSchema = () => {
    const defaultColl: SchemaCollection = {
      key:    'default',
      label:  definition.name || 'Default',
      role:   'primary',
      fields: definition.schema as SchemaField[],
    };
    updateSchemas({ default: defaultColl });
  };

  const addCollection = () => {
    const key = `collection_${uid()}`;
    const newColl: SchemaCollection = { key, label: 'New Collection', role: 'primary', fields: [] };
    updateSchemas({ ...schemas, [key]: newColl });
  };

  const updateCollection = useCallback((key: string, updated: SchemaCollection) => {
    updateSchemas({ ...schemas, [key]: updated });
  }, [schemas, updateSchemas]);

  const deleteCollection = useCallback((key: string) => {
    const next = { ...schemas };
    delete next[key];
    updateSchemas(next);
  }, [schemas, updateSchemas]);

  const addComputed = () => {
    const key = `computed_${uid()}`;
    const draft: ComputedProperty = { key, label: 'New property', type: 'sum', format: 'number' };
    setDraftComputed(draft);
    setEditingComputed(key);
  };

  const saveComputed = (p: ComputedProperty) => {
    const existing = computed.find(c => c.key === p.key);
    const next = existing ? computed.map(c => c.key === p.key ? p : c) : [...computed, p];
    updateComputedProperties(next);
    setEditingComputed(null);
    setDraftComputed(null);
  };

  const deleteComputed = (key: string) => {
    updateComputedProperties(computed.filter(c => c.key !== key));
    if (editingComputed === key) { setEditingComputed(null); setDraftComputed(null); }
  };

  return (
    <div className="flex gap-6 p-5 h-full overflow-hidden">

      {/* ── Left column ── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 min-w-0 pr-1">

        {/* Migration banner */}
        {showMigrationBanner && (
          <div className="bg-modules-aly/5 border border-modules-aly/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-[11px] text-text-secondary flex-1">Your module uses a legacy flat schema. Convert it to a collection to unlock V2 features.</span>
            <button type="button" onClick={migrateSchema} className="text-[11px] bg-modules-aly/10 text-modules-aly border border-modules-aly/20 rounded-lg px-3 py-1 hover:bg-modules-aly hover:text-white transition-all shrink-0">Convert</button>
          </div>
        )}

        {/* Collections section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Data Collections</p>
            <button type="button" onClick={addCollection} className="flex items-center gap-1 text-[11px] border border-border-primary rounded-xl px-3 py-1.5 text-text-tertiary hover:text-modules-aly hover:border-modules-aly/30 transition-all">
              <Plus size={12} /> Add Collection
            </button>
          </div>

          {collections.map(coll => (
            <CollectionCard
              key={coll.key}
              collection={coll}
              isOnly={collections.length === 1}
              allCollections={schemas}
              onUpdate={updated => updateCollection(coll.key, updated)}
              onDelete={() => {
                if (!window.confirm(`Delete collection "${coll.label}"?`)) return;
                deleteCollection(coll.key);
              }}
            />
          ))}

          {/* Add collection dashed button */}
          <button
            type="button"
            onClick={addCollection}
            className="w-full border-2 border-dashed border-border-primary rounded-xl py-5 text-[11px] text-text-tertiary hover:border-modules-aly/40 hover:text-modules-aly transition-all flex items-center justify-center gap-2"
          >
            <Plus size={13} /> Add Collection
          </button>
        </section>

        {/* Computed properties section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Computed Properties</p>
            <button type="button" onClick={addComputed} className="flex items-center gap-1 text-[11px] border border-border-primary rounded-xl px-3 py-1.5 text-text-tertiary hover:text-modules-aly hover:border-modules-aly/30 transition-all">
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden">
            {computed.length === 0 && !draftComputed && (
              <p className="text-[11px] text-text-tertiary/50 text-center py-6">No computed properties yet</p>
            )}

            {[...computed, ...(draftComputed && !computed.find(c => c.key === draftComputed.key) ? [draftComputed] : [])].map(p => {
              const isEditing = editingComputed === p.key;
              const displayProp = isEditing && draftComputed?.key === p.key ? draftComputed : p;
              return (
                <div key={p.key} className="border-b border-border-primary/30 last:border-0">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 group/cp">
                    <span className="text-[11px] font-mono text-modules-aly/70 w-5 text-center select-none">f</span>
                    <span className="text-[12px] text-text-primary flex-1">{displayProp.label || '—'}</span>
                    <span className="text-[10px] text-text-tertiary">{displayProp.type}{displayProp.window ? ` · ${displayProp.window}` : ''}</span>
                    <button type="button" onClick={() => { setEditingComputed(isEditing ? null : p.key); setDraftComputed(isEditing ? null : { ...p }); }} className="opacity-0 group-hover/cp:opacity-100 text-text-tertiary hover:text-text-primary transition-opacity">
                      {isEditing ? <CaretUp size={13} /> : <CaretDown size={13} />}
                    </button>
                    <button type="button" onClick={() => deleteComputed(p.key)} className="opacity-0 group-hover/cp:opacity-100 text-text-tertiary hover:text-red-400 transition-opacity"><X size={13} /></button>
                  </div>
                  {isEditing && draftComputed && (
                    <ComputedEditPanel
                      prop={draftComputed}
                      allCollections={schemas}
                      allComputed={computed}
                      onChange={setDraftComputed}
                      onClose={() => { saveComputed(draftComputed); }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── Right column (sticky summary) ── */}
      <div className="w-72 shrink-0">
        <SchemaSummary collections={collections} computedProps={computed} />
      </div>
    </div>
  );
}
