"use client";

import React from 'react';
import {
  X, DotsSixVertical, ChartBar, NoteBlank, ListBullets, Hash, Minus,
  CalendarBlank, ChartLineUp, Rows,
} from '@phosphor-icons/react';
import type { HubSection } from '@/types/ui-builder';

const TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
  widget:           { label: 'Widget',          icon: ChartBar },
  entry_form_panel: { label: 'Entry Form',       icon: NoteBlank },
  entry_list:       { label: 'Entry List',       icon: ListBullets },
  stats_row:        { label: 'Stats Row',        icon: Hash },
  divider:          { label: 'Divider',          icon: Minus },
  date_nav:         { label: 'Date Nav',         icon: CalendarBlank },
  summary_bar:      { label: 'Summary Bar',      icon: ChartLineUp },
  grouped_entries:  { label: 'Grouped Entries',  icon: Rows },
};

function SectionPreview({ section }: { section: HubSection }) {
  const type = section.config.type;

  if (type === 'widget') return (
    <div className="flex gap-2 p-3">
      {[1, 2, 3].map(i => <div key={i} className="flex-1 h-12 bg-background-tertiary rounded-lg" />)}
    </div>
  );

  if (type === 'entry_form_panel') return (
    <div className="flex flex-col gap-1.5 p-3">
      {[1, 2].map(i => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-16 h-2 bg-background-tertiary rounded" />
          <div className="flex-1 h-6 bg-background-tertiary rounded-lg" />
        </div>
      ))}
    </div>
  );

  if (type === 'entry_list') return (
    <div className="flex flex-col gap-1 p-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-2 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-background-tertiary shrink-0" />
          <div className="h-2 bg-background-tertiary rounded" style={{ width: `${60 + i * 10}%` }} />
        </div>
      ))}
    </div>
  );

  if (type === 'stats_row') return (
    <div className="flex gap-2 p-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="flex-1 h-10 bg-background-tertiary rounded-lg" />)}
    </div>
  );

  if (type === 'divider') return <hr className="border-border-primary mx-3 my-2" />;

  // ── Smart Section previews ────────────────────────────────────────────────

  if (type === 'date_nav') return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="w-5 h-5 bg-background-tertiary rounded" />
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 bg-background-tertiary rounded-full" />
        <div className="w-12 h-3 bg-background-tertiary rounded" />
        <div className="w-1.5 h-1.5 bg-background-tertiary rounded-full" />
      </div>
      <div className="w-5 h-5 bg-background-tertiary rounded" />
    </div>
  );

  if (type === 'summary_bar') {
    const c = section.config;
    const label = c.type === 'summary_bar' ? c.consumed_label ?? 'Consumed' : 'Consumed';
    return (
      <div className="flex flex-col gap-2 p-3">
        {/* Equation row */}
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="h-4 w-10 bg-background-tertiary rounded mx-auto mb-1" />
            <div className="h-2 w-8 bg-background-tertiary/60 rounded mx-auto" />
          </div>
          <span className="text-text-tertiary/40 text-sm">−</span>
          <div className="text-center">
            <div className="h-4 w-8 bg-background-tertiary rounded mx-auto mb-1" />
            <div className="h-2 w-12 bg-background-tertiary/60 rounded mx-auto" />
          </div>
          <span className="text-text-tertiary/40 text-sm">=</span>
          <div className="text-center">
            <div className="h-4 w-10 bg-background-tertiary rounded mx-auto mb-1" />
            <div className="h-2 w-6 bg-background-tertiary/60 rounded mx-auto" />
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-modules-aly/40 rounded-full" />
        </div>
      </div>
    );
  }

  if (type === 'grouped_entries') {
    const c    = section.config;
    const grps = c.type === 'grouped_entries' ? c.groups.slice(0, 3) : [];
    return (
      <div className="flex flex-col gap-0 p-3 divide-y divide-border-primary/30">
        {grps.length === 0
          ? (
            <>
              {['Group A', 'Group B'].map(g => (
                <div key={g} className="flex items-center justify-between py-2">
                  <div className="h-2.5 w-16 bg-background-tertiary rounded" />
                  <div className="h-2 w-8 bg-background-tertiary/60 rounded" />
                </div>
              ))}
            </>
          )
          : grps.map(g => (
            <div key={g.key} className="flex items-center justify-between py-2">
              <span className="text-[10px] font-medium text-text-secondary">{g.label}</span>
              <div className="h-2 w-8 bg-background-tertiary rounded" />
            </div>
          ))
        }
      </div>
    );
  }

  return null;
}

interface Props {
  section:    HubSection;
  isSelected: boolean;
  brandColor: string;
  onSelect:   () => void;
  onRemove:   () => void;
}

const SMART_TYPES = new Set(['date_nav', 'summary_bar', 'grouped_entries']);

export function HubSectionCard({ section, isSelected, brandColor, onSelect, onRemove }: Props) {
  const meta    = TYPE_META[section.config.type] ?? TYPE_META.divider;
  const Icon    = meta.icon;
  const isSmart = SMART_TYPES.has(section.config.type);

  const title = (() => {
    const c = section.config;
    if (c.type === 'entry_form_panel' && c.title) return c.title;
    if (c.type === 'entry_list' && c.title) return c.title;
    return meta.label;
  })();

  return (
    <div
      className="group/card rounded-xl border transition-all cursor-pointer overflow-hidden"
      style={{
        borderColor: isSelected ? brandColor : isSmart ? 'var(--modules-aly)' : 'var(--border-primary)',
        backgroundColor: 'var(--background-secondary)',
        opacity: isSmart && !isSelected ? 0.9 : 1,
      }}
      onClick={onSelect}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-primary/50">
        <DotsSixVertical size={13} className="text-text-tertiary/40 shrink-0 cursor-grab" />
        <Icon
          size={13}
          className="shrink-0"
          style={{ color: isSmart ? 'var(--modules-aly)' : 'var(--text-tertiary)' }}
        />
        <span className="text-[12px] font-medium text-text-secondary flex-1">{title}</span>
        {isSmart && (
          <span className="text-[8px] font-bold uppercase tracking-widest text-modules-aly bg-modules-aly/10 px-1.5 py-0.5 rounded">
            Smart
          </span>
        )}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="w-5 h-5 rounded flex items-center justify-center text-text-tertiary hover:text-red-400 opacity-0 group-hover/card:opacity-100 transition-all"
        >
          <X size={11} />
        </button>
      </div>

      {/* Preview */}
      <SectionPreview section={section} />
    </div>
  );
}
