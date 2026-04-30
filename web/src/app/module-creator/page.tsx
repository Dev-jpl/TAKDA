"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Trash, FloppyDisk, Check,
  Sparkle, Lock, CaretDown, CaretUp, X, Tag,
  ToggleLeft, CalendarBlank, ListBullets,
  TextT, Hash, ArrowsCounterClockwise, Globe,
  Warning,
} from '@phosphor-icons/react';
import {
  ModuleDefinition, SchemaField, AlyConfig, FieldType, FieldConfig,
  createModuleDefinition,
} from '@/services/modules.service';
import { UIDefinition } from '@/types/ui-builder';
import { UIBuilder } from '@/components/modules/UIBuilder';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/services/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'schema',    label: 'Schema' },
  { id: 'interface', label: 'Interface' },
  { id: 'agent',     label: 'Agent Configuration' },
] as const;

type TabId = typeof TABS[number]['id'];

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'text',    label: 'Text',     icon: TextT,                 desc: 'Short text or label' },
  { value: 'number',  label: 'Number',   icon: Hash,                  desc: 'Numeric value' },
  { value: 'counter', label: 'Counter',  icon: ArrowsCounterClockwise, desc: 'Number with goal' },
  { value: 'boolean', label: 'Yes / No', icon: ToggleLeft,            desc: 'True or false flag' },
  { value: 'date',    label: 'Date',     icon: CalendarBlank,         desc: 'Calendar date' },
  { value: 'select',  label: 'Select',   icon: ListBullets,           desc: 'One of several options' },
];

const inputCls = "w-full bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20 transition-all placeholder:text-text-tertiary";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── Field row ─────────────────────────────────────────────────────────────────

