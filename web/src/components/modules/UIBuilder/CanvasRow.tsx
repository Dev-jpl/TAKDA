"use client";

import React, { memo, useRef } from 'react';
import { XIcon, DotsSixVerticalIcon } from '@phosphor-icons/react';
import { UIRow, BlockSpan } from '@/types/ui-builder';
import { SchemaField } from '@/services/modules.service';
import { CanvasBlock, SPAN_CLASS } from './CanvasBlock';

interface CanvasRowProps {
  row:             UIRow;
  rowIndex:        number;
  selectedColId:   string | null;
  onSelectBlock:   (rowId: string, colId: string) => void;
  onRemoveBlock:   (rowId: string, colId: string) => void;
  onRemoveRow:     (rowId: string) => void;
  onCycleSpan:     (rowId: string, colId: string) => void;
  brandColor:      string;
  assistantName:   string;
  schema:          SchemaField[];
  // Drag props (managed by CanvasPanel with refs — no state)
  onDragStart:     (rowIndex: number, e: React.DragEvent) => void;
  onDragOver:      (rowIndex: number, e: React.DragEvent) => void;
  onDrop:          (rowIndex: number, e: React.DragEvent) => void;
  isDragOver:      boolean;
}

export const CanvasRow = memo(function CanvasRow({
  row, rowIndex, selectedColId, onSelectBlock, onRemoveBlock, onRemoveRow,
  onCycleSpan, brandColor, assistantName, schema,
  onDragStart, onDragOver, onDrop, isDragOver,
}: CanvasRowProps) {
  const handleRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`relative group/row rounded-xl transition-all ${
        isDragOver ? 'ring-2 ring-modules-aly/60 ring-offset-1' : ''
      }`}
      onDragOver={e => { e.preventDefault(); onDragOver(rowIndex, e); }}
      onDrop={e => onDrop(rowIndex, e)}
    >
      {/* Drag handle */}
      <div
        ref={handleRef}
        draggable
        onDragStart={e => onDragStart(rowIndex, e)}
        className="absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 rounded opacity-0 group-hover/row:opacity-100 transition-opacity text-text-tertiary hover:text-text-primary"
        title="Drag to reorder"
      >
        <DotsSixVerticalIcon size={14} />
      </div>

      {/* Delete row button */}
      <button
        type="button"
        onClick={() => onRemoveRow(row.id)}
        className="absolute -right-6 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover/row:opacity-100 transition-opacity text-text-tertiary hover:text-red-400"
        title="Remove row"
      >
        <XIcon size={14} />
      </button>

      {/* Columns */}
      <div className="grid grid-cols-12 gap-3">
        {row.columns.map((col, colIdx) => (
          <React.Fragment key={col.id}>
            {/* Column */}
            <div className={`${SPAN_CLASS[col.span]} relative group/col`}>
              <CanvasBlock
                block={col.block}
                colId={col.id}
                rowId={row.id}
                isSelected={selectedColId === col.id}
                onSelect={onSelectBlock}
                onRemove={onRemoveBlock}
                brandColor={brandColor}
                assistantName={assistantName}
                schema={schema}
              />
            </div>

            {/* Resize handle between columns */}
            {colIdx < row.columns.length - 1 && row.columns.length === 2 && (
              <div
                onClick={() => onCycleSpan(row.id, col.id)}
                className="absolute inset-y-0 opacity-0 group-hover/row:opacity-100 transition-opacity cursor-col-resize flex items-center justify-center z-10"
                style={{ left: `calc(${(col.span / 12) * 100}% - 6px)`, width: 12 }}
                title="Click to cycle column sizes"
              >
                <div className="w-1 h-6 rounded-full bg-border-primary/60 hover:bg-modules-aly/60 transition-colors" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});
