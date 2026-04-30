"use client";

import React, { useCallback, useState } from 'react';
import {
  SquaresFourIcon, GearSixIcon, SparkleIcon,
  EyeIcon, PencilSimpleIcon,
} from '@phosphor-icons/react';
import { UIDefinition, UIBlock } from '@/types/ui-builder';
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

// ── Panel toggle button ───────────────────────────────────────────────────────

function PanelToggle({
  icon: Icon, label, active, onClick,
}: {
  icon:    React.ElementType;
  label:   string;
  active:  boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all border ${
        active
          ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20'
          : 'text-text-tertiary border-transparent hover:bg-background-tertiary hover:text-text-secondary'
      }`}
    >
      <Icon size={12} weight={active ? 'fill' : 'regular'} />
      <span className="hidden lg:block">{label}</span>
    </button>
  );
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
    updateContainerBlock, addContainerChild,
    removeContainerChild, updateContainerChild, updateContainerChildSpan,
  } = useUIBuilder(schema, initialDefinition ?? null, moduleName, onChange);

  const handleSendChat = useCallback((msg: string) => {
    sendChatMessage(msg, brandColor, aName);
  }, [sendChatMessage, brandColor, aName]);

  const handleRemoveRow = useCallback((rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    row.columns.forEach(col => removeBlock(rowId, col.id));
  }, [rows, removeBlock]);

  // ── Panel visibility + preview mode ────────────────────────────────────────
  const [showPalette, setShowPalette] = useState(true);
  const [showConfig,  setShowConfig]  = useState(true);
  const [isPreview,   setIsPreview]   = useState(false);

  return (
    <div className="relative flex flex-col h-full bg-background-primary overflow-hidden">

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-background-secondary border border-border-primary rounded-xl shadow-xl text-xs font-medium text-text-primary whitespace-nowrap">
          <span className="text-modules-aly">✦</span>
          {aName} {toastMsg}
        </div>
      )}

      {/* ── Toolbar strip ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-primary bg-background-secondary shrink-0">

        {/* Panel toggles */}
        {!isPreview && (
          <div className="flex items-center gap-1">
            <PanelToggle
              icon={SquaresFourIcon}
              label="Components"
              active={showPalette}
              onClick={() => setShowPalette(v => !v)}
            />
            <PanelToggle
              icon={GearSixIcon}
              label="Configure"
              active={showConfig && configTab === 'configure'}
              onClick={() => {
                if (!showConfig) { setShowConfig(true); setConfigTab('configure'); }
                else if (configTab !== 'configure') setConfigTab('configure');
                else setShowConfig(v => !v);
              }}
            />
            <PanelToggle
              icon={SparkleIcon}
              label={`Ask ${aName}`}
              active={showConfig && configTab === 'chat'}
              onClick={() => {
                if (!showConfig) { setShowConfig(true); setConfigTab('chat'); }
                else if (configTab !== 'chat') setConfigTab('chat');
                else setShowConfig(v => !v);
              }}
            />
          </div>
        )}

        <div className="flex-1" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setIsPreview(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-medium transition-all border ${
            isPreview
              ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20'
              : 'border-border-primary text-text-tertiary hover:bg-background-tertiary hover:text-text-secondary'
          }`}
        >
          {isPreview
            ? <><PencilSimpleIcon size={11} weight="fill" /> Edit</>
            : <><EyeIcon size={11} /> Preview</>
          }
        </button>
      </div>

      {/* ── Main three-column layout ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel: Palette */}
        {showPalette && !isPreview && (
          <div className="w-52 shrink-0 border-r border-border-primary bg-background-secondary flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-border-primary shrink-0">
              <p className="text-[9px] font-bold text-text-tertiary/50 uppercase tracking-widest">Components</p>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <PalettePanel
                schema={schema}
                rows={rows}
                onAdd={addBlock}
                brandColor={accent}
              />
            </div>
          </div>
        )}

        {/* Center: Canvas */}
        <CanvasPanel
          rows={rows}
          selectedBlockId={selectedBlockId}
          schema={schema}
          moduleName={moduleName}
          brandColor={accent}
          assistantName={aName}
          pendingProposal={pendingProposal}
          isPreview={isPreview}
          onAdd={addBlock}
          onSelectBlock={selectBlock}
          onRemoveBlock={removeBlock}
          onRemoveRow={handleRemoveRow}
          onMoveRow={moveRow}
          onCycleSpan={cycleColSpan}
          onClearSelection={clearSelection}
        />

        {/* Right panel: Config */}
        {showConfig && !isPreview && (
          <div className="w-64 shrink-0 border-l border-border-primary bg-background-secondary flex flex-col overflow-hidden">
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
              onUpdateContainerBlock={updateContainerBlock}
              onAddContainerChild={addContainerChild}
              onRemoveContainerChild={removeContainerChild}
              onUpdateContainerChild={updateContainerChild}
              onUpdateContainerChildSpan={updateContainerChildSpan}
            />
          </div>
        )}
      </div>
    </div>
  );
}
