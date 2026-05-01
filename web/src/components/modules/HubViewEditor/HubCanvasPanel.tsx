"use client";

import React, { useRef, useState } from 'react';
import { Rows } from '@phosphor-icons/react';
import type { HubSection } from '@/types/ui-builder';
import { HubSectionCard } from './HubSectionCard';

interface Props {
  sections:    HubSection[];
  selectedId:  string | null;
  brandColor:  string;
  onSelect:    (id: string) => void;
  onClear:     () => void;
  onRemove:    (id: string) => void;
  onMove:      (from: number, to: number) => void;
}

export function HubCanvasPanel({ sections, selectedId, brandColor, onSelect, onClear, onRemove, onMove }: Props) {
  const dragIdxRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  return (
    <div
      className="flex-1 overflow-y-auto flex flex-col items-center py-8 px-6"
      style={{ backgroundImage: 'radial-gradient(circle, var(--border-primary) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      onClick={onClear}
    >
      <div className="w-full max-w-2xl flex flex-col gap-3" onClick={e => e.stopPropagation()}>

        {sections.length === 0 && (
          <div className="border-2 border-dashed border-border-primary rounded-2xl py-20 flex flex-col items-center gap-3 text-center">
            <Rows size={24} className="text-text-tertiary/30" />
            <p className="text-xs text-text-tertiary">Add sections from the palette<br/>to design your hub view</p>
          </div>
        )}

        {sections.map((section, idx) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => { dragIdxRef.current = idx; }}
            onDragOver={e => { e.preventDefault(); if (dragIdxRef.current !== null && dragIdxRef.current !== idx) setDragOver(idx); }}
            onDrop={() => { if (dragIdxRef.current !== null) { onMove(dragIdxRef.current, idx); dragIdxRef.current = null; setDragOver(null); } }}
            onDragEnd={() => { dragIdxRef.current = null; setDragOver(null); }}
            className={dragOver === idx ? 'border-t-2 border-t-modules-aly/60 rounded' : ''}
          >
            <HubSectionCard
              section={section}
              isSelected={selectedId === section.id}
              brandColor={brandColor}
              onSelect={() => onSelect(section.id)}
              onRemove={() => onRemove(section.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
