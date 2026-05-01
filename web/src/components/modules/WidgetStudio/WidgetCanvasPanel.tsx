"use client";

import React, { useRef, useState } from 'react';
import { Plus, X, Rows, AlignLeft, AlignCenterHorizontal, AlignRight, ArrowsHorizontal } from '@phosphor-icons/react';
import type { WidgetRow, WidgetRowAlign, WidgetRowJustify, WidgetSpan } from '@/types/ui-builder';
import { WidgetElementCard } from './WidgetElementCard';

// ── Justify / Align controls ──────────────────────────────────────────────────

const JUSTIFY_OPTIONS: { value: WidgetRowJustify; icon: React.ElementType; tip: string }[] = [
  { value: 'start',   icon: AlignLeft,             tip: 'Start' },
  { value: 'center',  icon: AlignCenterHorizontal,  tip: 'Center' },
  { value: 'end',     icon: AlignRight,              tip: 'End' },
  { value: 'between', icon: ArrowsHorizontal,        tip: 'Space between' },
];

const ALIGN_LABELS: { value: WidgetRowAlign; label: string }[] = [
  { value: 'top',     label: 'Top' },
  { value: 'middle',  label: 'Mid' },
  { value: 'bottom',  label: 'Bot' },
  { value: 'stretch', label: 'Str' },
];

const JUSTIFY_CLASS: Record<WidgetRowJustify, string> = {
  start:   'justify-start',
  center:  'justify-center',
  end:     'justify-end',
  between: 'justify-between',
  around:  'justify-around',
};

const ALIGN_CLASS: Record<WidgetRowAlign, string> = {
  top:     'items-start',
  middle:  'items-center',
  bottom:  'items-end',
  stretch: 'items-stretch',
};

const CANVAS_WIDTH: Record<number, string> = { 1: 'max-w-[200px]', 2: 'max-w-[420px]', 3: 'max-w-[640px]' };

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  rows:          WidgetRow[];
  selectedRowId: string | null;
  selectedElId:  string | null;
  brandColor:    string;
  colSpan:       number;
  onSelectEl:    (rowId: string, elId: string) => void;
  onSelectRow:   (rowId: string) => void;
  onClear:       () => void;
  onRemoveEl:    (rowId: string, elId: string) => void;
  onSpan:        (rowId: string, elId: string, span: WidgetSpan) => void;
  onUpdateRow:   (rowId: string, patch: { justify?: WidgetRowJustify; align?: WidgetRowAlign }) => void;
  onMoveRow:     (from: number, to: number) => void;
  onRemoveRow:   (rowId: string) => void;
  onAddRow:      () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WidgetCanvasPanel({
  rows, selectedRowId, selectedElId, brandColor, colSpan,
  onSelectEl, onSelectRow, onClear, onRemoveEl, onSpan,
  onUpdateRow, onMoveRow, onRemoveRow, onAddRow,
}: Props) {
  const dragIdxRef  = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const canvasWidth = CANVAS_WIDTH[colSpan] ?? 'max-w-[420px]';

  return (
    <div
      className="flex-1 overflow-y-auto flex flex-col items-center py-8 px-4"
      style={{ backgroundImage: 'radial-gradient(circle, var(--border-primary) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      onClick={onClear}
    >
      <div className={`w-full ${canvasWidth} flex flex-col gap-3`} onClick={e => e.stopPropagation()}>

        {rows.length === 0 && (
          <div className="border-2 border-dashed border-border-primary rounded-2xl py-16 flex flex-col items-center gap-3 text-center">
            <Rows size={24} className="text-text-tertiary/30" />
            <p className="text-xs text-text-tertiary">Add elements from the palette<br/>to start building your widget</p>
          </div>
        )}

        {rows.map((row, rowIdx) => {
          const isRowSelected = selectedRowId === row.id;
          return (
            <div
              key={row.id}
              draggable
              onDragStart={() => { dragIdxRef.current = rowIdx; }}
              onDragOver={e => { e.preventDefault(); if (dragIdxRef.current !== null && dragIdxRef.current !== rowIdx) setDragOver(rowIdx); }}
              onDrop={() => { if (dragIdxRef.current !== null) { onMoveRow(dragIdxRef.current, rowIdx); dragIdxRef.current = null; setDragOver(null); } }}
              onDragEnd={() => { dragIdxRef.current = null; setDragOver(null); }}
              className={`group/row rounded-xl border transition-all ${dragOver === rowIdx ? 'border-t-2 border-t-modules-aly/60' : ''} ${isRowSelected ? 'border-modules-aly/30' : 'border-border-primary'}`}
              style={{ backgroundColor: isRowSelected ? 'var(--background-secondary)' : 'var(--background-secondary)' }}
              onClick={e => { e.stopPropagation(); onSelectRow(row.id); }}
            >
              {/* Row toolbar */}
              <div className={`flex items-center gap-1 px-2 py-1.5 border-b border-border-primary/50 transition-opacity ${isRowSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'}`}>
                {/* Justify */}
                <div className="flex gap-0.5 mr-1">
                  {JUSTIFY_OPTIONS.map(j => {
                    const Icon = j.icon;
                    return (
                      <button
                        key={j.value}
                        type="button"
                        title={j.tip}
                        onClick={e => { e.stopPropagation(); onUpdateRow(row.id, { justify: j.value }); }}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-all ${row.justify === j.value ? 'text-white' : 'text-text-tertiary hover:text-text-primary'}`}
                        style={row.justify === j.value ? { backgroundColor: brandColor } : undefined}
                      >
                        <Icon size={12} />
                      </button>
                    );
                  })}
                </div>
                {/* Align */}
                <div className="flex gap-0.5">
                  {ALIGN_LABELS.map(a => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={e => { e.stopPropagation(); onUpdateRow(row.id, { align: a.value }); }}
                      className={`px-1.5 h-6 rounded text-[9px] font-medium transition-all ${row.align === a.value ? 'text-white' : 'text-text-tertiary hover:text-text-primary'}`}
                      style={row.align === a.value ? { backgroundColor: brandColor } : undefined}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                {/* Remove row */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onRemoveRow(row.id); }}
                  className="w-6 h-6 rounded flex items-center justify-center text-text-tertiary hover:text-red-400 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>

              {/* Elements */}
              <div className={`grid grid-cols-3 gap-2 p-2 min-h-[60px] ${JUSTIFY_CLASS[row.justify]} ${ALIGN_CLASS[row.align]}`}>
                {row.elements.map(el => (
                  <WidgetElementCard
                    key={el.id}
                    element={el}
                    rowId={row.id}
                    isSelected={selectedRowId === row.id && selectedElId === el.id}
                    brandColor={brandColor}
                    onSelect={() => onSelectEl(row.id, el.id)}
                    onRemove={() => onRemoveEl(row.id, el.id)}
                    onSpan={span => onSpan(row.id, el.id, span)}
                  />
                ))}
                {row.elements.length === 0 && (
                  <div className="col-span-3 flex items-center justify-center py-4 text-[11px] text-text-tertiary/40">
                    Row is empty — add elements from the palette
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add row button */}
        <button
          type="button"
          onClick={onAddRow}
          className="flex items-center justify-center gap-2 border-2 border-dashed border-border-primary rounded-xl py-3 text-[11px] text-text-tertiary hover:border-modules-aly/40 hover:text-modules-aly transition-all"
        >
          <Plus size={13} /> Add Row
        </button>
      </div>
    </div>
  );
}
