"use client";

import React, { useRef } from 'react';
import { TrashIcon, DotsSixVerticalIcon } from '@phosphor-icons/react';
import { ScreenWidget } from '@/services/screens.service';
import { WidgetCard } from '@/components/screens/WidgetCard';
import { Space } from '@/services/spaces.service';
import { Hub } from '@/services/hubs.service';

export interface CanvasPos { x: number; y: number; w: number; h: number }

export type CanvasMode = 'view' | 'edit';

interface CanvasWidgetNodeProps {
  widget: ScreenWidget;
  pos: CanvasPos;
  mode: CanvasMode;
  scale: number;
  userId?: string;
  spaces?: Space[];
  hubs?: Hub[];
  hubName?: string;
  spaceName?: string;
  isFocused?: boolean;
  onDragStart: (widgetId: string, e: React.PointerEvent) => void;
  onDelete: (widgetId: string) => void;
  onFocus: (widgetId: string) => void;
}

export function CanvasWidgetNode({
  widget, pos, mode, scale, userId, spaces, hubs, hubName, spaceName,
  isFocused, onDragStart, onDelete, onFocus,
}: CanvasWidgetNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode === 'edit') {
      e.stopPropagation();
      onDragStart(widget.id, e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (mode === 'view') {
      e.stopPropagation();
      onFocus(widget.id);
    }
  };

  return (
    <div
      ref={nodeRef}
      data-canvas-widget="true"
      data-widget-id={widget.id}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: pos.w,
        height: pos.h,
        cursor: mode === 'edit' ? 'grab' : 'default',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      className={`group select-none rounded-xl transition-shadow ${
        isFocused ? 'ring-2 ring-modules-aly shadow-2xl' : ''
      } ${mode === 'edit' ? 'hover:ring-2 hover:ring-modules-aly/40 hover:shadow-lg' : ''}`}
    >
      {/* Edit-mode drag handle badge */}
      {mode === 'edit' && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-0.5 bg-background-secondary border border-border-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <DotsSixVerticalIcon size={10} className="text-text-tertiary" />
          <span className="text-[9px] text-text-tertiary font-semibold uppercase tracking-wider">drag</span>
        </div>
      )}

      {/* Delete button in edit mode */}
      {mode === 'edit' && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(widget.id); }}
          className="absolute -top-2.5 -right-2.5 z-10 w-6 h-6 rounded-full bg-red-500 border-2 border-background-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
        >
          <TrashIcon size={10} className="text-white" />
        </button>
      )}

      {/* Widget content — pointer-events blocked in edit mode so drag works */}
      <div
        className="w-full h-full overflow-hidden rounded-xl"
        style={{ pointerEvents: mode === 'edit' ? 'none' : 'auto' }}
      >
        <WidgetCard
          widget={widget}
          hubName={hubName}
          spaceName={spaceName}
          userId={userId}
          spaces={spaces}
          hubs={hubs}
        />
      </div>
    </div>
  );
}
