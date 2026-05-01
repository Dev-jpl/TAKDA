"use client";

import React from 'react';
import {
  ChartBar, NoteBlank, ListBullets, Hash, Minus,
} from '@phosphor-icons/react';
import type { HubSectionConfig } from '@/types/ui-builder';

interface PaletteEntry {
  label:   string;
  icon:    React.ElementType;
  desc:    string;
  default: () => HubSectionConfig;
}

const ITEMS: PaletteEntry[] = [
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

export function HubPalettePanel({ onAdd }: Props) {
  return (
    <div className="w-52 border-r border-border-primary bg-background-secondary flex flex-col h-full overflow-y-auto shrink-0">
      <div className="px-3 py-2.5 border-b border-border-primary">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Sections</p>
      </div>
      <div className="flex flex-col gap-1 p-3">
        {ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onAdd(item.default())}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-border-primary text-left hover:bg-background-tertiary hover:border-border-primary/80 transition-all"
            >
              <Icon size={14} className="text-text-tertiary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[12px] text-text-secondary font-medium">{item.label}</p>
                <p className="text-[10px] text-text-tertiary">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
