"use client";

import React, { useState } from 'react';
import { SparkleIcon, PlusIcon, MinusIcon, CheckIcon } from '@phosphor-icons/react';
import { UIDefinition, UIBlock, UIColumn, BlockSpan } from '@/types/ui-builder';
import { SchemaField } from '@/services/modules.service';

// ── Props ─────────────────────────────────────────────────────────────────────

interface DynamicUIRendererProps {
  uiDefinition:   UIDefinition;
  schema:         SchemaField[];
  mode:           'preview' | 'entry' | 'detail';
  existingValues?: Record<string, unknown>;
  onSubmit?:      (data: Record<string, unknown>) => Promise<void>;
  onCancel?:      () => void;
  brandColor?:    string;
  assistantName?: string;
}

// ── Tailwind col-span map (must be literal strings for Tailwind JIT) ──────────

const SPAN_CLASS: Record<BlockSpan, string> = {
  3:  'md:col-span-3',
  4:  'md:col-span-4',
  6:  'md:col-span-6',
  8:  'md:col-span-8',
  9:  'md:col-span-9',
  12: 'md:col-span-12',
};

// ── Spacer sizes ──────────────────────────────────────────────────────────────

const SPACER_H = { sm: 8, md: 16, lg: 32 } as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputBase =
  'w-full bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20';

const inputError =
  'border-red-400/60 focus:border-red-400 focus:ring-red-400/20';

function formatDetailValue(value: unknown, schemaField: SchemaField | undefined): string {
  if (value === undefined || value === null || value === '') return '—';
  switch (schemaField?.type) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date':
      try { return new Date(String(value)).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }); }
      catch { return String(value); }
    case 'datetime':
      try { return new Date(String(value)).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
      catch { return String(value); }
    case 'number':
    case 'counter': {
      const unit = schemaField.config?.unit ?? '';
      return `${value}${unit ? ' ' + unit : ''}`;
    }
    default:
      return String(value);
  }
}

// ── Field input renderer ──────────────────────────────────────────────────────

interface FieldProps {
  block:        Extract<UIBlock, { type: 'field_input' }>;
  schemaField:  SchemaField | undefined;
  value:        unknown;
  onChange:     (v: unknown) => void;
  error?:       string;
  mode:         'preview' | 'entry' | 'detail';
  brandColor?:  string;
  isPreview:    boolean;
}

