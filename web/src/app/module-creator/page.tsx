"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash, ArrowRight, ArrowLeft, FloppyDisk, Check,
  Sparkle, Lock, CaretDown, CaretUp, X, Tag,
  NumberSquareOne, NumberSquareTwo, NumberSquareThree, NumberSquareFour,
  ToggleLeft, CalendarBlank, ListBullets, ChartBar,
  NumberCircleOne, TextT, Hash, ArrowsCounterClockwise, SlidersHorizontal,
} from '@phosphor-icons/react';
import {
  ModuleDefinition, SchemaField, AlyConfig, FieldType, FieldConfig,
  createModuleDefinition,
} from '@/services/modules.service';
import { supabase } from '@/services/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Schema',  desc: 'Define your data fields' },
  { id: 2, label: 'Widget',  desc: 'Choose how it surfaces' },
  { id: 3, label: 'Aly',     desc: 'Configure assistant integration' },
  { id: 4, label: 'Review',  desc: 'Save your module' },
];

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'text',    label: 'Text',    icon: TextT,              desc: 'Short text or label' },
  { value: 'number',  label: 'Number',  icon: Hash,               desc: 'Numeric value' },
  { value: 'counter', label: 'Counter', icon: ArrowsCounterClockwise, desc: 'Number with goal' },
  { value: 'boolean', label: 'Yes / No',icon: ToggleLeft,         desc: 'True or false flag' },
  { value: 'date',    label: 'Date',    icon: CalendarBlank,      desc: 'Calendar date' },
  { value: 'select',  label: 'Select',  icon: ListBullets,        desc: 'One of several options' },
];

interface WidgetOption {
  type: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  /** Which schema field types are needed */
  needs: FieldType[];
}

const WIDGET_OPTIONS: WidgetOption[] = [
  { type: 'counter',      label: 'Counter',       icon: NumberCircleOne, desc: 'Running total today vs a goal.', needs: ['number', 'counter'] },
  { type: 'goal_progress',label: 'Goal Progress', icon: SlidersHorizontal, desc: 'Progress bar with macro breakdown.', needs: ['number', 'counter'] },
  { type: 'trend_chart',  label: 'Trend Chart',   icon: ChartBar,        desc: 'Bar chart over time with category split.', needs: ['number'] },
];

const inputCls = "w-full bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20 transition-all placeholder:text-text-tertiary";
const selectCls = `${inputCls} cursor-pointer`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function numberFields(schema: SchemaField[]) {
  return schema.filter(f => f.type === 'number' || f.type === 'counter');
}
function dateFields(schema: SchemaField[]) {
  return schema.filter(f => f.type === 'date');
}
function textFields(schema: SchemaField[]) {
  return schema.filter(f => f.type === 'text' || f.type === 'select');
}

// ── Live Preview ──────────────────────────────────────────────────────────────

