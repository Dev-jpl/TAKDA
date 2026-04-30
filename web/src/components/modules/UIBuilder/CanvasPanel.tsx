"use client";

import React, { useCallback, useRef, useState } from 'react';
import {
  AppWindowIcon, SparkleIcon, MinusIcon, ArrowDownIcon,
  SquaresFourIcon, CheckSquareIcon, FrameCorners,
} from '@phosphor-icons/react';
import { UIRow, UIBlock, BlockSpan } from '@/types/ui-builder';
import { SchemaField } from '@/services/modules.service';
import { CanvasRow } from './CanvasRow';
import { SPAN_CLASS } from './CanvasBlock';

// ── Quick-add toolbar items ───────────────────────────────────────────────────

function uid() { return crypto.randomUUID().replace(/-/g, '').slice(0, 8); }

const TOOLBAR_TOOLS: { label: string; icon: React.ElementType; factory: () => UIBlock }[] = [
  { label: 'Section',   icon: AppWindowIcon,  factory: () => ({ type: 'section_header', title: 'New Section', subtitle: '' }) },
  { label: 'Divider',   icon: MinusIcon,       factory: () => ({ type: 'divider' }) },
  { label: 'Spacer',    icon: ArrowDownIcon,   factory: () => ({ type: 'spacer', size: 'md' }) },
  { label: 'Container', icon: SquaresFourIcon, factory: () => ({ type: 'container', label: '', bordered: true, background: false, children: [] }) },
  { label: 'Save',      icon: CheckSquareIcon, factory: () => ({ type: 'save_button', label: 'Save' }) },
  { label: 'AI Note',   icon: SparkleIcon,     factory: () => ({ type: 'assistant_nudge', hint: '' }) },
];

// ── Preview block renderer (no edit chrome) ───────────────────────────────────

