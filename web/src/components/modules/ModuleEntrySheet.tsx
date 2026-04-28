"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, CheckIcon, PlusIcon, MinusIcon } from '@phosphor-icons/react';
import {
  ModuleDefinition, ModuleEntry, SchemaField,
  createModuleEntry, updateModuleEntry,
} from '@/services/modules.service';

interface Props {
  definition: ModuleDefinition;
  hubId: string;
  userId: string;
  open: boolean;
  onClose: () => void;
  onSaved: (entry: ModuleEntry) => void;
  existingEntry?: ModuleEntry;
}

// ── Field renderers ───────────────────────────────────────────────────────────

function initValue(field: SchemaField, existingData?: Record<string, any>): unknown {
  if (existingData?.[field.key] !== undefined) return existingData[field.key];
  switch (field.type) {
    case 'boolean': return false;
    case 'counter': return field.config?.goal != null ? 0 : 0;
    case 'number':  return '';
    case 'date':    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    case 'datetime':return new Date().toISOString().slice(0, 16);  // datetime-local format
    default:        return '';
  }
}

function FieldInput({
  field, value, onChange, error,
}: {
  field: SchemaField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const base = "w-full bg-background-primary border rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary";
  const borderCls = error ? 'border-red-400/60 focus:border-red-400' : 'border-border-primary focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20';

  switch (field.type) {

    case 'boolean': {
      const checked = !!value;
      return (
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-modules-aly' : 'bg-background-tertiary border border-border-primary'}`}
          aria-checked={checked}
          role="switch"
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      );
    }

    case 'date':
      return (
        <input
          type="date"
          className={`${base} ${borderCls}`}
          value={value as string}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'datetime':
      return (
        <input
          type="datetime-local"
          className={`${base} ${borderCls}`}
          value={value as string}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'select': {
      const options = field.config?.options ?? [];
      return (
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const sel = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  sel ? 'bg-modules-aly/10 border-modules-aly/40 text-modules-aly'
                      : 'border-border-primary text-text-secondary hover:border-modules-aly/20'
                }`}
              >
                {opt}
              </button>
            );
          })}
          {options.length === 0 && <p className="text-xs text-text-tertiary">No options configured.</p>}
        </div>
      );
    }

    case 'counter': {
      const num   = Number(value ?? 0);
      const step  = field.config?.step  ?? 1;
      const min   = field.config?.min   ?? 0;
      const max   = field.config?.max   ?? Infinity;
      const unit  = field.config?.unit  ?? '';
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, num - step))}
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
            className="w-9 h-9 rounded-lg bg-modules-aly/10 border border-modules-aly/30 flex items-center justify-center text-modules-aly hover:bg-modules-aly/20 transition-colors"
          >
            <PlusIcon size={14} weight="bold" />
          </button>
        </div>
      );
    }

    case 'number': {
      const unit = field.config?.unit ?? '';
      return (
        <div className="relative">
          {unit && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-tertiary pointer-events-none">{unit}</span>
          )}
          <input
            type="number"
            className={`${base} ${borderCls} ${unit ? 'pl-10' : ''}`}
            value={value as string}
            onChange={e => onChange(e.target.value)}
            min={field.config?.min}
            max={field.config?.max}
            step="any"
            placeholder="0"
          />
        </div>
      );
    }

    default:
      return (
        <input
          type="text"
          className={`${base} ${borderCls}`}
          value={value as string}
          onChange={e => onChange(e.target.value)}
          placeholder={field.config?.placeholder ?? ''}
        />
      );
  }
}

// ── Main sheet ────────────────────────────────────────────────────────────────

export function ModuleEntrySheet({ definition, hubId, userId, open, onClose, onSaved, existingEntry }: Props) {
  const schema    = definition.schema ?? [];
  const isEditing = !!existingEntry;

  const initValues = useCallback(() =>
    schema.reduce<Record<string, unknown>>((acc, f) => {
      acc[f.key] = initValue(f, existingEntry?.data);
      return acc;
    }, {}),
    [schema, existingEntry],
  );

  const [values,  setValues]  = useState<Record<string, unknown>>(initValues);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [saving,  setSaving]  = useState(false);

  // Re-init when entry or open state changes
  useEffect(() => {
    if (open) setValues(initValues());
  }, [open, initValues]);

  const set = (key: string, val: unknown) => {
    setValues(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    for (const f of schema) {
      if (!f.required) continue;
      const v = values[f.key];
      if (v === '' || v === null || v === undefined) {
        errs[f.key] = `${f.label} is required`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const data: Record<string, any> = {};
      for (const f of schema) {
        const raw = values[f.key];
        if (raw === '' || raw === null || raw === undefined) continue;
        if (f.type === 'number' || f.type === 'counter') {
          data[f.key] = parseFloat(String(raw)) || 0;
        } else if (f.type === 'boolean') {
          data[f.key] = !!raw;
        } else {
          data[f.key] = raw;
        }
      }

      // Auto-fill the dateField if schema has a date field matching it
      const dateFieldKey = definition.layout?.dateField as string | undefined;
      if (dateFieldKey && !data[dateFieldKey]) {
        const isDateTime = dateFieldKey.includes('at') || schema.find(f => f.key === dateFieldKey)?.type === 'datetime';
        data[dateFieldKey] = isDateTime ? new Date().toISOString() : new Date().toLocaleDateString('en-CA');
      }

      let saved: ModuleEntry;
      if (isEditing && existingEntry) {
        saved = await updateModuleEntry(definition.id, existingEntry.id, data, userId, hubId);
      } else {
        saved = await createModuleEntry(definition.id, data, userId, hubId);
      }

      window.dispatchEvent(new Event('takda:data_updated'));
      onSaved(saved);
      onClose();
    } catch (e) {
      setErrors({ _global: e instanceof Error ? e.message : 'Could not save. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  const accentColor = definition.brand_color || 'var(--modules-aly)';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed bottom-0 inset-x-0 z-70 flex justify-center px-4 pb-4"
          >
            <div className="w-full max-w-lg bg-background-secondary rounded-2xl border border-border-primary shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary shrink-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}20` }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                  </div>
                  <p className="text-sm font-bold text-text-primary">
                    {isEditing ? 'Edit Entry' : `Add to ${definition.name}`}
                  </p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:bg-background-tertiary transition-colors">
                  <XIcon size={16} />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                {schema.map(field => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                        {field.config?.unit && field.type !== 'number' && (
                          <span className="text-text-tertiary normal-case ml-1">({field.config.unit})</span>
                        )}
                      </label>
                      {field.type === 'boolean' && (
                        <span className="text-xs text-text-tertiary">{values[field.key] ? 'Yes' : 'No'}</span>
                      )}
                    </div>
                    <FieldInput
                      field={field}
                      value={values[field.key]}
                      onChange={v => set(field.key, v)}
                      error={errors[field.key]}
                    />
                    {errors[field.key] && (
                      <p className="text-[11px] text-red-400 mt-1">{errors[field.key]}</p>
                    )}
                  </div>
                ))}

                {errors._global && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-2.5">
                    {errors._global}
                  </p>
                )}
              </div>

              {/* Save button */}
              <div className="px-5 pb-5 pt-3 border-t border-border-primary shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accentColor }}
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><CheckIcon size={15} weight="bold" /> {isEditing ? 'Save Changes' : 'Add Entry'}</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
