"use client";

import React, { useState } from 'react';
import {
  Plus, Trash, CaretDown, CaretUp, X,
  Equals, PlusCircle, PencilSimple, ArrowRight,
  GitBranch, Sparkle, ChatCircle, ArrowsClockwise,
} from '@phosphor-icons/react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import type { ModuleAction, ActionStep, ActionTrigger, ActionStepType, SchemaCollection } from '@/types/module-creator';

function uid() { return crypto.randomUUID().replace(/-/g, '').slice(0, 8); }

const TRIGGER_OPTIONS: { value: ActionTrigger; label: string }[] = [
  { value: 'button_click',    label: 'Button click' },
  { value: 'inline_icon',     label: 'Inline icon' },
  { value: 'keyboard_shortcut', label: 'Keyboard shortcut' },
  { value: 'on_entry_saved',  label: 'On entry saved' },
  { value: 'on_threshold',    label: 'On threshold' },
  { value: 'on_schedule',     label: 'On schedule' },
];

const STEP_TYPES: { value: ActionStepType; label: string; icon: React.ElementType }[] = [
  { value: 'compute',       label: 'Calculate',      icon: Equals },
  { value: 'mutate_create', label: 'Create entry',   icon: PlusCircle },
  { value: 'mutate_update', label: 'Update entry',   icon: PencilSimple },
  { value: 'mutate_delete', label: 'Delete entry',   icon: Trash },
  { value: 'ui_show',       label: 'Show feedback',  icon: ChatCircle },
  { value: 'ui_navigate',   label: 'Navigate',       icon: ArrowRight },
  { value: 'conditional',   label: 'Condition',      icon: GitBranch },
  { value: 'notify_aly',    label: 'Tell Aly',       icon: Sparkle },
];

const STEP_ICONS: Record<ActionStepType, React.ElementType> = Object.fromEntries(STEP_TYPES.map(s => [s.value, s.icon])) as any;

function stepSummary(step: ActionStep): string {
  switch (step.type) {
    case 'compute':       return `Calculate ${(step.config.variable_name as string) || '…'}`;
    case 'mutate_create': return `Create in ${(step.config.collection as string) || '…'}`;
    case 'mutate_update': return `Update ${(step.config.collection as string) || '…'}`;
    case 'mutate_delete': return `Delete from ${(step.config.collection as string) || '…'}`;
    case 'ui_show':       return `Show: ${(step.config.message as string)?.slice(0, 30) || '…'}`;
    case 'ui_navigate':   return `Go to ${(step.config.target as string) || '…'}`;
    case 'conditional':   return `If ${(step.config.left as string) || '…'} ${(step.config.operator as string) || ''} ${(step.config.right as string) || '…'}`;
    case 'notify_aly':    return `Tell Aly: ${(step.config.message as string)?.slice(0, 30) || '…'}`;
    default:              return step.type;
  }
}

