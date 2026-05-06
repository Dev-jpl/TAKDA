"use client";

import React, { useState } from 'react';
import { Plus, X, Tag } from '@phosphor-icons/react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import type { ModuleDefinitionV2 } from '@/types/module-creator';

type AlyConfig = ModuleDefinitionV2['aly_config'];

interface ProactiveInsight {
  label:     string;
  condition: string;
  message:   string;
}

const inputCls = "w-full bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-modules-aly/50 transition-all placeholder:text-text-tertiary";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-modules-aly' : 'bg-background-tertiary border border-border-primary'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">{title}</p>
      {subtitle && <p className="text-[11px] text-text-tertiary/70 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function IntelligencePage() {
  const { definition, updateAlyConfig } = useModuleEditor();
  const [kwInput, setKwInput] = useState('');

  if (!definition) return (
    <div className="flex items-center justify-center h-full">
      <span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  const aly = definition.aly_config;
  const upd = (patch: Partial<AlyConfig>) => updateAlyConfig({ ...aly, ...patch });

  const addKeyword = () => {
    const kw = kwInput.trim().toLowerCase();
    if (!kw || aly.intent_keywords.includes(kw)) { setKwInput(''); return; }
    upd({ intent_keywords: [...aly.intent_keywords, kw] });
    setKwInput('');
  };

  const insights: ProactiveInsight[] = (aly as any).proactive_insights ?? [];
  const loadLastN: number = (aly as any).load_last_n_entries ?? 10;
  const includeComputed: boolean = (aly as any).include_computed_in_context ?? true;

  const updateInsight = (i: number, patch: Partial<ProactiveInsight>) => {
    const next = insights.map((ins, idx) => idx === i ? { ...ins, ...patch } : ins);
    upd({ proactive_insights: next } as any);
  };

  const removeInsight = (i: number) => {
    upd({ proactive_insights: insights.filter((_, idx) => idx !== i) } as any);
  };

  const addInsight = () => {
    upd({ proactive_insights: [...insights, { label: '', condition: '', message: '' }] } as any);
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 overflow-y-auto h-full flex flex-col gap-8">

      {/* Section 1: Basic Integration */}
      <section className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-4">
        <SectionHeader
          title="Basic Integration"
          subtitle="Teach your assistant how to understand and log data for this module."
        />

        {/* Intent keywords */}
        <div>
          <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Tag size={11} /> Intent keywords
          </label>
          <p className="text-[10px] text-text-tertiary/60 mb-2">Words that signal this module is relevant. Press Enter to add.</p>
          <div
            className="min-h-10 flex flex-wrap gap-1.5 items-center bg-background-primary border border-border-primary rounded-xl px-3 py-2 cursor-text"
            onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
          >
            {aly.intent_keywords.map(kw => (
              <span key={kw} className="flex items-center gap-1 text-[11px] font-medium bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-2 py-0.5 rounded-md">
                {kw}
                <button type="button" onClick={() => upd({ intent_keywords: aly.intent_keywords.filter(k => k !== kw) })}>
                  <X size={9} weight="bold" />
                </button>
              </span>
            ))}
            <input
              value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(); } }}
              placeholder={aly.intent_keywords.length === 0 ? 'Type keyword and press Enter…' : ''}
              className="flex-1 min-w-20 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-tertiary/50"
            />
          </div>
        </div>

        {/* Context hint */}
        <div>
          <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-1.5 block">
            What Aly should know about this module
          </label>
          <p className="text-[10px] text-text-tertiary/60 mb-2">One sentence used when referencing this module in responses.</p>
          <textarea
            rows={3}
            value={aly.context_hint}
            onChange={e => upd({ context_hint: e.target.value })}
            placeholder={`e.g. "This module tracks daily ${definition.name || 'data'} for the user."`}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Log prompt */}
        <div>
          <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-1.5 block">
            Example log phrase
          </label>
          <p className="text-[10px] text-text-tertiary/60 mb-2">Show Aly what a typical log command looks like.</p>
          <input
            value={aly.log_prompt}
            onChange={e => upd({ log_prompt: e.target.value })}
            placeholder={`e.g. "log ${definition.name?.toLowerCase() || 'data'}: 2 units"`}
            className={inputCls}
          />
        </div>
      </section>

      {/* Section 2: Proactive Insights */}
      <section>
        <SectionHeader
          title="Proactive Insights"
          subtitle="Rules that tell Aly when to say something proactively."
        />
        <div className="flex flex-col gap-2">
          {insights.map((insight, i) => (
            <div key={i} className="bg-background-secondary border border-border-primary rounded-xl p-4 flex flex-col gap-3 relative group/insight">
              <button
                type="button"
                onClick={() => removeInsight(i)}
                className="absolute top-3 right-3 text-text-tertiary hover:text-red-400 opacity-0 group-hover/insight:opacity-100 transition-opacity"
              >
                <X size={13} />
              </button>

              <label className="flex flex-col gap-1">
                <span className="text-[9px] text-text-tertiary">Label</span>
                <input
                  value={insight.label}
                  onChange={e => updateInsight(i, { label: e.target.value })}
                  placeholder="e.g. Goal reached"
                  className="bg-background-primary border border-border-primary rounded-lg px-3 py-1.5 text-[12px] text-text-primary outline-none focus:border-modules-aly/50 w-full"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[9px] text-text-tertiary">Condition</span>
                <input
                  value={insight.condition}
                  onChange={e => updateInsight(i, { condition: e.target.value })}
                  placeholder="when total_calories > 2000"
                  className="bg-background-primary border border-border-primary rounded-lg px-3 py-1.5 text-[12px] text-text-primary outline-none focus:border-modules-aly/50 w-full font-mono"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[9px] text-text-tertiary">Message template</span>
                <textarea
                  rows={2}
                  value={insight.message}
                  onChange={e => updateInsight(i, { message: e.target.value })}
                  placeholder="You've hit your goal! You've logged {{total_calories}} kcal today."
                  className="bg-background-primary border border-border-primary rounded-lg px-3 py-1.5 text-[12px] text-text-primary outline-none focus:border-modules-aly/50 resize-none w-full"
                />
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={addInsight}
            className="flex items-center justify-center gap-2 border-2 border-dashed border-border-primary rounded-xl py-4 text-[11px] text-text-tertiary hover:border-modules-aly/40 hover:text-modules-aly transition-all"
          >
            <Plus size={13} /> Add Insight
          </button>
        </div>
      </section>

      {/* Section 3: Context Loading */}
      <section className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-4">
        <SectionHeader
          title="Context Loading"
          subtitle="What data does Aly receive when this module is active?"
        />

        <label className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[12px] text-text-secondary">Load latest entries</span>
            <p className="text-[10px] text-text-tertiary/60">How many recent entries Aly can reference</p>
          </div>
          <input
            type="number"
            min={1}
            max={50}
            value={loadLastN}
            onChange={e => upd({ load_last_n_entries: Math.min(50, Math.max(1, Number(e.target.value))) } as any)}
            className="w-20 bg-background-primary border border-border-primary rounded-xl px-3 py-1.5 text-[12px] text-text-primary outline-none focus:border-modules-aly/50 text-center"
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <span className="text-[12px] text-text-secondary">Include computed properties in context</span>
            <p className="text-[10px] text-text-tertiary/60">Aly will see your computed stats like totals and averages</p>
          </div>
          <Toggle
            checked={includeComputed}
            onChange={v => upd({ include_computed_in_context: v } as any)}
          />
        </label>
      </section>
    </div>
  );
}
