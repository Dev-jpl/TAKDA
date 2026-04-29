"use client";

import React, { useCallback } from 'react';
import { UIDefinition } from '@/types/ui-builder';
import { SchemaField } from '@/services/modules.service';
import { useUIBuilder } from './useUIBuilder';
import { PalettePanel } from './PalettePanel';
import { CanvasPanel } from './CanvasPanel';
import { ConfigPanel } from './ConfigPanel';

// ── Props ─────────────────────────────────────────────────────────────────────

interface UIBuilderProps {
  schema:             SchemaField[];
  initialDefinition?: UIDefinition | null;
  brandColor?:        string;
  assistantName?:     string;
  moduleName?:        string;
  onChange:           (definition: UIDefinition) => void;
}

// ── UIBuilder ─────────────────────────────────────────────────────────────────

export function UIBuilder({
  schema,
  initialDefinition,
  brandColor,
  assistantName,
  moduleName = 'Module',
  onChange,
}: UIBuilderProps) {
  const accent = brandColor || 'var(--modules-aly)';
  const aName  = assistantName || 'Assistant';

  const {
    rows, selectedBlockId, chatMessages, pendingProposal,
    isChatLoading, configTab, toastMsg,
    setConfigTab, addBlock, removeBlock, moveRow,
    updateBlock, updateSpan, cycleColSpan,
    selectBlock, clearSelection,
    sendChatMessage, applyProposal, dismissProposal,
  } = useUIBuilder(schema, initialDefinition ?? null, moduleName, onChange);

  const handleSendChat = useCallback((msg: string) => {
    sendChatMessage(msg, brandColor, aName);
  }, [sendChatMessage, brandColor, aName]);

  const handleRemoveRow = useCallback((rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    row.columns.forEach(col => removeBlock(rowId, col.id));
  }, [rows, removeBlock]);

  return (
    <div
      className="relative flex bg-background-primary border border-border-primary rounded-2xl overflow-hidden"
      style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}
    >
      {/* ── Toast notification ─────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-background-secondary border border-border-primary rounded-xl shadow-xl text-xs font-medium text-text-primary whitespace-nowrap">
          <span className="text-modules-aly">✦</span>
          {aName} {toastMsg}
        </div>
      )}

      {/* ── Left panel: Palette ─────────────────────────────────────────────── */}
      <div className="w-60 shrink-0 border-r border-border-primary bg-background-secondary flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border-primary shrink-0">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Components</p>
          <p className="text-[9px] text-text-tertiary/50 mt-0.5">Click to add to canvas</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PalettePanel
            schema={schema}
            rows={rows}
            onAdd={addBlock}
            brandColor={accent}
          />
        </div>
      </div>

      {/* ── Center panel: Canvas ────────────────────────────────────────────── */}
      <CanvasPanel
        rows={rows}
        selectedBlockId={selectedBlockId}
        schema={schema}
        moduleName={moduleName}
        brandColor={accent}
        assistantName={aName}
        pendingProposal={pendingProposal}
        onSelectBlock={selectBlock}
        onRemoveBlock={removeBlock}
        onRemoveRow={handleRemoveRow}
        onMoveRow={moveRow}
        onCycleSpan={cycleColSpan}
        onClearSelection={clearSelection}
      />

      {/* ── Right panel: Config ─────────────────────────────────────────────── */}
      <div className="w-68 shrink-0 border-l border-border-primary bg-background-secondary flex flex-col overflow-hidden">
        <ConfigPanel
          rows={rows}
          selectedBlockId={selectedBlockId}
          chatMessages={chatMessages}
          pendingProposal={pendingProposal}
          isChatLoading={isChatLoading}
          configTab={configTab}
          schema={schema}
          brandColor={accent}
          assistantName={aName}
          onSetConfigTab={setConfigTab}
          onUpdateBlock={updateBlock}
          onUpdateSpan={updateSpan}
          onSendChat={handleSendChat}
          onApplyProposal={applyProposal}
          onDismissProposal={dismissProposal}
        />
      </div>
    </div>
  );
}