function StepConfigPanel({
  step, onChange, collections,
}: {
  step:        ActionStep;
  onChange:    (s: ActionStep) => void;
  collections: SchemaCollection[];
}) {
  const upd = (p: Partial<ActionStep['config']>) => onChange({ ...step, config: { ...step.config, ...p } });
  const selectedColl = collections.find(c => c.key === (step.config.collection as string));

  if (step.type === 'compute') return (
    <div className="flex flex-col gap-2 pt-2">
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Variable name</span>
        <input value={(step.config.variable_name as string) ?? ''} onChange={e => upd({ variable_name: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none w-full" placeholder="result" />
      </label>
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Expression</span>
        <input value={(step.config.expression as string) ?? ''} onChange={e => upd({ expression: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none w-full" placeholder="entry.calories + 100" />
        <span className="text-[9px] text-text-tertiary/50">Available: entry.field_key, computed.key, refs.variable</span>
      </label>
    </div>
  );

  if (step.type === 'ui_show') return (
    <div className="flex flex-col gap-2 pt-2">
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Style</span>
        <select value={(step.config.style as string) ?? 'toast'} onChange={e => upd({ style: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
          <option value="banner">Banner</option><option value="toast">Toast</option>
        </select>
      </label>
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Message</span>
        <input value={(step.config.message as string) ?? ''} onChange={e => upd({ message: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none w-full" placeholder="Great job! {{refs.result}}" />
      </label>
    </div>
  );

  if (step.type === 'notify_aly') return (
    <div className="pt-2">
      <label className="flex flex-col gap-1"><span className="text-[9px] text-text-tertiary">Message for Aly</span>
        <textarea value={(step.config.message as string) ?? ''} onChange={e => upd({ message: e.target.value })} rows={2} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1.5 text-[11px] text-text-primary outline-none resize-none w-full" placeholder="User logged {{refs.result}} calories today." />
        <span className="text-[9px] text-text-tertiary/50">Use {'{{refs.variable}}'} for computed values</span>
      </label>
    </div>
  );

  if (step.type === 'mutate_create' || step.type === 'mutate_update') return (
    <div className="flex flex-col gap-2 pt-2">
      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-text-tertiary">Collection</span>
        <select
          value={(step.config.collection as string) ?? ''}
          onChange={e => upd({ collection: e.target.value })}
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none"
        >
          <option value="">— pick collection —</option>
          {collections.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>
      {selectedColl && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] text-text-tertiary">Field mappings</span>
          <p className="text-[9px] text-text-tertiary/50">Use <code>entry.field_key</code> or <code>computed.key</code> as values.</p>
          {selectedColl.fields.map(f => {
            const mappings = (step.config.mappings as Record<string, string>) ?? {};
            return (
              <div key={f.key} className="flex items-center gap-2">
                <span className="text-[10px] text-text-secondary w-24 shrink-0 truncate">{f.label}</span>
                <input
                  value={mappings[f.key] ?? ''}
                  onChange={e => upd({ mappings: { ...mappings, [f.key]: e.target.value } })}
                  placeholder={`entry.${f.key}`}
                  className="flex-1 bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (step.type === 'mutate_delete') return (
    <div className="flex flex-col gap-2 pt-2">
      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-text-tertiary">Collection</span>
        <select
          value={(step.config.collection as string) ?? ''}
          onChange={e => upd({ collection: e.target.value })}
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none"
        >
          <option value="">— pick collection —</option>
          {collections.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-text-tertiary">Entry ID expression</span>
        <input
          value={(step.config.entry_id as string) ?? ''}
          onChange={e => upd({ entry_id: e.target.value })}
          placeholder="entry.id"
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none w-full"
        />
      </label>
    </div>
  );

  if (step.type === 'ui_navigate') return (
    <div className="flex flex-col gap-2 pt-2">
      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-text-tertiary">Target type</span>
        <select
          value={(step.config.target_type as string) ?? 'page'}
          onChange={e => upd({ target_type: e.target.value })}
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none"
        >
          <option value="page">App page</option>
          <option value="hub">Hub</option>
          <option value="url">External URL</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-text-tertiary">Target path</span>
        <input
          value={(step.config.target as string) ?? ''}
          onChange={e => upd({ target: e.target.value })}
          placeholder="/spaces/... or https://..."
          className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none w-full"
        />
      </label>
    </div>
  );

  if (step.type === 'conditional') return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex gap-2 items-center">
        <input value={(step.config.left as string) ?? ''} onChange={e => upd({ left: e.target.value })} placeholder="entry.field or computed.key" className="flex-1 bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none" />
        <select value={(step.config.operator as string) ?? '='} onChange={e => upd({ operator: e.target.value })} className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
          {['=', '!=', '>', '<', '>=', '<='].map(op => <option key={op} value={op}>{op}</option>)}
        </select>
        <input value={(step.config.right as string) ?? ''} onChange={e => upd({ right: e.target.value })} placeholder="value" className="w-20 bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none" />
      </div>
      <p className="text-[9px] text-text-tertiary/50">Then-steps and else-steps configurable after save.</p>
    </div>
  );

  return <p className="text-[10px] text-text-tertiary/50 pt-2">Configure in the step panel after creation.</p>;
}

function ActionCard({ action, computedKeys, collections, onUpdate, onDelete }: {
  action:       ModuleAction;
  computedKeys: string[];
  collections:  SchemaCollection[];
  onUpdate:     (a: ModuleAction) => void;
  onDelete:     () => void;
}) {
  const [expanded, setExpanded]         = useState(false);
  const [editingStep, setEditingStep]   = useState<string | null>(null);
  const [showStepPicker, setShowStepPicker] = useState(false);

  const addStep = (type: ActionStepType) => {
    const step: ActionStep = { id: uid(), type, config: {} };
    onUpdate({ ...action, steps: [...action.steps, step] });
    setShowStepPicker(false);
    setEditingStep(step.id);
  };

  const updateStep = (id: string, patch: Partial<ActionStep>) => {
    onUpdate({ ...action, steps: action.steps.map(s => s.id === id ? { ...s, ...patch } : s) });
  };

  const removeStep = (id: string) => {
    onUpdate({ ...action, steps: action.steps.filter(s => s.id !== id) });
    if (editingStep === id) setEditingStep(null);
  };

  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl mb-2 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 group/action">
        <input value={action.name} onChange={e => onUpdate({ ...action, name: e.target.value })}
          className="bg-transparent text-[12px] font-medium text-text-primary outline-none flex-1" />
        <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-background-tertiary text-text-tertiary shrink-0">{action.trigger.replace('_', ' ')}</span>
        <span className="text-[10px] text-text-tertiary shrink-0">{action.steps.length} step{action.steps.length !== 1 ? 's' : ''}</span>
        <button type="button" onClick={() => setExpanded(v => !v)} className="text-text-tertiary hover:text-text-primary">
          {expanded ? <CaretUp size={13} /> : <CaretDown size={13} />}
        </button>
        <button type="button" onClick={onDelete} className="opacity-0 group-hover/action:opacity-100 text-text-tertiary hover:text-red-400 transition-opacity"><Trash size={13} /></button>
      </div>

      {expanded && (
        <div className="border-t border-border-primary px-4 py-4 flex flex-col gap-4">
          {/* Trigger */}
          <div>
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest mb-2">Trigger</p>
            <div className="grid grid-cols-3 gap-1.5">
              {TRIGGER_OPTIONS.map(t => (
                <button key={t.value} type="button" onClick={() => onUpdate({ ...action, trigger: t.value })}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] transition-all text-left ${action.trigger === t.value ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {action.trigger === 'keyboard_shortcut' && (
              <input value={(action.trigger_config?.shortcut as string) ?? ''} onChange={e => onUpdate({ ...action, trigger_config: { ...action.trigger_config, shortcut: e.target.value } })} placeholder="e.g. Ctrl+Shift+L" className="mt-2 bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] font-mono text-text-primary outline-none w-full" />
            )}
            {action.trigger === 'on_threshold' && (
              <div className="flex gap-2 mt-2">
                <select className="flex-1 bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
                  <option>Pick computed property…</option>
                  {computedKeys.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <select className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
                  {['>', '<', '>=', '<=', '='].map(op => <option key={op}>{op}</option>)}
                </select>
                <input type="number" placeholder="value" className="w-20 bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none" />
              </div>
            )}
            {action.trigger === 'on_schedule' && (
              <div className="flex gap-2 mt-2 items-center">
                <select className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none">
                  <option>Daily</option><option>Weekly</option>
                </select>
                <span className="text-[10px] text-text-tertiary">at</span>
                <input type="time" className="bg-background-primary border border-border-primary rounded-lg px-2 py-1 text-[11px] text-text-primary outline-none" />
              </div>
            )}
          </div>

          {/* Steps */}
          <div>
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest mb-2">Steps</p>
            {action.steps.length === 0 && <p className="text-[11px] text-text-tertiary/50 mb-2">No steps yet</p>}
            {action.steps.map(step => {
              const Icon = STEP_ICONS[step.type] ?? Equals;
              const isEditing = editingStep === step.id;
              return (
                <div key={step.id} className="bg-background-tertiary rounded-xl mb-1.5 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Icon size={13} className="text-text-tertiary shrink-0" />
                    <span className="text-[11px] text-text-secondary flex-1">{stepSummary(step)}</span>
                    <button type="button" onClick={() => setEditingStep(isEditing ? null : step.id)} className="text-text-tertiary hover:text-text-primary">
                      {isEditing ? <CaretUp size={12} /> : <CaretDown size={12} />}
                    </button>
                    <button type="button" onClick={() => removeStep(step.id)} className="text-text-tertiary hover:text-red-400"><X size={12} /></button>
                  </div>
                  {isEditing && (
                    <div className="border-t border-border-primary/30 px-3 pb-3">
                      <StepConfigPanel step={step} onChange={s => updateStep(s.id, s)} collections={collections} />
                    </div>
                  )}
                </div>
              );
            })}

            {showStepPicker ? (
              <div className="bg-background-tertiary rounded-xl p-3 grid grid-cols-2 gap-1.5">
                {STEP_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.value} type="button" onClick={() => addStep(t.value)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-primary text-[11px] text-text-secondary hover:bg-modules-aly/10 hover:text-modules-aly hover:border-modules-aly/20 transition-all">
                      <Icon size={12} /> {t.label}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setShowStepPicker(false)} className="col-span-2 text-[10px] text-text-tertiary hover:text-text-secondary mt-1 py-1">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowStepPicker(true)} className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-modules-aly mt-1 transition-colors">
                <Plus size={11} /> Add step
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type AutoBehaviorType = 'on_entry_saved' | 'on_threshold' | 'on_schedule';

export default function WebLogicPage() {
  const { definition, updateBehaviors } = useModuleEditor();
  const [showAutoPicker, setShowAutoPicker] = useState(false);

  if (!definition) return <div className="flex items-center justify-center h-full"><span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" /></div>;

  const behaviors    = definition.behaviors;
  const actions      = behaviors.web_actions ?? [];
  const computedKeys = (definition.computed_properties ?? []).map(c => c.key);
  const collections  = Object.values(definition.schemas ?? {}) as SchemaCollection[];
  const autoBehaviors = behaviors.auto_behaviors ?? {};

  const saveActions = (updated: ModuleAction[]) =>
    updateBehaviors({ ...behaviors, web_actions: updated });

  const addAction = () => {
    const a: ModuleAction = { id: uid(), name: 'New Action', trigger: 'button_click', trigger_config: {}, steps: [], is_primary: false };
    saveActions([...actions, a]);
  };

  return (
    <div className="flex flex-col gap-8 p-5 max-w-3xl mx-auto overflow-y-auto h-full">

      {/* Actions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Actions</p>
          <button type="button" onClick={addAction} className="flex items-center gap-1 text-[11px] border border-border-primary rounded-xl px-3 py-1.5 text-text-tertiary hover:text-modules-aly hover:border-modules-aly/30 transition-all">
            <Plus size={12} /> New Action
          </button>
        </div>
        {actions.length === 0 && <p className="text-[11px] text-text-tertiary/50 py-4 text-center">No actions defined</p>}
        {actions.map(action => (
          <ActionCard key={action.id} action={action} computedKeys={computedKeys} collections={collections}
            onUpdate={a => saveActions(actions.map(x => x.id === a.id ? a : x))}
            onDelete={() => { if (window.confirm('Delete action?')) saveActions(actions.filter(x => x.id !== action.id)); }}
          />
        ))}
      </section>

      {/* Auto-behaviors */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Auto-Behaviors</p>
          <div className="relative">
            <button type="button" onClick={() => setShowAutoPicker(v => !v)} className="flex items-center gap-1 text-[11px] border border-border-primary rounded-xl px-3 py-1.5 text-text-tertiary hover:text-modules-aly hover:border-modules-aly/30 transition-all">
              <Plus size={12} /> Add
            </button>
            {showAutoPicker && (
              <div className="absolute right-0 top-full mt-1 bg-background-secondary border border-border-primary rounded-xl shadow-xl overflow-hidden z-10 min-w-40">
                {[['on_entry_saved', 'On Entry Saved'], ['on_threshold', 'On Threshold'], ['on_schedule', 'On Schedule']].map(([type, label]) => (
                  <button key={type} type="button" onClick={() => {
                    const newBehavior = { id: uid(), type, steps: [], active: true } as any;
                    const key = type as AutoBehaviorType;
                    updateBehaviors({ ...behaviors, auto_behaviors: { ...autoBehaviors, [key]: [...((autoBehaviors as any)[key] ?? []), newBehavior] } });
                    setShowAutoPicker(false);
                  }} className="w-full px-4 py-2.5 text-[11px] text-text-secondary hover:bg-background-tertiary hover:text-text-primary text-left transition-all">
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {['on_entry_saved', 'on_threshold', 'on_schedule'].map(type => {
          const list = (autoBehaviors as any)[type] ?? [];
          return list.map((b: any) => (
            <div key={b.id} className="flex items-center gap-3 py-2.5 border-b border-border-primary/30 last:border-0">
              <button type="button" onClick={() => {
                const updated = { ...autoBehaviors, [type]: list.map((x: any) => x.id === b.id ? { ...x, active: !x.active } : x) };
                updateBehaviors({ ...behaviors, auto_behaviors: updated });
              }} className={`w-3 h-3 rounded-full shrink-0 transition-colors ${b.active ? 'bg-modules-aly' : 'bg-background-tertiary border border-border-primary'}`} />
              <span className="text-[11px] text-text-secondary flex-1">{type.replace('on_', 'On ').replace('_', ' ')}</span>
              <span className="text-[10px] text-text-tertiary">{b.steps?.length ?? 0} steps</span>
              <button type="button" onClick={() => {
                const updated = { ...autoBehaviors, [type]: list.filter((x: any) => x.id !== b.id) };
                updateBehaviors({ ...behaviors, auto_behaviors: updated });
              }} className="text-text-tertiary hover:text-red-400"><X size={12} /></button>
            </div>
          ));
        })}
        {['on_entry_saved', 'on_threshold', 'on_schedule'].every(t => !((autoBehaviors as any)[t]?.length)) && (
          <p className="text-[11px] text-text-tertiary/50 py-4 text-center">No auto-behaviors defined</p>
        )}
      </section>
    </div>
  );
}
