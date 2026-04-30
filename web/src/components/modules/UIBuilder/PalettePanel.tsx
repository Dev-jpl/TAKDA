"use client";

import React, { useMemo, useState } from 'react';
import {
  TextTIcon, HashIcon, ArrowsCounterClockwiseIcon, ToggleLeftIcon,
  CalendarBlankIcon, ListBulletsIcon, SparkleIcon, MinusIcon,
  CheckSquareIcon, AppWindowIcon, ArrowDownIcon, SquaresFourIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import { UIBlock, ComponentType } from '@/types/ui-builder';
import { SchemaField, FieldType } from '@/services/modules.service';
import { defaultComponent } from './autoLayout';

// ── Field type icons ──────────────────────────────────────────────────────────

const FIELD_ICONS: Record<string, React.ElementType> = {
  text:     TextTIcon,
  string:   TextTIcon,
  number:   HashIcon,
  counter:  ArrowsCounterClockwiseIcon,
  boolean:  ToggleLeftIcon,
  date:     CalendarBlankIcon,
  datetime: CalendarBlankIcon,
  select:   ListBulletsIcon,
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text', string: 'Text', number: 'Number', counter: 'Counter',
  boolean: 'Toggle', date: 'Date', datetime: 'DateTime', select: 'Select',
};

// ── Layout block definitions ──────────────────────────────────────────────────

interface LayoutItem {
  label:   string;
  icon:    React.ElementType;
  factory: () => UIBlock;
}

function uid() { return crypto.randomUUID().replace(/-/g, '').slice(0, 8); }

const LAYOUT_ITEMS: LayoutItem[] = [
  { label: 'Section Header', icon: AppWindowIcon,  factory: () => ({ type: 'section_header', title: 'New Section', subtitle: '' }) },
  { label: 'Divider',        icon: MinusIcon,       factory: () => ({ type: 'divider' }) },
  { label: 'Spacer (Small)', icon: ArrowDownIcon,   factory: () => ({ type: 'spacer', size: 'sm' }) },
  { label: 'Spacer (Medium)',icon: ArrowDownIcon,   factory: () => ({ type: 'spacer', size: 'md' }) },
  { label: 'Spacer (Large)', icon: ArrowDownIcon,   factory: () => ({ type: 'spacer', size: 'lg' }) },
  { label: 'AI Note',        icon: SparkleIcon,     factory: () => ({ type: 'assistant_nudge', hint: '' }) },
];

const ACTION_ITEMS: LayoutItem[] = [
  { label: 'Save Button',   icon: CheckSquareIcon, factory: () => ({ type: 'save_button',   label: 'Save'   }) },
  { label: 'Cancel Button', icon: MinusIcon,       factory: () => ({ type: 'cancel_button', label: 'Cancel' }) },
];

const CONTAINER_ITEMS: LayoutItem[] = [
  {
    label: 'Field Group',
    icon:  SquaresFourIcon,
    factory: () => ({
      type: 'container' as const,
      label: 'Field Group',
      bordered: true,
      background: false,
      children: [
        { id: `cc_${uid()}`, span: 6 as const, block: { type: 'section_header' as const, title: 'Field A', subtitle: '' } },
        { id: `cc_${uid()}`, span: 6 as const, block: { type: 'section_header' as const, title: 'Field B', subtitle: '' } },
      ],
    }),
  },
  {
    label: 'Button Group',
    icon:  CheckSquareIcon,
    factory: () => ({
      type: 'container' as const,
      label: '',
      bordered: false,
      background: true,
      children: [
        { id: `cc_${uid()}`, span: 6 as const, block: { type: 'save_button'   as const, label: 'Save'   } },
        { id: `cc_${uid()}`, span: 6 as const, block: { type: 'cancel_button' as const, label: 'Cancel' } },
      ],
    }),
  },
  {
    label: 'Container',
    icon:  SquaresFourIcon,
    factory: () => ({
      type: 'container' as const,
      label: '',
      bordered: true,
      background: false,
      children: [],
    }),
  },
];

// ── PaletteItem ───────────────────────────────────────────────────────────────

function PaletteItem({
  icon: Icon, label, onClick, dot, accent = false,
}: {
  icon:    React.ElementType;
  label:   string;
  onClick: () => void;
  dot?:    'green' | 'orange';
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all group text-[11px] font-medium border border-transparent ${
        accent
          ? 'text-text-tertiary hover:bg-modules-aly/10 hover:text-modules-aly hover:border-modules-aly/20'
          : 'text-text-tertiary hover:bg-background-tertiary hover:text-text-primary'
      }`}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dot === 'green' ? '#22c55e' : '#f97316' }}
        />
      )}
      <Icon size={12} className="shrink-0 text-text-tertiary/60 group-hover:text-inherit transition-colors" />
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold text-text-tertiary/40 uppercase tracking-widest px-2.5 pt-3 pb-1">
      {children}
    </p>
  );
}

// ── PalettePanel ──────────────────────────────────────────────────────────────

interface PalettePanelProps {
  schema:     SchemaField[];
  rows:       import('@/types/ui-builder').UIRow[];
  onAdd:      (block: UIBlock) => void;
  brandColor: string;
}

export function PalettePanel({ schema, rows, onAdd, brandColor }: PalettePanelProps) {
  const [search, setSearch] = useState('');
  const q = search.toLowerCase().trim();

  const placedKeys = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach(row => row.columns.forEach(col => {
      if (col.block.type === 'field_input') keys.add(col.block.field_key);
      else if (col.block.type === 'container') col.block.children.forEach(child => {
        if (child.block.type === 'field_input') keys.add(child.block.field_key);
      });
    }));
    return keys;
  }, [rows]);

  const placedCount = schema.filter(f => placedKeys.has(f.key)).length;
  const allPlaced   = schema.length > 0 && placedCount === schema.length;

  const filteredFields    = q ? schema.filter(f => f.key.includes(q) || f.label.toLowerCase().includes(q)) : schema;
  const filteredLayout    = q ? LAYOUT_ITEMS.filter(i => i.label.toLowerCase().includes(q))    : LAYOUT_ITEMS;
  const filteredContainers= q ? CONTAINER_ITEMS.filter(i => i.label.toLowerCase().includes(q)) : CONTAINER_ITEMS;
  const filteredActions   = q ? ACTION_ITEMS.filter(i => i.label.toLowerCase().includes(q))    : ACTION_ITEMS;

  const anyResults = filteredFields.length > 0 || filteredLayout.length > 0 || filteredContainers.length > 0 || filteredActions.length > 0;

  return (
    <div className="flex flex-col h-full">

      {/* Search */}
      <div className="px-2.5 pt-2.5 pb-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-background-primary border border-border-primary rounded-lg px-2.5 py-1.5">
          <MagnifyingGlassIcon size={11} className="text-text-tertiary/60 shrink-0" />
          <input
            type="text"
            placeholder="Search components…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[11px] text-text-primary outline-none placeholder:text-text-tertiary/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-text-tertiary/60 hover:text-text-tertiary transition-colors">
              <span className="text-[10px]">✕</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto pb-4">

        {!anyResults && (
          <p className="px-3 py-4 text-[11px] text-text-tertiary/50 text-center">No results for "{search}"</p>
        )}

        {/* Fields */}
        {filteredFields.length > 0 && (
          <>
            <div className="flex items-center justify-between px-2.5 pt-3 pb-1">
              <p className="text-[9px] font-bold text-text-tertiary/50 uppercase tracking-widest">Fields</p>
              {!q && schema.length > 0 && (
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                  allPlaced ? 'text-green-400 bg-green-500/10' : 'text-orange-400 bg-orange-500/10'
                }`}>
                  {placedCount}/{schema.length}
                </span>
              )}
            </div>
            {filteredFields.map(f => {
              const Icon   = FIELD_ICONS[f.type] ?? TextTIcon;
              const placed = placedKeys.has(f.key);
              return (
                <div key={f.key}>
                  <PaletteItem
                    icon={Icon}
                    label={f.label || f.key}
                    dot={placed ? 'green' : 'orange'}
                    onClick={() => onAdd({
                      type:       'field_input',
                      field_key:  f.key,
                      component:  defaultComponent(f.type as FieldType, f.config?.options),
                      label:      f.label,
                      show_label: true,
                      placeholder: '',
                    })}
                  />
                  <p className="px-7 pb-0.5 text-[9px] text-text-tertiary/40 font-mono truncate">
                    {f.key} · {FIELD_TYPE_LABELS[f.type] ?? f.type}
                  </p>
                </div>
              );
            })}
          </>
        )}

        {/* Layout */}
        {filteredLayout.length > 0 && (
          <>
            <SectionLabel>Layout</SectionLabel>
            {filteredLayout.map(item => (
              <PaletteItem key={item.label} icon={item.icon} label={item.label} onClick={() => onAdd(item.factory())} />
            ))}
          </>
        )}

        {/* Containers */}
        {filteredContainers.length > 0 && (
          <>
            <SectionLabel>Containers</SectionLabel>
            {filteredContainers.map(item => (
              <PaletteItem key={item.label} icon={item.icon} label={item.label} onClick={() => onAdd(item.factory())} />
            ))}
          </>
        )}

        {/* Actions */}
        {filteredActions.length > 0 && (
          <>
            <SectionLabel>Actions</SectionLabel>
            {filteredActions.map(item => (
              <PaletteItem key={item.label} icon={item.icon} label={item.label} accent onClick={() => onAdd(item.factory())} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
