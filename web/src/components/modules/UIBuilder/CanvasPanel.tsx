"use client";

import React, { useCallback, useRef, useState } from 'react';
import { AppWindowIcon } from '@phosphor-icons/react';
import { UIRow, UIBlock, BlockSpan } from '@/types/ui-builder';
import { SchemaField } from '@/services/modules.service';
import { CanvasRow } from './CanvasRow';

interface CanvasPanelProps {
  rows:             UIRow[];
  selectedBlockId:  string | null;
  schema:           SchemaField[];
  moduleName:       string;
  brandColor:       string;
  assistantName:    string;
  pendingProposal:  import('@/types/ui-builder').UIDefinition | null;
  onSelectBlock:    (rowId: string, colId: string) => void;
  onRemoveBlock:    (rowId: string, colId: string) => void;
  onRemoveRow:      (rowId: string) => void;
  onMoveRow:        (from: number, to: number) => void;
  onCycleSpan:      (rowId: string, colId: string) => void;
  onClearSelection: () => void;
}

export function CanvasPanel({
  rows, selectedBlockId, schema, moduleName, brandColor, assistantName,
  pendingProposal, onSelectBlock, onRemoveBlock, onRemoveRow, onMoveRow,
  onCycleSpan, onClearSelection,
}: CanvasPanelProps) {
  // ── Drag state (refs only — no React state during drag) ────────────────────
  const draggedIdxRef   = useRef<number | null>(null);
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
    if (from !== null && from !== rowIndex) {
      onMoveRow(from, rowIndex);
    }
  }, [onMoveRow]);

  const handleDragEnd = useCallback(() => {
    draggedIdxRef.current = null;
    setDragOverIdx(null);
  }, []);

  // Count unplaced fields
  const placedKeys = new Set<string>();
  rows.forEach(r => r.columns.forEach(c => {
    if (c.block.type === 'field_input') placedKeys.add(c.block.field_key);
  }));
  const unplacedCount = schema.filter(f => !placedKeys.has(f.key)).length;

  // Determine selected row/col from selectedBlockId
  const [selRowId, selColId] = selectedBlockId ? selectedBlockId.split(':') : [null, null];

  return (
    <div
      className="flex-1 overflow-y-auto"
      onClick={onClearSelection}
    >
      {/* Dot-grid background */}
      <div
        className="min-h-full flex justify-center py-6 px-4"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        {/* 680px canvas */}
        <div className="w-full max-w-[680px] flex flex-col gap-2">

          {/* Canvas header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{moduleName}</span>
              {unplacedCount > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                  {unplacedCount} field{unplacedCount > 1 ? 's' : ''} unplaced
                </span>
              )}
            </div>
            <span className="text-[9px] text-text-tertiary/40">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Empty state */}
          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-20 text-center border-2 border-dashed border-border-primary/40 rounded-2xl">
              <AppWindowIcon size={32} className="text-text-tertiary/20" weight="duotone" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Start designing your module UI</p>
                <p className="text-xs text-text-tertiary mt-1">Click any component from the left panel to add it to the canvas</p>
              </div>
            </div>
          )}

          {/* Rows */}
          <div
            className="flex flex-col gap-3 px-6 py-2"
            onDragEnd={handleDragEnd}
          >
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
  );
}