function LivePreview({ schema, layout }: { schema: SchemaField[]; layout: Record<string, unknown> }) {
  const type = layout.type as string | undefined;

  if (!type) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <ChartBar size={28} className="text-text-tertiary/20" weight="duotone" />
        <p className="text-xs text-text-tertiary">Pick a widget type to see a preview.</p>
      </div>
    );
  }

  // Counter preview
  if (type === 'counter') {
    const valField = schema.find(f => f.key === layout.value_field);
    const unit  = (valField?.config?.unit ?? layout.unit ?? '') as string;
    const goal  = valField?.config?.goal ?? (layout.goal as number | undefined);
    const pct   = goal ? 37 : null; // mock 37% for demo
    return (
      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-text-primary leading-none tabular-nums">
              {goal ? Math.round(goal * 0.37) : 0}
              {unit && <span className="text-sm font-normal text-text-tertiary ml-1.5">{unit}</span>}
            </p>
            {goal && <p className="text-[10px] text-text-tertiary mt-1">goal: {goal} {unit}</p>}
          </div>
          {pct != null && <span className="text-sm font-bold text-indigo-400">{pct}%</span>}
        </div>
        {pct != null && (
          <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        )}
        <p className="text-[10px] text-text-tertiary italic">Preview — shows mock data</p>
      </div>
    );
  }

  // Goal progress preview
  if (type === 'goal_progress') {
    const goal = (layout.goal as number) || 2000;
    const unit = (layout.unit as string) || '';
    const total = Math.round(goal * 0.6);
    const pct = 60;
    return (
      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="grid grid-cols-5 gap-1 text-center">
          <div><p className="text-base font-bold text-text-primary">{goal}</p><p className="text-[9px] text-text-tertiary">Goal</p></div>
          <div className="flex items-center justify-center text-text-tertiary text-sm">−</div>
          <div><p className="text-base font-bold text-text-primary">{total}</p><p className="text-[9px] text-text-tertiary">Logged</p></div>
          <div className="flex items-center justify-center text-text-tertiary text-sm">=</div>
          <div><p className="text-base font-bold text-green-400">{goal - total}</p><p className="text-[9px] text-text-tertiary">Left</p></div>
        </div>
        <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-text-tertiary italic">Preview — shows mock data</p>
      </div>
    );
  }

  // Trend chart preview
  if (type === 'trend_chart' || type === 'chart') {
    const bars = [40, 75, 30, 90, 55, 20, 65];
    const max  = Math.max(...bars);
    return (
      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1 bg-background-tertiary rounded-xl p-3 border border-border-primary/50">
            <p className="text-[9px] text-text-tertiary font-bold uppercase">This Month</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">—</p>
          </div>
          <div className="flex-1 bg-background-tertiary rounded-xl p-3 border border-border-primary/50">
            <p className="text-[9px] text-text-tertiary font-bold uppercase">Today</p>
            <p className="text-xl font-bold text-text-primary mt-0.5">—</p>
          </div>
        </div>
        <div className="flex items-end gap-1 h-12 mt-2">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 rounded-sm bg-modules-aly/40" style={{ height: `${(b / max) * 100}%` }} />
          ))}
        </div>
        <p className="text-[10px] text-text-tertiary italic">Preview — shows mock data</p>
      </div>
    );
  }

  return null;
}

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({
  field, index, onUpdate, onRemove,
}: {
  field: SchemaField;
  index: number;
  onUpdate: (i: number, patch: Partial<SchemaField> & { config?: Partial<FieldConfig> }) => void;
  onRemove: (i: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasConfig = field.type === 'number' || field.type === 'counter' || field.type === 'select';
  const FieldIcon = FIELD_TYPES.find(t => t.value === field.type)?.icon ?? TextT;

  return (
    <div className="border border-border-primary rounded-xl bg-background-primary overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <FieldIcon size={14} className="text-text-tertiary shrink-0" />
        <input
          placeholder="field_key"
          className="bg-transparent text-xs text-modules-aly placeholder:text-text-tertiary outline-none w-24 shrink-0 font-mono"
          value={field.key}
          onChange={e => onUpdate(index, { key: toSlug(e.target.value) })}
        />
        <div className="w-px h-4 bg-border-primary shrink-0" />
        <input
          placeholder="Label"
          className="bg-transparent text-xs text-text-primary placeholder:text-text-tertiary outline-none flex-1"
          value={field.label}
          onChange={e => {
            const label = e.target.value;
            onUpdate(index, { label, key: field.key || toSlug(label) });
          }}
        />
        <select
          className="bg-background-secondary border border-border-primary rounded-lg px-2 py-1 text-xs text-text-secondary outline-none shrink-0"
          value={field.type}
          onChange={e => onUpdate(index, { type: e.target.value as FieldType })}
        >
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-1 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={field.required}
            onChange={e => onUpdate(index, { required: e.target.checked })}
            className="w-3 h-3 rounded accent-modules-aly"
          />
          <span className="text-[10px] text-text-tertiary">req</span>
        </label>
        {hasConfig && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 text-text-tertiary hover:text-text-primary transition-colors shrink-0"
          >
            {expanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
          </button>
        )}
        <button
          onClick={() => onRemove(index)}
          className="p-1 text-text-tertiary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
        >
          <Trash size={13} />
        </button>
      </div>

      {/* Type-specific config */}
      {expanded && hasConfig && (
        <div className="border-t border-border-primary/60 px-3 py-3 bg-background-secondary/30 flex flex-wrap gap-3">
          {(field.type === 'number' || field.type === 'counter') && (
            <>
              <label className="flex flex-col gap-1 min-w-20">
                <span className="text-[10px] text-text-tertiary">Unit</span>
                <input
                  placeholder="e.g. cups"
                  className="bg-background-primary border border-border-primary rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-modules-aly/40 w-24"
                  value={field.config?.unit ?? ''}
                  onChange={e => onUpdate(index, { config: { unit: e.target.value } })}
                />
              </label>
              {field.type === 'counter' && (
                <label className="flex flex-col gap-1 min-w-20">
                  <span className="text-[10px] text-text-tertiary">Daily goal</span>
                  <input
                    type="number"
                    placeholder="e.g. 8"
                    className="bg-background-primary border border-border-primary rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-modules-aly/40 w-24"
                    value={field.config?.goal ?? ''}
                    onChange={e => onUpdate(index, { config: { goal: Number(e.target.value) || undefined } })}
                  />
                </label>
              )}
              <label className="flex flex-col gap-1 min-w-16">
                <span className="text-[10px] text-text-tertiary">Min</span>
                <input
                  type="number"
                  className="bg-background-primary border border-border-primary rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-modules-aly/40 w-20"
                  value={field.config?.min ?? ''}
                  onChange={e => onUpdate(index, { config: { min: e.target.value === '' ? undefined : Number(e.target.value) } })}
                />
              </label>
              <label className="flex flex-col gap-1 min-w-16">
                <span className="text-[10px] text-text-tertiary">Max</span>
                <input
                  type="number"
                  className="bg-background-primary border border-border-primary rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-modules-aly/40 w-20"
                  value={field.config?.max ?? ''}
                  onChange={e => onUpdate(index, { config: { max: e.target.value === '' ? undefined : Number(e.target.value) } })}
                />
              </label>
            </>
          )}
          {field.type === 'select' && (
            <label className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] text-text-tertiary">Options (comma-separated)</span>
              <input
                placeholder="breakfast, lunch, dinner, snack"
                className="bg-background-primary border border-border-primary rounded-lg px-2 py-1.5 text-xs text-text-primary outline-none focus:border-modules-aly/40 w-full"
                value={(field.config?.options ?? []).join(', ')}
                onChange={e => onUpdate(index, {
                  config: { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) },
                })}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// ── Keyword tag input ─────────────────────────────────────────────────────────

function KeywordInput({
  keywords, onChange,
}: { keywords: string[]; onChange: (kw: string[]) => void }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const kw = input.trim().toLowerCase();
    if (!kw || keywords.includes(kw)) { setInput(''); return; }
    onChange([...keywords, kw]);
    setInput('');
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="min-h-10 flex flex-wrap gap-1.5 items-center bg-background-primary border border-border-primary rounded-xl px-3 py-2 cursor-text"
    >
      {keywords.map(kw => (
        <span
          key={kw}
          className="flex items-center gap-1 text-[11px] font-semibold bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-2 py-0.5 rounded-md"
        >
          {kw}
          <button onClick={e => { e.stopPropagation(); onChange(keywords.filter(k => k !== kw)); }}
            className="hover:text-red-400 transition-colors">
            <X size={9} weight="bold" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        placeholder={keywords.length === 0 ? 'Type a keyword and press Enter…' : ''}
        className="flex-1 min-w-24 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-tertiary"
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModuleCreatorPage() {
  const router = useRouter();
  const [step,    setStep]    = useState(1);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [userId,  setUserId]  = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      else router.push('/auth');
    });
  }, [router]);

  // ── Form state ──────────────────────────────────────────────────────────────

  const [name,        setName]        = useState('');
  const [slug,        setSlug]        = useState('');
  const [description, setDescription] = useState('');
  const [schema,      setSchema]      = useState<SchemaField[]>([]);
  const [layout,      setLayout]      = useState<Record<string, unknown>>({ type: '' });
  const [alyConfig,   setAlyConfig]   = useState<AlyConfig>({
    intent_keywords: [],
    context_hint:   '',
    log_prompt:     '',
  });

  // Auto-derive slug from name
  useEffect(() => {
    if (name) setSlug(toSlug(name));
  }, [name]);

  // ── Schema helpers ──────────────────────────────────────────────────────────

  const addField = () => setSchema(prev => [
    ...prev,
    { key: '', label: '', type: 'number', required: false },
  ]);

  const updateField = useCallback((index: number, patch: Partial<SchemaField> & { config?: Partial<FieldConfig> }) => {
    setSchema(prev => prev.map((f, i) => {
      if (i !== index) return f;
      const base = { ...f, ...patch };
      if (patch.config) base.config = { ...(f.config ?? {}), ...patch.config };
      return base;
    }));
  }, []);

  const removeField = useCallback((index: number) => {
    setSchema(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Layout helpers ──────────────────────────────────────────────────────────

  const patchLayout = (patch: Record<string, unknown>) =>
    setLayout(prev => ({ ...prev, ...patch }));

  // ── Validation ──────────────────────────────────────────────────────────────

  const step1Valid = name.trim().length > 0 && schema.length > 0 &&
    schema.every(f => f.key && f.label);

  const step2Valid = !!(layout.type) && (() => {
    const t = layout.type as string;
    if (t === 'counter')       return !!(layout.value_field);
    if (t === 'goal_progress') return !!(layout.aggregate && layout.dateField);
    if (t === 'trend_chart')   return !!(layout.aggregate && layout.dateField);
    return true;
  })();

  const step3Valid = alyConfig.context_hint.trim().length > 0;

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError('');
    try {
      await createModuleDefinition({
        user_id:       userId,
        slug,
        name:          name.trim(),
        description:   description.trim(),
        schema_fields: schema,
        layout,
        is_global:     false,
        is_private:    true,
        aly_config:    alyConfig,
      } as Parameters<typeof createModuleDefinition>[0]);
      router.push('/creator/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save module.');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived info for preview / review ───────────────────────────────────────

  const numFields  = useMemo(() => numberFields(schema), [schema]);
  const dtFields   = useMemo(() => dateFields(schema),   [schema]);
  const txtFields  = useMemo(() => textFields(schema),   [schema]);

  // ── Step indicator ──────────────────────────────────────────────────────────

  const StepDots = () => (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done    = step > s.id;
        const current = step === s.id;
        return (
          <React.Fragment key={s.id}>
            <button
              onClick={() => done && setStep(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                current ? 'bg-modules-aly/10 border border-modules-aly/30 text-modules-aly'
                : done   ? 'text-text-secondary hover:text-text-primary cursor-pointer'
                : 'text-text-tertiary cursor-default'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                done    ? 'bg-modules-aly border-modules-aly text-white'
                : current ? 'border-modules-aly text-modules-aly'
                : 'border-border-primary text-text-tertiary'
              }`}>
                {done ? <Check size={8} weight="bold" /> : s.id}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-5 ${done ? 'bg-modules-aly/40' : 'bg-border-primary'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-8">

        {/* ── Header ── */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center">
              <Sparkle size={20} className="text-modules-aly" weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Module Creator</h1>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-400/30 text-indigo-400">
                  <Lock size={9} /> Pro
                </span>
              </div>
              <p className="text-sm text-text-tertiary">Build a private custom module and install it on any hub.</p>
            </div>
          </div>
          <StepDots />
        </header>

        {/* ── Two-column body ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* Left: builder (3 cols) */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">

              {/* ── Step 1: Schema ── */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex flex-col gap-6">

                  {/* Basic info */}
                  <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Basic Info</h2>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-medium text-text-secondary block mb-1.5">Module name</label>
                        <input
                          autoFocus
                          placeholder="e.g. Water Tracker"
                          className={inputCls}
                          value={name}
                          onChange={e => setName(e.target.value)}
                        />
                        {slug && (
                          <p className="text-[10px] text-text-tertiary mt-1.5 pl-1">
                            slug: <span className="text-modules-aly font-mono">{slug}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary block mb-1.5">Description</label>
                        <textarea
                          rows={3}
                          placeholder="What does this module track? Be specific — Aly reads this to understand context."
                          className={`${inputCls} resize-none`}
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Schema fields */}
                  <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Data Schema</h2>
                        <p className="text-[10px] text-text-tertiary mt-0.5">Each field is a column in every logged entry.</p>
                      </div>
                      <button
                        onClick={addField}
                        className="flex items-center gap-1.5 text-xs font-semibold text-modules-aly bg-modules-aly/8 hover:bg-modules-aly/15 border border-modules-aly/20 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Plus size={12} weight="bold" /> Add Field
                      </button>
                    </div>

                    {schema.length === 0 ? (
                      <div className="border border-dashed border-border-primary rounded-xl py-8 text-center">
                        <p className="text-xs text-text-tertiary">No fields yet. Add at least one to continue.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {schema.map((f, i) => (
                          <FieldRow key={i} field={f} index={i} onUpdate={updateField} onRemove={removeField} />
                        ))}
                      </div>
                    )}

                    {/* Field type legend */}
                    {schema.length === 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                        {FIELD_TYPES.map(ft => (
                          <div key={ft.value} className="flex items-center gap-2 p-2 rounded-lg bg-background-primary border border-border-primary/60">
                            <ft.icon size={14} className="text-text-tertiary shrink-0" />
                            <div>
                              <p className="text-[11px] font-semibold text-text-secondary">{ft.label}</p>
                              <p className="text-[9px] text-text-tertiary">{ft.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    disabled={!step1Valid}
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center gap-2 bg-modules-aly text-white font-semibold py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
                  >
                    Choose Widget <ArrowRight size={15} weight="bold" />
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Widget ── */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex flex-col gap-6">

                  {/* Widget type picker */}
                  <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Widget Type</h2>
                    <div className="flex flex-col gap-2">
                      {WIDGET_OPTIONS.map(opt => {
                        const selected = layout.type === opt.type;
                        const hasNeeded = opt.needs.some(n => schema.some(f => f.type === n));
                        return (
                          <button
                            key={opt.type}
                            onClick={() => patchLayout({ type: opt.type })}
                            disabled={!hasNeeded}
                            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                              selected    ? 'border-modules-aly bg-modules-aly/5'
                              : !hasNeeded? 'opacity-40 border-border-primary cursor-not-allowed bg-background-primary'
                              : 'border-border-primary bg-background-primary hover:border-modules-aly/30'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-modules-aly/10' : 'bg-background-tertiary'}`}>
                              <opt.icon size={18} className={selected ? 'text-modules-aly' : 'text-text-tertiary'} weight="duotone" />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>
                                {opt.label}
                              </p>
                              <p className="text-[11px] text-text-tertiary mt-0.5">{opt.desc}</p>
                              {!hasNeeded && (
                                <p className="text-[10px] text-amber-400 mt-1">
                                  Requires a {opt.needs.join(' or ')} field in your schema.
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Field mapping (shown once a type is selected) */}
                  {layout.type && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-4">
                      <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Field Mapping</h2>

                      {/* Counter */}
                      {layout.type === 'counter' && (
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="text-xs font-medium text-text-secondary block mb-1.5">Value field (summed for today)</label>
                            <select className={selectCls} value={(layout.value_field as string) ?? ''}
                              onChange={e => {
                                const f = schema.find(sf => sf.key === e.target.value);
                                patchLayout({ value_field: e.target.value, unit: f?.config?.unit ?? '', goal: f?.config?.goal ?? null });
                              }}>
                              <option value="">Select…</option>
                              {numFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-text-secondary block mb-1.5">Date field (filter for today)</label>
                            <select className={selectCls} value={(layout.date_field as string) ?? ''}
                              onChange={e => patchLayout({ date_field: e.target.value })}>
                              <option value="">Select…</option>
                              {dtFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                              <option value="created_at">created_at (auto)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Goal progress / trend chart */}
                      {(layout.type === 'goal_progress' || layout.type === 'trend_chart') && (
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="text-xs font-medium text-text-secondary block mb-1.5">Aggregate field (number to sum)</label>
                            <select className={selectCls} value={(layout.aggregate as string) ?? ''}
                              onChange={e => patchLayout({ aggregate: e.target.value })}>
                              <option value="">Select…</option>
                              {numFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-text-secondary block mb-1.5">Date field</label>
                            <select className={selectCls} value={(layout.dateField as string) ?? ''}
                              onChange={e => patchLayout({ dateField: e.target.value })}>
                              <option value="">Select…</option>
                              {dtFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                              <option value="created_at">created_at (auto)</option>
                            </select>
                          </div>
                          {layout.type === 'goal_progress' && (
                            <div>
                              <label className="text-xs font-medium text-text-secondary block mb-1.5">Daily goal</label>
                              <input type="number" className={inputCls} placeholder="e.g. 2000"
                                value={(layout.goal as number) ?? ''}
                                onChange={e => patchLayout({ goal: Number(e.target.value) || null })} />
                            </div>
                          )}
                          {layout.type === 'trend_chart' && txtFields.length > 0 && (
                            <div>
                              <label className="text-xs font-medium text-text-secondary block mb-1.5">Category field <span className="text-text-tertiary font-normal">(optional)</span></label>
                              <select className={selectCls} value={(layout.categoryField as string) ?? ''}
                                onChange={e => patchLayout({ categoryField: e.target.value || undefined })}>
                                <option value="">None</option>
                                {txtFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                              </select>
                            </div>
                          )}
                          {layout.type === 'trend_chart' && (
                            <div>
                              <label className="text-xs font-medium text-text-secondary block mb-1.5">Currency symbol <span className="text-text-tertiary font-normal">(optional)</span></label>
                              <input className={inputCls} placeholder="e.g. ₱, $, €"
                                value={(layout.defaultCurrency as string) ?? ''}
                                onChange={e => patchLayout({ defaultCurrency: e.target.value || undefined })} />
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-5 py-3 border border-border-primary rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary transition-all">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button disabled={!step2Valid} onClick={() => setStep(3)}
                      className="flex-1 flex items-center justify-center gap-2 bg-modules-aly text-white font-semibold py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all">
                      Configure Aly <ArrowRight size={15} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Aly Config ── */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex flex-col gap-6">

                  <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-5">
                    <div>
                      <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Aly Integration</h2>
                      <p className="text-[11px] text-text-tertiary mt-1">
                        Teach Aly how to recognise and log data for this module through chat.
                      </p>
                    </div>

                    {/* Intent keywords */}
                    <div>
                      <label className="text-xs font-medium text-text-secondary block mb-1.5">
                        <span className="flex items-center gap-1.5"><Tag size={12} /> Intent keywords</span>
                      </label>
                      <p className="text-[10px] text-text-tertiary mb-2">
                        Words that tell Aly this module is relevant. Press Enter to add.
                      </p>
                      <KeywordInput
                        keywords={alyConfig.intent_keywords}
                        onChange={kw => setAlyConfig(a => ({ ...a, intent_keywords: kw }))}
                      />
                    </div>

                    {/* Context hint */}
                    <div>
                      <label className="text-xs font-medium text-text-secondary block mb-1.5">Context hint</label>
                      <p className="text-[10px] text-text-tertiary mb-2">
                        One sentence Aly uses when referencing this module in responses.
                      </p>
                      <input
                        className={inputCls}
                        placeholder={`e.g. "This module tracks daily ${name || 'data'}."`}
                        value={alyConfig.context_hint}
                        onChange={e => setAlyConfig(a => ({ ...a, context_hint: e.target.value }))}
                      />
                    </div>

                    {/* Log example */}
                    <div>
                      <label className="text-xs font-medium text-text-secondary block mb-1.5">Log example</label>
                      <p className="text-[10px] text-text-tertiary mb-2">
                        Show Aly what a typical log command looks like so it can parse values from chat.
                      </p>
                      <input
                        className={inputCls}
                        placeholder={`e.g. "log ${name?.toLowerCase() || 'water'}: 2 glasses"`}
                        value={alyConfig.log_prompt}
                        onChange={e => setAlyConfig(a => ({ ...a, log_prompt: e.target.value }))}
                      />
                    </div>

                    {/* Generated Aly card preview */}
                    {alyConfig.context_hint && (
                      <div className="bg-modules-aly/5 border border-modules-aly/20 rounded-xl p-4 flex gap-3">
                        <Sparkle size={16} className="text-modules-aly shrink-0 mt-0.5" weight="duotone" />
                        <div>
                          <p className="text-[11px] font-semibold text-text-primary mb-1">Aly will know:</p>
                          <p className="text-[11px] text-text-secondary leading-relaxed">{alyConfig.context_hint}</p>
                          {alyConfig.log_prompt && (
                            <p className="text-[10px] text-text-tertiary mt-2 italic">"{alyConfig.log_prompt}"</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)}
                      className="flex items-center gap-2 px-5 py-3 border border-border-primary rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary transition-all">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button disabled={!step3Valid} onClick={() => setStep(4)}
                      className="flex-1 flex items-center justify-center gap-2 bg-modules-aly text-white font-semibold py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all">
                      Review <ArrowRight size={15} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 4: Review & Save ── */}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex flex-col gap-6">

                  <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-5">
                    <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Review</h2>

                    {/* Name + slug */}
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-bold text-text-primary">{name}</p>
                      <p className="text-xs font-mono text-modules-aly">{slug}</p>
                      {description && <p className="text-xs text-text-secondary mt-1 leading-relaxed">{description}</p>}
                    </div>

                    <div className="border-t border-border-primary/40" />

                    {/* Schema */}
                    <div>
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Schema ({schema.length} fields)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {schema.map(f => (
                          <span key={f.key} className="text-[10px] px-2 py-0.5 bg-background-primary border border-border-primary rounded-md text-text-secondary font-mono">
                            {f.key} <span className="text-text-tertiary">({f.type})</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Widget */}
                    <div>
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Widget</p>
                      <span className="text-[11px] px-2.5 py-1 bg-modules-aly/10 border border-modules-aly/20 rounded-lg text-modules-aly font-semibold">
                        {WIDGET_OPTIONS.find(w => w.type === layout.type)?.label ?? layout.type as string}
                      </span>
                    </div>

                    {/* Aly */}
                    {alyConfig.intent_keywords.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Aly keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {alyConfig.intent_keywords.map(kw => (
                            <span key={kw} className="text-[10px] px-2 py-0.5 bg-modules-aly/8 border border-modules-aly/15 rounded-md text-modules-aly">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Private badge */}
                    <div className="flex items-center gap-2 bg-background-tertiary border border-border-primary rounded-xl px-4 py-3">
                      <Lock size={14} className="text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-text-primary">Private module</p>
                        <p className="text-[10px] text-text-tertiary">Only you can see and use this module. Publishing is available on the Creator tier.</p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setStep(3)}
                      className="flex items-center gap-2 px-5 py-3 border border-border-primary rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary transition-all">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-modules-aly text-white font-semibold py-3 rounded-xl disabled:opacity-60 hover:opacity-90 transition-all">
                      {saving ? (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><FloppyDisk size={16} /> Save Private Module</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Right: live preview (2 cols) */}
          <div className="lg:col-span-2 lg:sticky lg:top-8 flex flex-col gap-4">
            <div className="bg-background-secondary border border-border-primary rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-primary">
                <div className="w-7 h-7 rounded-lg bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center">
                  <Sparkle size={13} className="text-modules-aly" weight="fill" />
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary">{name || 'New Module'}</p>
                  <p className="text-[10px] text-text-tertiary">{WIDGET_OPTIONS.find(w => w.type === layout.type)?.label ?? 'Widget preview'}</p>
                </div>
              </div>
              <div className="min-h-32">
                <LivePreview schema={schema} layout={layout} />
              </div>
            </div>

            {/* Schema summary */}
            {schema.length > 0 && (
              <div className="bg-background-secondary border border-border-primary rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Fields</p>
                {schema.map(f => {
                  const FIcon = FIELD_TYPES.find(t => t.value === f.type)?.icon ?? TextT;
                  return (
                    <div key={f.key} className="flex items-center gap-2">
                      <FIcon size={12} className="text-text-tertiary shrink-0" />
                      <span className="text-xs font-mono text-modules-aly">{f.key || '—'}</span>
                      <span className="text-[10px] text-text-tertiary flex-1 truncate">{f.label}</span>
                      <span className="text-[9px] text-text-tertiary/60 shrink-0">{f.type}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Aly summary */}
            {alyConfig.intent_keywords.length > 0 && (
              <div className="bg-modules-aly/5 border border-modules-aly/20 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-[10px] font-bold text-modules-aly uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkle size={10} weight="fill" /> Aly Config
                </p>
                <div className="flex flex-wrap gap-1">
                  {alyConfig.intent_keywords.map(kw => (
                    <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-modules-aly/10 rounded text-modules-aly">{kw}</span>
                  ))}
                </div>
                {alyConfig.context_hint && (
                  <p className="text-[10px] text-text-secondary leading-relaxed">{alyConfig.context_hint}</p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
