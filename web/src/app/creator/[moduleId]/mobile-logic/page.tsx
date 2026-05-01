"use client";

import React, { useState } from 'react';
import { Plus, Trash, CaretDown, CaretUp, X, Sparkle } from '@phosphor-icons/react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import type { ModuleAction, ActionStep, ActionTrigger, ActionStepType, SchemaCollection } from '@/types/module-creator';

function uid() { return crypto.randomUUID().replace(/-/g, '').slice(0, 8); }

const MOBILE_TRIGGERS: { value: ActionTrigger; label: string }[] = [
  { value: 'fab_tap',        label: 'FAB tap' },
  { value: 'swipe_left',     label: 'Swipe left' },
  { value: 'swipe_right',    label: 'Swipe right' },
  { value: 'long_press',     label: 'Long press' },
  { value: 'on_entry_saved', label: 'On entry saved' },
  { value: 'on_threshold',   label: 'On threshold' },
  { value: 'on_schedule',    label: 'On schedule' },
];

const MOBILE_STEP_TYPES: { value: ActionStepType; label: string }[] = [
  { value: 'compute',       label: 'Calculate' },
  { value: 'mutate_create', label: 'Create entry' },
  { value: 'mutate_update', label: 'Update entry' },
  { value: 'mutate_delete', label: 'Delete entry' },
  { value: 'ui_show',       label: 'Show message' },
  { value: 'ui_feedback',   label: 'Haptic / animation' },
  { value: 'notify_aly',    label: 'Tell Aly' },
  { value: 'conditional',   label: 'Condition' },
];

