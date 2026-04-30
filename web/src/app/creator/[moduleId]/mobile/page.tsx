"use client";

import React, { useMemo, useState } from 'react';
import {
  Plus, X, TextT, Hash, ToggleLeft, CalendarBlank, ListBullets,
} from '@phosphor-icons/react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import type { MobileConfig } from '@/types/module-creator';

type MobileSurface = 'module_screen' | 'entry_sheet' | 'widget' | 'list_item';
type RightTab = 'configure' | 'behavior';

const SURFACES: { id: MobileSurface; label: string }[] = [
  { id: 'module_screen', label: 'Module Screen' },
  { id: 'entry_sheet',   label: 'Entry Sheet' },
  { id: 'widget',        label: 'Widget' },
  { id: 'list_item',     label: 'List Item' },
];

const SHEET_HEIGHTS: Record<string, string> = { compact: '35%', standard: '60%', tall: '85%' };

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-modules-aly' : 'bg-background-tertiary border border-border-primary'}`}>
      <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function RadioGroup({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] text-text-tertiary uppercase tracking-widest">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all ${value === o.value ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MobileInterfacePage() {
  const { definition, updateMobileConfig } = useModuleEditor();
  const [surface,     setSurface]     = useState<MobileSurface>('entry_sheet');
  const [rightTab,    setRightTab]    = useState<RightTab>('behavior');
  const [showKbd,     setShowKbd]     = useState(false);
  const [showThumb,   setShowThumb]   = useState(false);
  const [showSafe,    setShowSafe]    = useState(false);

  const fields = useMemo(() => {
    if (!definition) return [];
    if (Object.keys(definition.schemas ?? {}).length > 0)
      return Object.values(definition.schemas).flatMap(c => c.fields);
    return definition.schema ?? [];
  }, [definition]);

  if (!definition) return <div className="flex items-center justify-center h-full"><span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" /></div>;

  const mc = definition.mobile_config;
  const upd = (patch: Partial<MobileConfig>) => updateMobileConfig({ ...patch, _configured: true });
  const sheetH = SHEET_HEIGHTS[mc.sheet_height] ?? '60%';

  const noSchema = fields.length === 0;

  return (
    <div className="flex h-full overflow-hidden">

      {/* Left palette */}
      <div className="w-48 shrink-0 border-r border-border-primary bg-background-secondary flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border-primary shrink-0">
          <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest">Components</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {noSchema ? (
            <p className="text-[11px] text-text-tertiary/50 px-3 py-4 text-center">Define schema first</p>
          ) : (
            <>
              <p className="text-[9px] text-text-tertiary/50 uppercase tracking-widest px-3 pt-2 pb-1">Fields</p>
              {fields.map(f => {
                const icons: Record<string, React.ElementType> = { text: TextT, string: TextT, number: Hash, boolean: ToggleLeft, date: CalendarBlank, select: ListBullets };
                const Icon = icons[f.type] ?? TextT;
                return (
                  <button key={f.key} type="button" className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-text-secondary hover:bg-background-tertiary hover:text-text-primary rounded-xl mx-1 transition-all">
                    <Icon size={12} className="text-text-tertiary/60 shrink-0" />
                    {f.label}
                  </button>
                );
              })}
              <p className="text-[9px] text-text-tertiary/50 uppercase tracking-widest px-3 pt-3 pb-1">Layout</p>
              {['Section Header', 'Divider', 'Spacer', 'Save Button'].map(l => (
                <button key={l} type="button" className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-text-secondary hover:bg-background-tertiary hover:text-text-primary rounded-xl mx-1 transition-all">{l}</button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Center: phone frame */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background-primary">
        {/* Surface switcher + overlays */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border-primary bg-background-secondary shrink-0 flex-wrap">
          {SURFACES.map(s => (
            <button key={s.id} type="button" onClick={() => setSurface(s.id)}
              className={`px-3 py-1 rounded-xl text-[11px] border transition-all ${surface === s.id ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
              {s.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            {[['Keyboard', showKbd, setShowKbd], ['Thumb Zone', showThumb, setShowThumb], ['Safe Areas', showSafe, setShowSafe]].map(([label, val, setter]: any) => (
              <button key={label} type="button" onClick={() => setter(!val)}
                className={`px-2 py-0.5 rounded-lg text-[10px] border transition-all ${val ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Phone frame */}
        <div className="flex-1 overflow-y-auto flex items-start justify-center py-8"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          <div className="w-[390px] h-[780px] rounded-[44px] border-4 border-background-tertiary bg-background-primary shadow-2xl overflow-hidden relative flex flex-col">
            {/* Safe areas */}
            {showSafe && <div className="absolute top-0 left-0 right-0 h-11 bg-blue-500/10 flex items-center justify-center z-30 pointer-events-none"><span className="text-[9px] text-blue-400">Status bar · 44px</span></div>}
            {showSafe && <div className="absolute bottom-0 left-0 right-0 h-8 bg-blue-500/10 flex items-center justify-center z-30 pointer-events-none"><span className="text-[9px] text-blue-400">Home indicator · 34px</span></div>}

            {/* Status bar */}
            <div className="h-11 bg-background-secondary flex items-center justify-between px-8 shrink-0 relative z-10">
              <span className="text-[11px] text-text-tertiary font-medium">9:41</span>
              <div className="flex gap-1 items-center">
                <span className="text-[10px] text-text-tertiary">▌▌▌</span>
                <span className="text-[10px] text-text-tertiary">⬛</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative overflow-hidden">
              {/* Thumb zone overlay */}
              {showThumb && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-2/3 bg-red-500/5 pointer-events-none z-20 flex items-start justify-center pt-4">
                    <span className="text-[9px] text-red-400/60">Stretch zone</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-green-500/10 pointer-events-none z-20 flex items-end justify-center pb-3">
                    <span className="text-[9px] text-green-400/60">Easy reach</span>
                  </div>
                </>
              )}

              {/* Module screen content */}
              {surface === 'module_screen' && (
                <div className="h-full overflow-y-auto px-5 pt-5">
                  <p className="text-base font-medium text-text-primary mb-1">{definition.name || 'Module'}</p>
                  <p className="text-[11px] text-text-tertiary mb-4">{fields.length} fields · {definition.computed_properties?.length ?? 0} computed</p>
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-background-secondary border border-border-primary rounded-xl px-4 py-3 mb-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-background-tertiary shrink-0" />
                      <div className="flex-1">
                        <div className="h-2.5 bg-background-tertiary rounded w-3/4 mb-1.5" />
                        <div className="h-2 bg-background-tertiary/60 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Entry sheet */}
              {surface === 'entry_sheet' && (
                <>
                  <div className="absolute bottom-0 left-0 right-0 bg-background-secondary rounded-t-[20px] border-t border-border-primary flex flex-col" style={{ height: sheetH }}>
                    <div className="w-9 h-1 rounded-full bg-background-tertiary mx-auto mt-3 shrink-0" />
                    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                      {noSchema ? (
                        <p className="text-[11px] text-text-tertiary text-center py-4">No fields defined</p>
                      ) : fields.slice(0, 4).map(f => (
                        <div key={f.key}>
                          <p className="text-[10px] text-text-tertiary mb-1">{f.label}</p>
                          <div className="bg-background-tertiary border border-border-primary rounded-xl h-9 px-3 flex items-center">
                            <span className="text-[11px] text-text-tertiary/50">Enter {f.label.toLowerCase()}…</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {showKbd && <div className="h-[200px] bg-background-tertiary/80 border-t border-border-primary shrink-0 flex items-center justify-center"><span className="text-[10px] text-text-tertiary/40">Keyboard</span></div>}
                  </div>
                </>
              )}

              {/* Widget */}
              {surface === 'widget' && (
                <div className="p-4">
                  <div className="bg-background-secondary border border-border-primary rounded-xl p-4">
                    <p className="text-[11px] text-text-tertiary mb-1">Widget preview</p>
                    <p className="text-2xl font-medium text-text-primary">—</p>
                  </div>
                </div>
              )}

              {/* List item */}
              {surface === 'list_item' && (
                <div className="p-4">
                  <div className="bg-background-secondary border border-border-primary rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-background-tertiary shrink-0" />
                    <div className="flex-1">
                      <div className="h-2.5 bg-background-tertiary rounded w-2/3 mb-1.5" />
                      <div className="h-2 bg-background-tertiary/60 rounded w-1/3" />
                    </div>
                    <div className="h-5 w-10 bg-background-tertiary rounded" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-64 shrink-0 border-l border-border-primary bg-background-secondary flex flex-col overflow-hidden">
        <div className="flex gap-1 p-2 border-b border-border-primary shrink-0">
          {(['configure', 'behavior'] as RightTab[]).map(t => (
            <button key={t} type="button" onClick={() => setRightTab(t)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-xl border transition-all capitalize ${rightTab === t ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
              {t === 'behavior' ? 'Mobile Behavior' : 'Configure'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
          {rightTab === 'configure' && (
            <p className="text-[11px] text-text-tertiary">Select a component on the canvas to configure it.</p>
          )}

          {rightTab === 'behavior' && surface === 'entry_sheet' && (
            <>
              <RadioGroup label="Sheet height" value={mc.sheet_height} onChange={v => upd({ sheet_height: v as any })} options={[{ value: 'compact', label: 'Compact' }, { value: 'standard', label: 'Standard' }, { value: 'tall', label: 'Tall' }]} />
              {[['auto_focus_first_field', 'Auto-focus first field'], ['dismiss_on_save', 'Dismiss after save'], ['haptic_on_save', 'Haptic on save'], ['show_success_animation', 'Success animation']].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-[11px] text-text-secondary">{label}</span>
                  <Toggle checked={(mc as any)[key] ?? true} onChange={v => upd({ [key]: v } as any)} />
                </label>
              ))}
              {mc.show_success_animation && (
                <RadioGroup label="Animation type" value={mc.success_animation_type ?? 'checkmark'} onChange={v => upd({ success_animation_type: v as any })} options={[{ value: 'checkmark', label: 'Checkmark' }, { value: 'confetti', label: 'Confetti' }, { value: 'none', label: 'None' }]} />
              )}
            </>
          )}

          {rightTab === 'behavior' && surface === 'module_screen' && (
            <>
              <RadioGroup label="Swipe left" value={mc.swipe_left_action ?? 'none'} onChange={v => upd({ swipe_left_action: v })} options={[{ value: 'none', label: 'None' }, { value: 'delete', label: 'Delete' }, { value: 'archive', label: 'Archive' }]} />
              <RadioGroup label="Swipe right" value={mc.swipe_right_action ?? 'none'} onChange={v => upd({ swipe_right_action: v })} options={[{ value: 'none', label: 'None' }, { value: 'edit', label: 'Edit' }, { value: 'quick_complete', label: 'Quick complete' }]} />
              <RadioGroup label="Tap row" value={mc.tap_row_action ?? 'detail'} onChange={v => upd({ tap_row_action: v as any })} options={[{ value: 'detail', label: 'Detail' }, { value: 'edit', label: 'Edit' }, { value: 'expand', label: 'Expand' }, { value: 'none', label: 'None' }]} />
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-[11px] text-text-secondary">Show computed summary</span>
                <Toggle checked={mc.show_computed_summary} onChange={v => upd({ show_computed_summary: v })} />
              </label>
              {mc.show_computed_summary && (
                <RadioGroup label="Summary style" value={mc.summary_style ?? 'cards_row'} onChange={v => upd({ summary_style: v as any })} options={[{ value: 'cards_row', label: 'Cards row' }, { value: 'single_stat', label: 'Single stat' }, { value: 'ring_progress', label: 'Ring' }]} />
              )}
            </>
          )}

          {rightTab === 'behavior' && surface === 'widget' && (
            <RadioGroup label="Widget size" value={String(mc.widget_col_span ?? 2)} onChange={v => upd({ widget_col_span: Number(v) as any })} options={[{ value: '1', label: '1 col' }, { value: '2', label: '2 col' }, { value: '3', label: '3 col' }]} />
          )}
        </div>
      </div>
    </div>
  );
}