function FieldBlock({ block, schemaField, value, onChange, error, mode, brandColor, isPreview }: FieldProps) {
  const pointerNone = isPreview ? { pointerEvents: 'none' as const, opacity: 0.6 } : {};
  const bordCls     = error ? inputError : '';
  const accentColor = brandColor || 'var(--modules-aly)';

  // ── detail mode ─────────────────────────────────────────────────────────────
  if (mode === 'detail') {
    return (
      <div className="flex flex-col gap-1">
        {block.show_label && (
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{block.label}</p>
        )}
        <p className="text-sm text-text-primary">{formatDetailValue(value, schemaField)}</p>
      </div>
    );
  }

  // ── input renderers ──────────────────────────────────────────────────────────

  let input: React.ReactNode;

  switch (block.component) {

    case 'text_input':
      input = (
        <input
          type="text"
          className={`${inputBase} ${bordCls}`}
          placeholder={block.placeholder ?? ''}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          tabIndex={isPreview ? -1 : undefined}
          style={pointerNone}
        />
      );
      break;

    case 'longtext_input':
      input = (
        <textarea
          className={`${inputBase} ${bordCls} resize-y min-h-20`}
          placeholder={block.placeholder ?? ''}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          rows={3}
          tabIndex={isPreview ? -1 : undefined}
          style={pointerNone}
        />
      );
      break;

    case 'number_input': {
      const unit = schemaField?.config?.unit ?? '';
      input = (
        <div className="relative">
          {unit && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-tertiary pointer-events-none">
              {unit}
            </span>
          )}
          <input
            type="number"
            className={`${inputBase} ${bordCls} ${unit ? 'pr-12' : ''}`}
            placeholder={block.placeholder ?? '0'}
            value={String(value ?? '')}
            onChange={e => onChange(e.target.value)}
            min={schemaField?.config?.min}
            max={schemaField?.config?.max}
            step="any"
            tabIndex={isPreview ? -1 : undefined}
            style={pointerNone}
          />
        </div>
      );
      break;
    }

    case 'currency_input':
      input = (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-tertiary pointer-events-none">₱</span>
          <input
            type="number"
            className={`${inputBase} ${bordCls} pl-8`}
            placeholder={block.placeholder ?? '0.00'}
            value={String(value ?? '')}
            onChange={e => onChange(e.target.value)}
            step="0.01"
            min={0}
            tabIndex={isPreview ? -1 : undefined}
            style={pointerNone}
          />
        </div>
      );
      break;

    case 'counter_stepper': {
      const num  = Number(value ?? 0);
      const step = schemaField?.config?.step ?? 1;
      const min  = schemaField?.config?.min  ?? 0;
      const max  = schemaField?.config?.max  ?? Infinity;
      const unit = schemaField?.config?.unit ?? '';
      input = (
        <div className="flex items-center gap-3" style={pointerNone}>
          <button
            type="button"
            onClick={() => onChange(Math.max(min, num - step))}
            tabIndex={isPreview ? -1 : undefined}
            className="w-9 h-9 rounded-lg border border-border-primary bg-background-tertiary flex items-center justify-center text-text-secondary hover:bg-background-primary transition-colors"
          >
            <MinusIcon size={14} weight="bold" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-bold text-text-primary tabular-nums">{num}</span>
            {unit && <span className="text-sm text-text-tertiary ml-1.5">{unit}</span>}
          </div>
          <button
            type="button"
            onClick={() => onChange(Math.min(max, num + step))}
            tabIndex={isPreview ? -1 : undefined}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}40`, color: accentColor }}
          >
            <PlusIcon size={14} weight="bold" />
          </button>
        </div>
      );
      break;
    }

    case 'boolean_toggle': {
      const checked = !!value;
      input = (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          tabIndex={isPreview ? -1 : undefined}
          style={{ backgroundColor: checked ? accentColor : undefined, ...pointerNone }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked ? '' : 'bg-background-tertiary border border-border-primary'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      );
      break;
    }

    case 'date_picker':
      input = (
        <input
          type="date"
          className={`${inputBase} ${bordCls}`}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          tabIndex={isPreview ? -1 : undefined}
          style={pointerNone}
        />
      );
      break;

    case 'datetime_picker':
      input = (
        <input
          type="datetime-local"
          className={`${inputBase} ${bordCls}`}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          tabIndex={isPreview ? -1 : undefined}
          style={pointerNone}
        />
      );
      break;

    case 'select_chips': {
      const options = schemaField?.config?.options ?? [];
      input = (
        <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap" style={pointerNone}>
          {options.map(opt => {
            const sel = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                tabIndex={isPreview ? -1 : undefined}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 transition-all ${
                  sel
                    ? 'text-white'
                    : 'border-border-primary text-text-secondary hover:border-border-primary/60'
                }`}
                style={sel ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
              >
                {opt}
              </button>
            );
          })}
          {options.length === 0 && <p className="text-xs text-text-tertiary">No options configured.</p>}
        </div>
      );
      break;
    }

    case 'select_dropdown': {
      const options = schemaField?.config?.options ?? [];
      input = (
        <select
          className={`${inputBase} ${bordCls} cursor-pointer`}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          tabIndex={isPreview ? -1 : undefined}
          style={pointerNone}
        >
          <option value="">{block.placeholder ?? 'Select…'}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
      break;
    }

    default:
      input = <div className="text-xs text-text-tertiary">Unknown component type</div>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {block.show_label && (
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
          {block.label}
          {schemaField?.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      {input}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

// ── Block router ──────────────────────────────────────────────────────────────

interface BlockRouterProps {
  block:        UIBlock;
  schema:       SchemaField[];
  values:       Record<string, unknown>;
  errors:       Record<string, string>;
  setValues:    React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  mode:         'preview' | 'entry' | 'detail';
  brandColor?:  string;
  assistantName?: string;
  submitting:   boolean;
  handleSubmit: () => void;
  onCancel?:    () => void;
}

function BlockRouter({
  block, schema, values, errors, setValues, mode,
  brandColor, assistantName, submitting, handleSubmit, onCancel,
}: BlockRouterProps) {
  const accentColor = brandColor || 'var(--modules-aly)';
  const isPreview   = mode === 'preview';

  switch (block.type) {

    case 'field_input': {
      const schemaField = schema.find(f => f.key === block.field_key);
      return (
        <FieldBlock
          block={block}
          schemaField={schemaField}
          value={values[block.field_key]}
          onChange={v => setValues(prev => ({ ...prev, [block.field_key]: v }))}
          error={errors[block.field_key]}
          mode={mode}
          brandColor={brandColor}
          isPreview={isPreview}
        />
      );
    }

    case 'section_header':
      return (
        <div className="pl-3 border-l-2" style={{ borderLeftColor: accentColor }}>
          <p className="text-sm font-semibold text-text-primary">{block.title}</p>
          {block.subtitle && <p className="text-xs text-text-tertiary mt-0.5">{block.subtitle}</p>}
        </div>
      );

    case 'divider':
      return <hr className="border-border-primary" />;

    case 'spacer':
      return <div style={{ height: SPACER_H[block.size] }} />;

    case 'assistant_nudge':
      return (
        <div className="flex gap-3 p-4 bg-modules-aly/5 border border-modules-aly/20 rounded-xl">
          <SparkleIcon size={16} className="text-modules-aly shrink-0 mt-0.5" weight="duotone" />
          <div>
            <p className="text-xs font-semibold text-text-primary">{assistantName ?? 'Assistant'}</p>
            {block.hint && <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{block.hint}</p>}
          </div>
        </div>
      );

    case 'save_button':
      if (mode === 'detail') return null;
      return (
        <button
          type="button"
          onClick={isPreview ? undefined : handleSubmit}
          disabled={submitting || isPreview}
          tabIndex={isPreview ? -1 : undefined}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ backgroundColor: accentColor, pointerEvents: isPreview ? 'none' : undefined }}
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <><CheckIcon size={15} weight="bold" /> {block.label}</>
          )}
        </button>
      );

    case 'cancel_button':
      if (mode === 'detail') return null;
      return (
        <button
          type="button"
          onClick={isPreview ? undefined : onCancel}
          disabled={isPreview}
          tabIndex={isPreview ? -1 : undefined}
          className="w-full py-3 rounded-xl text-sm font-semibold text-text-secondary border border-border-primary hover:bg-background-tertiary transition-colors disabled:opacity-50"
          style={{ pointerEvents: isPreview ? 'none' : undefined }}
        >
          {block.label}
        </button>
      );

    default:
      return null;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function DynamicUIRenderer({
  uiDefinition,
  schema,
  mode,
  existingValues,
  onSubmit,
  onCancel,
  brandColor,
  assistantName,
}: DynamicUIRendererProps) {
  const [values,     setValues]     = useState<Record<string, unknown>>(existingValues ?? {});
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (mode !== 'entry') return;

    // Validate required fields
    const allFieldBlocks = uiDefinition.rows
      .flatMap(r => r.columns)
      .map(c => c.block)
      .filter((b): b is Extract<UIBlock, { type: 'field_input' }> => b.type === 'field_input');

    const newErrors: Record<string, string> = {};
    for (const b of allFieldBlocks) {
      const sf = schema.find(f => f.key === b.field_key);
      if (!sf?.required) continue;
      const v = values[b.field_key];
      if (v === undefined || v === null || v === '') {
        newErrors[b.field_key] = `${b.label} is required`;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      // Coerce types
      const data: Record<string, unknown> = {};
      for (const b of allFieldBlocks) {
        const v  = values[b.field_key];
        if (v === undefined || v === null || v === '') continue;
        const sf = schema.find(f => f.key === b.field_key);
        if (sf?.type === 'number' || sf?.type === 'counter') {
          data[b.field_key] = parseFloat(String(v)) || 0;
        } else if (sf?.type === 'boolean') {
          data[b.field_key] = !!v;
        } else {
          data[b.field_key] = v;
        }
      }
      await onSubmit?.(data);
      // Reset on success
      setValues(existingValues ?? {});
    } catch (e) {
      setErrors({ _submit: e instanceof Error ? e.message : 'Could not save. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      {uiDefinition.rows.map(row => (
        <div key={row.id} className="grid grid-cols-12 gap-3">
          {row.columns.map(col => (
            <div
              key={col.id}
              className={`col-span-12 ${SPAN_CLASS[col.span]}`}
            >
              <BlockRouter
                block={col.block}
                schema={schema}
                values={values}
                errors={errors}
                setValues={setValues}
                mode={mode}
                brandColor={brandColor}
                assistantName={assistantName}
                submitting={submitting}
                handleSubmit={handleSubmit}
                onCancel={onCancel}
              />
            </div>
          ))}
        </div>
      ))}

      {/* Global submit error */}
      {errors._submit && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-2.5">
          {errors._submit}
        </p>
      )}
    </div>
  );
}
