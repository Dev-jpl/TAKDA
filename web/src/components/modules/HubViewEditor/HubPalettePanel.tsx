"use client";

import React from 'react';
import {
  ChartBar, NoteBlank, ListBullets, Hash, Minus,
  CalendarBlank, ChartLineUp, Rows,
} from '@phosphor-icons/react';
import type { HubSectionConfig } from '@/types/ui-builder';

interface PaletteEntry {
  label:   string;
  icon:    React.ElementType;
  desc:    string;
  default: () => HubSectionConfig;
}

const SMART_ITEMS: PaletteEntry[] = [
  {
    label:   'Date Nav',
    icon:    CalendarBlank,
    desc:    'Day-by-day navigation filter',
    default: () => ({ type: 'date_nav', date_field: '' }),
  },
  {
    label:   'Summary Bar',
    icon:    ChartLineUp,
    desc:    'Goal / consumed / remaining',
    default: () => ({
      type: 'summary_bar', primary_key: '', goal_value: 2000,
      goal_label: 'Goal', consumed_label: 'Consumed', remaining_label: 'Left',
      macro_keys: [],
    }),
  },
  {
    label:   'Grouped Entries',
    icon:    Rows,
    desc:    'Per-group lists with add forms',
    default: () => ({
      type: 'grouped_entries', group_by_field: '', groups: [],
      show_fields: [], inline_form: true, limit_per_group: 20,
    }),
  },
];

const STANDARD_ITEMS: PaletteEntry[] = [
  {
    label:   'Widget',
    icon:    ChartBar,
    desc:    'Show your widget definition',
    default: () => ({ type: 'widget' }),
  },
  {
    label:   'Entry Form',
    icon:    NoteBlank,
    desc:    'Inline entry form panel',
    default: () => ({ type: 'entry_form_panel', title: '' }),
  },
  {
    label:   'Entry List',
    icon:    ListBullets,
    desc:    'List of recent entries',
    default: () => ({ type: 'entry_list', limit: 10, show_fields: [], title: '' }),
  },
  {
    label:   'Stats Row',
    icon:    Hash,
    desc:    'Row of computed stat cards',
    default: () => ({ type: 'stats_row', computed_keys: [] }),
  },
  {
    label:   'Divider',
    icon:    Minus,
    desc:    'Horizontal separator',
    default: () => ({ type: 'divider' }),
  },
];

interface Props {
  onAdd: (config: HubSectionConfig) => void;
}

function PaletteGroup({
  label, items, onAdd, accent,
}: {
  label: string;
  items: PaletteEntry[];
  onAdd: Props['onAdd'];
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className={`text-[9px] font-bold uppercase tracking-widest px-1 mb-0.5 ${accent ? 'text-modules-aly' : 'text-text-tertiary/60'}`}>
        {label}
      </p>
      {items.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onAdd(item.default())}
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
              accent
                ? 'border-modules-aly/20 bg-modules-aly/5 hover:bg-modules-aly/10 hover:border-modules-aly/30'
                : 'border-border-primary hover:bg-background-tertiary hover:border-border-primary/80'
            }`}
          >
            <Icon size={14} className={`shrink-0 mt-0.5 ${accent ? 'text-modules-aly' : 'text-text-tertiary'}`} />
            <div className="min-w-0">
              <p className="text-[12px] text-text-secondary font-medium">{item.label}</p>
              <p className="text-[10px] text-text-tertiary">{item.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function HubPalettePanel({ onAdd }: Props) {
  return (
    <div className="w-52 border-r border-border-primary bg-background-secondary flex flex-col h-full overflow-y-auto shrink-0">
      <div className="px-3 py-2.5 border-b border-border-primary">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Sections</p>
      </div>
      <div className="flex flex-col gap-4 p-3">
        <PaletteGroup label="Smart" items={SMART_ITEMS} onAdd={onAdd} accent />
        <PaletteGroup label="Standard" items={STANDARD_ITEMS} onAdd={onAdd} />
      </div>
    </div>
  );
}
