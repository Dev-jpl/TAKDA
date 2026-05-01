"use client";

import React from 'react';
import { X, DotsSixVertical, ChartBar, NoteBlank, ListBullets, Hash, Minus } from '@phosphor-icons/react';
import type { HubSection } from '@/types/ui-builder';

const TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
  widget:           { label: 'Widget',      icon: ChartBar },
  entry_form_panel: { label: 'Entry Form',  icon: NoteBlank },
  entry_list:       { label: 'Entry List',  icon: ListBullets },
  stats_row:        { label: 'Stats Row',   icon: Hash },
  divider:          { label: 'Divider',     icon: Minus },
};

function SectionPreview({ section }: { section: HubSection }) {
  const type = section.config.type;

  if (type === 'widget') return (
    <div className="flex gap-2 p-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex-1 h-12 bg-background-tertiary rounded-lg" />
      ))}
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
          <div className="h-2 bg-background-tertiary rounded flex-1" style={{ width: `${60 + i * 10}%` }} />
        </div>
      ))}
    </div>
  );

  if (type === 'stats_row') return (
    <div className="flex gap-2 p-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex-1 h-10 bg-background-tertiary rounded-lg" />
      ))}
    </div>
  );

  if (type === 'divider') return <hr className="border-border-primary mx-3 my-2" />;

  return null;
}

interface Props {
  section:    HubSection;
  isSelected: boolean;
  brandColor: string;
  onSelect:   () => void;
  onRemove:   () => void;
}

export function HubSectionCard({ section, isSelected, brandColor, onSelect, onRemove }: Props) {
  const meta = TYPE_META[section.config.type] ?? TYPE_META.divider;
  const Icon = meta.icon;

  const title = (() => {
    const c = section.config;
    if (c.type === 'entry_form_panel' && c.title) return c.title;
    if (c.type === 'entry_list' && c.title) return c.title;
    return meta.label;
  })();

  return (
    <div
      className="group/card rounded-xl border transition-all cursor-pointer overflow-hidden"
      style={{ borderColor: isSelected ? brandColor : 'var(--border-primary)', backgroundColor: 'var(--background-secondary)' }}
      onClick={onSelect}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-primary/50">
        <DotsSixVertical size={13} className="text-text-tertiary/40 shrink-0 cursor-grab" />
        <Icon size={13} className="text-text-tertiary shrink-0" />
        <span className="text-[12px] font-medium text-text-secondary flex-1">{title}</span>
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