function PreviewBlock({
  block, schema, brandColor, assistantName,
}: {
  block:         UIBlock;
  schema:        SchemaField[];
  brandColor:    string;
  assistantName: string;
}) {
  const inputMock = 'w-full bg-background-tertiary/50 border border-border-primary/40 rounded-lg px-3 py-2.5 text-xs text-text-tertiary';

  switch (block.type) {
    case 'field_input': {
      const sf = schema.find(f => f.key === block.field_key);
      return (
        <div className="flex flex-col gap-1.5 w-full">
          {block.show_label && (
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{block.label}</p>
          )}
          {block.component === 'boolean_toggle' ? (
            <div className="flex items-center gap-2">
              <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-background-tertiary border border-border-primary">
                <span className="inline-block h-3 w-3 translate-x-1 rounded-full bg-text-tertiary/30" />
              </div>
              <span className="text-xs text-text-tertiary">Off</span>
            </div>
          ) : block.component === 'counter_stepper' ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg border border-border-primary flex items-center justify-center text-text-secondary text-sm">−</div>
              <span className="flex-1 text-center text-base font-bold text-text-primary">0{sf?.config?.unit ? ` ${sf.config.unit}` : ''}</span>
              <div className="w-8 h-8 rounded-lg border border-border-primary flex items-center justify-center text-text-secondary text-sm">+</div>
            </div>
          ) : block.component === 'select_chips' ? (
            <div className="flex gap-1.5 flex-wrap">
              {(sf?.config?.options ?? ['Option 1', 'Option 2']).slice(0, 4).map((opt, i) => (
                <span key={i} className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${i === 0 ? 'text-white' : 'border-border-primary text-text-tertiary'}`}
                  style={i === 0 ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}>
                  {opt}
                </span>
              ))}
            </div>
          ) : (
            <div className={inputMock}>{block.placeholder || `${block.label}…`}</div>
          )}
        </div>
      );
    }
    case 'section_header':
      return (
        <div className="pl-3 border-l-2 w-full" style={{ borderLeftColor: brandColor }}>
          <p className="text-sm font-semibold text-text-primary">{block.title || 'Section Title'}</p>
          {block.subtitle && <p className="text-xs text-text-tertiary mt-0.5">{block.subtitle}</p>}
        </div>
      );
    case 'divider':
      return <hr className="w-full border-border-primary" />;
    case 'spacer':
      return <div style={{ height: block.size === 'sm' ? 8 : block.size === 'md' ? 16 : 32 }} />;
    case 'assistant_nudge':
      return (
        <div className="flex gap-2.5 p-3 bg-modules-aly/5 border border-modules-aly/20 rounded-lg w-full">
          <SparkleIcon size={14} className="text-modules-aly shrink-0 mt-0.5" weight="duotone" />
          <div>
            <p className="text-[10px] font-semibold text-text-primary">{assistantName}</p>
            {block.hint && <p className="text-xs text-text-secondary mt-0.5">{block.hint}</p>}
          </div>
        </div>
      );
    case 'save_button':
      return (
        <button type="button" className="w-full py-3 rounded-xl text-white text-sm font-bold pointer-events-none" style={{ backgroundColor: brandColor }}>
          {block.label || 'Save'}
        </button>
      );
    case 'cancel_button':
      return (
        <button type="button" className="w-full py-3 rounded-xl text-sm font-semibold text-text-secondary border border-border-primary pointer-events-none">
          {block.label || 'Cancel'}
        </button>
      );
    case 'container': {
      const cls = ['w-full rounded-xl p-3 flex flex-col gap-2', block.bordered ? 'border border-border-primary' : '', block.background ? 'bg-background-secondary' : ''].filter(Boolean).join(' ');
      return (
        <div className={cls}>
          {block.label && <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">{block.label}</p>}
          <div className="grid grid-cols-12 gap-2">
            {block.children.map(child => (
              <div key={child.id} className={SPAN_CLASS[child.span]}>
                <PreviewBlock block={child.block} schema={schema} brandColor={brandColor} assistantName={assistantName} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

// ── Preview canvas ────────────────────────────────────────────────────────────

function PreviewCanvas({
  rows, schema, moduleName, brandColor, assistantName,
}: {
  rows:          UIRow[];
  schema:        SchemaField[];
  moduleName:    string;
  brandColor:    string;
  assistantName: string;
}) {
  return (
    <div
      className="flex-1 overflow-y-auto flex items-start justify-center py-10 px-6"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="w-97.5 bg-background-secondary border border-border-primary rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-primary bg-background-tertiary">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-modules-aly/10 border border-modules-aly/20">
            <SparkleIcon size={13} className="text-modules-aly" weight="fill" />
          </div>
          <p className="text-sm font-semibold text-text-primary">{moduleName}</p>
          <span className="ml-auto text-[9px] font-bold text-modules-aly/60 uppercase tracking-widest">Preview</span>
        </div>

        {/* Form content */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {rows.length === 0 ? (
            <p className="text-xs text-text-tertiary text-center py-8">No components yet</p>
          ) : rows.map(row => (
            <div key={row.id} className="grid grid-cols-12 gap-3">
              {row.columns.map(col => (
                <div key={col.id} className={SPAN_CLASS[col.span]}>
                  <PreviewBlock block={col.block} schema={schema} brandColor={brandColor} assistantName={assistantName} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CanvasPanel ───────────────────────────────────────────────────────────────

interface CanvasPanelProps {
  rows:             UIRow[];
  selectedBlockId:  string | null;
  schema:           SchemaField[];
  moduleName:       string;
  brandColor:       string;
  assistantName:    string;
  pendingProposal:  import('@/types/ui-builder').UIDefinition | null;
  isPreview:        boolean;
  onAdd:            (block: UIBlock) => void;
  onSelectBlock:    (rowId: string, colId: string) => void;
  onRemoveBlock:    (rowId: string, colId: string) => void;
  onRemoveRow:      (rowId: string) => void;
  onMoveRow:        (from: number, to: number) => void;
  onCycleSpan:      (rowId: string, colId: string) => void;
  onClearSelection: () => void;
}

export function CanvasPanel({
  rows, selectedBlockId, schema, moduleName, brandColor, assistantName,
  pendingProposal, isPreview, onAdd, onSelectBlock, onRemoveBlock, onRemoveRow, onMoveRow,
  onCycleSpan, onClearSelection,
}: CanvasPanelProps) {

  // Preview mode
  if (isPreview) {
    return (
      <PreviewCanvas
        rows={rows}
        schema={schema}
        moduleName={moduleName}
        brandColor={brandColor}
        assistantName={assistantName}
      />
    );
  }

  // ── Drag state ─────────────────────────────────────────────────────────────
  const draggedIdxRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((rowIndex: number, e: React.DragEvent) => {
    draggedIdxRef.current = rowIndex;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((rowIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdxRef.current !== null && rowIndex !== draggedIdxRef.current) {
      setDragOverIdx(rowIndex);
    }
  }, []);

  const handleDrop = useCallback((rowIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const from = draggedIdxRef.current;
    draggedIdxRef.current = null;
    setDragOverIdx(null);
    if (from !== null && from !== rowIndex) onMoveRow(from, rowIndex);
  }, [onMoveRow]);

  const handleDragEnd = useCallback(() => {
    draggedIdxRef.current = null;
    setDragOverIdx(null);
  }, []);

  const placedKeys = new Set<string>();
  rows.forEach(r => r.columns.forEach(c => {
    if (c.block.type === 'field_input') placedKeys.add(c.block.field_key);
    else if (c.block.type === 'container') c.block.children.forEach(ch => {
      if (ch.block.type === 'field_input') placedKeys.add(ch.block.field_key);
    });
  }));
  const unplacedCount = schema.filter(f => !placedKeys.has(f.key)).length;

  const [selRowId, selColId] = selectedBlockId ? selectedBlockId.split(':') : [null, null];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Scrollable canvas */}
      <div className="flex-1 overflow-y-auto" onClick={onClearSelection}>
        <div
          className="min-h-full flex justify-center py-10 px-10"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="w-full max-w-180 flex flex-col gap-2">

            {/* Canvas header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-tertiary/70 uppercase tracking-widest">{moduleName}</span>
                {unplacedCount > 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                    {unplacedCount} unplaced
                  </span>
                )}
              </div>
              <span className="text-[9px] text-text-tertiary/30">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Empty state */}
            {rows.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-24 text-center border border-dashed border-border-primary/30 rounded-2xl">
                <FrameCorners size={36} className="text-text-tertiary/15" weight="duotone" />
                <div>
                  <p className="text-sm font-semibold text-text-primary/70">Design your module interface</p>
                  <p className="text-xs text-text-tertiary/50 mt-1.5">
                    Use the toolbar below or the Components panel to add elements
                  </p>
                </div>
              </div>
            )}

            {/* Rows */}
            <div className="flex flex-col gap-3 px-8 pb-6" onDragEnd={handleDragEnd}>
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className={`relative transition-all ${
                    pendingProposal
                      ? pendingProposal.rows.find(r => r.id === row.id)
                        ? 'ring-2 ring-blue-400/40 rounded-xl'
                        : 'opacity-50 ring-2 ring-red-400/20 rounded-xl'
                      : ''
                  }`}
                >
                  <CanvasRow
                    row={row}
                    rowIndex={idx}
                    selectedColId={selRowId === row.id ? selColId : null}
                    onSelectBlock={onSelectBlock}
                    onRemoveBlock={onRemoveBlock}
                    onRemoveRow={onRemoveRow}
                    onCycleSpan={onCycleSpan}
                    brandColor={brandColor}
                    assistantName={assistantName}
                    schema={schema}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragOver={dragOverIdx === idx}
                  />
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ── Bottom toolbar ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 px-4 py-2 border-t border-border-primary bg-background-secondary">
        <span className="text-[9px] font-bold text-text-tertiary/40 uppercase tracking-widest mr-2">Quick add</span>
        <div className="w-px h-3.5 bg-border-primary mr-1" />
        {TOOLBAR_TOOLS.map((tool, i) => (
          <React.Fragment key={tool.label}>
            {i === 4 && <div className="w-px h-3.5 bg-border-primary mx-1" />}
            <button
              type="button"
              title={tool.label}
              onClick={() => onAdd(tool.factory())}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium text-text-tertiary hover:bg-modules-aly/10 hover:text-modules-aly border border-transparent hover:border-modules-aly/20 transition-all"
            >
              <tool.icon size={12} className="shrink-0" />
              <span className="hidden sm:block">{tool.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>

    </div>
  );
}
