"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ModuleDefinition, createModuleDefinition } from '@/services/modules.service';
import { ModulePreview } from '@/components/modules/ModulePreview';
import { supabase } from '@/services/supabase';
import {
  Plus, Trash, ArrowRight, ArrowLeft, FloppyDisk,
  Sparkle, ListBullets, ChartBar, Check,
} from '@phosphor-icons/react';

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Layout' },
  { id: 3, label: 'Publish' },
];

const LAYOUT_OPTIONS = [
  {
    id: 'goal_progress',
    name: 'Goal Progress',
    desc: 'Track a running total toward a daily target with a progress bar.',
    icon: ListBullets,
  },
  {
    id: 'trend_chart',
    name: 'Trend Chart',
    desc: 'Visualise spending or values over time with a bar chart.',
    icon: ChartBar,
  },
];

const FIELD_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
];

export default function ModuleCreatorPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      else router.push('/login');
    });
  }, [router]);

  const [formData, setFormData] = useState<Partial<ModuleDefinition>>({
    name: '',
    slug: '',
    description: '',
    schema: [],
    layout: { type: '' },
    is_global: false,
  });

  const addField = () => {
    setFormData(prev => ({
      ...prev,
      schema: [...(prev.schema || []), { key: '', label: '', type: 'string', required: false }],
    }));
  };

  const updateField = (index: number, updates: any) => {
    const newSchema = [...(formData.schema || [])];
    newSchema[index] = { ...newSchema[index], ...updates };
    setFormData(prev => ({ ...prev, schema: newSchema }));
  };

  const removeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schema: prev.schema?.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!userId) throw new Error('Not authenticated');
      await createModuleDefinition({ ...formData, user_id: userId } as any);
      router.push('/creator/dashboard');
    } catch (error) {
      console.error(error);
      alert('Failed to save module');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = !!(formData.name && (formData.schema?.length ?? 0) > 0);
  const canProceedStep2 = !!(formData.layout?.type && formData.layout?.aggregate && formData.layout?.dateField);

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="p-6 lg:p-12 max-w-7xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center">
              <Sparkle size={20} className="text-modules-aly" weight="duotone" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">Module Creator</h1>
              <p className="text-sm text-text-tertiary">Build a custom data module and install it on any hub.</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4 ml-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => step > s.id && setStep(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    step === s.id
                      ? 'bg-modules-aly/10 border border-modules-aly/30 text-modules-aly'
                      : step > s.id
                      ? 'text-text-secondary cursor-pointer hover:text-text-primary'
                      : 'text-text-tertiary cursor-default'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                    step > s.id
                      ? 'bg-modules-aly border-modules-aly text-white'
                      : step === s.id
                      ? 'border-modules-aly text-modules-aly'
                      : 'border-border-primary text-text-tertiary'
                  }`}>
                    {step > s.id ? <Check size={8} weight="bold" /> : s.id}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-6 ${step > s.id ? 'bg-modules-aly/40' : 'bg-border-primary'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </header>

        {/* Body: two-column */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* Left: Builder — takes 3 cols */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">

              {/* ── Step 1: Basics & Schema ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-5">
                    <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-widest">Basic Info</h2>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-text-secondary">Module Name</label>
                        <input
                          placeholder="e.g. Water Tracker"
                          className="bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm outline-none focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20 transition-all placeholder:text-text-tertiary"
                          value={formData.name}
                          onChange={e => setFormData({
                            ...formData,
                            name: e.target.value,
                            slug: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                          })}
                        />
                        {formData.slug && (
                          <p className="text-[10px] text-text-tertiary pl-1">slug: <span className="text-modules-aly">{formData.slug}</span></p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-text-secondary">Description / Aly Instructions</label>
                        <textarea
                          placeholder="Describe what this module tracks. Aly uses this to know when to log data automatically."
                          className="bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm outline-none focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20 transition-all placeholder:text-text-tertiary min-h-24 resize-none"
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Schema */}
                  <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-widest">Data Schema</h2>
                      <button
                        onClick={addField}
                        className="flex items-center gap-1.5 text-xs font-semibold text-modules-aly bg-modules-aly/8 hover:bg-modules-aly/15 border border-modules-aly/20 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Plus size={12} weight="bold" /> Add Field
                      </button>
                    </div>

                    {(formData.schema?.length ?? 0) === 0 ? (
                      <div className="border border-dashed border-border-primary rounded-xl py-8 flex flex-col items-center gap-2">
                        <p className="text-xs text-text-tertiary">No fields yet. Add at least one field to continue.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {formData.schema?.map((field, i) => (
                          <div key={i} className="flex gap-2 items-center bg-background-primary border border-border-primary rounded-xl px-3 py-2.5">
                            <input
                              placeholder="key"
                              className="bg-transparent text-xs text-text-primary placeholder:text-text-tertiary outline-none w-24 shrink-0 border-r border-border-primary pr-2"
                              value={field.key}
                              onChange={e => updateField(i, { key: e.target.value })}
                            />
                            <input
                              placeholder="Label"
                              className="bg-transparent text-xs text-text-primary placeholder:text-text-tertiary outline-none flex-1"
                              value={field.label}
                              onChange={e => updateField(i, { label: e.target.value })}
                            />
                            <select
                              className="bg-background-secondary border border-border-primary rounded-lg px-2 py-1 text-xs text-text-secondary outline-none"
                              value={field.type}
                              onChange={e => updateField(i, { type: e.target.value })}
                            >
                              {FIELD_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeField(i)}
                              className="p-1 text-text-tertiary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center gap-2 bg-modules-aly text-white font-semibold py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
                  >
                    Continue to Layout <ArrowRight size={16} weight="bold" />
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Layout ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  {/* Layout picker */}
                  <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-widest">Widget Layout</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {LAYOUT_OPTIONS.map(l => {
                        const Icon = l.icon;
                        const selected = formData.layout?.type === l.id;
                        return (
                          <button
                            key={l.id}
                            onClick={() => setFormData(p => ({ ...p, layout: { type: l.id } }))}
                            className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2 ${
                              selected
                                ? 'border-modules-aly bg-modules-aly/5'
                                : 'border-border-primary bg-background-primary hover:border-border-primary/80'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-modules-aly/10' : 'bg-background-tertiary'}`}>
                              <Icon size={18} className={selected ? 'text-modules-aly' : 'text-text-tertiary'} weight="duotone" />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>{l.name}</p>
                              <p className="text-[11px] text-text-tertiary leading-relaxed mt-0.5">{l.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Layout config */}
                  {formData.layout?.type && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-4"
                    >
                      <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-widest">Configuration</h2>

                      <div className="flex flex-col gap-3">
                        {/* Date field */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-text-secondary">Date Field</label>
                          <select
                            className="bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm outline-none focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20 transition-all text-text-primary"
                            value={formData.layout.dateField ?? ''}
                            onChange={e => setFormData(p => ({ ...p, layout: { ...p.layout, dateField: e.target.value } }))}
                          >
                            <option value="">Select a field</option>
                            {formData.schema?.filter(f => f.type === 'date' || f.type === 'datetime').map(f => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Aggregate field */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-text-secondary">
                            {formData.layout.type === 'goal_progress' ? 'Tracked Field (Number)' : 'Aggregated Field (Number)'}
                          </label>
                          <select
                            className="bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm outline-none focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20 transition-all text-text-primary"
                            value={formData.layout.aggregate ?? ''}
                            onChange={e => setFormData(p => ({ ...p, layout: { ...p.layout, aggregate: e.target.value } }))}
                          >
                            <option value="">Select a field</option>
                            {formData.schema?.filter(f => f.type === 'number').map(f => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>
                        </div>

                        {formData.layout.type === 'goal_progress' && (
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-text-secondary">Daily Goal</label>
                            <input
                              type="number"
                              placeholder="e.g. 2000"
                              className="bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm outline-none focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20 transition-all placeholder:text-text-tertiary"
                              value={formData.layout.goal ?? ''}
                              onChange={e => setFormData(p => ({ ...p, layout: { ...p.layout, goal: Number(e.target.value) } }))}
                            />
                          </div>
                        )}

                        {formData.layout.type === 'trend_chart' && (
                          <>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium text-text-secondary">Category Field <span className="text-text-tertiary">(optional)</span></label>
                              <select
                                className="bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm outline-none focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20 transition-all text-text-primary"
                                value={formData.layout.categoryField ?? ''}
                                onChange={e => setFormData(p => ({ ...p, layout: { ...p.layout, categoryField: e.target.value } }))}
                              >
                                <option value="">None</option>
                                {formData.schema?.filter(f => f.type === 'string').map(f => (
                                  <option key={f.key} value={f.key}>{f.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium text-text-secondary">Currency Symbol <span className="text-text-tertiary">(optional)</span></label>
                              <input
                                type="text"
                                placeholder="e.g. PHP, $, €"
                                className="bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm outline-none focus:border-modules-aly/50 focus:ring-1 focus:ring-modules-aly/20 transition-all placeholder:text-text-tertiary"
                                value={formData.layout.defaultCurrency ?? ''}
                                onChange={e => setFormData(p => ({ ...p, layout: { ...p.layout, defaultCurrency: e.target.value } }))}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-5 py-3 border border-border-primary rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-border-primary/80 transition-all"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      disabled={!canProceedStep2}
                      onClick={() => setStep(3)}
                      className="flex-1 flex items-center justify-center gap-2 bg-modules-aly text-white font-semibold py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
                    >
                      Review & Publish <ArrowRight size={16} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Review & Publish ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  {/* Summary card */}
                  <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-5">
                    <h2 className="text-sm font-bold text-text-tertiary uppercase tracking-widest">Summary</h2>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-widest">Module Name</p>
                        <p className="text-sm font-semibold text-text-primary">{formData.name}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-widest">Slug</p>
                        <p className="text-sm font-mono text-modules-aly">{formData.slug}</p>
                      </div>
                      {formData.description && (
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-widest">Description</p>
                          <p className="text-xs text-text-secondary leading-relaxed">{formData.description}</p>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-widest">Schema Fields</p>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {formData.schema?.map(f => (
                            <span key={f.key} className="text-[10px] px-2 py-0.5 bg-background-primary border border-border-primary rounded-md text-text-secondary">
                              {f.label} <span className="text-text-tertiary">({f.type})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-widest">Layout</p>
                        <span className="text-[10px] inline-flex w-fit px-2 py-0.5 bg-modules-aly/10 border border-modules-aly/20 rounded-md text-modules-aly font-semibold">
                          {formData.layout?.type?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Aly callout */}
                  <div className="bg-modules-aly/5 border border-modules-aly/20 rounded-2xl p-5 flex gap-3">
                    <Sparkle size={18} className="text-modules-aly shrink-0 mt-0.5" weight="duotone" />
                    <div>
                      <p className="text-xs font-semibold text-text-primary mb-1">Aly Zero-Shot Integration</p>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        Once published, Aly will automatically know to use this module when you say something like:
                        <br />
                        <span className="italic text-text-tertiary">"{formData.description || formData.name}"</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 px-5 py-3 border border-border-primary rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-border-primary/80 transition-all"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 bg-modules-aly text-white font-semibold py-3 rounded-xl disabled:opacity-60 hover:opacity-90 transition-all"
                    >
                      {loading ? 'Publishing...' : <><FloppyDisk size={18} /> Publish Module</>}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Right: Live Preview — takes 2 cols */}
          <div className="lg:col-span-2 lg:sticky lg:top-8 flex flex-col gap-4">
            <ModulePreview definition={formData} />
          </div>

        </div>
      </div>
    </div>
  );
}
