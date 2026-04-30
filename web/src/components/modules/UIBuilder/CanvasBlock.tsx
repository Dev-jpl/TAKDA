"use client";

import React, { memo } from 'react';
import { XIcon, SparkleIcon } from '@phosphor-icons/react';
import { UIBlock, BlockSpan } from '@/types/ui-builder';
import { SchemaField } from '@/services/modules.service';

// ── Span class lookup (literal Tailwind classes) ──────────────────────────────

export const SPAN_CLASS: Record<BlockSpan, string> = {
  3:  'col-span-3',
  4:  'col-span-4',
  6:  'col-span-6',
  8:  'col-span-8',
  9:  'col-span-9',
  12: 'col-span-12',
};

// ── Block visual renderers (preview-only, no inputs) ──────────────────────────

function BlockPreview({
  block,
  schema,
  brandColor,
  assistantName,
}: {
  block: UIBlock;
  schema: SchemaField[];
  brandColor: string;
  assistantName: string;
}) {
  const inputMock =
    'w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-xs text-text-tertiary';

  switch (block.type) {
    case 'field_input': {
      const sf = schema.find(f => f.key === block.field_key);
      return (
        <div className="flex flex-col gap-1 w-full">
          {block.show_label && (
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{block.label}</p>
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
              <div className="w-7 h-7 rounded-md border border-border-primary flex items-center justify-center text-text-tertiary text-sm">−</div>
              <span className="flex-1 text-center text-sm font-bold text-text-primary">
                0{sf?.config?.unit ? ` ${sf.config.unit}` : ''}
              </span>
              <div className="w-7 h-7 rounded-md border border-border-primary flex items-center justify-center text-text-tertiary text-sm">+</div>
            </div>
          ) : block.component === 'select_chips' ? (
            <div className="flex gap-1.5 flex-wrap">
              {(sf?.config?.options ?? ['Option 1', 'Option 2']).slice(0, 4).map((opt, i) => (
                <span key={i} className={`px-2 py-1 rounded-md border text-[10px] font-semibold ${
                  i === 0 ? 'text-white' : 'border-border-primary text-text-tertiary'
                }`} style={i === 0 ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}>
                  {opt}
                </span>
              ))}
            </div>
          ) : (
            <div className={inputMock}>
              {block.placeholder || `${block.label}…`}
            </div>
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
      return (
        <div
          className="w-full border border-dashed border-border-primary/40 rounded flex items-center justify-center"
          style={{ height: block.size === 'sm' ? 16 : block.size === 'md' ? 32 : 48 }}
        >
          <span className="text-[9px] text-text-tertiary/40 uppercase tracking-widest">Spacer ({block.size})</span>
        </div>
      );

    case 'assistant_nudge':
      return (
        <div className="flex gap-2.5 p-3 bg-modules-aly/5 border border-modules-aly/20 rounded-lg w-full">
          <SparkleIcon size={14} className="text-modules-aly shrink-0 mt-0.5" weight="duotone" />
          <div>
            <p className="text-[10px] font-semibold text-text-primary">{assistantName}</p>
            {block.hint && <p className="text-xs text-text-secondary mt-0.5">{block.hint}</p>}
            {!block.hint && <p className="text-xs text-text-tertiary/60">Add a context hint</p>}
          </div>
        </div>
      );

    case 'save_button':
      return (
        <button
          type="button"
          className="w-full py-2.5 rounded-xl text-white text-xs font-bold pointer-events-none"
          style={{ backgroundColor: brandColor }}
        >
          {block.label || 'Save'}
        </button>
      );

    case 'cancel_button':
      return (
        <button
          type="button"
          className="w-full py-2.5 rounded-xl text-xs font-semibold text-text-secondary border border-border-primary pointer-events-none"
        >
          {block.label || 'Cancel'}
        </button>
      );

    case 'container': {
      const wrapperCls = [
        'w-full rounded-lg p-2 flex flex-col gap-2',
        block.bordered   ? 'border border-border-primary' : '',
        block.background ? 'bg-background-secondary' : '',
      ].filter(Boolean).join(' ');
      return (
        <div className={wrapperCls}>
          {block.label && (
            <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest px-1">
              {block.label}
            </p>
          )}
          {block.children.length === 0 ? (
            <div className="flex items-center justify-center py-4 border border-dashed border-border-primary/30 rounded-md">
              <span className="text-[9px] text-text-tertiary/40 uppercase tracking-widest">
                No children — configure in panel
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-1.5">
              {block.children.map(child => (
                <div key={child.id} className={`${SPAN_CLASS[child.span]} pointer-events-none opacity-80`}>
                  {/* child.block is LeafBlock — no container case — safe to call BlockPreview */}
                  <BlockPreview
                    block={child.block}
                    schema={schema}
                    brandColor={brandColor}
                    assistantName={assistantName}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    default:
      return <div className="text-xs text-text-tertiary">Unknown block</div>;
  }
}

// ── CanvasBlock ───────────────────────────────────────────────────────────────

interface CanvasBlockProps {
  block:         UIBlock;
  colId:         string;
  rowId:         string;
  isSelected:    boolean;
  onSelect:      (rowId: string, colId: string) => void;
  onRemove:      (rowId: string, colId: string) => void;
  brandColor:    string;
  assistantName: string;
  schema:        SchemaField[];
}

export const CanvasBlock = memo(function CanvasBlock({
  block, colId, rowId, isSelected, onSelect, onRemove, brandColor, assistantName, schema,
}: CanvasBlockProps) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onSelect(rowId, colId); }}
      className={`relative group/block p-3 rounded-xl border-2 cursor-pointer transition-all bg-background-primary ${
        isSelected
          ? 'shadow-sm'
          : 'border-transparent hover:border-border-primary/30'
      }`}
      style={isSelected ? { borderColor: brandColor } : undefined}
    >
      {/* Remove button */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove(rowId, colId); }}
        className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-background-secondary border border-border-primary flex items-center justify-center text-text-tertiary hover:text-red-400 hover:border-red-400/40 transition-all opacity-0 group-hover/block:opacity-100"
      >
        <XIcon size={10} weight="bold" />
      </button>

      <BlockPreview
        block={block}
        schema={schema}
        brandColor={brandColor}
        assistantName={assistantName}
      />
    </div>
  );
});
