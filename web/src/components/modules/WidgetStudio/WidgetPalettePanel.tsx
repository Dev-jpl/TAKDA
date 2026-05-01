"use client";

import React from 'react';
import {
  ChartBar, ChartLine, ChartDonut, CircleHalf, Rectangle,
  TextT, Minus, ArrowsVertical, ListBullets, PlayCircle,
  Hash,
} from '@phosphor-icons/react';
import type { WidgetElementConfig, WidgetElementType } from '@/types/ui-builder';

// ── Palette item metadata ─────────────────────────────────────────────────────

interface PaletteEntry {
  type:    WidgetElementType;
  label:   string;
  icon:    React.ElementType;
  default: () => WidgetElementConfig;
}

const PALETTE: { group: string; items: PaletteEntry[] }[] = [
  {
    group: 'Stats',
    items: [
      {
        type:    'stat_card',
        label:   'Stat Card',
        icon:    Hash,
        default: () => ({ type: 'stat_card', computed_key: '', label: 'Total', show_change: false }),
      },
    ],
  },
  {
    group: 'Charts',
    items: [
      {
        type:    'bar_chart',
        label:   'Bar Chart',
        icon:    ChartBar,
        default: () => ({ type: 'bar_chart', computed_key: '', window: 'last_7d' }),
      },
      {
        type:    'line_chart',
        label:   'Line Chart',
        icon:    ChartLine,
        default: () => ({ type: 'line_chart', computed_key: '', window: 'last_7d' }),
      },
      {
        type:    'donut_chart',
        label:   'Donut Chart',
        icon:    ChartDonut,
        default: () => ({ type: 'donut_chart', field_key: '', aggregation: 'count' }),
      },
      {
        type:    'progress_ring',
        label:   'Progress Ring',
        icon:    CircleHalf,
        default: () => ({ type: 'progress_ring', computed_key: '', goal: 100 }),
      },
      {
        type:    'progress_bar',
        label:   'Progress Bar',
        icon:    Rectangle,
        default: () => ({ type: 'progress_bar', computed_key: '', goal: 100 }),
      },
    ],
  },
  {
    group: 'Content',
    items: [
      {
        type:    'text',
        label:   'Text',
        icon:    TextT,
        default: () => ({ type: 'text', content: 'Text block', size: 'md', weight: 400 }),
      },
      {
        type:    'divider',
        label:   'Divider',
        icon:    Minus,
        default: () => ({ type: 'divider' }),
      },
      {
        type:    'spacer',
        label:   'Spacer',
        icon:    ArrowsVertical,
        default: () => ({ type: 'spacer', size: 'md' }),
      },
    ],
  },
  {
    group: 'Data',
    items: [
      {
        type:    'entry_list',
        label:   'Entry List',
        icon:    ListBullets,
        default: () => ({ type: 'entry_list', limit: 5, show_fields: [] }),
      },
    ],
  },
  {
    group: 'Actions',
    items: [
      {
        type:    'action_button',
        label:   'Button',
        icon:    PlayCircle,
        default: () => ({ type: 'action_button', label: 'Action', style: 'primary' }),
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onAdd: (config: WidgetElementConfig) => void;
}

export function WidgetPalettePanel({ onAdd }: Props) {
  return (
    <div className="w-52 border-r border-border-primary bg-background-secondary flex flex-col h-full overflow-y-auto shrink-0">
      <div className="px-3 py-2.5 border-b border-border-primary">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Elements</p>
      </div>
      <div className="flex flex-col gap-4 p-3">
        {PALETTE.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[9px] font-medium text-text-tertiary uppercase tracking-widest mb-1.5">{group}</p>
            <div className="flex flex-col gap-1">
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => onAdd(item.default())}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border-primary text-left text-[12px] text-text-secondary hover:bg-background-tertiary hover:text-text-primary hover:border-border-primary/80 transition-all"
                  >
                    <Icon size={14} className="text-text-tertiary shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