function MobileStepConfig({
  step, onChange, collections,
}: {
  step:        ActionStep;
  onChange:    (s: ActionStep) => void;
  collections: SchemaCollection[];
}) {
  const upd = (p: Partial<ActionStep['config']>) => onChange({ ...step, config: { ...step.config, ...p } });
  const selectedColl = collections.find(c => c.key === (step.config.collection as string));

  if (step.type === 'compute') return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Variable name</span>
        <input value={(step.config.variable_name as string) ?? ''} onChange={e => upd({ variable_name: e.target.value })}
          placeholder="result" className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none w-full" />
      </label>
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Expression</span>
        <input value={(step.config.expression as string) ?? ''} onChange={e => upd({ expression: e.target.value })}
          placeholder="entry.calories + 100" className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none w-full" />
      </label>
    </div>
  );

  if (step.type === 'ui_show') return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Style</span>
        <select value={(step.config.style as string) ?? 'toast'} onChange={e => upd({ style: e.target.value })}
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
          <option value="toast">Toast</option><option value="banner">Banner</option>
        </select>
      </label>
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Message</span>
        <input value={(step.config.message as string) ?? ''} onChange={e => upd({ message: e.target.value })}
          placeholder="Great job! {{refs.result}}" className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none w-full" />
      </label>
    </div>
  );

  if (step.type === 'ui_feedback') return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Haptic</span>
        <select value={(step.config.haptic as string) ?? 'light'} onChange={e => upd({ haptic: e.target.value })}
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
          {['none','light','medium','heavy','success','warning','error'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Animation</span>
        <select value={(step.config.play_animation as string) ?? 'none'} onChange={e => upd({ play_animation: e.target.value })}
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
          {['none','checkmark','confetti','shake'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
    </div>
  );

  if (step.type === 'notify_aly') return (
    <div>
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Message for Aly</span>
        <textarea value={(step.config.message as string) ?? ''} onChange={e => upd({ message: e.target.value })} rows={2}
          placeholder="User logged {{refs.result}} calories." className="bg-background-primary border border-border-primary rounded-lg px-2 py-1.5 text-[11px] text-text-primary outline-none resize-none w-full" />
      </label>
    </div>
  );

  if (step.type === 'mutate_create' || step.type === 'mutate_update') return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Collection</span>
        <select value={(step.config.collection as string) ?? ''} onChange={e => upd({ collection: e.target.value })}
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
          <option value="">— pick collection —</option>
          {collections.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>
      {selectedColl && selectedColl.fields.map(f => {
        const mappings = (step.config.mappings as Record<string, string>) ?? {};
        return (
          <div key={f.key} className="flex items-center gap-2">
            <span className="text-[10px] text-text-secondary w-20 shrink-0 truncate">{f.label}</span>
            <input value={mappings[f.key] ?? ''} onChange={e => upd({ mappings: { ...mappings, [f.key]: e.target.value } })}
              placeholder={`entry.${f.key}`} className="flex-1 bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none" />
          </div>
        );
      })}
    </div>
  );

  if (step.type === 'mutate_delete') return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Collection</span>
        <select value={(step.config.collection as string) ?? ''} onChange={e => upd({ collection: e.target.value })}
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
          <option value="">— pick collection —</option>
          {collections.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Entry ID</span>
        <input value={(step.config.entry_id as string) ?? ''} onChange={e => upd({ entry_id: e.target.value })}
          placeholder="entry.id" className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none w-full" />
      </label>
    </div>
  );

  return <p className="text-[10px] text-text-tertiary/50">No config needed for this step type.</p>;
}

function MobileActionCard({ action, collections, onUpdate, onDelete }: {
  action:      ModuleAction;
  collections: SchemaCollection[];
  onUpdate:    (a: ModuleAction) => void;
  onDelete:    () => void;
}) {
  const [expanded,    setExpanded]    = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);

  const addStep = (type: ActionStepType) => {
    const step: ActionStep = { id: uid(), type, config: {} };
    onUpdate({ ...action, steps: [...action.steps, step] });
    setShowPicker(false);
    setEditingStep(step.id);
  };

  const updateStep = (id: string, s: ActionStep) =>
    onUpdate({ ...action, steps: action.steps.map(x => x.id === id ? s : x) });

  const removeStep = (id: string) => {
    onUpdate({ ...action, steps: action.steps.filter(s => s.id !== id) });
    if (editingStep === id) setEditingStep(null);
  };

  const stepLabel = (s: ActionStep): string => {
    if (s.type === 'ui_feedback') return `Haptic: ${(s.config.haptic as string) ?? 'light'}, anim: ${(s.config.play_animation as string) ?? 'none'}`;
    if (s.type === 'ui_show')     return `Show: ${(s.config.message as string)?.slice(0, 28) ?? '…'}`;
    if (s.type === 'compute')     return `Calculate ${(s.config.variable_name as string) ?? '…'}`;
    if (s.type === 'notify_aly')  return `Tell Aly: ${(s.config.message as string)?.slice(0, 28) ?? '…'}`;
    if (s.type === 'mutate_create') return `Create in ${(s.config.collection as string) || '…'}`;
    if (s.type === 'mutate_update') return `Update ${(s.config.collection as string) || '…'}`;
    if (s.type === 'mutate_delete') return `Delete from ${(s.config.collection as string) || '…'}`;
    return s.type.replace(/_/g, ' ');
  };

  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl mb-2 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 group/ma">
        <input value={action.name} onChange={e => onUpdate({ ...action, name: e.target.value })}
          className="bg-transparent text-[12px] font-medium text-text-primary outline-none flex-1" />
        <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-background-tertiary text-text-tertiary shrink-0">{action.trigger.replace(/_/g, ' ')}</span>
        <span className="text-[10px] text-text-tertiary">{action.steps.length} steps</span>
        <button type="button" onClick={() => setExpanded(v => !v)} className="text-text-tertiary hover:text-text-primary">{expanded ? <CaretUp size={13} /> : <CaretDown size={13} />}</button>
        <button type="button" onClick={onDelete} className="opacity-0 group-hover/ma:opacity-100 text-text-tertiary hover:text-red-400 transition-opacity"><Trash size={13} /></button>
      </div>

      {expanded && (
        <div className="border-t border-border-primary px-4 py-4 flex flex-col gap-4">
          <div>
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest mb-2">Trigger</p>
            <div className="grid grid-cols-3 gap-1.5">
              {MOBILE_TRIGGERS.map(t => (
                <button key={t.value} type="button" onClick={() => onUpdate({ ...action, trigger: t.value })}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] transition-all ${action.trigger === t.value ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest mb-2">Steps</p>
            {action.steps.map(step => {
              const isEditing = editingStep === step.id;
              return (
                <div key={step.id} className="bg-background-tertiary rounded-xl mb-1.5 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="text-[11px] text-text-secondary flex-1">{stepLabel(step)}</span>
                    <button type="button" onClick={() => setEditingStep(isEditing ? null : step.id)} className="text-text-tertiary hover:text-text-primary">
                      {isEditing ? <CaretUp size={12} /> : <CaretDown size={12} />}
                    </button>
                    <button type="button" onClick={() => removeStep(step.id)} className="text-text-tertiary hover:text-red-400"><X size={12} /></button>
                  </div>
                  {isEditing && (
                    <div className="border-t border-border-primary/30 px-3 pb-3 pt-2">
                      <MobileStepConfig step={step} onChange={s => updateStep(s.id, s)} collections={collections} />
                    </div>
                  )}
                </div>
              );
            })}
            {showPicker ? (
              <div className="bg-background-tertiary rounded-xl p-2 grid grid-cols-2 gap-1 mb-2">
                {MOBILE_STEP_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => addStep(t.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-border-primary text-[11px] text-text-secondary hover:bg-modules-aly/10 hover:text-modules-aly hover:border-modules-aly/20 transition-all text-left">
                    {t.label}
                  </button>
                ))}
                <button type="button" onClick={() => setShowPicker(false)} className="col-span-2 text-[10px] text-text-tertiary mt-1 py-1 text-center">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowPicker(true)} className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-modules-aly transition-colors">
                <Plus size={11} /> Add step
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobileLogicPage() {
  const { definition, updateBehaviors, updateMobileConfig } = useModuleEditor();

  if (!definition) return <div className="flex items-center justify-center h-full"><span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" /></div>;

  const behaviors   = definition.behaviors;
  const actions     = behaviors.mobile_actions ?? [];
  const mc          = definition.mobile_config;
  const collections = Object.values(definition.schemas ?? {}) as SchemaCollection[];

  const saveActions = (updated: ModuleAction[]) =>
    updateBehaviors({ ...behaviors, mobile_actions: updated });

  const addAction = () => {
    const a: ModuleAction = { id: uid(), name: 'New Action', trigger: 'fab_tap', trigger_config: {}, steps: [], is_primary: false };
    saveActions([...actions, a]);
  };

  const actionOptions = [{ value: '__entry_sheet__', label: 'Open Entry Sheet (default)' }, ...actions.map(a => ({ value: a.id, label: a.name }))];

  return (
    <div className="flex flex-col gap-8 p-5 max-w-3xl mx-auto overflow-y-auto h-full">

      {/* FAB Binding */}
      <section className="bg-background-secondary border border-modules-aly/20 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkle size={14} className="text-modules-aly" weight="fill" />
          <p className="text-[11px] font-medium text-text-primary">FAB Binding</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-secondary">When user taps the FAB, run:</span>
          <select value={mc.fab_label ?? '__entry_sheet__'} onChange={e => updateMobileConfig({ fab_label: e.target.value, _configured: true })}
            className="flex-1 bg-background-primary border border-border-primary rounded-xl px-3 py-1.5 text-[12px] text-text-primary outline-none">
            {actionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </section>

      {/* Swipe Actions */}
      <section>
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-3">Swipe Actions</p>
        <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden divide-y divide-border-primary">
          {[['Swipe Left', 'swipe_left_action'], ['Swipe Right', 'swipe_right_action']].map(([label, key]) => (
            <div key={key} className="flex items-center gap-3 px-4 py-3">
              <span className="text-[11px] text-text-secondary w-24">{label} →</span>
              <select value={(mc as any)[key] ?? '__none__'} onChange={e => updateMobileConfig({ [key]: e.target.value, _configured: true } as any)}
                className="flex-1 bg-background-primary border border-border-primary rounded-xl px-3 py-1.5 text-[11px] text-text-primary outline-none">
                <option value="__none__">No action</option>
                {actions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Actions</p>
          <button type="button" onClick={addAction} className="flex items-center gap-1 text-[11px] border border-border-primary rounded-xl px-3 py-1.5 text-text-tertiary hover:text-modules-aly hover:border-modules-aly/30 transition-all">
            <Plus size={12} /> New Action
          </button>
        </div>
        {actions.length === 0 && <p className="text-[11px] text-text-tertiary/50 py-4 text-center">No actions defined</p>}
        {actions.map(a => (
          <MobileActionCard key={a.id} action={a} collections={collections}
            onUpdate={updated => saveActions(actions.map(x => x.id === updated.id ? updated : x))}
            onDelete={() => { if (window.confirm('Delete action?')) saveActions(actions.filter(x => x.id !== a.id)); }}
          />
        ))}
      </section>
    </div>
  );
}
