"use client";

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { WidgetType } from '@/services/screens.service';
import { Space } from '@/services/spaces.service';
import { Hub, hubsService } from '@/services/hubs.service';
import {
  CheckCircle,
  PencilSimple,
  FileText,
  PaperPlaneRight,
  PuzzlePiece,
  CaretLeft,
  CalendarCheck,
  Moon,
  Lightning,
  ChartPieSlice,
  Clock,
  TrendUp,
  ForkKnife,
  CurrencyDollar,
  Bicycle,
  // New types
  Plus,
  CheckSquare,
  ChartBar,
  Flame,
  Sparkle,
  Camera,
} from '@phosphor-icons/react';

type WidgetCategory = 'hub' | 'global' | 'tracking';

const WIDGET_TYPES: {
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: WidgetCategory;
}[] = [
  // ── New core widgets (global / standalone) ────────────────────────────────
  { type: 'counter',      label: 'Counter',       description: 'Numeric counter with +/−, goal, and unit.', icon: <Plus        size={18} weight="duotone" />, category: 'tracking' },
  { type: 'checklist',   label: 'Checklist',      description: 'Persistent to-do list on your screen.',     icon: <CheckSquare size={18} weight="duotone" />, category: 'tracking' },
  { type: 'streak',      label: 'Streak',         description: 'Consecutive-day habit tracker.',             icon: <Flame       size={18} weight="duotone" />, category: 'tracking' },
  { type: 'chart',       label: 'Chart',          description: 'Line or bar chart of habit history.',        icon: <ChartBar    size={18} weight="duotone" />, category: 'tracking' },
  { type: 'aly_nudge',   label: 'Aly Nudge',      description: 'Daily personalised message from Aly.',      icon: <Sparkle     size={18} weight="duotone" />, category: 'global'   },
  // ── Hub widgets ──────────────────────────────────────────────────────────
  { type: 'hub_snapshot',label: 'Hub Snapshot',   description: 'Latest hub activity with an AI summary.',   icon: <Camera      size={18} weight="duotone" />, category: 'hub'      },
  { type: 'hub_overview',label: 'Hub Overview',   description: 'Task progress and status breakdown.',        icon: <PuzzlePiece size={18} weight="duotone" />, category: 'hub'      },
  { type: 'tasks',       label: 'Tasks',          description: 'Open task list from a hub.',                icon: <CheckCircle size={18} weight="duotone" />, category: 'hub'      },
  { type: 'notes',       label: 'Notes',          description: 'Recent annotations from a hub.',            icon: <PencilSimple size={18} weight="duotone" />, category: 'hub'     },
  { type: 'docs',        label: 'Resources',      description: 'Documents & links from a hub.',             icon: <FileText    size={18} weight="duotone" />, category: 'hub'      },
  { type: 'outcomes',    label: 'Outcomes',       description: 'Recent deliveries from a hub.',             icon: <PaperPlaneRight size={18} weight="duotone" />, category: 'hub'  },
  { type: 'calorie_counter', label: 'Calorie Counter', description: "Today's calorie summary.",             icon: <ForkKnife   size={18} weight="duotone" />, category: 'hub'      },
  { type: 'expense_tracker', label: 'Expense Tracker', description: "This month's spending total.",         icon: <CurrencyDollar size={18} weight="duotone" />, category: 'hub'   },
  { type: 'upcoming_events', label: 'Upcoming Events', description: 'Next 5 calendar events from a hub.',  icon: <CalendarCheck size={18} weight="duotone" />, category: 'hub'    },
  { type: 'sleep_tracker',   label: 'Sleep Tracker',   description: 'Latest sleep log from a hub.',        icon: <Moon        size={18} weight="duotone" />, category: 'hub'      },
  { type: 'workout_log',     label: 'Workout Log',     description: 'Last workout & weekly session count.',icon: <Lightning   size={18} weight="duotone" />, category: 'hub'      },
  // ── Global overview widgets ───────────────────────────────────────────────
  { type: 'space_pulse',    label: 'Space Pulse',    description: 'Count of spaces & hubs at a glance.',  icon: <ChartPieSlice size={18} weight="duotone" />, category: 'global'  },
  { type: 'quick_clock',    label: 'Quick Clock',    description: "Live clock and today's date.",         icon: <Clock       size={18} weight="duotone" />, category: 'global'    },
  { type: 'weekly_progress',label: 'Weekly Progress',description: 'Task completion across all your hubs.',icon: <TrendUp     size={18} weight="duotone" />, category: 'global'    },
  { type: 'upcoming_global',label: 'Upcoming (All)', description: 'Next events across all your hubs.',    icon: <CalendarCheck size={18} weight="duotone" />, category: 'global'  },
  { type: 'strava_stats',   label: 'Strava Stats',   description: 'Recent synced Strava runs & rides.',   icon: <Bicycle     size={18} weight="duotone" />, category: 'global'    },
];

type Step = 'type' | 'source';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: Space[];
  onAdd: (type: WidgetType, hubId: string | null, title: string) => void;
}

/** Widget types that add instantly (no hub or extra config needed) */
const INSTANT_TYPES = new Set<WidgetType>([
  'counter', 'checklist', 'streak', 'chart', 'aly_nudge',
  'space_pulse', 'quick_clock', 'weekly_progress', 'upcoming_global', 'strava_stats',
]);