function FieldRow({
  field, index, onUpdate, onRemove,
}: {
  field:    SchemaField;
  index:    number;
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

function KeywordInput({ keywords, onChange }: { keywords: string[]; onChange: (kw: string[]) => void }) {
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
        <span key={kw} className="flex items-center gap-1 text-[11px] font-semibold bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-2 py-0.5 rounded-md">
          {kw}
          <button onClick={e => { e.stopPropagation(); onChange(keywords.filter(k => k !== kw)); }} className="hover:text-red-400 transition-colors">
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

// ── Publish review modal ──────────────────────────────────────────────────────

function PublishModal({
  name, slug, schema, uiDefinition, alyConfig, assistantName, saving, error,
  onSaveDraft, onPublish, onClose,
}: {
  name:         string;
  slug:         string;
  schema:       SchemaField[];
  uiDefinition: UIDefinition | null;
  alyConfig:    AlyConfig;
  assistantName: string;
  saving:       boolean;
  error:        string;
  onSaveDraft:  () => void;
  onPublish:    () => void;
  onClose:      () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-background-secondary border border-border-primary rounded-xl w-full max-w-lg flex flex-col overflow-hidden"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h2 className="text-sm font-bold text-text-primary">Review &amp; Publish</h2>
          <button onClick={onClose} className="p-1 text-text-tertiary hover:text-text-primary transition-colors rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[60vh]">
          {/* Name + slug */}
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-text-primary">{name || '—'}</p>
            <p className="text-xs font-mono text-modules-aly">{slug || '—'}</p>
          </div>

          <div className="border-t border-border-primary/40" />

          {/* Schema */}
          <div>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Schema ({schema.length} fields)</p>
            {schema.length === 0 ? (
              <p className="text-xs text-orange-400 flex items-center gap-1.5"><Warning size={12} /> No fields defined</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {schema.map(f => (
                  <span key={f.key} className="text-[10px] px-2 py-0.5 bg-background-primary border border-border-primary rounded-md text-text-secondary font-mono">
                    {f.key} <span className="text-text-tertiary">({f.type})</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Interface */}
          <div>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Interface</p>
            {uiDefinition && uiDefinition.rows.length > 0 ? (
              <span className="text-[11px] px-2.5 py-1 bg-modules-aly/10 border border-modules-aly/20 rounded-lg text-modules-aly font-semibold">
                Custom Form · {uiDefinition.rows.length} row{uiDefinition.rows.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <p className="text-xs text-orange-400 flex items-center gap-1.5"><Warning size={12} /> No UI defined</p>
            )}
          </div>

          {/* Agent */}
          {alyConfig.intent_keywords.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">{assistantName} keywords</p>
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
              <p className="text-[10px] text-text-tertiary">Only you can see and use this module. Publishing to marketplace is available on the Creator tier.</p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-border-primary">
          <button
            onClick={onSaveDraft}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 border border-border-primary rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-background-tertiary transition-all disabled:opacity-50"
          >
            <FloppyDisk size={15} /> Save Draft
          </button>
          <button
            onClick={onPublish}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-modules-aly text-white font-semibold py-2.5 rounded-xl disabled:opacity-60 hover:opacity-90 transition-all text-sm"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <><Globe size={15} weight="bold" /> Publish to Marketplace</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModuleCreatorPage() {
  const router = useRouter();
  const [activeTab,   setActiveTab]   = useState<TabId>('schema');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [userId,      setUserId]      = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      else router.push('/auth');
    });
  }, [router]);

  // ── Form state ──────────────────────────────────────────────────────────────

  const { assistantName } = useUserProfile();
  const [name,         setName]        = useState('');
  const [slug,         setSlug]        = useState('');
  const [description,  setDescription] = useState('');
  const [schema,       setSchema]      = useState<SchemaField[]>([]);
  const [uiDefinition, setUiDefinition]= useState<UIDefinition | null>(null);
  const [alyConfig,    setAlyConfig]   = useState<AlyConfig>({
    intent_keywords: [],
    context_hint:   '',
    log_prompt:     '',
  });

  useEffect(() => { if (name) setSlug(toSlug(name)); }, [name]);

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

  // ── Tab validation (non-blocking, for indicators) ───────────────────────────

  const schemaValid    = name.trim().length > 0 && schema.length > 0 && schema.every(f => f.key && f.label);
  const interfaceValid = !!uiDefinition && uiDefinition.rows.length > 0;
  const agentValid     = alyConfig.context_hint.trim().length > 0;

  const tabValid: Record<TabId, boolean> = {
    schema:    schemaValid,
    interface: interfaceValid,
    agent:     agentValid,
  };

  // ── Save / Publish ──────────────────────────────────────────────────────────

  const persist = async (status: 'draft' | 'published') => {
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
        layout:        { type: 'custom' },
        is_global:     false,
        is_private:    true,
        aly_config:    alyConfig,
        ui_definition: uiDefinition ?? undefined,
        status,
      } as Parameters<typeof createModuleDefinition>[0]);
      router.push('/creator/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save module.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => persist('draft');
  const handlePublish   = () => persist('published');

  // ── Interface validation hints ──────────────────────────────────────────────

  const interfaceHints = (() => {
    const hints: string[] = [];
    if (!uiDefinition || uiDefinition.rows.length === 0) hints.push('Add at least one component to the canvas');
    else {
      const allBlocks = uiDefinition.rows.flatMap(r => r.columns.map(c => c.block));
      if (!allBlocks.some(b => b.type === 'save_button')) hints.push('Your form needs a Save button — add one from Actions');
    }
    return hints;
  })();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-background-primary text-text-primary overflow-hidden min-h-0">

      {/* ── Header bar ── */}
      <header className="flex items-center gap-4 px-5 h-12 border-b border-border-primary shrink-0 bg-background-secondary z-20">

        {/* Left: icon + title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center">
            <Sparkle size={12} className="text-modules-aly" weight="fill" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-primary">Module Creator</span>
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-modules-aly/10 border border-modules-aly/20 text-modules-aly">
              <Lock size={7} /> Pro
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-border-primary shrink-0" />

        {/* Center: tabs (TAKDA nav style) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              const valid  = tabValid[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? 'bg-modules-aly/10 text-modules-aly border border-modules-aly/20'
                      : 'text-text-tertiary hover:bg-background-tertiary hover:text-text-secondary border border-transparent'
                  }`}
                >
                  {tab.label}
                  {valid && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-modules-aly' : 'bg-green-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleSaveDraft}
            disabled={saving || !name.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-primary rounded-xl text-xs font-medium text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all disabled:opacity-40"
          >
            <FloppyDisk size={12} /> Save Draft
          </button>
          <button
            onClick={() => setShowPublish(true)}
            disabled={saving || !name.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-modules-aly/10 text-modules-aly border border-modules-aly/20 hover:bg-modules-aly hover:text-white transition-all disabled:opacity-40"
          >
            <Globe size={13} weight="bold" /> Publish
          </button>
        </div>
      </header>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ── Schema tab ── */}
          {activeTab === 'schema' && (
            <motion.div
              key="schema"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

                {/* Basic info */}
                <div className="bg-background-secondary border border-border-primary rounded-xl p-6 flex flex-col gap-4">
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
                        placeholder={`What does this module track? Be specific — ${assistantName} reads this to understand context.`}
                        className={`${inputCls} resize-none`}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Schema fields */}
                <div className="bg-background-secondary border border-border-primary rounded-xl p-6 flex flex-col gap-4">
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

                {/* Continue nudge */}
                {schemaValid && (
                  <button
                    onClick={() => setActiveTab('interface')}
                    className="flex items-center justify-center gap-2 bg-modules-aly/8 border border-modules-aly/20 text-modules-aly font-semibold py-3 rounded-xl hover:bg-modules-aly/15 transition-all text-sm"
                  >
                    Continue to Interface <Check size={14} weight="bold" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Interface tab ── */}
          {activeTab === 'interface' && (
            <motion.div
              key="interface"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
              className="h-full flex flex-col"
            >
              <UIBuilder
                schema={schema}
                initialDefinition={uiDefinition}
                brandColor={undefined}
                assistantName={assistantName}
                moduleName={name || 'Module'}
                onChange={setUiDefinition}
              />

              {/* Validation hints strip */}
              {interfaceHints.length > 0 && (
                <div className="shrink-0 flex items-center gap-4 px-6 py-2 border-t border-border-primary bg-background-secondary">
                  {interfaceHints.map((hint, i) => (
                    <p key={i} className="text-[11px] text-orange-400 flex items-center gap-1.5">
                      <Warning size={11} /> {hint}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Agent Configuration tab ── */}
          {activeTab === 'agent' && (
            <motion.div
              key="agent"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

                <div className="bg-background-secondary border border-border-primary rounded-xl p-6 flex flex-col gap-5">
                  <div>
                    <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Agent Configuration</h2>
                    <p className="text-[11px] text-text-tertiary mt-1">
                      Teach {assistantName} how to recognise and log data for this module through chat.
                    </p>
                  </div>

                  {/* Intent keywords */}
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">
                      <span className="flex items-center gap-1.5"><Tag size={12} /> Intent keywords</span>
                    </label>
                    <p className="text-[10px] text-text-tertiary mb-2">
                      Words that tell {assistantName} this module is relevant. Press Enter to add.
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
                      One sentence {assistantName} uses when referencing this module in responses.
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
                      Show {assistantName} what a typical log command looks like so it can parse values from chat.
                    </p>
                    <input
                      className={inputCls}
                      placeholder={`e.g. "log ${name?.toLowerCase() || 'water'}: 2 glasses"`}
                      value={alyConfig.log_prompt}
                      onChange={e => setAlyConfig(a => ({ ...a, log_prompt: e.target.value }))}
                    />
                  </div>

                  {/* Preview card */}
                  {alyConfig.context_hint && (
                    <div className="bg-modules-aly/5 border border-modules-aly/20 rounded-xl p-4 flex gap-3">
                      <Sparkle size={16} className="text-modules-aly shrink-0 mt-0.5" weight="duotone" />
                      <div>
                        <p className="text-[11px] font-semibold text-text-primary mb-1">{assistantName} will know:</p>
                        <p className="text-[11px] text-text-secondary leading-relaxed">{alyConfig.context_hint}</p>
                        {alyConfig.log_prompt && (
                          <p className="text-[10px] text-text-tertiary mt-2 italic">"{alyConfig.log_prompt}"</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Publish modal ── */}
      <AnimatePresence>
        {showPublish && (
          <PublishModal
            name={name}
            slug={slug}
            schema={schema}
            uiDefinition={uiDefinition}
            alyConfig={alyConfig}
            assistantName={assistantName}
            saving={saving}
            error={error}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
            onClose={() => { setShowPublish(false); setError(''); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
