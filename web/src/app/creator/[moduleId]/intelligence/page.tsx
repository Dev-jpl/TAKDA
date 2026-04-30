"use client";

import React, { useState } from 'react';
import { Plus, X, Tag } from '@phosphor-icons/react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import type { ModuleDefinitionV2 } from '@/types/module-creator';

type AlyConfig = ModuleDefinitionV2['aly_config'];

const inputCls = "w-full bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-modules-aly/50 transition-all placeholder:text-text-tertiary";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">{title}</p>
      {subtitle && <p className="text-[11px] text-text-tertiary/70 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function IntelligencePage() {
  const { definition, updateAlyConfig, updateDefinition } = useModuleEditor();
  const [kwInput, setKwInput] = useState('');
  const [insightInput, setInsightInput] = useState('');

  if (!definition) return <div className="flex items-center justify-center h-full"><span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" /></div>;

  const aly = definition.aly_config;
  const upd = (patch: Partial<AlyConfig>) => updateAlyConfig({ ...aly, ...patch });

  const addKeyword = () => {
    const kw = kwInput.trim().toLowerCase();
    if (!kw || aly.intent_keywords.includes(kw)) { setKwInput(''); return; }
    upd({ intent_keywords: [...aly.intent_keywords, kw] });
    setKwInput('');
  };

  const allActions = [
    ...(definition.behaviors?.web_actions ?? []),
    ...(definition.behaviors?.mobile_actions ?? []),
  ];
  const computedProps = definition.computed_properties ?? [];

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 overflow-y-auto h-full flex flex-col gap-8">

      {/* Section 1: Basic Integration */}
      <section className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-4">
        <SectionHeader title="Basic Integration" subtitle={`Teach your assistant how to understand and log data for this module.`} />

        <div>
          <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Tag size={11} /> Intent keywords</label>
          <p className="text-[10px] text-text-tertiary/60 mb-2">Words that signal this module is relevant. Press Enter to add.</p>
          <div className="min-h-10 flex flex-wrap gap-1.5 items-center bg-background-primary border border-border-primary rounded-xl px-3 py-2 cursor-text"
            onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
            {aly.intent_keywords.map(kw => (
              <span key={kw} className="flex items-center gap-1 text-[11px] font-medium bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-2 py-0.5 rounded-md">
                {kw}
                <button type="button" onClick={() => upd({ intent_keywords: aly.intent_keywords.filter(k => k !== kw) })}><X size={9} weight="bold" /></button>
              </span>
            ))}
            <input value={kwInput} onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(); } }}
              placeholder={aly.intent_keywords.length === 0 ? 'Type keyword and press Enter…' : ''}
              className="flex-1 min-w-20 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-tertiary/50" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-1.5 block">What your assistant should know</label>
          <p className="text-[10px] text-text-tertiary/60 mb-2">One sentence used when referencing this module in responses.</p>
          <textarea rows={3} value={aly.context_hint} onChange={e => upd({ context_hint: e.target.value })}
            placeholder={`e.g. "This module tracks daily ${definition.name || 'data'} for the user."`}
            className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-1.5 block">Log example</label>
          <p className="text-[10px] text-text-tertiary/60 mb-2">Show your assistant what a typical log command looks like.</p>
          <input value={aly.log_prompt} onChange={e => upd({ log_prompt: e.target.value })}
            placeholder={`e.g. "log ${definition.name?.toLowerCase() || 'data'}: 2 units"`}
            className={inputCls} />
        </div>
      </section>

      {/* Section 2: Proactive Insights */}
      <section>
        <SectionHeader title="Proactive Insights" subtitle="Rules that tell your assistant when to proactively say something." />
        <div className="flex flex-col gap-2">
          {(aly.proactive_insights ?? []).map((insight, i) => (
            <div key={i} className="bg-background-secondary border border-border-primary rounded-xl p-4 flex flex-col gap-2 relative group/insight">
              <button type="button" onClick={() => upd({ proactive_insights: (aly.proactive_insights ?? []).filter((_, j) => j !== i) })}
                className="absolute top-3 right-3 text-text-tertiary hover:text-red-400 opacity-0 group-hover/insight:opacity-100 transition-opacity"><X size={13} /></button>
              <p className="text-[9px] text-text-tertiary">Condition</p>
              <div className="flex gap-2 items-center flex-wrap">
                <select className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
                  <option>Pick computed property…</option>
                  {computedProps.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <select className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
                  {['>', '<', '>=', '<=', '='].map(op => <option key={op}>{op}</option>)}
                </select>
                <input type="number" placeholder="value" className="w-20 bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none" />
              </div>
              <textarea rows={2} value={insight} onChange={e => {
                const updated = [...(aly.proactive_insights ?? [])];
                updated[i] = e.target.value;
                upd({ proactive_insights: updated });
              }} placeholder="Aly says: 'You've hit your goal! {{computed.total}} logged.'" className={`${inputCls} resize-none text-[12px]`} />
              <div className="flex items-center gap-3">
                <p className="text-[9px] text-text-tertiary">Frequency</p>
                {['once', 'daily', 'every_time'].map(f => (
                  <label key={f} className="flex items-center gap-1 text-[11px] text-text-secondary cursor-pointer">
                    <input type="radio" name={`freq_${i}`} value={f} className="accent-modules-aly" />{f.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => upd({ proactive_insights: [...(aly.proactive_insights ?? []), ''] })}
            className="flex items-center justify-center gap-2 border-2 border-dashed border-border-primary rounded-xl py-4 text-[11px] text-text-tertiary hover:border-modules-aly/40 hover:text-modules-aly transition-all">
            <Plus size={13} /> Add Insight
          </button>
        </div>
      </section>

      {/* Section 3: Aly Actions */}
      <section className="bg-background-secondary border border-border-primary rounded-xl p-5">
        <SectionHeader title="Aly Actions" subtitle="Which actions can your assistant trigger on behalf of the user via chat?" />
        {allActions.length === 0 ? (
          <p className="text-[11px] text-text-tertiary/50">Define actions in Web Logic or Mobile Logic first.</p>
        ) : allActions.map(a => (
          <label key={a.id} className="flex items-center gap-3 py-2.5 cursor-pointer border-b border-border-primary/30 last:border-0">
            <input type="checkbox"
              checked={(aly.aly_can_trigger_actions ?? []).includes(a.id)}
              onChange={e => {
                const current = aly.aly_can_trigger_actions ?? [];
                upd({ aly_can_trigger_actions: e.target.checked ? [...current, a.id] : current.filter(id => id !== a.id) });
              }}
              className="accent-modules-aly w-4 h-4" />
            <span className="text-[12px] text-text-primary flex-1">{a.name}</span>
            <span className="text-[9px] text-text-tertiary uppercase tracking-widest">{a.trigger.replace(/_/g, ' ')}</span>
          </label>
        ))}
      </section>

      {/* Section 4: Context Loading */}
      <section className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-4">
        <SectionHeader title="Context Loading" subtitle="What data does your assistant receive when this module is active?" />

        <label className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-text-secondary">Load latest N entries</span>
          <input type="number" min={1} max={50} defaultValue={10}
            className="w-20 bg-background-primary border border-border-primary rounded-xl px-3 py-1.5 text-[12px] text-text-primary outline-none focus:border-modules-aly/50" />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-[12px] text-text-secondary">Include computed properties in context</span>
          <button type="button" className="relative inline-flex h-4 w-7 items-center rounded-full bg-modules-aly shrink-0">
            <span className="inline-block h-2.5 w-2.5 translate-x-3.5 rounded-full bg-white shadow" />
          </button>
        </label>

        {computedProps.length > 0 && (
          <div>
            <p className="text-[10px] text-text-tertiary mb-2">Which computed properties to include</p>
            {computedProps.map(p => (
              <label key={p.key} className="flex items-center gap-2 py-1.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-modules-aly" />
                <span className="text-[11px] text-text-secondary">{p.label}</span>
                <span className="text-[9px] text-text-tertiary font-mono">{p.key}</span>
              </label>
            ))}
          </div>
        )}

        <div>
          <p className="text-[10px] text-text-tertiary mb-2">Context tier</p>
          <div className="flex gap-3">
            {[['base', 'Always loaded'], ['deep', 'Loaded when relevant']].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer">
                <input type="radio" name="context_tier" value={v} defaultChecked={v === 'base'} className="accent-modules-aly" />{l}
              </label>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