export function AddWidgetModal({ isOpen, onClose, spaces, onAdd }: AddWidgetModalProps) {
  const [step,     setStep]     = useState<Step>('type');
  const [selected, setSelected] = useState<WidgetType | null>(null);
  const [spaceId,  setSpaceId]  = useState('');
  const [hubId,    setHubId]    = useState('');
  const [title,    setTitle]    = useState('');
  const [hubs,     setHubs]     = useState<Hub[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep('type'); setSelected(null);
      setSpaceId(''); setHubId(''); setTitle(''); setHubs([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!spaceId) { setHubs([]); setHubId(''); return; }
    setLoadingHubs(true);
    hubsService.getHubsBySpace(spaceId)
      .then(setHubs)
      .finally(() => setLoadingHubs(false));
  }, [spaceId]);

  const widgetDef = WIDGET_TYPES.find(w => w.type === selected);

  function handleSelectType(type: WidgetType) {
    setSelected(type);
    if (INSTANT_TYPES.has(type)) {
      onAdd(type, null, '');
      onClose();
    } else {
      setStep('source');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    onAdd(selected, hubId || null, title);
    onClose();
  }

  const inputCls = "w-full bg-background-tertiary border border-border-primary rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-aly/40 transition-all placeholder:text-text-tertiary";

  const trackingWidgets = WIDGET_TYPES.filter(w => w.category === 'tracking');
  const hubWidgets      = WIDGET_TYPES.filter(w => w.category === 'hub');
  const globalWidgets   = WIDGET_TYPES.filter(w => w.category === 'global');

  const stepLabel = step === 'type' ? 'Choose type' : 'Pick source';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Widget" subtitle={stepLabel}>
      {/* ── Step 1: Widget type ── */}
      {step === 'type' && (
        <div className="flex flex-col gap-4">

          {/* Tracking / core widgets */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest px-0.5">Tracking</p>
            {trackingWidgets.map(w => (
              <button
                key={w.type}
                type="button"
                onClick={() => handleSelectType(w.type)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border-primary bg-background-tertiary text-left hover:border-modules-aly/30 hover:bg-modules-aly/5 transition-all group"
              >
                <span className="text-text-tertiary group-hover:text-modules-aly transition-colors">{w.icon}</span>
                <div>
                  <p className="font-bold text-sm text-text-primary">{w.label}</p>
                  <p className="text-[11px] text-text-tertiary">{w.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-border-primary/40" />

          {/* Hub widgets */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest px-0.5">Hub Widgets</p>
            {hubWidgets.map(w => (
              <button
                key={w.type}
                type="button"
                onClick={() => handleSelectType(w.type)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border-primary bg-background-tertiary text-left hover:border-modules-aly/30 hover:bg-modules-aly/5 transition-all group"
              >
                <span className="text-text-tertiary group-hover:text-modules-aly transition-colors">{w.icon}</span>
                <div>
                  <p className="font-bold text-sm text-text-primary">{w.label}</p>
                  <p className="text-[11px] text-text-tertiary">{w.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-border-primary/40" />

          {/* Global widgets */}
          <div className="flex flex-col gap-1.5">
            <div>
              <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest px-0.5">Global Widgets</p>
              <p className="text-[9px] text-text-tertiary/50 px-0.5">No hub required — adds instantly</p>
            </div>
            {globalWidgets.map(w => (
              <button
                key={w.type}
                type="button"
                onClick={() => handleSelectType(w.type)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border-primary bg-background-tertiary text-left hover:border-modules-aly/30 hover:bg-modules-aly/5 transition-all group"
              >
                <span className="text-text-tertiary group-hover:text-modules-aly transition-colors">{w.icon}</span>
                <div>
                  <p className="font-bold text-sm text-text-primary">{w.label}</p>
                  <p className="text-[11px] text-text-tertiary">{w.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Space + Hub source (hub widgets only) ── */}
      {step === 'source' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setStep('type')}
            className="self-start flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors mb-1"
          >
            <CaretLeft size={11} weight="bold" /> Back
          </button>

          <div className="flex items-center gap-3 px-3 py-2.5 bg-modules-aly/5 border border-modules-aly/20 rounded-xl">
            <span className="text-modules-aly">{widgetDef?.icon}</span>
            <span className="text-sm font-bold text-text-primary">{widgetDef?.label}</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest block mb-1.5">Space</label>
            <select
              value={spaceId}
              onChange={e => { setSpaceId(e.target.value); setHubId(''); }}
              required
              className={inputCls}
            >
              <option value="">Select a space…</option>
              {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest block mb-1.5">Hub</label>
            <select
              value={hubId}
              onChange={e => setHubId(e.target.value)}
              required
              disabled={!spaceId || loadingHubs}
              className={`${inputCls} disabled:opacity-50`}
            >
              <option value="">
                {!spaceId ? 'Select a space first…' : loadingHubs ? 'Loading…' : 'Select a hub…'}
              </option>
              {hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest block mb-1.5">
              Title <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={widgetDef?.label ?? ''}
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={!hubId}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-modules-aly text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Add Widget
          </button>
        </form>
      )}
    </Modal>
  );
}
