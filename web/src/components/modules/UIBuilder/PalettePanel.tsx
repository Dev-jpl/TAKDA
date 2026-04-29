"use client";

import React, { useMemo } from 'react';
import {
  TextTIcon, HashIcon, ArrowsCounterClockwiseIcon, ToggleLeftIcon,
  CalendarBlankIcon, ListBulletsIcon, SparkleIcon, MinusIcon,
  CheckSquareIcon, AppWindowIcon, ArrowDownIcon,
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

const LAYOUT_ITEMS: LayoutItem[] = [
  { label: 'Section Header', icon: AppWindowIcon,  factory: () => ({ type: 'section_header', title: 'New Section', subtitle: '' }) },
  { label: 'Divider',        icon: MinusIcon,       factory: () => ({ type: 'divider' }) },
  { label: 'Spacer (Small)', icon: ArrowDownIcon,   factory: () => ({ type: 'spacer', size: 'sm' }) },
  { label: 'Spacer (Medium)',icon: ArrowDownIcon,   factory: () => ({ type: 'spacer', size: 'md' }) },
  { label: 'Spacer (Large)', icon: ArrowDownIcon,   factory: () => ({ type: 'spacer', size: 'lg' }) },
  { label: 'Assistant Note', icon: SparkleIcon,     factory: () => ({ type: 'assistant_nudge', hint: '' }) },
];

const ACTION_ITEMS: LayoutItem[] = [
  { label: 'Save Button',   icon: CheckSquareIcon, factory: () => ({ type: 'save_button',   label: 'Save'   }) },
  { label: 'Cancel Button', icon: MinusIcon,       factory: () => ({ type: 'cancel_button', label: 'Cancel' }) },
];

// ── PaletteItem ───────────────────────────────────────────────────────────────

function PaletteItem({
  icon: Icon, label, onClick, accent = false, dot,
}: {
  icon:     React.ElementType;
  label:    string;
  onClick:  () => void;
  accent?:  boolean;
  dot?:     'green' | 'orange';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all group text-xs font-medium ${
        accent
          ? 'text-text-secondary hover:bg-modules-aly/5 hover:text-modules-aly'
          : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
      }`}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dot === 'green' ? '#22c55e' : '#f97316' }}
        />
      )}
      <Icon size={14} className="shrink-0 text-text-tertiary group-hover:text-inherit transition-colors" />
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold text-text-tertiary/60 uppercase tracking-widest px-3 pt-3 pb-1">
      {children}
    </p>
  );
}

// ── PalettePanel ──────────────────────────────────────────────────────────────

interface PalettePanelProps {
  schema:    SchemaField[];
  rows:      import('@/types/ui-builder').UIRow[];
  onAdd:     (block: UIBlock) => void;
  brandColor: string;
}

export function PalettePanel({ schema, rows, onAdd, brandColor }: PalettePanelProps) {
  // Which field keys are already placed on the canvas
  const placedKeys = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach(row =>
      row.columns.forEach(col => {
        if (col.block.type === 'field_input') keys.add(col.block.field_key);
      }),
    );
    return keys;
  }, [rows]);

  const placedCount = schema.filter(f => placedKeys.has(f.key)).length;
  const allPlaced   = placedCount === schema.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Fields section */}
      <SectionLabel>Fields</SectionLabel>

      {/* Placement status */}
      {schema.length > 0 && (
        <div className={`mx-3 mb-1 px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
          allPlaced
            ? 'bg-green-500/10 text-green-400'
            : 'bg-orange-500/10 text-orange-400'
        }`}>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: allPlaced ? '#22c55e' : '#f97316' }}
          />
          {placedCount} of {schema.length} fields placed
        </div>
      )}

      {schema.length === 0 ? (
        <p className="px-3 py-2 text-[11px] text-text-tertiary">No fields in schema yet.</p>
      ) : (
        schema.map(f => {
          const Icon    = FIELD_ICONS[f.type] ?? TextTIcon;
          const placed  = placedKeys.has(f.key);
          return (
            <div key={f.key} className="flex flex-col">
              <PaletteItem
                icon={Icon}
                label={f.label || f.key}
                dot={placed ? 'green' : 'orange'}
                onClick={() => onAdd({
                  type:      'field_input',
                  field_key: f.key,
                  component: defaultComponent(f.type as FieldType, f.config?.options),
                  label:     f.label,
                  show_label: true,
                  placeholder: '',
                })}
              />
              <p className="px-8 pb-1 text-[9px] text-text-tertiary/50 font-mono">
                {f.key} · {FIELD_TYPE_LABELS[f.type] ?? f.type}
              </p>
            </div>
          );
        })
      )}

      {/* Layout section */}
      <SectionLabel>Layout</SectionLabel>
      {LAYOUT_ITEMS.map(item => (
        <PaletteItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          onClick={() => onAdd(item.factory())}
        />
      ))}

      {/* Actions section */}
      <SectionLabel>Actions</SectionLabel>
      {ACTION_ITEMS.map(item => (
        <PaletteItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          accent
          onClick={() => onAdd(item.factory())}
        />
      ))}

      <div className="h-4" />
    </div>
  );
}
